import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getModule, lessonPath, publishedLessons } from '../../content';
import { assessmentById } from '../../../content/assessments';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useProgress } from '../progress/useProgress';

const PLANNED = [
  'Problem-solving recipe library (50+ recipes)',
  'Enterprise case studies (entity hierarchy builder, reconciliation, one million records, …)',
  'Interview preparation centre by level and question format',
  'Find-the-bug and predict-the-output challenge sets',
];

export function PracticePage() {
  useDocumentTitle('Practice');
  const progress = useProgress();
  const done = publishedLessons.filter((l) => progress.lessons[l.id]?.exerciseCompleted).length;
  const passed = publishedLessons.filter((l) => progress.lessons[l.id]?.assessment?.passed).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Practice</h1>
      <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
        Every published lesson ends with a practice exercise (with a hidden solution), reasoning-based interview questions with answers, and a
        knowledge check. This page lists exactly those — nothing here is a placeholder.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Exercises completed: {done}/{publishedLessons.length} · Assessments passed: {passed}/{publishedLessons.length}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800" role="region" aria-label="Practice by lesson" tabIndex={0}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2">Lesson</th>
              <th className="px-4 py-2">Exercise</th>
              <th className="px-4 py-2">Interview questions</th>
              <th className="px-4 py-2">Knowledge check</th>
            </tr>
          </thead>
          <tbody>
            {publishedLessons.map((l) => {
              const p = progress.lessons[l.id];
              const a = assessmentById.get(l.assessmentId);
              return (
                <tr key={l.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-500">Module {getModule(l.moduleId)!.number}</p>
                    <Link className="link font-medium" to={lessonPath(l)}>
                      {l.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="link" to={lessonPath(l, '16-practice-exercise')}>
                      Open exercise
                    </Link>
                    {p?.exerciseCompleted && <CheckCircle2 size={14} className="ml-1 inline text-emerald-600" aria-label="completed" />}
                  </td>
                  <td className="px-4 py-3">
                    <Link className="link" to={lessonPath(l, '15-interview-questions')}>
                      Read questions
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {a ? `${a.questions.length} questions` : '—'}
                    {p?.assessment && (
                      <span className="block text-xs text-slate-500">
                        best {p.assessment.score}/{p.assessment.total} {p.assessment.passed ? '· passed' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-10" aria-labelledby="planned-practice">
        <h2 id="planned-practice" className="text-lg font-semibold">
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
