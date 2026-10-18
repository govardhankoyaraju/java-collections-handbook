import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const AVAILABLE = [
  { to: '/reference/hierarchy', title: 'Collections Framework hierarchy explorer', text: 'Every core interface and the main implementations, with supertypes, ordering, duplicates, nulls and thread safety.' },
  { to: '/reference/complexity', title: 'Collection operation complexity', text: 'Lookup, insertion, removal and iteration costs, marked as Javadoc-documented or implementation-derived.' },
  { to: '/reference/models/arraylist', title: 'ArrayList capacity and resizing simulator', text: 'Interactive model of size, capacity, growth and element shifting.' },
  { to: '/reference/models/hashmap', title: 'HashMap bucket, collision and resize simulator', text: 'Step through put/get/remove with configurable capacity and load factor.' },
];

const PLANNED = [
  'Class / API explorer (HashMap, TreeMap, Optional, Stream, Collectors, …)',
  'Comparison centre (31 required comparisons with decision guides)',
  '“Which Java API should I use?” decision assistant',
  'Cheat sheets: generics, null-support matrix, mutability, Comparator, Stream operations, Collectors, functional interfaces, Optional, Date/Time',
  'Java version compatibility matrix, common exceptions, performance and code-review checklists',
];

export function ReferencePage() {
  useDocumentTitle('Reference');
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Reference</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">Concise, technically precise pages for working engineers, linked to the lessons that explain them.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {AVAILABLE.map((a) => (
          <li key={a.to}>
            <Link to={a.to} className="block h-full rounded-xl border border-slate-200 p-5 hover:border-sky-400 dark:border-slate-800 dark:hover:border-sky-600">
              <h2 className="font-semibold">{a.title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.text}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-10" aria-labelledby="planned-ref">
        <h2 id="planned-ref" className="text-lg font-semibold">
          Not yet available
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-500">
          {PLANNED.map((p) => (
            <li key={p}>{p} — coming soon</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
