import { describe, expect, it } from 'vitest';
import * as HM from '../src/visualizations/hashmap/model';

const run = (state: HM.MapState, keys: (string | number)[]) =>
  keys.reduce((s, k) => HM.finalState(HM.put(s, String(k), `v${k}`), s), state);

describe('HashMap model — hashing (cross-checked with java-examples expected output)', () => {
  it('reproduces Java String.hashCode, spreading and indexing', () => {
    expect(HM.stringHashCode('customer:42')).toBe(-1772098662);
    expect(HM.spread(-1772098662)).toBe(-1772126779);
    expect(HM.bucketIndex(-1772126779, 16)).toBe(5);
    expect(HM.stringHashCode('ORD-1001')).toBe(1993768940);
    expect(HM.spread(1993768940)).toBe(1993738554);
    expect(HM.bucketIndex(1993738554, 16)).toBe(10);
    expect(HM.stringHashCode('Aa')).toBe(2112);
    expect(HM.stringHashCode('BB')).toBe(2112);
    expect(HM.stringHashCode('')).toBe(0);
  });

  it('generates colliding strings', () => {
    const keys = HM.collidingStrings(3);
    expect(keys).toHaveLength(8);
    expect(new Set(keys.map(HM.stringHashCode)).size).toBe(1);
  });

  it('rounds table sizes like tableSizeFor', () => {
    expect(HM.tableSizeFor(0)).toBe(1);
    expect(HM.tableSizeFor(1)).toBe(1);
    expect(HM.tableSizeFor(10)).toBe(16);
    expect(HM.tableSizeFor(100)).toBe(128);
    expect(HM.tableSizeFor(134)).toBe(256);
  });

  it('normalises integer keys and rejects non-ints', () => {
    expect(HM.normalizeKey('007', 'integer')).toBe('7');
    expect(() => HM.normalizeKey('x', 'integer')).toThrow();
    expect(() => HM.normalizeKey('2147483648', 'integer')).toThrow();
    expect(HM.keyHashCode('-5', 'integer')).toBe(-5);
  });
});

describe('HashMap model — structure', () => {
  it('allocates lazily and resizes at the 13th entry', () => {
    let m = HM.createMap({ keyMode: 'integer' });
    expect(m.capacity).toBe(0);
    m = run(m, Array.from({ length: 12 }, (_, i) => i + 1));
    expect([m.capacity, m.threshold, m.size]).toEqual([16, 12, 12]);
    m = run(m, [13]);
    expect([m.capacity, m.threshold]).toEqual([32, 24]);
    m = run(m, Array.from({ length: 84 }, (_, i) => i + 14)); // 97 entries
    expect([m.capacity, m.threshold]).toEqual([256, 192]);
  });

  it('honours an initial capacity hint like new HashMap<>(100) and the 0 edge case', () => {
    let m = HM.createMap({ initialCapacity: 100, keyMode: 'integer' });
    m = run(m, [1]);
    expect([m.capacity, m.threshold]).toEqual([128, 96]);
    let z = HM.createMap({ initialCapacity: 0, keyMode: 'integer' });
    z = run(z, [1]);
    expect(z.capacity).toBe(2); // 1-slot table with threshold 0 resizes immediately, as in JDK 25
  });

  it('appends collisions at the tail and splits lo/hi on resize (same as HashMapInternalsTest)', () => {
    let m = HM.createMap({ initialCapacity: 16, keyMode: 'integer' });
    m = run(m, [5, 21, 37, 53]);
    expect(m.buckets[5].entries.map((e) => e.key)).toEqual(['5', '21', '37', '53']);
    m = run(m, [200, 201, 202, 203, 204, 205, 206, 207, 208]);
    expect(m.capacity).toBe(32);
    expect(m.buckets[5].entries.map((e) => e.key)).toEqual(['5', '37']);
    expect(m.buckets[21].entries.map((e) => e.key)).toEqual(['21', '53']);
  });

  it('resizes instead of treeifying below 64 buckets, then treeifies (same as TreeificationDemo)', () => {
    const keys = HM.collidingStrings(4);
    let m = HM.createMap();
    const caps: number[] = [];
    const trees: boolean[] = [];
    for (const k of keys.slice(0, 11)) {
      m = HM.finalState(HM.put(m, k, 'x'), m);
      caps.push(m.capacity);
      trees.push(m.buckets.some((b) => b.tree));
    }
    expect(caps).toEqual([16, 16, 16, 16, 16, 16, 16, 16, 32, 64, 64]);
    expect(trees.lastIndexOf(false)).toBe(9);
    expect(trees[10]).toBe(true);
  });

  it('replaces values without changing size, and get/remove find colliding keys', () => {
    let m = HM.createMap();
    m = HM.finalState(HM.put(m, 'Aa', '1'), m);
    m = HM.finalState(HM.put(m, 'BB', '2'), m);
    const replace = HM.put(m, 'Aa', '3');
    expect(replace.at(-1)!.kind).toBe('replace');
    m = HM.finalState(replace, m);
    expect(m.size).toBe(2);
    const found = HM.get(m, 'BB');
    expect(found.at(-1)!.kind).toBe('found');
    expect(found.some((f) => f.kind === 'compare' && f.key === 'Aa')).toBe(true);
    expect(HM.get(m, 'Ab').at(-1)!.kind).toBe('missing');
    m = HM.finalState(HM.remove(m, 'Aa'), m);
    expect(m.size).toBe(1);
    expect(m.capacity).toBe(16); // never shrinks
    expect(HM.remove(m, 'zzz').at(-1)!.kind).toBe('missing');
  });

  it('never mutates the input state', () => {
    const m = HM.createMap();
    const frozen = JSON.stringify(m);
    HM.put(m, 'a', 'b');
    expect(JSON.stringify(m)).toBe(frozen);
  });

  it('validates configuration', () => {
    expect(() => HM.createMap({ loadFactor: 0 })).toThrow();
    expect(() => HM.createMap({ initialCapacity: -1 })).toThrow();
  });
});
