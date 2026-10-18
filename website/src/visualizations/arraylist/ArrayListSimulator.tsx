import { useState } from 'react';
import { ModelNotice, VizFrame, btn, btnPrimary, input } from '../ModelNotice';
import * as AL from './model';

const MAX_SLOTS_DRAWN = 120;

export default function ArrayListSimulator() {
  const [ctor, setCtor] = useState<'default' | 'sized'>('default');
  const [initial, setInitial] = useState(4);
  const [state, setState] = useState<AL.ArrayListState>(() => AL.create());
  const [log, setLog] = useState<string[]>(['new ArrayList<>(): elementData is a shared empty array, capacity 0.']);
  const [touched, setTouched] = useState<number[]>([]);
  const [value, setValue] = useState('A');
  const [index, setIndex] = useState(0);
  const [ensure, setEnsure] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);
  const [bulk, setBulk] = useState(10);

  const apply = (fn: () => AL.OpResult) => {
    try {
      const r = fn();
      setState(r.state);
      setTouched(r.touched);
      setLog((l) => [...r.events, ...l].slice(0, 40));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const nextValue = () => {
    const v = value.trim() || `E${counter}`;
    setCounter((c) => c + 1);
    setValue(`E${counter + 1}`);
    return v;
  };

  const reset = () => {
    const s = ctor === 'default' ? AL.create() : AL.create(initial);
    setState(s);
    setTouched([]);
    setError(null);
    setLog([ctor === 'default' ? 'new ArrayList<>(): capacity 0 until the first add.' : `new ArrayList<>(${initial}): new Object[${initial}].`]);
  };

  const size = state.elements.length;
  const drawn = Math.min(state.capacity, MAX_SLOTS_DRAWN);
  const fill = state.capacity === 0 ? 0 : Math.round((size / state.capacity) * 100);

  return (
    <VizFrame id="arraylist-sim" title="ArrayList capacity and resizing simulator">
      <ModelNotice>
        It replays OpenJDK 17–25&apos;s growth rule (new = old + max(needed, old/2); first add to <code>new ArrayList&lt;&gt;()</code> allocates 10). The
        rule is checked against a real JDK 25 by the java-examples test suite. Memory addresses and GC timing are not modelled.
      </ModelNotice>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="size()" value={size} />
        <Stat label="capacity (elementData.length)" value={state.capacity} testId="al-capacity" />
        <Stat label="resizes" value={state.resizes} />
        <Stat label="references copied" value={state.copies} />
      </div>

      <div className="mt-4" aria-hidden>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: drawn }, (_, i) => {
            const filled = i < size;
            const hot = touched.includes(i);
            return (
              <div
                key={i}
                className={`flex h-9 w-12 flex-col items-center justify-center rounded border text-[11px] font-mono ${
                  filled
                    ? hot
                      ? 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100'
                      : 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-900/40 dark:text-sky-100'
                    : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-600'
                }`}
              >
                <span className="text-[9px] opacity-70">{i}</span>
                <span className="max-w-full truncate px-0.5">{filled ? state.elements[i] : 'null'}</span>
              </div>
            );
          })}
          {state.capacity > MAX_SLOTS_DRAWN && <span className="self-center text-xs text-slate-500">… {state.capacity - MAX_SLOTS_DRAWN} more slots</span>}
          {state.capacity === 0 && <span className="text-sm text-slate-500">Empty backing array (length 0)</span>}
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
        Text description: the list holds {size} element{size === 1 ? '' : 's'} in a backing array of length {state.capacity} ({fill}% used).
        {touched.length > 0 && ` The last operation wrote or shifted indexes ${touched[0]}–${touched[touched.length - 1]}.`}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">Elements</legend>
          <label className="block text-xs">
            Value
            <input className={input} value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <label className="block text-xs">
            Index
            <input className={input} type="number" min={0} value={index} onChange={(e) => setIndex(Number(e.target.value))} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => apply(() => AL.add(state, nextValue()))}>
              add(value)
            </button>
            <button type="button" className={btn} onClick={() => apply(() => AL.addAt(state, index, nextValue()))}>
              add(index, value)
            </button>
            <button type="button" className={btn} onClick={() => apply(() => AL.removeAt(state, index))} disabled={size === 0}>
              remove(index)
            </button>
            <button
              type="button"
              className={btn}
              onClick={() =>
                apply(() => {
                  const values = Array.from({ length: bulk }, (_, i) => `E${counter + i}`);
                  setCounter((c) => c + bulk);
                  return AL.addAll(state, values);
                })
              }
            >
              addAll({bulk} elements)
            </button>
            <label className="inline-flex items-center gap-1 text-xs">
              count
              <input className={`${input} w-16`} type="number" min={0} max={500} value={bulk} onChange={(e) => setBulk(Math.max(0, Math.min(500, Number(e.target.value))))} />
            </label>
          </div>
        </fieldset>
        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">Capacity</legend>
          <label className="block text-xs">
            ensureCapacity(minCapacity)
            <input className={input} type="number" min={0} value={ensure} onChange={(e) => setEnsure(Number(e.target.value))} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={() => apply(() => AL.ensureCapacity(state, ensure))}>
              ensureCapacity
            </button>
            <button type="button" className={btn} onClick={() => apply(() => AL.trimToSize(state))}>
              trimToSize()
            </button>
            <button type="button" className={btn} onClick={() => apply(() => AL.clear(state))}>
              clear()
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
            <label className="text-xs">
              Constructor
              <select className={input} value={ctor} onChange={(e) => setCtor(e.target.value as 'default' | 'sized')}>
                <option value="default">new ArrayList&lt;&gt;()</option>
                <option value="sized">new ArrayList&lt;&gt;(n)</option>
              </select>
            </label>
            {ctor === 'sized' && (
              <label className="w-20 text-xs">
                n
                <input className={input} type="number" min={0} max={200} value={initial} onChange={(e) => setInitial(Math.max(0, Number(e.target.value)))} />
              </label>
            )}
            <button type="button" className={btn} onClick={reset}>
              Reset
            </button>
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      <div className="mt-3">
        <h4 className="text-sm font-medium">What happened (newest first)</h4>
        <ol className="mt-1 max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300" aria-live="polite">
          {log.map((l, i) => (
            <li key={`${i}-${l}`} className="border-l-2 border-slate-200 pl-2 dark:border-slate-700">
              {l}
            </li>
          ))}
        </ol>
      </div>
    </VizFrame>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-mono text-lg font-semibold" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}
