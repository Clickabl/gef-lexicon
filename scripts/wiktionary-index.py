#!/usr/bin/env python3
"""Private, rebuildable source lookup. Python 3.6+; standard library only."""
import argparse
import collections
import datetime
import gzip
import hashlib
import json
import os
import re
import sqlite3
import sys
import unicodedata
import zlib
from urllib.parse import quote


def safety(sense, row):
    with open(os.path.join(os.path.dirname(__file__), 'wiktionary-safety-rules.json'), encoding='utf-8') as stream:
        rules = json.load(stream)
    labels = {x.lower() for value in (sense, row) for key in ('tags', 'raw_tags', 'topics')
              for x in value.get(key, []) if isinstance(x, str)}
    detected = [x for x in rules['adult_tags'] if x.lower() in labels]
    sexual = bool(re.search(rules['sexual_gloss_pattern'], ' '.join(sense.get('glosses', [])), re.I))
    adult = bool(detected) or sexual
    profanity = any(x in labels for x in rules['profanity_tags'])
    result = {'adult_content': True if adult else None, 'minimum_age': 18 if adult else None,
              'classification_status': 'flagged' if adult or profanity else 'unclassified',
              'review_state': 'candidate', 'policy_version': rules['version'],
              'evidence': ['source-label:' + x for x in detected] + (['english-gloss:sexual-content'] if sexual else [])}
    if adult or profanity:
        result['safety'] = {'band': 'explicit' if adult else 'mature',
                            'tags': (['sexual_content'] if sexual or any(x not in ('vulgar', 'obscene') for x in detected) else []) + (['profanity'] if profanity else []),
                            'minimumBand': 'AGE_18_20' if adult else 'AGE_16_17', 'warningStrength': 'strong'}
    return result


def normalize(value):
    return unicodedata.normalize('NFC', value).strip().casefold()


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def build(args):
    with open(args.report, encoding='utf-8') as stream:
        report = json.load(stream)
    expected = report['keptCounts']
    if os.path.exists(args.database) or os.path.exists(args.database + '.building'):
        raise ValueError('Output already exists; choose a new index path. Never replace a serving index in place.')
    print('Verifying compressed source checksum', file=sys.stderr, flush=True)
    if digest(args.archive) != report['output']['sha256']:
        raise ValueError('Archive checksum does not match filter report')
    staging = args.database + '.building'
    db = sqlite3.connect(staging)
    os.chmod(staging, 0o600)
    db.executescript('''
        PRAGMA journal_mode=OFF;
        PRAGMA synchronous=OFF;
        PRAGMA cache_size=-32768;
        CREATE TABLE records (id INTEGER PRIMARY KEY, payload BLOB NOT NULL);
        CREATE TABLE lookup (language TEXT, surface TEXT, record_id INTEGER,
            PRIMARY KEY (language, surface, record_id)) WITHOUT ROWID;
        CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ''')
    counts = collections.Counter()
    total = 0
    unindexable = 0
    with gzip.open(args.archive, 'rb') as stream:
        for raw in stream:
            if not raw.strip():
                continue
            row = json.loads(raw.decode('utf-8'))
            language, word = row.get('lang_code'), row.get('word')
            if language not in expected:
                raise ValueError('Excluded language found in archive: ' + str(language))
            total += 1
            counts[language] += 1
            db.execute('INSERT INTO records VALUES (?,?)', (total, sqlite3.Binary(zlib.compress(raw, 1))))
            surfaces = {normalize(word)} if isinstance(word, str) and word.strip() else set()
            if not surfaces:
                unindexable += 1
            for form in row.get('forms', []):
                value = form.get('form') if isinstance(form, dict) else form
                if isinstance(value, str) and value.strip():
                    surfaces.add(normalize(value))
            db.executemany('INSERT INTO lookup VALUES (?,?,?)',
                           ((language, surface, total) for surface in sorted(surfaces)))
            if total % 10000 == 0:
                db.commit()
                if os.path.getsize(staging) > args.max_bytes:
                    raise ValueError('Index size budget exceeded; incomplete .building file retained for inspection')
            if total % 100000 == 0:
                print(json.dumps({'records': total, 'bytes': os.path.getsize(staging)}), file=sys.stderr, flush=True)
    if dict(counts) != expected or total != report['keptRecords']:
        raise ValueError('Full archive scan disagrees with retained language counts')
    metadata = {
        'schema_version': 1, 'review_state': 'candidate',
        'source_edition': 'enwiktionary', 'definition_language': 'en',
        'archive_sha256': report['output']['sha256'],
        'original_archive_sha256': report['source']['sha256'],
        'registry': report['registry'], 'source_mappings': report.get('sourceMappings'),
        'records': total, 'language_counts': dict(counts), 'records_without_headword': unindexable,
        'attribution': 'Wiktionary contributors; extracted by Kaikki/Wiktextract',
        'license_notices': ['CC BY-SA', 'GFDL'],
        'license_url': 'https://en.wiktionary.org/wiki/Wiktionary:Copyrights',
        'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'verification': 'Compressed SHA-256, complete gzip/JSON scan, exact per-language counts; no excluded source codes',
    }
    db.execute('INSERT INTO metadata VALUES (?,?)', ('manifest', json.dumps(metadata)))
    db.commit()
    if db.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
        raise ValueError('SQLite integrity check failed')
    db.close()
    os.rename(staging, args.database)
    print(json.dumps(metadata, ensure_ascii=False), flush=True)


