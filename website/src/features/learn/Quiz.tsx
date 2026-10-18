import { useState } from 'react';
import type { Assessment } from '../../../content/types';
import { CodeBlock } from '../../components/CodeBlock';

export interface QuizProps {
  assessment: Assessment;
  onSubmit: (score: number, total: number) => void;
}

/** Knowledge check. Submitting records an attempt; only a passing score marks "assessment passed". */
export function Quiz({ assessment, onSubmit }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const total = assessment.questions.length;
  const score = assessment.questions.filter((q) => answers[q.id] === q.answerIndex).length;
  const allAnswered = assessment.questions.every((q) => answers[q.id] !== undefined);
  const needed = Math.ceil(assessment.passRatio * total);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!allAnswered) return;
        setSubmitted(true);
        onSubmit(score, total);
      }}
      aria-label="Lesson assessment"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {total} questions · pass with {needed} correct. Explanations appear after you submit.
      </p>
      {assessment.questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <legend className="px-1 text-sm font-semibold">
            Question {qi + 1}
          </legend>
          <p className="text-sm leading-relaxed">{q.prompt}</p>
          {q.code && <CodeBlock code={q.code} language="java" badge="Excerpt" />}
          <div className="mt-2 space-y-1.5">
            {q.options.map((opt, oi) => {
              const chosen = answers[q.id] === oi;
              const correct = submitted && oi === q.answerIndex;
              const wrong = submitted && chosen && oi !== q.answerIndex;
              return (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    correct
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                      : wrong
                        ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
                        : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={chosen}
                    disabled={submitted}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className="mt-1"
                  />
                  <span>
                    {opt}
                    {correct && <span className="sr-only"> (correct answer)</span>}
                    {wrong && <span className="sr-only"> (your answer, incorrect)</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {submitted && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{q.explanation}</p>}
        </fieldset>
      ))}
      {!submitted ? (
        <button type="submit" disabled={!allAnswered} className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-sky-600">
          Submit answers
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <p className={`text-sm font-semibold ${score >= needed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {score}/{total} correct — {score >= needed ? 'passed' : `not passed (need ${needed})`}.
          </p>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </form>
  );
}
