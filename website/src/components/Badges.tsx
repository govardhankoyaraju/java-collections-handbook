import { Clock, Coffee, Gauge } from 'lucide-react';
import { difficultyLabel, type PublishedLesson } from '../content';

export function LessonBadges({ lesson }: { lesson: PublishedLesson }) {
  return (
    <ul className="flex flex-wrap gap-2 text-xs" aria-label="Lesson facts">
      <li className="badge" title="Difficulty">
        <Gauge size={12} aria-hidden /> {difficultyLabel[lesson.difficulty]}
      </li>
      <li className="badge" title={lesson.javaVersion.note ?? 'Minimum Java version for the runnable examples'}>
        <Coffee size={12} aria-hidden /> Java {lesson.javaVersion.min}+ · reference {lesson.javaVersion.reference}
      </li>
      <li className="badge" title="Estimated reading time">
        <Clock size={12} aria-hidden /> {lesson.readingMinutes} min read
      </li>
    </ul>
  );
}

export function ComingSoon() {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Coming soon
    </span>
  );
}
