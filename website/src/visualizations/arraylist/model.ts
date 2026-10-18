/**
 * Educational model of java.util.ArrayList's backing array (OpenJDK 17–25 growth policy:
 * newCapacity = old + max(minGrowth, old >> 1); a default-constructed list allocates 10 on first add).
 * Verified against Temurin 25 by java-examples ListExamplesTest.growthModelMatchesRunningJdk.
 */

export const DEFAULT_CAPACITY = 10;
export const SOFT_MAX_ARRAY_LENGTH = 2147483647 - 8;

export interface ArrayListState {
  elements: string[];
  capacity: number;
  /** true while a `new ArrayList<>()` still shares DEFAULTCAPACITY_EMPTY_ELEMENTDATA. */
  pristineDefault: boolean;
  modCount: number;
  copies: number;
  resizes: number;
}

export interface OpResult {
  state: ArrayListState;
  events: string[];
  /** Indexes touched by the last operation (for highlighting). */
  touched: number[];
}

export function create(initialCapacity?: number): ArrayListState {
  if (initialCapacity !== undefined && (initialCapacity < 0 || !Number.isInteger(initialCapacity))) {
    throw new Error(`Illegal Capacity: ${initialCapacity}`);
  }
  return {
    elements: [],
    capacity: initialCapacity ?? 0,
    pristineDefault: initialCapacity === undefined,
    modCount: 0,
    copies: 0,
    resizes: 0,
  };
}

export function newCapacity(old: number, minCapacity: number, pristineDefault: boolean): number {
  if (old === 0 && pristineDefault) return Math.max(DEFAULT_CAPACITY, minCapacity);
  const pref = old + Math.max(minCapacity - old, old >> 1);
  if (pref > 0 && pref <= SOFT_MAX_ARRAY_LENGTH) return pref;
  const min = old + (minCapacity - old);
  if (min > 2147483647) throw new Error('OutOfMemoryError: Required array length too large');
  return Math.max(min, SOFT_MAX_ARRAY_LENGTH);
}

function grow(s: ArrayListState, minCapacity: number, events: string[]) {
  const old = s.capacity;
  const next = newCapacity(old, minCapacity, s.pristineDefault);
  if (old === 0 && s.pristineDefault) {
    events.push(`First allocation: new Object[${next}] (DEFAULT_CAPACITY ${DEFAULT_CAPACITY}). Nothing to copy.`);
  } else {
    events.push(`Grow ${old} → ${next}: Arrays.copyOf allocates a new array and copies ${s.elements.length} reference(s); the old array becomes garbage.`);
    s.copies += s.elements.length;
  }
  s.capacity = next;
  s.resizes++;
  s.pristineDefault = false;
}

const copy = (s: ArrayListState): ArrayListState => ({ ...s, elements: [...s.elements] });

export function add(state: ArrayListState, value: string): OpResult {
  return addAt(state, state.elements.length, value);
}

export function addAt(state: ArrayListState, index: number, value: string): OpResult {
  const s = copy(state);
  const events: string[] = [];
  if (index < 0 || index > s.elements.length) {
    throw new RangeError(`IndexOutOfBoundsException: Index: ${index}, Size: ${s.elements.length}`);
  }
  s.modCount++;
  if (s.elements.length === s.capacity) grow(s, s.elements.length + 1, events);
  const shifted = s.elements.length - index;
  if (shifted > 0) events.push(`System.arraycopy shifts ${shifted} element(s) one slot right (indexes ${index}..${s.elements.length - 1}).`);
  s.elements.splice(index, 0, value);
  events.push(`elementData[${index}] = "${value}"; size = ${s.elements.length}.`);
  const touched = Array.from({ length: shifted + 1 }, (_, k) => index + k);
  return { state: s, events, touched };
}

/** addAll(c) appended at the end: grows at most once, to max(needed, 1.5 × old). */
export function addAll(state: ArrayListState, values: string[]): OpResult {
  const s = copy(state);
  const events: string[] = [];
  s.modCount++;
  if (values.length === 0) return { state: s, events: ['addAll of an empty collection returns false; nothing changes.'], touched: [] };
  const needed = s.elements.length + values.length;
  if (needed > s.capacity) grow(s, needed, events);
  const start = s.elements.length;
  s.elements.push(...values);
  events.push(`addAll copies ${values.length} reference(s) with one System.arraycopy; size = ${s.elements.length}.`);
  return { state: s, events, touched: Array.from({ length: values.length }, (_, k) => start + k) };
}

export function removeAt(state: ArrayListState, index: number): OpResult {
  const s = copy(state);
  if (index < 0 || index >= s.elements.length) {
    throw new RangeError(`IndexOutOfBoundsException: Index ${index} out of bounds for length ${s.elements.length}`);
  }
  s.modCount++;
  const removed = s.elements[index];
  const shifted = s.elements.length - 1 - index;
  s.elements.splice(index, 1);
  const events = [
    `remove(${index}) returns "${removed}".`,
    shifted > 0 ? `System.arraycopy shifts ${shifted} element(s) one slot left.` : 'Last element: no shifting needed.',
    `elementData[${s.elements.length}] = null (lets the GC reclaim the reference); capacity stays ${s.capacity}.`,
  ];
  return { state: s, events, touched: Array.from({ length: shifted }, (_, k) => index + k) };
}

export function ensureCapacity(state: ArrayListState, minCapacity: number): OpResult {
  const s = copy(state);
  const events: string[] = [];
  if (minCapacity > s.capacity && !(s.pristineDefault && minCapacity <= DEFAULT_CAPACITY)) {
    s.modCount++;
    grow(s, minCapacity, events);
  } else {
    events.push(`ensureCapacity(${minCapacity}) is a no-op: capacity ${s.capacity}${s.pristineDefault && minCapacity <= DEFAULT_CAPACITY ? ' and the first add will allocate 10 anyway' : ' is already enough'}.`);
  }
  return { state: s, events, touched: [] };
}

export function trimToSize(state: ArrayListState): OpResult {
  const s = copy(state);
  s.modCount++;
  const events: string[] = [];
  if (s.elements.length < s.capacity) {
    events.push(`trimToSize(): capacity ${s.capacity} → ${s.elements.length}${s.elements.length > 0 ? ` (copies ${s.elements.length} reference(s))` : ' (shared empty array)'}.`);
    s.copies += s.elements.length;
    s.capacity = s.elements.length;
    s.pristineDefault = false;
  } else {
    events.push('trimToSize(): already exact, nothing to do.');
  }
  return { state: s, events, touched: [] };
}

export function clear(state: ArrayListState): OpResult {
  const s = copy(state);
  s.modCount++;
  const n = s.elements.length;
  s.elements = [];
  return { state: s, events: [`clear(): nulls ${n} slot(s); size = 0; capacity stays ${s.capacity}.`], touched: [] };
}

/** Capacities observed while appending n elements (first entry is the starting capacity). */
export function capacitySequence(n: number, initialCapacity?: number): number[] {
  let s = create(initialCapacity);
  const seq = [s.capacity];
  for (let i = 0; i < n; i++) {
    s = add(s, String(i)).state;
    if (s.capacity !== seq[seq.length - 1]) seq.push(s.capacity);
  }
  return seq;
}
