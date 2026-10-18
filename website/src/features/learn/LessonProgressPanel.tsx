import { CheckCircle2, Circle } from 'lucide-react';
import type { PublishedLesson } from '../../content';
import { assessmentById } from '../../../content/assessments';
import { MILESTONES } from '../progress/progressStore';
import { progressStore, useProgress } from '../progress/useProgress';
import { Quiz } from './Quiz';

export function LessonProgressPanel({ lesson }: { lesson: PublishedLesson }) {
  const progress = useProgress();
  const p = progress.lessons[lesson.id] ?? {};
  const assessment = assessmentById.get(lesson.assessmentId);

  return (
    <section aria-labelledby="progress-heading" className="mt-12 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
      <h2 id="progress-heading" className="text-lg font-semibold">
        Track your learning
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Reading a page is not mastery. These four milestones are tracked separately and stored only in this browser.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {MILESTONES.map((m) => (
          <li key={m.key}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <input type="checkbox" checked={Boolean(p[m.key])} onChange={() => progressStore.toggleMilestone(lesson.id, m.key)} className="mt-0.5" />
              <span>
                <span className="font-medium">{m.label}</span>
                <span className="block text-xs text-slate-500">{m.hint}</span>
              </span>
            </label>
          </li>
        ))}
        <li className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          {p.assessment?.passed ? (
            <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" aria-hidden />
          ) : (
            <Circle size={16} className="mt-0.5 text-slate-400" aria-hidden />
          )}
          <span>
            <span className="font-medium">Assessment passed</span>
            <span className="block text-xs text-slate-500">
              {p.assessment
                ? `Best attempt: ${p.assessment.score}/${p.assessment.total} (${p.assessment.passed ? 'passed' : 'not passed'})`
                : 'Set only by passing the knowledge check below.'}
            </span>
          </span>
        </li>
      </ul>
      {assessment && (
        <details className="mt-5 group">
          <summary className="cursor-pointer text-sm font-semibold text-sky-800 dark:text-sky-300">Knowledge check ({assessment.questions.length} questions)</summary>
          <div className="mt-4">
            <Quiz
              assessment={assessment}
              onSubmit={(score, total) => progressStore.recordAssessment(lesson.id, score, total, assessment.passRatio)}
            />
          </div>
        </details>
      )}
    </section>
  );
}
