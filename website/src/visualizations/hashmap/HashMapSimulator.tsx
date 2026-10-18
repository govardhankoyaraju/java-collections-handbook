import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, StepForward } from 'lucide-react';
import { ModelNotice, VizFrame, btn, btnPrimary, input } from '../ModelNotice';
import * as HM from './model';

type Op = { kind: 'put' | 'get' | 'remove'; key: string; value?: string };

const PRESETS: { label: string; ops: (mode: HM.KeyMode) => Op[]; mode?: HM.KeyMode; capacity?: number }[] = [
  {
    label: '13 integer keys → first resize',
    mode: 'integer',
    ops: () => Array.from({ length: 13 }, (_, i) => ({ kind: 'put', key: String(i + 1), value: `v${i + 1}` })),
  },
  {
    label: 'Keys 5, 21, 37, 53 → one bucket, then split',
    mode: 'integer',
    capacity: 16,
    ops: () => [5, 21, 37, 53, 200, 201, 202, 203, 204, 205, 206, 207, 208].map((k) => ({ kind: 'put', key: String(k), value: `v${k}` })),
  },
  {
    label: '"Aa"/"BB" strings → collisions & treeify',
    mode: 'string',
    ops: () => HM.collidingStrings(4).slice(0, 12).map((k, i) => ({ kind: 'put', key: k, value: String(i) })),
  },
];

function run(map: HM.MapState, op: Op): HM.Frame[] {
  if (op.kind === 'put') return HM.put(map, op.key, op.value ?? '');
  if (op.kind === 'get') return HM.get(map, op.key);
  return HM.remove(map, op.key);
}

