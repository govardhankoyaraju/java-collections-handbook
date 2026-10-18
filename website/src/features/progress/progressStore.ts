/**
 * Local-only learning progress (spec §16). Opening or reading a lesson is NOT treated as mastery:
 * four milestones are tracked separately, and "assessment passed" can only be set by the quiz.
 */

export type Milestone = 'conceptUnderstood' | 'exampleReviewed' | 'exerciseCompleted';

export const MILESTONES: { key: Milestone; label: string; hint: string }[] = [
  { key: 'conceptUnderstood', label: 'Concept understood', hint: 'You can explain the idea without the page open.' },
  { key: 'exampleReviewed', label: 'Example reviewed', hint: 'You read (ideally ran) the runnable example and its walkthrough.' },
  { key: 'exerciseCompleted', label: 'Exercise completed', hint: 'You solved the practice exercise yourself before opening the solution.' },
];

export interface AssessmentResult {
  passed: boolean;
  score: number;
  total: number;
  at: string;
}

export interface LessonProgress {
  conceptUnderstood?: string;
  exampleReviewed?: string;
  exerciseCompleted?: string;
  /** Best attempt; a later failed attempt never removes an earlier pass. */
  assessment?: AssessmentResult;
}

export interface ProgressState {
  version: 1;
  lessons: Record<string, LessonProgress>;
  bookmarks: string[];
  lastVisited?: { lessonId: string; at: string };
}

export type LessonStatus = 'not-started' | 'in-progress' | 'complete';

export const STORAGE_KEY = 'jch.progress.v1';

export const emptyState = (): ProgressState => ({ version: 1, lessons: {}, bookmarks: [] });

export function lessonStatus(p: LessonProgress | undefined): LessonStatus {
  if (!p) return 'not-started';
  const done = [p.conceptUnderstood, p.exampleReviewed, p.exerciseCompleted, p.assessment?.passed ? 'y' : undefined];
  const count = done.filter(Boolean).length;
  if (count === 4) return 'complete';
  return count === 0 && !p.assessment ? 'not-started' : 'in-progress';
}

export function milestoneCount(p: LessonProgress | undefined): number {
  if (!p) return 0;
  return [p.conceptUnderstood, p.exampleReviewed, p.exerciseCompleted, p.assessment?.passed ? 'y' : undefined].filter(Boolean)
    .length;
}

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Validates untrusted JSON (imports, corrupted storage). Throws with a readable message. */
export function parseProgress(json: string): ProgressState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('Expected a JSON object.');
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) throw new Error('Unsupported progress file version (expected 1).');
  if (typeof obj.lessons !== 'object' || obj.lessons === null || Array.isArray(obj.lessons)) {
    throw new Error('"lessons" must be an object.');
  }
  if (!Array.isArray(obj.bookmarks) || !obj.bookmarks.every((b) => typeof b === 'string')) {
    throw new Error('"bookmarks" must be an array of lesson ids.');
  }
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, value] of Object.entries(obj.lessons as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) throw new Error(`Progress for "${id}" must be an object.`);
    const v = value as Record<string, unknown>;
    const entry: LessonProgress = {};
    for (const key of ['conceptUnderstood', 'exampleReviewed', 'exerciseCompleted'] as const) {
      if (v[key] !== undefined) {
        if (!isIso(v[key])) throw new Error(`"${id}.${key}" must be an ISO date string.`);
        entry[key] = v[key] as string;
      }
    }
    if (v.assessment !== undefined) {
      const a = v.assessment as Record<string, unknown>;
      if (
        typeof a !== 'object' ||
        a === null ||
        typeof a.passed !== 'boolean' ||
        typeof a.score !== 'number' ||
        typeof a.total !== 'number' ||
        a.score < 0 ||
        a.score > a.total ||
        !isIso(a.at)
      ) {
        throw new Error(`"${id}.assessment" is malformed.`);
      }
      entry.assessment = { passed: a.passed, score: a.score, total: a.total, at: a.at };
    }
    lessons[id] = entry;
  }
  const state: ProgressState = { version: 1, lessons, bookmarks: [...new Set(obj.bookmarks as string[])] };
  const lv = obj.lastVisited as Record<string, unknown> | undefined;
  if (lv && typeof lv.lessonId === 'string' && isIso(lv.at)) state.lastVisited = { lessonId: lv.lessonId, at: lv.at };
  return state;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProgressStore {
  getState(): ProgressState;
  subscribe(listener: () => void): () => void;
  toggleMilestone(lessonId: string, milestone: Milestone): void;
  recordAssessment(lessonId: string, score: number, total: number, passRatio: number): AssessmentResult;
  toggleBookmark(lessonId: string): void;
  visit(lessonId: string): void;
  exportJson(): string;
  importJson(json: string): void;
  reset(): void;
}

export function createProgressStore(storage: StorageLike | undefined, now: () => Date = () => new Date()): ProgressStore {
  let state: ProgressState = emptyState();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = parseProgress(saved);
      } catch {
        state = emptyState(); // corrupted storage: start fresh rather than crash
      }
    }
  }
  const listeners = new Set<() => void>();

  const commit = (next: ProgressState) => {
    state = next;
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    listeners.forEach((l) => l());
  };

  const updateLesson = (id: string, fn: (p: LessonProgress) => LessonProgress) =>
    commit({ ...state, lessons: { ...state.lessons, [id]: fn({ ...(state.lessons[id] ?? {}) }) } });

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toggleMilestone(lessonId, milestone) {
      updateLesson(lessonId, (p) => {
        if (p[milestone]) delete p[milestone];
        else p[milestone] = now().toISOString();
        return p;
      });
    },
    recordAssessment(lessonId, score, total, passRatio) {
      if (total <= 0 || score < 0 || score > total) throw new Error('Invalid assessment score');
      const result: AssessmentResult = { passed: score / total >= passRatio, score, total, at: now().toISOString() };
      updateLesson(lessonId, (p) => {
        const previous = p.assessment;
        const keepPrevious = previous && (previous.passed && !result.passed || (previous.passed === result.passed && previous.score > result.score));
        if (!keepPrevious) p.assessment = result;
        return p;
      });
      return result;
    },
    toggleBookmark(lessonId) {
      const has = state.bookmarks.includes(lessonId);
      commit({ ...state, bookmarks: has ? state.bookmarks.filter((b) => b !== lessonId) : [...state.bookmarks, lessonId] });
    },
    visit(lessonId) {
      commit({ ...state, lastVisited: { lessonId, at: now().toISOString() } });
    },
    exportJson() {
      return JSON.stringify(state, null, 2);
    },
    importJson(json) {
      commit(parseProgress(json));
    },
    reset() {
      commit(emptyState());
    },
  };
}
