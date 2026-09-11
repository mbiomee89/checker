import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import {
  INSPECTOR_CAMP_STORAGE_KEY,
  readRememberedInspectorCampId,
  rememberInspectorCampId,
  resolveInspectorCampId,
  roomsPathForCamp,
} from './inspectorCamp.ts';

const camps = [
  { id: 10, name: 'Alpha', location: null },
  { id: 20, name: 'Beta', location: 'Site B' },
];

before(() => {
  if (typeof globalThis.sessionStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

afterEach(() => {
  sessionStorage.removeItem(INSPECTOR_CAMP_STORAGE_KEY);
});

describe('resolveInspectorCampId', () => {
  it('returns null when there are no camps', () => {
    assert.equal(resolveInspectorCampId([], '10'), null);
  });

  it('prefers a valid URL campId', () => {
    rememberInspectorCampId(10);
    assert.equal(resolveInspectorCampId(camps, '20'), 20);
  });

  it('falls back to sessionStorage when URL is missing', () => {
    rememberInspectorCampId(20);
    assert.equal(resolveInspectorCampId(camps, null), 20);
    assert.equal(resolveInspectorCampId(camps, ''), 20);
  });

  it('falls back to sessionStorage when URL is invalid', () => {
    rememberInspectorCampId(20);
    assert.equal(resolveInspectorCampId(camps, '999'), 20);
    assert.equal(resolveInspectorCampId(camps, 'abc'), 20);
  });

  it('falls back to the first camp when URL and storage miss', () => {
    assert.equal(resolveInspectorCampId(camps, null), 10);
  });

  it('ignores remembered ids that are not in camps', () => {
    rememberInspectorCampId(99);
    assert.equal(resolveInspectorCampId(camps, null), 10);
  });
});

describe('rememberInspectorCampId / readRememberedInspectorCampId', () => {
  it('round-trips a positive id', () => {
    rememberInspectorCampId(20);
    assert.equal(readRememberedInspectorCampId(), 20);
  });
});

describe('roomsPathForCamp', () => {
  it('builds the rooms query path', () => {
    assert.equal(roomsPathForCamp(20), '/rooms?campId=20');
  });
});
