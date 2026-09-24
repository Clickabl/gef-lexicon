import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { wiktionarySafety } from './wiktionary-safety.mjs';

const cases = [
  { glosses: ['The action of fastening with pegs.'] },
  { glosses: ['A sexual act involving a strap-on.'] },
  { glosses: ['A vulgar insult'], tags: ['vulgar'] },
  { glosses: ['A person who is gay.'], tags: ['LGBT'] },
  { glosses: ['A bone of the pelvis.'], topics: ['anatomy'] },
];
assert.equal(wiktionarySafety(cases[0]).adult_content, null);
assert.equal(wiktionarySafety(cases[1]).minimum_age, 18);
assert.equal(wiktionarySafety(cases[2]).safety.minimumBand, 'AGE_18_20');
assert.equal(wiktionarySafety(cases[3]).adult_content, null);
assert.equal(wiktionarySafety(cases[4]).adult_content, null);
const code = `import importlib.util,json,sys
s=importlib.util.spec_from_file_location('lookup','scripts/wiktionary-index.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
print(json.dumps([m.safety(x,{}) for x in json.load(sys.stdin)]))`;
const python = JSON.parse(execFileSync('python3', ['-c', code], { input: JSON.stringify(cases), encoding: 'utf8' }));
assert.deepEqual(python, cases.map(x => wiktionarySafety(x)));
console.log('Sense safety flags and Python/importer parity passed.');
