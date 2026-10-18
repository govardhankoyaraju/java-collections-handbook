import type { LessonStatus } from '../progress/progressStore';

const label: Record<LessonStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'All four milestones complete',
};

export function StatusDot({ status }: { status: LessonStatus }) {
  const cls =
    status === 'complete'
      ? 'bg-emerald-500 border-emerald-500'
      : status === 'in-progress'
        ? 'bg-amber-400 border-amber-400'
        : 'border-slate-300 dark:border-slate-600';
  return (
    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${cls}`} role="img" aria-label={label[status]} title={label[status]} />
  );
}
