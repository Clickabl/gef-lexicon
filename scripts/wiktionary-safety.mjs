import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('./wiktionary-safety-rules.json', import.meta.url), 'utf8'));
const sexual = new RegExp(rules.sexual_gloss_pattern, 'iu');

export function wiktionarySafety(sense, row = {}) {
  const labels = [sense, row].flatMap(value => ['tags', 'raw_tags', 'topics']
    .flatMap(key => Array.isArray(value[key]) ? value[key].filter(x => typeof x === 'string') : []));
  const normalized = new Set(labels.map(x => x.toLowerCase()));
  const detected = rules.adult_tags.filter(x => normalized.has(x.toLowerCase()));
  const gloss = (sense.glosses ?? []).filter(x => typeof x === 'string').join(' ');
  const sexualGloss = sexual.test(gloss);
  const adult = detected.length > 0 || sexualGloss;
  const profanity = rules.profanity_tags.some(x => normalized.has(x));
  return {
    adult_content: adult ? true : null,
    minimum_age: adult ? 18 : null,
    classification_status: adult || profanity ? 'flagged' : 'unclassified',
    review_state: 'candidate',
    policy_version: rules.version,
    evidence: [...detected.map(x => `source-label:${x}`), ...(sexualGloss ? ['english-gloss:sexual-content'] : [])],
    ...(adult || profanity ? { safety: {
      band: adult ? 'explicit' : 'mature',
      tags: [...(sexualGloss || detected.some(x => !['vulgar', 'obscene'].includes(x)) ? ['sexual_content'] : []),
        ...(profanity ? ['profanity'] : [])],
      minimumBand: adult ? 'AGE_18_20' : 'AGE_16_17', warningStrength: 'strong',
    } } : {}),
  };
}
