import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        This address does not match any page. If it pointed to a lesson, the lesson may not be written yet.
      </p>
      <p className="mt-6">
        <Link className="link" to="/learn">
          Browse the curriculum
        </Link>
      </p>
    </div>
  );
}
