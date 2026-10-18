import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from '../layouts/SiteLayout';
import { HomePage } from '../features/learn/HomePage';
import { LearnIndexPage } from '../features/learn/LearnIndexPage';
import { ModulePage } from '../features/learn/ModulePage';
import { PracticePage } from '../features/practice/PracticePage';
import { ReferencePage } from '../features/reference/ReferencePage';
import { ComplexityPage } from '../features/reference/ComplexityPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { NotFoundPage } from './NotFoundPage';

const HierarchyPage = lazy(() => import('../features/explorer/HierarchyPage'));
const ModelPage = lazy(() => import('../features/explorer/ModelPage'));
// The lesson page pulls in the Markdown pipeline and syntax highlighter: load it on demand.
const LessonPage = lazy(() => import('../features/learn/LessonPage').then((m) => ({ default: m.LessonPage })));

const loading = <p className="mx-auto max-w-4xl p-6 text-slate-500">Loading…</p>;

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="learn" element={<LearnIndexPage />} />
        <Route path="learn/:moduleSlug" element={<ModulePage />} />
        <Route
          path="learn/:moduleSlug/:lessonSlug"
          element={
            <Suspense fallback={loading}>
              <LessonPage />
            </Suspense>
          }
        />
        <Route path="practice" element={<PracticePage />} />
        <Route path="reference" element={<ReferencePage />} />
        <Route path="reference/complexity" element={<ComplexityPage />} />
        <Route
          path="reference/hierarchy"
          element={
            <Suspense fallback={loading}>
              <HierarchyPage />
            </Suspense>
          }
        />
        <Route
          path="reference/models/:modelId"
          element={
            <Suspense fallback={loading}>
              <ModelPage />
            </Suspense>
          }
        />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
