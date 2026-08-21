#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  OCCURRENCE_EVIDENCE_POLICY,
  resolveOccurrenceSense,
  validateBidirectionalOccurrencePair,
} from './lib/occurrence-sense.mjs';

const romanticCita = '02000000-0000-7000-9201-000000000001';
const appointmentCita = '02000000-0000-7000-9201-000000000002';

const romantic = resolveOccurrenceSense({
  candidates: [
    { sense_id: romanticCita, score: 0.97 },
    { sense_id: appointmentCita, score: 0.14 },
  ],
  evidence: [
    { kind: 'local_context', detail: 'con Ana; social/romantic meeting context' },
    { kind: 'translation_memory', detail: 'earlier aligned to English date' },
  ],
});
assert.equal(romantic.status, 'resolved');
assert.equal(romantic.sense_id, romanticCita);

const dentist = resolveOccurrenceSense({
  candidates: [
    { sense_id: romanticCita, score: 0.08 },
    { sense_id: appointmentCita, score: 0.99 },
  ],
  evidence: [
    { kind: 'local_context', detail: 'con su dentista' },
    { kind: 'domain_context', detail: 'healthcare scheduling' },
    { kind: 'prior_occurrence', detail: 'same spelling was romantic on previous page' },
  ],
});
assert.equal(dentist.status, 'resolved');
assert.equal(dentist.sense_id, appointmentCita);

const launderingAttempt = resolveOccurrenceSense({
  candidates: [
    { sense_id: romanticCita, score: 0.99 },
    { sense_id: appointmentCita, score: 0.01 },
  ],
  evidence: [
    { kind: 'translation_memory', detail: 'cita was aligned to date earlier' },
    { kind: 'prior_occurrence', detail: 'same surface form previously resolved romantic' },
  ],
});
assert.deepEqual(launderingAttempt, {
  status: 'unresolved',
  reason: 'soft_evidence_only',
  sense_id: null,
});

const ambiguous = resolveOccurrenceSense({
  candidates: [
    { sense_id: romanticCita, score: 0.87 },
    { sense_id: appointmentCita, score: 0.81 },
  ],
  evidence: [{ kind: 'local_context', detail: 'insufficient generic meeting context' }],
});
assert.equal(ambiguous.status, 'unresolved');
assert.equal(ambiguous.reason, 'ambiguous_margin');

const romanticPivot = 'cpt_02000000-0000-7000-9000-000000000001';
const appointmentPivot = 'cpt_02000000-0000-7000-9000-000000000002';
const pairOk = validateBidirectionalOccurrencePair({
  sourceSense: { concept_links: [{ relation: 'primary', review_state: 'approved', concept_id: romanticPivot }] },
  targetSense: { concept_links: [{ relation: 'primary', review_state: 'approved', concept_id: romanticPivot }] },
});
assert.equal(pairOk.status, 'exact_pivot_match');

const pairWrong = validateBidirectionalOccurrencePair({
  sourceSense: { concept_links: [{ relation: 'primary', review_state: 'approved', concept_id: romanticPivot }] },
  targetSense: { concept_links: [{ relation: 'primary', review_state: 'approved', concept_id: appointmentPivot }] },
});
assert.equal(pairWrong.status, 'blocked');
assert.equal(pairWrong.reason, 'different_exact_pivots');

assert.equal(OCCURRENCE_EVIDENCE_POLICY.priorOccurrenceCanAuthorize, false);
assert.equal(OCCURRENCE_EVIDENCE_POLICY.translationMemoryCanAuthorize, false);
assert.equal(OCCURRENCE_EVIDENCE_POLICY.semanticRelationCanAuthorize, false);

console.log('✅ Occurrence-sense disambiguation refuses reverse-tag laundering.');
