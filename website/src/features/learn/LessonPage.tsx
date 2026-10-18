import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Menu, X } from 'lucide-react';
import { findLesson, getLesson, getModule, lessonPath, loadLessonBody, modulePath, neighbours } from '../../content';
import { Markdown } from '../../components/Markdown';
import { LessonBadges } from '../../components/Badges';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { progressStore, useProgress } from '../progress/useProgress';
import { CurriculumSidebar } from './CurriculumSidebar';
import { scrollToSection, TableOfContents, useHeadings } from './TableOfContents';
import { LessonProgressPanel } from './LessonProgressPanel';
import { NotFoundPage } from '../../app/NotFoundPage';

export function LessonPage() {
  const { moduleSlug = '', lessonSlug = '' } = useParams();
  const [search] = useSearchParams();
  const lesson = findLesson(moduleSlug, lessonSlug);
  const [body, setBody] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const progress = useProgress();
  useDocumentTitle(lesson?.title ?? 'Lesson');

  useEffect(() => {
    if (!lesson) return;
    let live = true;
    progressStore.visit(lesson.id);
    loadLessonBody(lesson)
      .then((text) => live && setBody({ id: lesson.id, text }))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [lesson]);

  const headings = useHeadings('lesson-body', [body?.id]);
  const section = search.get('s');
  useEffect(() => {
    if (section && body) {
      const t = window.setTimeout(() => scrollToSection(section), 50);
      return () => window.clearTimeout(t);
    }
  }, [section, body]);

  if (!lesson) return <NotFoundPage />;
  const module = getModule(lesson.moduleId)!;
  const { prev, next } = neighbours(lesson.id);
  const bookmarked = progress.bookmarks.includes(lesson.id);
  const ready = body?.id === lesson.id;

  return (
    <div className="mx-auto grid max-w-[90rem] gap-8 px-4 py-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_14rem]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <CurriculumSidebar currentModuleId={module.id} />
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setDrawer(false)}>
          <div
            className="h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-4 dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Curriculum"
          >
            <button type="button" onClick={() => setDrawer(false)} className="mb-3 flex items-center gap-1 text-sm" aria-label="Close curriculum">
              <X size={16} aria-hidden /> Close
            </button>
            <CurriculumSidebar currentModuleId={module.id} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <article className="min-w-0">
        <button type="button" onClick={() => setDrawer(true)} className="mb-4 flex items-center gap-2 text-sm text-slate-600 lg:hidden dark:text-slate-300">
          <Menu size={16} aria-hidden /> Curriculum
        </button>
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link to="/learn" className="hover:underline">
            Learn
          </Link>{' '}
          /{' '}
          <Link to={modulePath(module)} className="hover:underline">
            Module {module.number}: {module.title}
          </Link>
        </nav>
        <header className="mt-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
            <button
              type="button"
              onClick={() => progressStore.toggleBookmark(lesson.id)}
              aria-pressed={bookmarked}
              className="shrink-0 rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this lesson'}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}
            </button>
          </div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{lesson.description}</p>
          <div className="mt-3">
            <LessonBadges lesson={lesson} />
          </div>
          {lesson.javaVersion.note && <p className="mt-2 text-xs text-slate-500">{lesson.javaVersion.note}</p>}
          {lesson.prerequisites.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-medium">Prerequisites: </span>
              {lesson.prerequisites.map((id, i) => {
                const pre = getLesson(id);
                return pre ? (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link className="link" to={lessonPath(pre)}>
                      {pre.title}
                    </Link>
                  </span>
                ) : null;
              })}
            </p>
          )}
        </header>

        <div id="lesson-body" className="prose prose-slate mt-8 max-w-none dark:prose-invert">
          {error && <p role="alert">Could not load this lesson: {error}</p>}
          {!ready && !error && <p className="text-slate-500">Loading lesson…</p>}
          {ready && <Markdown source={body!.text} objectives={lesson.objectives} />}
        </div>

        {ready && lesson.related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-heading">
            <h2 id="related-heading" className="text-lg font-semibold">
              Related topics
            </h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {lesson.related.map((id) => {
                const r = getLesson(id);
                return r ? (
                  <li key={id}>
                    <Link className="link" to={lessonPath(r)}>
                      {r.title}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </section>
        )}

        {ready && <LessonProgressPanel lesson={lesson} />}

        <nav aria-label="Lesson navigation" className="mt-10 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-800">
          {prev ? (
            <Link to={lessonPath(prev)} className="pager">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <ArrowLeft size={12} aria-hidden /> Previous
              </span>
              <span className="font-medium">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={lessonPath(next)} className="pager text-right sm:col-start-2">
              <span className="flex items-center justify-end gap-1 text-xs text-slate-500">
                Next <ArrowRight size={12} aria-hidden />
              </span>
              <span className="font-medium">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TableOfContents items={headings} />
        </div>
      </aside>
    </div>
  );
}
