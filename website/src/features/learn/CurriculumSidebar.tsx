import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { levels, lessonPath, modulePath, modules } from '../../content';
import { useProgress } from '../progress/useProgress';
import { lessonStatus } from '../progress/progressStore';
import { ComingSoon } from '../../components/Badges';
import { StatusDot } from './StatusDot';

/** Curriculum navigation generated entirely from content metadata. */
export function CurriculumSidebar({ currentModuleId, onNavigate }: { currentModuleId?: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentModuleId ? [currentModuleId] : []));
  const progress = useProgress();
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <nav aria-label="Curriculum" className="text-sm">
      {levels.map((level) => (
        <div key={level.id} className="mb-4">
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Level {level.id} · {level.title}
          </p>
          <ul>
            {modules
              .filter((m) => m.level === level.id)
              .map((m) => {
                const isOpen = open.has(m.id);
                const published = m.lessons.filter((l) => l.status === 'published').length;
                return (
                  <li key={m.id}>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggle(m.id)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} module ${m.number}`}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                      </button>
                      <NavLink
                        to={modulePath(m)}
                        onClick={onNavigate}
                        end
                        className={({ isActive }) =>
                          `flex-1 rounded px-1.5 py-1 ${isActive ? 'font-semibold text-sky-800 dark:text-sky-300' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'}`
                        }
                      >
                        <span className="text-slate-400">{m.number}.</span> {m.title}
                        {published === 0 && <span className="ml-1 text-[10px] text-slate-400">(soon)</span>}
                      </NavLink>
                    </div>
                    {isOpen && (
                      <ul className="mb-2 ml-6 border-l border-slate-200 pl-2 dark:border-slate-800">
                        {m.lessons.map((l) =>
                          l.status === 'published' ? (
                            <li key={l.id}>
                              <NavLink
                                to={lessonPath(l)}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                  `flex items-start gap-1.5 rounded px-1.5 py-1 ${isActive ? 'bg-sky-50 font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-200' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`
                                }
                              >
                                <StatusDot status={lessonStatus(progress.lessons[l.id])} />
                                <span>{l.title}</span>
                              </NavLink>
                            </li>
                          ) : (
                            <li key={l.title} className="flex items-start gap-1.5 px-1.5 py-1 text-slate-400" aria-disabled="true">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-dashed border-slate-300" aria-hidden />
                              <span>
                                {l.title} <ComingSoon />
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
