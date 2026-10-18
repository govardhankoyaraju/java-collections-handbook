import { Link } from 'react-router-dom';
import { levels, modulePath, modules, publishedIn } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useProgress } from '../progress/useProgress';
import { lessonStatus } from '../progress/progressStore';

export function LearnIndexPage() {
  useDocumentTitle('Curriculum');
  const progress = useProgress();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Curriculum</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
        26 modules in six levels. Published lessons follow the full 18-section structure; modules without published lessons show their planned
        outline and are marked as coming soon.
      </p>
      {levels.map((level) => (
        <section key={level.id} className="mt-10" aria-labelledby={`level-${level.id}`}>
          <h2 id={`level-${level.id}`} className="text-lg font-semibold">
            Level {level.id}: {level.title}
          </h2>
          <p className="text-sm text-slate-500">{level.summary}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {modules
              .filter((m) => m.level === level.id)
              .map((m) => {
                const pub = publishedIn(m);
                const done = pub.filter((l) => lessonStatus(progress.lessons[l.id]) === 'complete').length;
                return (
                  <li key={m.id}>
                    <Link to={modulePath(m)} className="block h-full rounded-xl border border-slate-200 p-4 hover:border-sky-400 dark:border-slate-800 dark:hover:border-sky-600">
                      <p className="text-xs text-slate-500">Module {m.number}</p>
                      <h3 className="font-semibold">{m.title}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.summary}</p>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {pub.length > 0
                          ? `${pub.length} of ${m.lessons.length} lessons published · ${done} completed`
                          : `Coming soon · ${m.lessons.length} lessons planned`}
                      </p>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
