#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const manifest = readJson('curriculum/lesson-system-manifest.json');
const catalog = readJson('curriculum/lesson-catalog.json');
const errors = [];

if (catalog.canonical_source !== 'curriculum/lesson-system-manifest.json') {
  errors.push('curriculum/lesson-catalog.json must declare the universal lesson SSOT as canonical_source');
}

const expected = new Map();
for (const group of manifest.lesson_groups ?? []) {
  for (const part of group.parts ?? []) {
    for (const lessonId of part.implementation_lesson_ids ?? []) {
      if (expected.has(lessonId)) {
        errors.push(`SSOT lesson ${lessonId} is bound more than once`);
      } else {
        expected.set(lessonId, { groupId: group.group_id, partId: part.part_id });
      }
    }
  }
}

const entries = [
  ...(catalog.universal ?? []).map((entry) => ({ ...entry, projection: 'universal' })),
  ...(catalog.language_specific ?? []).map((entry) => ({ ...entry, projection: 'language_specific' })),
];
const actual = new Map();
for (const entry of entries) {
  if (!entry.lesson_id) {
    errors.push(`Catalog ${entry.projection} entry is missing lesson_id`);
    continue;
  }
  if (actual.has(entry.lesson_id)) {
    errors.push(`Catalog contains duplicate lesson_id ${entry.lesson_id}`);
  } else {
    actual.set(entry.lesson_id, entry);
  }
}

for (const [lessonId, owner] of expected) {
  if (!actual.has(lessonId)) {
    errors.push(`Catalog is missing SSOT lesson ${lessonId} (${owner.groupId}/${owner.partId})`);
  }
}
for (const lessonId of actual.keys()) {
  if (!expected.has(lessonId)) {
    errors.push(`Catalog contains ${lessonId}, but the SSOT does not bind it to an implemented lesson part`);
  }
}

for (const [lessonId, entry] of actual) {
  let lesson = null;
  for (const langDir of fs.readdirSync(path.join(root, 'lessons'), { withFileTypes: true })) {
    if (!langDir.isDirectory()) continue;
    const languagePath = path.join(root, 'lessons', langDir.name);
    for (const lessonDir of fs.readdirSync(languagePath, { withFileTypes: true })) {
      if (!lessonDir.isDirectory()) continue;
      const lessonPath = path.join(languagePath, lessonDir.name, 'lesson.json');
      if (!fs.existsSync(lessonPath)) continue;
      const candidate = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
      if (candidate.lesson_id === lessonId) {
        lesson = candidate;
        break;
      }
    }
    if (lesson) break;
  }
  if (!lesson) continue;

  if (entry.projection === 'universal' && lesson.target_language !== 'mul') {
    errors.push(`${lessonId} targets ${lesson.target_language} but is projected as universal`);
  }
  if (entry.projection === 'language_specific') {
    if (!entry.language_tag) errors.push(`${lessonId} language_specific entry is missing language_tag`);
    if (lesson.target_language === 'mul') errors.push(`${lessonId} is universal but projected as language_specific`);
    if (entry.language_tag && lesson.target_language !== entry.language_tag) {
      errors.push(`${lessonId} catalog language ${entry.language_tag} does not match lesson target ${lesson.target_language}`);
    }
  }
}

if (errors.length) {
  console.error(`Lesson catalog parity failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Lesson catalog parity valid: ${actual.size}/${expected.size} implemented SSOT lesson IDs projected exactly once.`);