export default function HashMapSimulator() {
  const [capacityChoice, setCapacityChoice] = useState<string>('default');
  const [loadFactor, setLoadFactor] = useState(0.75);
  const [keyMode, setKeyMode] = useState<HM.KeyMode>('string');
  const [map, setMap] = useState<HM.MapState>(() => HM.createMap());
  const [frames, setFrames] = useState<HM.Frame[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState('ORD-1001');
  const [value, setValue] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  const pending = frames.length > 0 && cursor < frames.length - 1;
  const shown = frames.length ? frames[cursor].state : map;
  const current = frames.length ? frames[cursor] : undefined;

  const isPlaying = playing && pending;
  useEffect(() => {
    if (!isPlaying) return;
    const t = window.setTimeout(() => setCursor((c) => c + 1), 900);
    return () => window.clearTimeout(t);
  }, [isPlaying, cursor]);

  const committed = () => (frames.length ? frames[frames.length - 1].state : map);

  const start = (ops: Op[], base = committed()) => {
    try {
      let state = base;
      const all: HM.Frame[] = [];
      for (const op of ops) {
        const f = run(state, op);
        all.push(...f);
        state = HM.finalState(f, state);
      }
      setMap(base);
      setFrames(all);
      setCursor(0);
      setPlaying(false);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reset = (mode = keyMode, capChoice = capacityChoice, lf = loadFactor) => {
    const fresh = HM.createMap({ keyMode: mode, loadFactor: lf, initialCapacity: capChoice === 'default' ? undefined : Number(capChoice) });
    setMap(fresh);
    setFrames([]);
    setCursor(0);
    setPlaying(false);
    setError(null);
    return fresh;
  };

  const breakdown = useMemo(() => {
    try {
      const k = HM.normalizeKey(key, keyMode);
      const h = HM.keyHashCode(k, keyMode);
      const s = HM.spread(h);
      const cap = shown.capacity || (shown.threshold || 16);
      return { h, s, cap, index: HM.bucketIndex(s, cap) };
    } catch {
      return null;
    }
  }, [key, keyMode, shown.capacity, shown.threshold]);

  const nonEmpty = shown.buckets.filter((b) => b.entries.length > 0).length;
  const longest = shown.buckets.reduce((m, b) => Math.max(m, b.entries.length), 0);
  const trees = shown.buckets.filter((b) => b.tree).length;

  return (
    <VizFrame id="hashmap-sim" title="HashMap bucket, collision and resize simulator">
      <ModelNotice>
        Hashing, indexing, thresholds, tail insertion, the treeify rule (chain of 9 and table ≥ 64, otherwise resize) and the lo/hi resize split
        follow OpenJDK 8–25 and are cross-checked against JDK 25 by tests. Tree bins are drawn as lists (the red-black shape and compareTo
        ordering are not drawn), and removal untreeifies at ≤ 6 nodes as a simplification.
      </ModelNotice>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">Operation</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Key ({keyMode === 'string' ? 'String' : 'Integer'})
              <input className={input} value={key} onChange={(e) => setKey(e.target.value)} />
            </label>
            <label className="text-xs">
              Value
              <input className={input} value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => start([{ kind: 'put', key, value }])}>
              put
            </button>
            <button type="button" className={btn} onClick={() => start([{ kind: 'get', key }])}>
              get
            </button>
            <button type="button" className={btn} onClick={() => start([{ kind: 'remove', key }])}>
              remove
            </button>
          </div>
          {breakdown && (
            <div className="overflow-x-auto rounded bg-slate-50 p-2 font-mono text-[11px] leading-5 dark:bg-slate-800/60">
              <div>hashCode()   {HM.toBinary32(breakdown.h)} ({breakdown.h})</div>
              <div>h &gt;&gt;&gt; 16      {HM.toBinary32(breakdown.h >>> 16)}</div>
              <div>spread hash  {HM.toBinary32(breakdown.s)} ({breakdown.s})</div>
              <div>
                &amp; ({breakdown.cap} - 1)  → bucket {breakdown.index}
                {shown.capacity === 0 && ' (table not yet allocated)'}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">Configure (resets the map)</legend>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs">
              Initial capacity
              <select
                className={input}
                value={capacityChoice}
                onChange={(e) => {
                  setCapacityChoice(e.target.value);
                  reset(keyMode, e.target.value, loadFactor);
                }}
              >
                <option value="default">default (16)</option>
                {[1, 2, 4, 8, 16, 32, 64, 100].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Load factor
              <select
                className={input}
                value={loadFactor}
                onChange={(e) => {
                  setLoadFactor(Number(e.target.value));
                  reset(keyMode, capacityChoice, Number(e.target.value));
                }}
              >
                {[0.5, 0.75, 1, 2].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Key type
              <select
                className={input}
                value={keyMode}
                onChange={(e) => {
                  const m = e.target.value as HM.KeyMode;
                  setKeyMode(m);
                  setKey(m === 'integer' ? '21' : 'ORD-1001');
                  reset(m, capacityChoice, loadFactor);
                }}
              >
                <option value="string">String</option>
                <option value="integer">Integer</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Scenarios:</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={btn}
                onClick={() => {
                  const mode = p.mode ?? keyMode;
                  const cap = p.capacity ? String(p.capacity) : 'default';
                  setKeyMode(mode);
                  setCapacityChoice(cap);
                  setLoadFactor(0.75);
                  const fresh = reset(mode, cap, 0.75);
                  start(p.ops(mode), fresh);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Playback">
        <button type="button" className={btn} onClick={() => setCursor((c) => Math.min(c + 1, frames.length - 1))} disabled={!pending}>
          <StepForward size={14} aria-hidden /> Step
        </button>
        <button type="button" className={btn} onClick={() => setPlaying(!isPlaying)} disabled={!pending}>
          {isPlaying ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" className={btn} onClick={() => setCursor(Math.max(0, frames.length - 1))} disabled={!pending}>
          <SkipForward size={14} aria-hidden /> Finish
        </button>
        <button type="button" className={btn} onClick={() => reset()}>
          <RotateCcw size={14} aria-hidden /> Reset map
        </button>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {frames.length ? `Step ${cursor + 1} of ${frames.length}` : 'No operation in progress'}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <p
        className="mt-2 min-h-10 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:bg-sky-950/40 dark:text-sky-100"
        aria-live="polite"
        data-testid="hm-narration"
      >
        {current ? current.message : 'Choose put, get or remove — or a scenario — then Step or Play through what HashMap does.'}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <Stat label="size" value={shown.size} />
        <Stat label="capacity" value={shown.capacity} />
        <Stat label="threshold" value={shown.threshold} />
        <Stat label="longest chain" value={longest} />
        <Stat label="tree bins" value={trees} />
      </div>

      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        Text description: {shown.capacity === 0 ? 'the table has not been allocated yet.' : `${shown.size} mappings in ${nonEmpty} of ${shown.capacity} buckets; the longest chain has ${longest} node(s); ${trees} bucket(s) are tree bins.`}
      </p>

      {shown.capacity > 0 && (
        <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-1.5" aria-label="Buckets">
          {shown.buckets.map((b, i) => {
            const hot = current?.bucket === i;
            return (
              <li
                key={i}
                aria-label={`Bucket ${i}: ${b.entries.length ? b.entries.map((e) => e.key).join(', ') : 'empty'}${b.tree ? ' (tree bin)' : ''}`}
                className={`min-h-12 rounded border p-1.5 text-[11px] ${
                  hot ? 'border-sky-600 ring-2 ring-sky-400/60' : 'border-slate-200 dark:border-slate-700'
                } ${b.entries.length ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900/30'}`}
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-mono">[{i}]</span>
                  {b.tree && <span className="rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">TREE</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {b.entries.map((e, j) => (
                    <span
                      key={e.key}
                      className={`rounded px-1 font-mono ${
                        current?.key === e.key && hot ? 'bg-amber-200 text-amber-950 dark:bg-amber-700 dark:text-amber-50' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      title={`hash ${e.hash}`}
                    >
                      {j > 0 && !b.tree ? '→ ' : ''}
                      {e.key}={e.value}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </VizFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
