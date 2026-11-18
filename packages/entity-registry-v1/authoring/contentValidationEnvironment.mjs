import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

/** One immutable product registry supplies both Studio target selection and Content validation. */
export function contentValidationEnvironment(registry, inherited = process.env) {
  const env = {...inherited, NODE_OPTIONS: inherited.NODE_OPTIONS ?? '--max-old-space-size=512'};
  if (registry == null) return env;
  if (!registry || typeof registry.file !== 'string' || !path.isAbsolute(registry.file)
    || typeof registry.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(registry.sha256)) throw new Error('Invalid canonical validator registry binding');
  const stat = fs.statSync(registry.file);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid canonical validator registry size');
  const bytes = fs.readFileSync(registry.file);
  if (bytes.length > 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== registry.sha256) throw new Error('Canonical validator registry hash mismatch');
  const data = JSON.parse(bytes.toString('utf8')), tags = data.uiLocalization?.productionRuntimeTags;
  if (data.canonicalSource !== 'Clickabl/gef-expo/registry/language-support.json' || !Array.isArray(tags) || !tags.length
    || tags.some(tag => typeof tag !== 'string' || !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u.test(tag))
    || new Set(tags).size !== tags.length) throw new Error('Canonical validator registry authority mismatch');
  env.GEF_LANGUAGE_SUPPORT_REGISTRY = registry.file;
  return env;
}
