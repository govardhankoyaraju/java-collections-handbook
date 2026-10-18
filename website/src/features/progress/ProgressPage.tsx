import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Upload } from 'lucide-react';
import { getLesson, lessonPath, modulePath, modules, publishedIn } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { lessonStatus, milestoneCount } from './progressStore';
import { progressStore, useProgress } from './useProgress';

export function ProgressPage() {
  useDocumentTitle('Progress and bookmarks');
  const progress = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const last = progress.lastVisited ? getLesson(progress.lastVisited.lessonId) : undefined;

  const exportFile = () => {
    const blob = new Blob([progressStore.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `java-collections-handbook-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: 'ok', text: 'Progress exported.' });
  };

  const importFile = async (file: File) => {
    try {
      progressStore.importJson(await file.text());
      setMessage({ kind: 'ok', text: `Imported progress from ${file.name}.` });
    } catch (e) {
      setMessage({ kind: 'error', text: `Import failed: ${(e as Error).message} Your existing progress was not changed.` });
    }
  };

  const modulesWithLessons = modules.filter((m) => publishedIn(m).length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Progress, bookmarks and data</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Stored only in this browser (localStorage). Export a JSON file to back it up or move it to another device.</p>
      {last && (
        <p className="mt-4 text-sm">
          Resume: <Link className="link font-medium" to={lessonPath(last)}>{last.title}</Link>
        </p>
      )}

      <section className="mt-8" aria-labelledby="module-progress">
        <h2 id="module-progress" className="text-lg font-semibold">
          Module progress
        </h2>
        <p className="text-sm text-slate-500">A lesson is complete when all four milestones are done: concept, example, exercise and assessment.</p>
        <ul className="mt-3 space-y-3">
          {modulesWithLessons.map((m) => {
            const lessons = publishedIn(m);
            const milestones = lessons.reduce((n, l) => n + milestoneCount(progress.lessons[l.id]), 0);
            const total = lessons.length * 4;
            const complete = lessons.filter((l) => lessonStatus(progress.lessons[l.id]) === 'complete').length;
            return (
              <li key={m.id}>
                <div className="flex justify-between text-sm">
                  <Link className="link" to={modulePath(m)}>
                    Module {m.number}: {m.title}
                  </Link>
                  <span className="text-slate-500">
                    {complete}/{lessons.length} lessons · {milestones}/{total} milestones
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={milestones} aria-label={`Module ${m.number} milestones`}>
                  <div className="h-2 rounded bg-sky-600" style={{ width: `${(milestones / total) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="bookmarks">
        <h2 id="bookmarks" className="text-lg font-semibold">
          Bookmarks
        </h2>
        {progress.bookmarks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No bookmarks yet. Use the bookmark button on any lesson.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {progress.bookmarks.map((id) => {
              const l = getLesson(id);
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  {l ? (
                    <Link className="link" to={lessonPath(l)}>
                      {l.title}
                    </Link>
                  ) : (
                    <span className="text-slate-500">{id} (lesson not available)</span>
                  )}
                  <button type="button" className="text-xs text-slate-500 hover:text-red-700" onClick={() => progressStore.toggleBookmark(id)} aria-label={`Remove bookmark ${l?.title ?? id}`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="data">
        <h2 id="data" className="text-lg font-semibold">
          Export, import and reset
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="cta-secondary" onClick={exportFile}>
            <Download size={16} aria-hidden /> Export JSON
          </button>
          <button type="button" className="cta-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Progress file to import"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="cta-secondary text-red-700 dark:text-red-400"
            onClick={() => {
              if (window.confirm('Delete all progress and bookmarks stored in this browser?')) {
                progressStore.reset();
                setMessage({ kind: 'ok', text: 'Progress reset.' });
              }
            }}
          >
            <Trash2 size={16} aria-hidden /> Reset
          </button>
        </div>
        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${message.kind === 'error' ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
