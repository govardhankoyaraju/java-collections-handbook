import { Link } from 'react-router-dom';
import { getLesson, lessonPath } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface Row {
  type: string;
  structure: string;
  access: string;
  insert: string;
  remove: string;
  contains: string;
  iterate: string;
  documented: string;
}

const ROWS: Row[] = [
  { type: 'ArrayList', structure: 'Resizable array', access: 'get(i): O(1)', insert: 'add(e): amortized O(1); add(i, e): O(n − i)', remove: 'remove(i): O(n − i); remove(o): O(n)', contains: 'O(n)', iterate: 'O(n)', documented: 'Yes — Javadoc states constant, amortized constant and linear costs' },
  { type: 'LinkedList', structure: 'Doubly linked nodes', access: 'get(i): O(min(i, n − i))', insert: 'ends: O(1); at index: O(n) to reach + O(1) link; via ListIterator: O(1)', remove: 'ends: O(1); remove(o): O(n)', contains: 'O(n)', iterate: 'O(n), pointer chasing', documented: 'Partly — Javadoc: indexing traverses from the closer end' },
  { type: 'ArrayDeque', structure: 'Circular resizable array', access: 'peekFirst/peekLast: O(1)', insert: 'addFirst/addLast: amortized O(1)', remove: 'pollFirst/pollLast: O(1); remove(o): O(n)', contains: 'O(n)', iterate: 'O(n)', documented: 'Yes — “most operations amortized constant; contains/remove(o) linear”' },
  { type: 'PriorityQueue', structure: 'Binary heap in an array', access: 'peek: O(1)', insert: 'offer: O(log n)', remove: 'poll: O(log n); remove(o): O(n)', contains: 'O(n)', iterate: 'O(n), not in priority order', documented: 'Yes — Javadoc implementation note lists O(log n), linear and constant methods' },
  { type: 'HashMap / HashSet', structure: 'Bucket table + chains/tree bins', access: 'get: O(1) average', insert: 'put: O(1) average, amortized over resizes', remove: 'O(1) average', contains: 'containsKey: O(1) average; containsValue: O(capacity + n)', iterate: 'O(capacity + n)', documented: 'Average constant time “assuming the hash function disperses elements properly”; tree bins are an implementation detail' },
  { type: 'LinkedHashMap / LinkedHashSet', structure: 'HashMap + doubly linked entry list', access: 'get: O(1) average (moves entry in access order)', insert: 'O(1) average', remove: 'O(1) average', contains: 'O(1) average', iterate: 'O(n), independent of capacity', documented: 'Yes — iteration proportional to size, not capacity' },
  { type: 'TreeMap / TreeSet', structure: 'Red-black tree', access: 'get / floor / ceiling: O(log n)', insert: 'O(log n)', remove: 'O(log n)', contains: 'O(log n)', iterate: 'O(n), sorted', documented: 'Yes — “guaranteed log(n) time cost” for containsKey, get, put, remove' },
];

export function ComplexityPage() {
  useDocumentTitle('Collection operation complexity');
  const lesson = getLesson('m02-collection-operation-complexity')!;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link to="/reference" className="hover:underline">
          Reference
        </Link>{' '}
        / Complexity
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Collection operation complexity</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
        Asymptotic time per operation for n elements. “Average” for hash structures assumes well-distributed hash codes; worst cases are
        explained in <Link className="link" to={lessonPath(getLesson('m07-hashmap-production')!)}>HashMap Internals IV</Link>. Big O is not the
        whole story — see <Link className="link" to={lessonPath(getLesson('m02-memory-locality')!)}>allocation and cache locality</Link>.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800" role="region" aria-label="Complexity table" tabIndex={0}>
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              {['Type', 'Structure', 'Access / lookup', 'Insert', 'Remove', 'contains', 'Iterate', 'Documented in Javadoc?'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.type} className="border-t border-slate-100 align-top dark:border-slate-800">
                <th scope="row" className="px-3 py-2 font-mono font-semibold">
                  {r.type}
                </th>
                <td className="px-3 py-2">{r.structure}</td>
                <td className="px-3 py-2">{r.access}</td>
                <td className="px-3 py-2">{r.insert}</td>
                <td className="px-3 py-2">{r.remove}</td>
                <td className="px-3 py-2">{r.contains}</td>
                <td className="px-3 py-2">{r.iterate}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.documented}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm">
        Full explanation: <Link className="link" to={lessonPath(lesson)}>{lesson.title}</Link>
      </p>
    </div>
  );
}
