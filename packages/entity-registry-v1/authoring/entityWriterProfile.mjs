import fs from 'node:fs';
import path from 'node:path';
import { GitContentWorkspace } from './gitContentWorkspace.mjs';
import { EntityRegistryService, registryOperationReceipt } from './entityRegistryService.mjs';
import { registryDigest } from './registryOperationJournal.mjs';

/** Trusted operator configuration, never source paths or authority supplied by a mutation. */
export function readEntityWriterProfile(env = process.env) {
  const value = name => env[name]?.trim() || null;
  const repo = value('GEF_LEXICON_AUTHORING_REPO');
  if (!repo || !path.isAbsolute(repo))
    throw Error('GEF_LEXICON_AUTHORING_REPO must name the admitted absolute source checkout');
  const file = value('GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_FILE');
  const sha256 = value('GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SHA256');
  const sourceCommit = value('GEF_ENTITY_AUTHORING_LANGUAGE_REGISTRY_SOURCE_COMMIT');
  if (!file || !path.isAbsolute(file) || !/^[a-f0-9]{64}$/u.test(sha256 ?? '') ||
      !/^[a-f0-9]{40}$/u.test(sourceCommit ?? ''))
    throw Error('Entity authoring requires the complete admitted language file/hash/source-commit binding');
  return Object.freeze({
    repo,
    remote: value('GEF_LEXICON_AUTHORING_REMOTE') ?? 'origin',
    push: (value('GEF_LEXICON_AUTHORING_PUSH') ?? 'true') !== 'false',
    languageRegistry: Object.freeze({ file, sha256, sourceCommit }),
  });
}

export function createEntityWriter(env = process.env) {
  const profile = readEntityWriterProfile(env);
  if (!fs.statSync(path.join(profile.repo, '.git', 'gef-entity-operations')).isDirectory())
    throw Error('The admitted historical journal is unavailable; the operator never creates a replacement');
  return new EntityRegistryService({
    workspace: new GitContentWorkspace({
      repo: profile.repo, remote: profile.remote, branch: 'main',
      author: { name: 'Gef Entity Authoring', email: 'entity-authoring@clickabl.co' },
    }),
    push: profile.push,
    languageRegistry: profile.languageRegistry,
  });
}

/** Schema/receipt compatibility only: no recovery, source scripts, ID allocation or journal writes. */
export async function inspectEntityWriterHistory(service) {
  return service.workspace.withLock(() => {
    service.assertWorkspace();
    service.validationEnvironment();
    const records = service.journal.all();
    const hashes = records.map(record => [record.key, registryDigest(fs.readFileSync(
      path.join(service.journal.directory, `${record.key}.json`),
    ))]);
    const statusCounts = {};
    for (const record of records) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
    return {
      contract: 'gef-entity-writer-history-v1',
      operationCount: records.length,
      statusCounts,
      journalSha256: registryDigest(JSON.stringify(hashes)),
      receipts: records.map(registryOperationReceipt),
      freshMutationAdmission: false,
    };
  });
}
