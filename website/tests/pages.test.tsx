// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../src/features/learn/HomePage';
import { LearnIndexPage } from '../src/features/learn/LearnIndexPage';
import { ModulePage } from '../src/features/learn/ModulePage';
import { PracticePage } from '../src/features/practice/PracticePage';
import { CurriculumSidebar } from '../src/features/learn/CurriculumSidebar';
import { Route, Routes } from 'react-router-dom';
import { progressStore } from '../src/features/progress/useProgress';
import { modules, publishedLessons } from '../src/content';

const inRouter = (ui: React.ReactNode, path = '/') => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('pages', () => {
  it('home page offers to resume the last visited lesson', () => {
    progressStore.visit('m07-hashmap-operations');
    inRouter(<HomePage />);
    expect(screen.getByRole('link', { name: /Continue: HashMap Internals III/ })).toHaveAttribute('href', '/learn/maps/hashmap-internals-operations');
  });

  it('curriculum lists all 26 modules and marks unwritten ones as coming soon', () => {
    inRouter(<LearnIndexPage />);
    const cards = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/learn/'));
    expect(cards).toHaveLength(26);
    expect(screen.getAllByText(/Coming soon · \d+ lessons planned/).length).toBe(modules.filter((m) => m.lessons.every((l) => l.status === 'planned')).length);
  });

  it('module page shows published lessons as links and planned ones as coming soon', () => {
    inRouter(
      <Routes>
        <Route path="/learn/:moduleSlug" element={<ModulePage />} />
      </Routes>,
      '/learn/maps',
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Module 7');
    expect(screen.getAllByRole('link', { name: /HashMap Internals/ })).toHaveLength(4);
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });

  it('practice page lists exactly the published lessons', () => {
    inRouter(<PracticePage />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('link', { name: 'Open exercise' })).toHaveLength(publishedLessons.length);
  });

  it('sidebar expands a module with keyboard-operable buttons', () => {
    inRouter(<CurriculumSidebar currentModuleId="m05" />);
    expect(screen.getByRole('button', { name: 'Collapse module 5' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /ArrayList Internals/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand module 7' })).toHaveAttribute('aria-expanded', 'false');
  });
});
