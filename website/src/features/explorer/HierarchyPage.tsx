import { Link } from 'react-router-dom';
import HierarchyExplorer from '../../visualizations/hierarchy/HierarchyExplorer';
import { getLesson, lessonPath } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function HierarchyPage() {
  useDocumentTitle('Collections hierarchy explorer');
  const lesson = getLesson('m03-hierarchy')!;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link to="/reference" className="hover:underline">
          Reference
        </Link>{' '}
        / Hierarchy explorer
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Collections Framework hierarchy</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Explained in depth in <Link className="link" to={lessonPath(lesson)}>{lesson.title}</Link>.
      </p>
      <HierarchyExplorer />
    </div>
  );
}
