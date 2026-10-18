import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Hash, LayoutGrid } from 'lucide-react';
import { createSearchIndex, type SearchIndex, type SearchResult } from './searchIndex';

let indexPromise: Promise<SearchIndex> | null = null;

export function loadSearchIndex(): Promise<SearchIndex> {
  indexPromise ??= import('./searchData').then((m) => createSearchIndex(m.buildDocuments()));
  return indexPromise;
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    loadSearchIndex().then((i) => live && setIndex(i));
    inputRef.current?.focus();
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      live = false;
      previous?.focus?.();
    };
  }, []);

  const results: SearchResult[] = index ? index.search(query) : [];

  const go = (r: SearchResult) => {
    onClose();
    navigate(r.path);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // keep focus inside the dialog; arrows move through results
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-[10vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the handbook"
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Search lessons, sections and pages — e.g. treeify, load factor, getFirst"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-base outline-none dark:border-slate-700"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `sr-${active}` : undefined}
          aria-autocomplete="list"
        />
        <div className="max-h-[60vh] overflow-y-auto">
          {!index && <p className="px-4 py-6 text-sm text-slate-500">Loading index…</p>}
          {index && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500" role="status">
              No results for “{query}”. Only published lessons are searchable.
            </p>
          )}
          {index && query.trim().length < 2 && (
            <p className="px-4 py-6 text-sm text-slate-500">Type at least two characters. Use ↑ ↓ to move, Enter to open, Esc to close.</p>
          )}
          <ul id="search-results" role="listbox" aria-label="Search results">
            {results.map((r, i) => (
              <li
                key={r.id}
                id={`sr-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`cursor-pointer border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 ${i === active ? 'bg-sky-50 dark:bg-sky-950/50' : ''}`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.kind === 'lesson' ? <FileText size={14} aria-hidden /> : r.kind === 'section' ? <Hash size={14} aria-hidden /> : <LayoutGrid size={14} aria-hidden />}
                  {r.title}
                </div>
                <div className="text-xs text-slate-500">{r.context}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{r.snippet}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
