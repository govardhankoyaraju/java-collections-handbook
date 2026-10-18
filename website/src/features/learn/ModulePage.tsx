import { Link, useParams } from 'react-router-dom';
import { getModuleBySlug, levels, lessonPath, modulePath, modules, publishedIn } from '../../content';
import { LessonBadges, ComingSoon } from '../../components/Badges';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useProgress } from '../progress/useProgress';
import { lessonStatus, milestoneCount } from '../progress/progressStore';
import { NotFoundPage } from '../../app/NotFoundPage';
import { StatusDot } from './StatusDot';

export function ModulePage() {
  const { moduleSlug = '' } = useParams();
  const module = getModuleBySlug(moduleSlug);
  const progress = useProgress();
  useDocumentTitle(module ? `Module ${module.number}: ${module.title}` : 'Module');
  if (!module) return <NotFoundPage />;
  const level = levels.find((l) => l.id === module.level)!;
  const published = publishedIn(module);
  const idx = modules.indexOf(module);
  const prev = modules[idx - 1];
  const next = modules[idx + 1];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link to="/learn" className="hover:underline">
          Learn
        </Link>{' '}
        / Level {level.id}: {level.title}
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Module {module.number}: {module.title}
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">{module.summary}</p>
      {published.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          No lessons in this module are published yet. The outline below is the plan; nothing here is presented as finished content.
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          {published.length} of {module.lessons.length} lessons published ·{' '}
          {published.filter((l) => lessonStatus(progress.lessons[l.id]) === 'complete').length} completed
        </p>
      )}

      <ol className="mt-6 space-y-3">
        {module.lessons.map((l, i) =>
          l.status === 'published' ? (
            <li key={l.id}>
              <Link to={lessonPath(l)} className="block rounded-xl border border-slate-200 p-4 hover:border-sky-400 dark:border-slate-800 dark:hover:border-sky-600">
                <div className="flex items-start gap-2">
                  <StatusDot status={lessonStatus(progress.lessons[l.id])} />
                  <div>
                    <p className="text-xs text-slate-500">
                      Lesson {i + 1} · {milestoneCount(progress.lessons[l.id])}/4 milestones
                    </p>
                    <h2 className="font-semibold">{l.title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{l.description}</p>
                    <div className="mt-2">
                      <LessonBadges lesson={l} />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ) : (
            <li key={l.title} className="rounded-xl border border-dashed border-slate-200 p-4 text-slate-500 dark:border-slate-800" aria-disabled="true">
              <p className="text-xs">Lesson {i + 1}</p>
              <p className="font-medium">
                {l.title} <ComingSoon />
              </p>
            </li>
          ),
        )}
      </ol>
      <nav aria-label="Module navigation" className="mt-10 flex justify-between gap-4 text-sm">
        {prev ? <Link className="link" to={modulePath(prev)}>← Module {prev.number}: {prev.title}</Link> : <span />}
        {next && <Link className="link text-right" to={modulePath(next)}>Module {next.number}: {next.title} →</Link>}
      </nav>
    </div>
  );
}
