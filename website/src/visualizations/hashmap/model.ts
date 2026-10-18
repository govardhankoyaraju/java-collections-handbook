/**
 * Educational model of java.util.HashMap (OpenJDK 8–25 algorithm, verified against JDK 25 source).
 *
 * Faithful: String.hashCode / Integer.hashCode, hash spreading, (n - 1) & hash indexing, lazy table
 * allocation, tableSizeFor, threshold arithmetic, tail insertion by put, the treeify rule
 * (chain reaching 9 nodes and table >= 64, otherwise resize), and the lo/hi split on resize.
 * Simplified: tree bins are shown as a list (the red-black tree shape and its compareTo ordering are
 * not drawn), and removal untreeifies at <= 6 nodes (the JDK uses a structural heuristic).
 */

export const DEFAULT_INITIAL_CAPACITY = 16;
export const MAXIMUM_CAPACITY = 1 << 30;
export const TREEIFY_THRESHOLD = 8;
export const UNTREEIFY_THRESHOLD = 6;
export const MIN_TREEIFY_CAPACITY = 64;

export type KeyMode = 'string' | 'integer';

export interface Entry {
  key: string;
  value: string;
  /** Spread hash, as stored in Node.hash. */
  hash: number;
}

export interface Bucket {
  entries: Entry[];
  tree: boolean;
}

export interface MapState {
  keyMode: KeyMode;
  loadFactor: number;
  /** Table length; 0 until the first insertion allocates the table. */
  capacity: number;
  /** Before allocation: requested initial capacity (or 0 for defaults). After: capacity * loadFactor. */
  threshold: number;
  size: number;
  buckets: Bucket[];
}

export type FrameKind = 'info' | 'compare' | 'insert' | 'replace' | 'resize' | 'treeify' | 'found' | 'missing' | 'remove';

export interface Frame {
  kind: FrameKind;
  message: string;
  state: MapState;
  bucket?: number;
  key?: string;
}

