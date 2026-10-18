import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';

/** Every visualization states what it models and how faithful it is (spec §9). */
export function ModelNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
      <FlaskConical size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>
        <strong>Educational model, not live JVM state.</strong> {children}
      </span>
    </p>
  );
}

export function VizFrame({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="viz not-prose my-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 sm:p-5"
    >
      <h3 id={`${id}-title`} className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {children}
    </section>
  );
}

export const btn =
  'inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
export const btnPrimary =
  'inline-flex items-center gap-1 rounded-md bg-sky-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500';
export const input =
  'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100';
