import { Link, useParams } from 'react-router-dom';
import ArrayListSimulator from '../../visualizations/arraylist/ArrayListSimulator';
import HashMapSimulator from '../../visualizations/hashmap/HashMapSimulator';
import { getLesson, lessonPath } from '../../content';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { NotFoundPage } from '../../app/NotFoundPage';

const MODELS = {
  arraylist: { title: 'ArrayList capacity simulator', Component: ArrayListSimulator, lesson: 'm05-arraylist-internals' },
  hashmap: { title: 'HashMap bucket and resize simulator', Component: HashMapSimulator, lesson: 'm07-hashmap-collisions-resizing' },
} as const;

export default function ModelPage() {
  const { modelId = '' } = useParams();
  const model = MODELS[modelId as keyof typeof MODELS];
  useDocumentTitle(model?.title ?? 'Model');
  if (!model) return <NotFoundPage />;
  const lesson = getLesson(model.lesson)!;
  const { Component } = model;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link to="/reference" className="hover:underline">
          Reference
        </Link>{' '}
        / {model.title}
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{model.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Explained in <Link className="link" to={lessonPath(lesson)}>{lesson.title}</Link>.
      </p>
      <Component />
    </div>
  );
}