/** Java's String.hashCode(): s[0]*31^(n-1) + ... + s[n-1], with 32-bit int overflow. */
export function stringHashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export function parseIntegerKey(text: string): number | null {
  if (!/^-?\d{1,10}$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return n >= -2147483648 && n <= 2147483647 ? n : null;
}

/** Canonical display form of a key ("007" and "7" are the same Integer). */
export function normalizeKey(key: string, mode: KeyMode): string {
  if (mode === 'integer') {
    const n = parseIntegerKey(key);
    if (n === null) throw new Error(`"${key}" is not a Java int`);
    return String(n);
  }
  return key;
}

export function keyHashCode(key: string, mode: KeyMode): number {
  if (mode === 'integer') {
    const n = parseIntegerKey(key);
    if (n === null) throw new Error(`"${key}" is not a Java int`);
    return n | 0; // Integer.hashCode() is the value itself
  }
  return stringHashCode(key);
}

/** HashMap.hash(): h ^ (h >>> 16). */
export function spread(h: number): number {
  return (h ^ (h >>> 16)) | 0;
}

export function bucketIndex(hash: number, capacity: number): number {
  return (capacity - 1) & hash;
}

/** HashMap.tableSizeFor: the smallest power of two >= cap (1 for cap <= 1). */
export function tableSizeFor(cap: number): number {
  if (cap <= 1) return 1;
  let n = 1;
  while (n < cap && n < MAXIMUM_CAPACITY) n <<= 1;
  return n;
}

export function toBinary32(n: number): string {
  return (n >>> 0).toString(2).padStart(32, '0');
}

export function createMap(options: { initialCapacity?: number; loadFactor?: number; keyMode?: KeyMode } = {}): MapState {
  const loadFactor = options.loadFactor ?? 0.75;
  if (!(loadFactor > 0) || !Number.isFinite(loadFactor)) throw new Error('Illegal load factor');
  if (options.initialCapacity !== undefined && options.initialCapacity < 0) throw new Error('Illegal initial capacity');
  return {
    keyMode: options.keyMode ?? 'string',
    loadFactor,
    capacity: 0,
    threshold: options.initialCapacity === undefined ? 0 : tableSizeFor(Math.min(options.initialCapacity, MAXIMUM_CAPACITY)),
    size: 0,
    buckets: [],
  };
}

const clone = (s: MapState): MapState => ({
  ...s,
  buckets: s.buckets.map((b) => ({ tree: b.tree, entries: b.entries.map((e) => ({ ...e })) })),
});

/** HashMap.resize(): allocate or double, then split every bucket into lo/hi lists. Mutates `s`. */
function resize(s: MapState): string {
  const oldCap = s.capacity;
  const oldThr = s.threshold;
  let newCap: number;
  let newThr = 0;
  if (oldCap > 0) {
    if (oldCap >= MAXIMUM_CAPACITY) {
      s.threshold = 2147483647;
      return 'Table already at maximum capacity; threshold set to Integer.MAX_VALUE.';
    }
    newCap = oldCap << 1;
    if (newCap < MAXIMUM_CAPACITY && oldCap >= DEFAULT_INITIAL_CAPACITY) newThr = oldThr << 1;
  } else if (oldThr > 0) {
    newCap = oldThr;
  } else {
    newCap = DEFAULT_INITIAL_CAPACITY;
    newThr = Math.trunc(0.75 * DEFAULT_INITIAL_CAPACITY);
  }
  if (newThr === 0) {
    const ft = Math.fround(newCap * s.loadFactor);
    newThr = newCap < MAXIMUM_CAPACITY && ft < MAXIMUM_CAPACITY ? Math.trunc(ft) : 2147483647;
  }
  const old = s.buckets;
  const fresh: Bucket[] = Array.from({ length: newCap }, () => ({ entries: [], tree: false }));
  const moves: string[] = [];
  for (let j = 0; j < oldCap; j++) {
    const b = old[j];
    if (!b || b.entries.length === 0) continue;
    if (b.entries.length === 1) {
      const e = b.entries[0];
      fresh[e.hash & (newCap - 1)] = { entries: [e], tree: false };
      continue;
    }
    const lo = b.entries.filter((e) => (e.hash & oldCap) === 0);
    const hi = b.entries.filter((e) => (e.hash & oldCap) !== 0);
    const keepTree = (part: Entry[]) => b.tree && part.length > UNTREEIFY_THRESHOLD;
    if (lo.length) fresh[j] = { entries: lo, tree: keepTree(lo) };
    if (hi.length) fresh[j + oldCap] = { entries: hi, tree: keepTree(hi) };
    if (hi.length) moves.push(`bucket ${j} → lo ${j} (${lo.length}) / hi ${j + oldCap} (${hi.length})`);
  }
  s.capacity = newCap;
  s.threshold = newThr;
  s.buckets = fresh;
  if (oldCap === 0) return `Table allocated lazily: capacity ${newCap}, threshold ${newThr}.`;
  const split = moves.length ? ` Split: ${moves.slice(0, 6).join('; ')}${moves.length > 6 ? `; … ${moves.length - 6} more` : ''}.` : ' No chain needed to move.';
  return `Resized ${oldCap} → ${newCap}, threshold ${newThr}. Each node stays at j or moves to j + ${oldCap} depending on (hash & ${oldCap}).${split}`;
}

function hashFrames(key: string, s: MapState, frames: Frame[]): number {
  const h = keyHashCode(key, s.keyMode);
  const hash = spread(h);
  frames.push({
    kind: 'info',
    key,
    state: clone(s),
    message:
      s.keyMode === 'string'
        ? `"${key}".hashCode() = ${h}. Spread: h ^ (h >>> 16) = ${hash}.`
        : `Integer.valueOf(${key}).hashCode() = ${h}. Spread: h ^ (h >>> 16) = ${hash}.`,
  });
  return hash;
}

export function put(state: MapState, key: string, value: string): Frame[] {
  const s = clone(state);
  key = normalizeKey(key, s.keyMode);
  const frames: Frame[] = [];
  const hash = hashFrames(key, s, frames);
  if (s.capacity === 0) {
    const msg = resize(s);
    frames.push({ kind: 'resize', state: clone(s), message: msg });
  }
  const i = bucketIndex(hash, s.capacity);
  const bucket = s.buckets[i];
  frames.push({ kind: 'info', bucket: i, key, state: clone(s), message: `Index = (${s.capacity} - 1) & ${hash} = ${i}.` });

  for (const e of bucket.entries) {
    const sameHash = e.hash === hash;
    const equal = sameHash && e.key === key;
    frames.push({
      kind: 'compare',
      bucket: i,
      key: e.key,
      state: clone(s),
      message: sameHash
        ? `Compare with "${e.key}": hashes equal → equals() is ${equal}.`
        : `Compare with "${e.key}": hash ${e.hash} ≠ ${hash}, so equals() is never called.`,
    });
    if (equal) {
      const old = e.value;
      e.value = value;
      frames.push({ kind: 'replace', bucket: i, key, state: clone(s), message: `Existing key: value replaced, put() returns "${old}". Size stays ${s.size}.` });
      return frames;
    }
  }

  const wasEmpty = bucket.entries.length === 0;
  bucket.entries.push({ key, value, hash });
  frames.push({
    kind: 'insert',
    bucket: i,
    key,
    state: clone(s),
    message: wasEmpty
      ? `Bucket ${i} was empty: new Node stored directly in table[${i}].`
      : bucket.tree
        ? `Tree bin: new TreeNode inserted (red-black tree, O(log n) for comparable keys).`
        : `Collision: new Node appended to the tail of the chain (length ${bucket.entries.length}).`,
  });

  if (!bucket.tree && bucket.entries.length > TREEIFY_THRESHOLD) {
    if (s.capacity < MIN_TREEIFY_CAPACITY) {
      const msg = resize(s);
      frames.push({ kind: 'resize', state: clone(s), message: `Chain reached ${TREEIFY_THRESHOLD + 1} nodes but table < ${MIN_TREEIFY_CAPACITY}: treeifyBin() resizes instead. ${msg}` });
    } else {
      bucket.tree = true;
      frames.push({ kind: 'treeify', bucket: i, state: clone(s), message: `Chain reached ${TREEIFY_THRESHOLD + 1} nodes and table ≥ ${MIN_TREEIFY_CAPACITY}: bin ${i} converted to a red-black tree of TreeNodes.` });
    }
  }

  s.size++;
  if (s.size > s.threshold) {
    const msg = resize(s);
    frames.push({ kind: 'resize', state: clone(s), message: `size ${s.size} > threshold → ${msg}` });
  } else {
    frames.push({ kind: 'info', state: clone(s), message: `size = ${s.size} (threshold ${s.threshold}). put() returns null.` });
  }
  return frames;
}

export function get(state: MapState, key: string): Frame[] {
  const s = clone(state);
  key = normalizeKey(key, s.keyMode);
  const frames: Frame[] = [];
  const hash = hashFrames(key, s, frames);
  if (s.capacity === 0) {
    frames.push({ kind: 'missing', state: clone(s), message: 'Table not allocated yet: get() returns null.' });
    return frames;
  }
  const i = bucketIndex(hash, s.capacity);
  frames.push({ kind: 'info', bucket: i, state: clone(s), message: `Index = (${s.capacity} - 1) & ${hash} = ${i}.` });
  for (const e of s.buckets[i].entries) {
    const equal = e.hash === hash && e.key === key;
    frames.push({ kind: 'compare', bucket: i, key: e.key, state: clone(s), message: `Compare with "${e.key}": ${e.hash === hash ? `hashes equal, equals() is ${equal}` : 'different hash, skipped'}.` });
    if (equal) {
      frames.push({ kind: 'found', bucket: i, key, state: clone(s), message: `Found: get() returns "${e.value}".` });
      return frames;
    }
  }
  frames.push({ kind: 'missing', bucket: i, state: clone(s), message: `Not found in bucket ${i}: get() returns null.` });
  return frames;
}

export function remove(state: MapState, key: string): Frame[] {
  const s = clone(state);
  key = normalizeKey(key, s.keyMode);
  const frames: Frame[] = [];
  const hash = hashFrames(key, s, frames);
  if (s.capacity === 0) {
    frames.push({ kind: 'missing', state: clone(s), message: 'Empty map: remove() returns null.' });
    return frames;
  }
  const i = bucketIndex(hash, s.capacity);
  const bucket = s.buckets[i];
  frames.push({ kind: 'info', bucket: i, state: clone(s), message: `Index = ${i}.` });
  const pos = bucket.entries.findIndex((e) => e.hash === hash && e.key === key);
  if (pos < 0) {
    frames.push({ kind: 'missing', bucket: i, state: clone(s), message: `No mapping for "${key}": remove() returns null.` });
    return frames;
  }
  const [removed] = bucket.entries.splice(pos, 1);
  s.size--;
  let msg = `Unlinked "${key}" (${pos === 0 ? 'table slot now points to the next node' : 'predecessor.next skips it'}). size = ${s.size}. remove() returns "${removed.value}". The table never shrinks.`;
  if (bucket.tree && bucket.entries.length <= UNTREEIFY_THRESHOLD) {
    bucket.tree = false;
    msg += ' Tree bin became small and was converted back to a list (model: ≤ 6 nodes; the JDK uses a structural check).';
  }
  frames.push({ kind: 'remove', bucket: i, key, state: clone(s), message: msg });
  return frames;
}

/** Keys whose String.hashCode() collide: every combination of "Aa"/"BB" blocks. */
export function collidingStrings(blocks: number): string[] {
  let out = [''];
  for (let i = 0; i < blocks; i++) out = out.flatMap((p) => [p + 'Aa', p + 'BB']);
  return out;
}

export function finalState(frames: Frame[], fallback: MapState): MapState {
  return frames.length ? frames[frames.length - 1].state : fallback;
}
