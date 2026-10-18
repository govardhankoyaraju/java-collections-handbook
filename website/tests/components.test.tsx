// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { SearchDialog } from '../src/features/search/SearchDialog';
import { Quiz } from '../src/features/learn/Quiz';
import { LessonPage } from '../src/features/learn/LessonPage';
import { ProgressPage } from '../src/features/progress/ProgressPage';
import HashMapSimulator from '../src/visualizations/hashmap/HashMapSimulator';
import ArrayListSimulator from '../src/visualizations/arraylist/ArrayListSimulator';
import HierarchyExplorer from '../src/visualizations/hierarchy/HierarchyExplorer';
import { assessmentById } from '../content/assessments';
import { progressStore } from '../src/features/progress/useProgress';
import { lessonPath, publishedLessons } from '../src/content';

function LocationProbe() {
  const loc = useLocation();
  return <output data-testid="location">{loc.pathname + loc.search}</output>;
}

describe('SearchDialog', () => {
  it('searches lesson content and navigates with the keyboard', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <MemoryRouter>
        <SearchDialog onClose={() => (closed = true)} />
        <LocationProbe />
      </MemoryRouter>,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'removeEldestEntry');
    const options = await screen.findAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(closed).toBe(true);
    expect(screen.getByTestId('location').textContent).toContain('/learn/maps/linkedhashmap-and-lru-cache');
  });

  it('closes on Escape and explains empty results', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <MemoryRouter>
        <SearchDialog onClose={() => (closed = true)} />
      </MemoryRouter>,
    );
    await user.type(screen.getByRole('combobox'), 'zzzqqqxxv');
    expect(await screen.findByRole('status')).toHaveTextContent('No results');
    await user.keyboard('{Escape}');
    expect(closed).toBe(true);
  });
});

describe('Quiz', () => {
  it('scores answers, reveals explanations and reports the result', async () => {
    const user = userEvent.setup();
    const assessment = assessmentById.get('a-m07-linkedhashmap-lru')!;
    let result: [number, number] | null = null;
    render(<Quiz assessment={assessment} onSubmit={(s, t) => (result = [s, t])} />);
    const submit = screen.getByRole('button', { name: 'Submit answers' });
    expect(submit).toBeDisabled();
    for (const [i, q] of assessment.questions.entries()) {
      const group = screen.getByRole('group', { name: `Question ${i + 1}` });
      await user.click(within(group).getAllByRole('radio')[q.answerIndex]);
    }
    await user.click(submit);
    expect(result).toEqual([assessment.questions.length, assessment.questions.length]);
    expect(screen.getByRole('status')).toHaveTextContent('passed');
    expect(screen.getByText(assessment.questions[0].explanation)).toBeInTheDocument();
  });
});

describe('LessonPage', () => {
  const lesson = publishedLessons.find((l) => l.id === 'm07-hashmap-hashing')!;

  it('renders all 18 sections, metadata, examples with verified output, and records the visit', async () => {
    render(
      <MemoryRouter initialEntries={[lessonPath(lesson)]}>
        <Routes>
          <Route path="/learn/:moduleSlug/:lessonSlug" element={<LessonPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: lesson.title })).toBeInTheDocument();
    expect(screen.getByText(`${lesson.readingMinutes} min read`, { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelectorAll('#lesson-body h2')).toHaveLength(18), { timeout: 10_000 });
    const ids = Array.from(document.querySelectorAll('#lesson-body h2')).map((h) => h.id);
    expect(ids[0]).toBe('1-learning-objectives');
    expect(ids[17]).toBe('18-official-references');
    for (const objective of lesson.objectives) expect(screen.getByText(objective)).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('lesson-body')!.textContent).toContain('package dev.handbook.m07;'), { timeout: 10_000 });
    await waitFor(() => expect(screen.getAllByText(/verified by ExpectedOutputTest/).length).toBeGreaterThan(0));
    expect(document.getElementById('lesson-body')!.textContent).toContain('bucket 0 holds [Aa, BB]');
    expect(progressStore.getState().lastVisited?.lessonId).toBe(lesson.id);
  });

  it('toggles milestones and bookmarks', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[lessonPath(lesson)]}>
        <Routes>
          <Route path="/learn/:moduleSlug/:lessonSlug" element={<LessonPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Bookmark this lesson' }));
    expect(progressStore.getState().bookmarks).toContain(lesson.id);
    const concept = await screen.findByRole('checkbox', { name: /Concept understood/ }, { timeout: 10_000 });
    await user.click(concept);
    expect(progressStore.getState().lessons[lesson.id].conceptUnderstood).toBeTruthy();
  });
});

describe('ProgressPage', () => {
  it('imports a progress file and rejects an invalid one without losing data', async () => {
    progressStore.toggleBookmark('m02-big-o');
    render(
      <MemoryRouter>
        <ProgressPage />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText('Progress file to import');
    const bad = new File(['{"version":9}'], 'bad.json', { type: 'application/json' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [bad] } });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed');
    expect(progressStore.getState().bookmarks).toEqual(['m02-big-o']);

    const good = new File([JSON.stringify({ version: 1, lessons: {}, bookmarks: ['m03-sequenced'] })], 'good.json', { type: 'application/json' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [good] } });
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Imported');
    expect(progressStore.getState().bookmarks).toEqual(['m03-sequenced']);
  });
});

describe('visualizations', () => {
  it('HashMap simulator steps through a put and shows the computed bucket', async () => {
    const user = userEvent.setup();
    render(<HashMapSimulator />);
    await user.click(screen.getByRole('button', { name: 'put' }));
    expect(screen.getAllByText(/1993768940/).length).toBeGreaterThan(0); // "ORD-1001".hashCode()
    const step = screen.getByRole('button', { name: /Step/ });
    while (!step.hasAttribute('disabled')) await user.click(step);
    expect(screen.getByLabelText(/Bucket 10: ORD-1001/)).toBeInTheDocument();
  });

  it('HashMap scenario reaches a tree bin', async () => {
    const user = userEvent.setup();
    render(<HashMapSimulator />);
    await user.click(screen.getByRole('button', { name: /collisions & treeify/ }));
    await user.click(screen.getByRole('button', { name: /Finish/ }));
    expect(screen.getAllByLabelText(/\(tree bin\)/).length).toBe(1);
  });

  it('ArrayList simulator grows from 10 to 15 on the 11th add', async () => {
    const user = userEvent.setup();
    render(<ArrayListSimulator />);
    await user.click(screen.getByRole('button', { name: /addAll/ })); // 10 elements
    expect(screen.getByTestId('al-capacity')).toHaveTextContent('10');
    await user.click(screen.getByRole('button', { name: 'add(value)' }));
    expect(screen.getByTestId('al-capacity')).toHaveTextContent('15');
  });

  it('Hierarchy explorer shows details for a selected type', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HierarchyExplorer />
      </MemoryRouter>,
    );
    const items = screen.getAllByRole('treeitem');
    expect(items.length).toBeGreaterThan(20);
    await user.click(screen.getAllByRole('button', { name: /^LinkedList/ })[0]);
    expect(screen.getAllByText(/Deque/).length).toBeGreaterThan(0);
  });
});
