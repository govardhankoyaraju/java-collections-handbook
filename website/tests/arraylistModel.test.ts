import { describe, expect, it } from 'vitest';
import * as AL from '../src/visualizations/arraylist/model';

describe('ArrayList model (cross-checked with ArrayListGrowthDemo on JDK 25)', () => {
  it('grows a default-constructed list 0 → 10 → 15 → 22 → 33 → 49 → 73', () => {
    expect(AL.capacitySequence(50)).toEqual([0, 10, 15, 22, 33, 49, 73]);
  });

  it('grows new ArrayList<>(0) by one at first: 1, 2, 3, 4, 6', () => {
    expect(AL.capacitySequence(6, 0)).toEqual([0, 1, 2, 3, 4, 6]);
  });

  it('shifts on positional insert and remove', () => {
    let s = AL.create(4);
    for (const v of ['A', 'B', 'C']) s = AL.add(s, v).state;
    const ins = AL.addAt(s, 0, 'X');
    expect(ins.state.elements).toEqual(['X', 'A', 'B', 'C']);
    expect(ins.events.some((e) => e.includes('shifts 3'))).toBe(true);
    const rem = AL.removeAt(ins.state, 1);
    expect(rem.state.elements).toEqual(['X', 'B', 'C']);
    expect(rem.state.capacity).toBe(4);
  });

  it('implements ensureCapacity, addAll and trimToSize like OpenJDK', () => {
    let s = AL.create();
    expect(AL.ensureCapacity(s, 5).state.capacity).toBe(0); // no-op for pristine default list
    for (let i = 0; i < 11; i++) s = AL.add(s, `E${i}`).state;
    expect(s.capacity).toBe(15);
    s = AL.addAll(s, Array.from({ length: 30 }, (_, i) => `B${i}`)).state;
    expect(s.capacity).toBe(41);
    s = AL.ensureCapacity(s, 50).state;
    expect(s.capacity).toBe(61);
    for (let i = 0; i < 20; i++) s = AL.removeAt(s, 0).state;
    expect([s.elements.length, s.capacity]).toEqual([21, 61]);
    s = AL.trimToSize(s).state;
    expect(s.capacity).toBe(21);
  });

  it('counts copies: about 2.4 per element for one million appends', () => {
    let copies = 0;
    let cap = 0;
    let pristine = true;
    for (let size = 0; size < 1_000_000; size++) {
      if (size === cap) {
        if (!pristine) copies += size;
        cap = AL.newCapacity(cap, size + 1, pristine);
        pristine = false;
      }
    }
    expect(copies).toBe(2430972); // identical to ArrayListGrowthDemo's output
  });

  it('rejects bad indexes and capacities', () => {
    const s = AL.create();
    expect(() => AL.addAt(s, 1, 'x')).toThrow(/IndexOutOfBounds/);
    expect(() => AL.removeAt(s, 0)).toThrow(/IndexOutOfBounds/);
    expect(() => AL.create(-1)).toThrow();
  });
});
