import { describe, expect, it } from 'vitest';
import { createProgressStore, lessonStatus, milestoneCount, parseProgress, STORAGE_KEY, type StorageLike } from '../src/features/progress/progressStore';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const fixedNow = () => new Date('2026-10-18T10:00:00.000Z');

describe('progress store', () => {
  it('tracks the four milestones separately and derives status', () => {
    const store = createProgressStore(memoryStorage(), fixedNow);
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('not-started');
    store.toggleMilestone('l1', 'conceptUnderstood');
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('in-progress');
    store.toggleMilestone('l1', 'exampleReviewed');
    store.toggleMilestone('l1', 'exerciseCompleted');
    expect(milestoneCount(store.getState().lessons['l1'])).toBe(3);
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('in-progress'); // reading is not mastery
    store.recordAssessment('l1', 4, 5, 0.8);
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('complete');
    store.toggleMilestone('l1', 'conceptUnderstood'); // untick
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('in-progress');
  });

  it('keeps the best assessment attempt and only a quiz can pass it', () => {
    const store = createProgressStore(memoryStorage(), fixedNow);
    expect(store.recordAssessment('l1', 2, 5, 0.8).passed).toBe(false);
    expect(lessonStatus(store.getState().lessons['l1'])).toBe('in-progress');
    store.recordAssessment('l1', 5, 5, 0.8);
    store.recordAssessment('l1', 1, 5, 0.8); // a later failure must not erase the pass
    expect(store.getState().lessons['l1'].assessment).toMatchObject({ passed: true, score: 5 });
    expect(() => store.recordAssessment('l1', 6, 5, 0.8)).toThrow();
  });

  it('persists to storage and reloads', () => {
    const storage = memoryStorage();
    const a = createProgressStore(storage, fixedNow);
    a.toggleBookmark('l2');
    a.visit('l2');
    const b = createProgressStore(storage, fixedNow);
    expect(b.getState().bookmarks).toEqual(['l2']);
    expect(b.getState().lastVisited).toEqual({ lessonId: 'l2', at: '2026-10-18T10:00:00.000Z' });
    b.toggleBookmark('l2');
    expect(b.getState().bookmarks).toEqual([]);
  });

  it('notifies subscribers', () => {
    const store = createProgressStore(memoryStorage(), fixedNow);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.toggleBookmark('x');
    off();
    store.toggleBookmark('x');
    expect(calls).toBe(1);
  });

  it('exports and imports JSON round-trip', () => {
    const a = createProgressStore(memoryStorage(), fixedNow);
    a.toggleMilestone('l1', 'exampleReviewed');
    a.recordAssessment('l1', 3, 4, 0.75);
    a.toggleBookmark('l3');
    const json = a.exportJson();
    const b = createProgressStore(memoryStorage(), fixedNow);
    b.importJson(json);
    expect(b.getState()).toEqual(a.getState());
  });

  it('rejects malformed imports with readable messages and keeps existing state', () => {
    const store = createProgressStore(memoryStorage(), fixedNow);
    store.toggleBookmark('keep');
    expect(() => store.importJson('not json')).toThrow(/valid JSON/);
    expect(() => store.importJson('{"version":2,"lessons":{},"bookmarks":[]}')).toThrow(/version/);
    expect(() => store.importJson('{"version":1,"lessons":[],"bookmarks":[]}')).toThrow(/lessons/);
    expect(() => store.importJson('{"version":1,"lessons":{"a":{"conceptUnderstood":"yesterday"}},"bookmarks":[]}')).toThrow(/ISO/);
    expect(() =>
      store.importJson('{"version":1,"lessons":{"a":{"assessment":{"passed":true,"score":9,"total":5,"at":"2026-01-01T00:00:00Z"}}},"bookmarks":[]}'),
    ).toThrow(/malformed/);
    expect(store.getState().bookmarks).toEqual(['keep']);
  });

  it('starts fresh when stored data is corrupted', () => {
    const store = createProgressStore(memoryStorage({ [STORAGE_KEY]: '{broken' }), fixedNow);
    expect(store.getState().lessons).toEqual({});
  });

  it('de-duplicates bookmarks on import', () => {
    expect(parseProgress('{"version":1,"lessons":{},"bookmarks":["a","a","b"]}').bookmarks).toEqual(['a', 'b']);
  });
});
