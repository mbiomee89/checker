import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { alreadyLoggedInspectionObservation } from '../services/correctiveActions.js';

describe('alreadyLoggedInspectionObservation', () => {
  it('returns false for empty description', () => {
    assert.equal(alreadyLoggedInspectionObservation(null, 12), false);
    assert.equal(alreadyLoggedInspectionObservation('', 12), false);
  });

  it('returns true when this inspection already logged the finding', () => {
    const desc = '[6 Aug, Ada]: Auto-opened from inspection #12 — "Broken lock" observed';
    assert.equal(alreadyLoggedInspectionObservation(desc, 12), true);
  });

  it('returns true for Still observed notes from the same inspection', () => {
    const desc = '[6 Aug, Ada]: Still observed on inspection #12';
    assert.equal(alreadyLoggedInspectionObservation(desc, 12), true);
  });

  it('returns false for a different inspection id', () => {
    const desc = '[6 Aug, Ada]: Auto-opened from inspection #11 — "Broken lock" observed';
    assert.equal(alreadyLoggedInspectionObservation(desc, 12), false);
  });
});

describe('reopen eligibility rules (documented)', () => {
  function canReopen({ status, inspectorId, userId, otherDraftExists }) {
    if (inspectorId !== userId) return { ok: false, reason: 'forbidden' };
    if (status !== 'SUBMITTED') return { ok: false, reason: 'not-submitted' };
    if (otherDraftExists) return { ok: false, reason: 'other-draft' };
    return { ok: true };
  }

  it('allows owner to reopen a submitted inspection with no other draft', () => {
    assert.deepEqual(
      canReopen({ status: 'SUBMITTED', inspectorId: 1, userId: 1, otherDraftExists: false }),
      { ok: true },
    );
  });

  it('forbids non-owner', () => {
    assert.equal(
      canReopen({ status: 'SUBMITTED', inspectorId: 1, userId: 2, otherDraftExists: false }).reason,
      'forbidden',
    );
  });

  it('rejects non-submitted', () => {
    assert.equal(
      canReopen({ status: 'DRAFT', inspectorId: 1, userId: 1, otherDraftExists: false }).reason,
      'not-submitted',
    );
  });

  it('rejects when another draft exists for the room', () => {
    assert.equal(
      canReopen({ status: 'SUBMITTED', inspectorId: 1, userId: 1, otherDraftExists: true }).reason,
      'other-draft',
    );
  });
});

describe('discard draft outcome (documented)', () => {
  function discardOutcome({ status, reopened }) {
    if (status !== 'DRAFT') return { ok: false, reason: 'not-draft' };
    if (reopened) return { ok: true, nextStatus: 'SUBMITTED', reopened: false };
    return { ok: true, nextStatus: 'CANCELLED' };
  }

  it('cancels a brand-new draft', () => {
    assert.deepEqual(discardOutcome({ status: 'DRAFT', reopened: false }), {
      ok: true,
      nextStatus: 'CANCELLED',
    });
  });

  it('restores SUBMITTED when discarding a reopened draft', () => {
    assert.deepEqual(discardOutcome({ status: 'DRAFT', reopened: true }), {
      ok: true,
      nextStatus: 'SUBMITTED',
      reopened: false,
    });
  });

  it('rejects non-draft', () => {
    assert.equal(discardOutcome({ status: 'SUBMITTED', reopened: false }).reason, 'not-draft');
  });
});
