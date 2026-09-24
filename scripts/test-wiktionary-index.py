import collections
import gzip
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(__file__), 'wiktionary-index.py')
spec = importlib.util.spec_from_file_location('lookup', SCRIPT)
lookup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lookup)


class SourceIndexTest(unittest.TestCase):
    def test_index_preserves_rows_forms_pagination_and_excluded_language_gate(self):
        with tempfile.TemporaryDirectory() as root:
            rows = [{'lang_code': 'fa', 'word': 'قورباغه', 'senses': [{'glosses': ['frog']}]},
                    {'lang_code': 'en', 'word': 'peg', 'forms': [{'form': 'pegging'}],
                     'senses': [{'glosses': ['fasten with a peg']}, {'glosses': ['A sexual act using a strap-on.']}]},
                    {'lang_code': 'en', 'word': 'pegging', 'senses': [{'glosses': ['act of pegging']}]}]
            archive, report, database = [os.path.join(root, p) for p in ('source.gz', 'report.json', 'source.sqlite')]
            with gzip.open(archive, 'wb') as out:
                out.write(('\n'.join(json.dumps(row) for row in rows) + '\n').encode())
            audit = {'keptCounts': dict(collections.Counter(row['lang_code'] for row in rows)), 'keptRecords': len(rows),
                     'output': {'sha256': lookup.digest(archive)}, 'source': {'sha256': 'original'}, 'registry': {}}
            with open(report, 'w') as out:
                json.dump(audit, out)
            command = [sys.executable, SCRIPT, 'build', '--archive', archive, '--report', report, '--database', database]
            subprocess.check_output(command)
            result = json.loads(subprocess.check_output([sys.executable, SCRIPT, 'query', '--database', database,
                '--language', 'en', '--word', 'PEGGING', '--limit', '1']))
            self.assertEqual(result['total_records'], 2)
            self.assertEqual(result['next_offset'], 1)
            self.assertEqual(result['records'][0]['source_record'], rows[1])
            flags = result['records'][0]['sense_safety']
            self.assertIsNone(flags[0]['adult_content'])
            self.assertEqual(flags[1]['minimum_age'], 18)
            self.assertEqual(flags[1]['safety']['minimumBand'], 'AGE_18_20')
            audit['keptCounts'] = {'fa': 1}
            with open(report, 'w') as out:
                json.dump(audit, out)
            command[-1] = os.path.join(root, 'excluded.sqlite')
            failed = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.assertNotEqual(failed.returncode, 0)
            self.assertFalse(os.path.exists(command[-1]))


if __name__ == '__main__':
    unittest.main()