def query(args):
    if not args.word.strip() or len(args.word) > 512:
        raise ValueError('Word must contain 1–512 characters')
    db = sqlite3.connect('file:' + quote(os.path.abspath(args.database)) + '?mode=ro', uri=True)
    manifest = json.loads(db.execute("SELECT value FROM metadata WHERE key='manifest'").fetchone()[0])
    if args.language not in manifest['language_counts']:
        print(json.dumps({'error': 'source_language_not_indexed',
                          'source_mappings': manifest.get('source_mappings'),
                          'source_languages': sorted(manifest['language_counts'])}))
        db.close()
        return
    count = db.execute('SELECT count(*) FROM lookup WHERE language=? AND surface=?',
                       (args.language, normalize(args.word))).fetchone()[0]
    rows = db.execute('SELECT records.id, payload FROM lookup JOIN records ON records.id=lookup.record_id '
                      'WHERE language=? AND surface=? ORDER BY records.id LIMIT ? OFFSET ?',
                      (args.language, normalize(args.word), args.limit, args.offset))
    records = []
    for record_id, payload in rows:
        row = json.loads(zlib.decompress(payload).decode('utf-8'))
        if args.jsonl:
            print(json.dumps(row, ensure_ascii=False))
        else:
            records.append({'source_record_id': record_id,
                            'source_url': 'https://en.wiktionary.org/wiki/' + quote(row['word'], safe='') if isinstance(row.get('word'), str) else None,
                            'sense_safety': [dict(source_sense_index=i, **safety(sense, row)) for i, sense in enumerate(row.get('senses', []))],
                            'source_record': row})
    if not args.jsonl:
        print(json.dumps({'query': {'language': args.language, 'word': args.word},
                          'match': 'exact NFC/casefold headword or attested form; all source senses',
                          'audience': 'authoring research; not learner delivery or child-safety approval',
                          'source': manifest, 'total_records': count, 'record_count': len(records),
                          'next_offset': args.offset + len(records) if args.offset + len(records) < count else None,
                          'records': records}, ensure_ascii=False))
    db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command')
    b = commands.add_parser('build')
    b.add_argument('--archive', required=True)
    b.add_argument('--report', required=True)
    b.add_argument('--database', required=True)
    b.add_argument('--max-bytes', type=int, default=12 * 1024 ** 3)
    q = commands.add_parser('query')
    q.add_argument('--database', required=True)
    q.add_argument('--language', required=True)
    q.add_argument('--word', required=True)
    q.add_argument('--limit', type=int, default=20)
    q.add_argument('--offset', type=int, default=0)
    q.add_argument('--jsonl', action='store_true', help='Unchanged full source rows for the canonical candidate importer')
    args = parser.parse_args()
    if args.command == 'build':
        build(args)
    elif args.command == 'query':
        query(args)
    else:
        parser.error('Choose build or query')


if __name__ == '__main__':
    main()
