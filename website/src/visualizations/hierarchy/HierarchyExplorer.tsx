import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { getLesson, lessonPath } from '../../content';
import { VizFrame, input } from '../ModelNotice';
import { ancestorsOf, childrenOf, directSubtypesOf, familyLabel, hierarchy, nodeById, type Family, type HierarchyNode } from './data';

const FAMILIES: Family[] = ['core', 'sequenced', 'general', 'specialized', 'concurrent', 'legacy'];

export default function HierarchyExplorer() {
  const [selected, setSelected] = useState('HashMap');
  const [query, setQuery] = useState('');
  const [families, setFamilies] = useState<Set<Family>>(new Set(FAMILIES));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ids = new Set<string>();
    for (const n of hierarchy) {
      if (!families.has(n.family)) continue;
      if (q && !n.id.toLowerCase().includes(q) && !n.summary.toLowerCase().includes(q)) continue;
      ids.add(n.id);
      // keep the path to the root visible so the tree stays readable
      for (let p = n.primaryParent; p; p = nodeById.get(p)?.primaryParent ?? null) ids.add(p);
    }
    return ids;
  }, [query, families]);

  const node = nodeById.get(selected)!;
  const highlighted = new Set([selected, ...ancestorsOf(selected)]);

  const toggleFamily = (f: Family) =>
    setFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <VizFrame id="hierarchy-explorer" title="Collections Framework hierarchy explorer">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Reflects the real <code>java.util</code> type hierarchy of Java 21–25 (verified against JDK 25 by the <code>HierarchyTour</code> example).
        Each type is placed under one parent for readability; the details panel lists <em>all</em> of its supertypes. Select a type to highlight
        everything it is assignable to.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="w-56 text-xs">
          Filter types
          <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Deque, sorted, thread" />
        </label>
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <legend className="sr-only">Families</legend>
          {FAMILIES.map((f) => (
            <label key={f} className="inline-flex items-center gap-1">
              <input type="checkbox" checked={families.has(f)} onChange={() => toggleFamily(f)} />
              {familyLabel[f]}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div role="tree" aria-label="Collection types" className="max-h-[32rem] overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          {childrenOf(null)
            .filter((n) => visible.has(n.id))
            .map((n) => (
              <TreeItem key={n.id} node={n} depth={0} visible={visible} selected={selected} highlighted={highlighted} onSelect={setSelected} />
            ))}
          {visible.size === 0 && <p className="p-2 text-sm text-slate-500">No types match.</p>}
        </div>
        <Details node={node} onSelect={setSelected} />
      </div>
    </VizFrame>
  );
}

function TreeItem(props: {
  node: HierarchyNode;
  depth: number;
  visible: Set<string>;
  selected: string;
  highlighted: Set<string>;
  onSelect: (id: string) => void;
}) {
  const { node, depth, visible, selected, highlighted, onSelect } = props;
  const kids = childrenOf(node.id).filter((c) => visible.has(c.id));
  const isSel = selected === node.id;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(node.id);
    }
  };
  return (
    <div role="treeitem" aria-selected={isSel} aria-expanded={kids.length ? true : undefined}>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        onKeyDown={onKey}
        style={{ paddingLeft: `${depth * 1.1 + 0.4}rem` }}
        className={`flex w-full items-center gap-2 rounded py-1 pr-2 text-left text-sm ${
          isSel
            ? 'bg-sky-700 text-white dark:bg-sky-600'
            : highlighted.has(node.id)
              ? 'bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className={`font-mono ${node.kind === 'interface' ? 'italic' : 'font-semibold'}`}>{node.id}</span>
        <span className={`text-[10px] uppercase tracking-wide ${isSel ? 'text-sky-100' : 'text-slate-500'}`}>
          {node.kind === 'interface' ? 'interface' : node.kind === 'abstract-class' ? 'abstract class' : 'class'}
          {node.family === 'sequenced' ? ' · 21+' : node.family === 'legacy' ? ' · legacy' : ''}
        </span>
      </button>
      {kids.length > 0 && (
        <div role="group">
          {kids.map((k) => (
            <TreeItem key={k.id} {...props} node={k} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Details({ node, onSelect }: { node: HierarchyNode; onSelect: (id: string) => void }) {
  const lesson = node.lesson ? getLesson(node.lesson) : undefined;
  const subs = directSubtypesOf(node.id);
  const rows: [string, string | undefined][] = [
    ['Ordering', node.ordering],
    ['Duplicates', node.duplicates],
    ['Nulls', node.nulls],
    ['Thread safety', node.threadSafety],
  ];
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700" aria-live="polite">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {node.pkg} · {node.kind.replace('-', ' ')} · since Java {node.since} · {familyLabel[node.family]}
      </p>
      <h4 className="mt-1 font-mono text-xl font-semibold">{node.id}</h4>
      <p className="mt-2 text-sm leading-relaxed">{node.summary}</p>
      <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Direct supertypes</dt>
        <dd>
          {node.supertypes.length === 0 && !node.superclass ? '—' : null}
          {node.superclass && <span className="mr-2 font-mono">extends {node.superclass}</span>}
          {node.supertypes.map((s) =>
            nodeById.has(s) ? (
              <button key={s} type="button" className="mr-2 font-mono text-sky-700 underline dark:text-sky-400" onClick={() => onSelect(s)}>
                {s}
              </button>
            ) : (
              <span key={s} className="mr-2 font-mono">
                {s}
              </span>
            ),
          )}
        </dd>
        <dt className="text-slate-500">Direct subtypes</dt>
        <dd>
          {subs.length === 0
            ? '—'
            : subs.map((s) => (
                <button key={s.id} type="button" className="mr-2 font-mono text-sky-700 underline dark:text-sky-400" onClick={() => onSelect(s.id)}>
                  {s.id}
                </button>
              ))}
        </dd>
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {lesson && (
        <p className="mt-3 text-sm">
          Deeper: <Link to={lessonPath(lesson)}>{lesson.title}</Link>
        </p>
      )}
    </div>
  );
}
