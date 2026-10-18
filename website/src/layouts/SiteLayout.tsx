import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookMarked, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { SearchDialog } from '../features/search/SearchDialog';

const nav = [
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/reference', label: 'Reference' },
];

export function SiteLayout() {
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!location.search.includes('s=')) window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label="Java Collections & Utilities Handbook — home">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[#1e3a5f] text-xs font-bold text-amber-300" aria-hidden>
              JC
            </span>
            <span className="hidden sm:inline">Collections Handbook</span>
          </Link>
          <nav aria-label="Primary" className="ml-2 flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-white"
              aria-label="Search the handbook (Ctrl+K or /)"
            >
              <Search size={15} aria-hidden />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border border-slate-200 px-1 text-[10px] md:inline dark:border-slate-700">Ctrl K</kbd>
            </button>
            <NavLink to="/progress" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Progress and bookmarks" title="Progress and bookmarks">
              <BookMarked size={18} aria-hidden />
            </NavLink>
            <button
              type="button"
              onClick={toggle}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800">
        <div className="mx-auto max-w-[90rem] px-4">
          <p>
            Java Collections &amp; Utilities Handbook — reference release Java 25 (LTS). Contracts are distinguished from OpenJDK implementation
            details throughout; visualizations are labelled educational models. Progress is stored only in this browser.
          </p>
        </div>
      </footer>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
