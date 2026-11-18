import fs from 'node:fs';
import { createEntityWriter, inspectEntityWriterHistory } from '../packages/entity-registry-v1/authoring/entityWriterProfile.mjs';

// One trusted local operator entrypoint. No HTTP service, issuer, refresh or alternate allocator.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--inspect-history') {
  console.log(JSON.stringify(await inspectEntityWriterHistory(
    createEntityWriter(),
  ), null, 2));
} else if (args.length === 1 && args[0] === '--inspect') {
  console.log(JSON.stringify(await createEntityWriter().list({ limit: 1 }), null, 2));
} else {
  const argumentsByName = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index], value = args[index + 1];
    if (!['--input', '--actor'].includes(key) || !value || argumentsByName.has(key))
      throw Error('Use --inspect, --inspect-history, or --input <intent.json> --actor <agent:name|user:subject>');
    argumentsByName.set(key, value);
  }
  const principal = argumentsByName.get('--actor'), filename = argumentsByName.get('--input');
  if (!principal || !filename) throw Error('Explicit operator actor and intent file required');
  const service = createEntityWriter();
  if (service.workspace.git(['branch', '--show-current']) !== 'main' || service.workspace.changedPaths().length)
    throw Error('Operator source checkout must be clean main; preserve peer changes before authoring');
  const input = JSON.parse(fs.readFileSync(filename, 'utf8'));
  console.log(JSON.stringify(await service.mutate(principal, input), null, 2));
}
