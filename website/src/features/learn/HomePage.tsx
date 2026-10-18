import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Cpu, GitCompare, Layers, Library, Route as RouteIcon, Search, Waves, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { getLesson, getModule, lessonPath, modulePath, plannedLessonCount, publishedLessons } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useProgress } from '../progress/useProgress';
import { lessonStatus } from '../progress/progressStore';

export function HomePage() {
  useDocumentTitle('');
  const progress = useProgress();
  const last = progress.lastVisited ? getLesson(progress.lastVisited.lessonId) : undefined;
  const firstUnfinished = publishedLessons.find((l) => lessonStatus(progress.lessons[l.id]) !== 'complete');
  const m = (id: string) => getModule(id)!;
  const l = (id: string) => getLesson(id)!;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-14 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-wider text-sky-700 dark:text-sky-400">Java 25 LTS reference · Java 17 & 21 compatibility noted</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Java Collections &amp; Utilities Handbook</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Understand the APIs. Explore the internals. Engineer better solutions. Every lesson separates what the specification guarantees from what
          OpenJDK happens to do, and every Java example compiles and is tested.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {last ? (
            <Link to={lessonPath(last)} className="cta-primary">
              Continue: {last.title} <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <Link to={lessonPath(publishedLessons[0])} className="cta-primary">
              Start from fundamentals <ArrowRight size={16} aria-hidden />
            </Link>
          )}
          <Link to="/learn" className="cta-secondary">
            Browse the curriculum
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {publishedLessons.length} lessons published · {plannedLessonCount} more planned across 26 modules.
          {firstUnfinished && last && firstUnfinished.id !== last.id && (
            <>
              {' '}
              Next unfinished: <Link className="link" to={lessonPath(firstUnfinished)}>{firstUnfinished.title}</Link>.
            </>
          )}
        </p>
      </section>

      <section aria-labelledby="explore" className="pb-6">
        <h2 id="explore" className="text-xl font-semibold">
          Explore
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card icon={<Layers size={18} />} title="Start from fundamentals" to={modulePath(m('m02'))} text="Big O, amortized cost, cache locality and the real cost of collection operations." />
          <Card icon={<Boxes size={18} />} title="Explore Collections" to={modulePath(m('m03'))} text="The framework architecture, contracts, sequenced collections and why Map is not a Collection." />
          <Card icon={<Cpu size={18} />} title="Understand JVM internals" to={lessonPath(l('m07-hashmap-hashing'))} text="A 29-point HashMap deep dive, ArrayList growth verified against JDK 25, memory models." />
          <Card icon={<GitCompare size={18} />} title="Compare Java APIs" to={lessonPath(l('m05-arraylist-vs-linkedlist'))} text="ArrayList vs LinkedList in depth, plus the operation complexity reference." />
          <Card icon={<Wrench size={18} />} title="Solve enterprise problems" to={lessonPath(l('m07-linkedhashmap-lru'))} text="Bounded LRU caches, lookup indexing instead of nested loops, safe concurrent counting." />
          <Card icon={<Search size={18} />} title="Interactive models" to="/reference" text="Hierarchy explorer, ArrayList capacity simulator, HashMap bucket and resize simulator." />
          <Card icon={<Waves size={18} />} title="Explore Streams" to={modulePath(m('m16'))} text="Module plan for the Stream API deep dive — lessons coming soon." soon />
          <Card icon={<Library size={18} />} title="Explore Java Utilities" to={modulePath(m('m18'))} text="Optional, text, date/time, numerics and more — lessons coming soon." soon />
          <Card icon={<RouteIcon size={18} />} title="Browse learning paths" to="/learn" text="Six levels from Fundamentals to Performance, Concurrency and Enterprise." />
        </div>
      </section>

      <section aria-labelledby="popular" className="py-10">
        <h2 id="popular" className="text-xl font-semibold">
          Popular classes
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            ['HashMap', 'm07-hashmap-hashing'],
            ['ArrayList', 'm05-arraylist-internals'],
            ['LinkedHashMap', 'm07-linkedhashmap-lru'],
            ['LinkedList', 'm05-arraylist-vs-linkedlist'],
            ['SequencedCollection', 'm03-sequenced'],
            ['Map views', 'm03-maps-and-views'],
          ].map(([name, id]) => (
            <li key={name}>
              <Link to={lessonPath(l(id))} className="inline-block rounded-full border border-slate-200 px-3 py-1 font-mono hover:border-sky-400 dark:border-slate-700">
                {name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/reference/hierarchy" className="inline-block rounded-full border border-slate-200 px-3 py-1 hover:border-sky-400 dark:border-slate-700">
              All types in the hierarchy explorer →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Card({ icon, title, text, to, soon }: { icon: ReactNode; title: string; text: string; to: string; soon?: boolean }) {
  return (
    <Link to={to} className="group rounded-xl border border-slate-200 p-5 transition hover:border-sky-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-sky-600">
      <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-2 font-semibold">
        {title}
        {soon && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-slate-400">plan only</span>}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </Link>
  );
}
