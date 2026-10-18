import { levels, modules } from '../../content/curriculum.ts';
import type { Module, PublishedLesson } from '../../content/types.ts';

export { levels, modules };
export type { Module, PublishedLesson };

export const publishedLessons: PublishedLesson[] = modules.flatMap((m) =>
  m.lessons.filter((l): l is PublishedLesson => l.status === 'published'),
);

const lessonById = new Map(publishedLessons.map((l) => [l.id, l]));
const moduleById = new Map(modules.map((m) => [m.id, m]));

export function getLesson(id: string): PublishedLesson | undefined {
  return lessonById.get(id);
}

export function getModule(id: string): Module | undefined {
  return moduleById.get(id);
}

export function getModuleBySlug(slug: string): Module | undefined {
  return modules.find((m) => m.slug === slug);
}

export function findLesson(moduleSlug: string, lessonSlug: string): PublishedLesson | undefined {
  const module = getModuleBySlug(moduleSlug);
  return publishedLessons.find((l) => l.moduleId === module?.id && l.slug === lessonSlug);
}

export function lessonPath(lesson: PublishedLesson, section?: string): string {
  const module = moduleById.get(lesson.moduleId)!;
  const base = `/learn/${module.slug}/${lesson.slug}`;
  return section ? `${base}?s=${encodeURIComponent(section)}` : base;
}

export function modulePath(module: Module): string {
  return `/learn/${module.slug}`;
}

/** Previous/next published lesson in curriculum order. */
export function neighbours(lessonId: string): { prev?: PublishedLesson; next?: PublishedLesson } {
  const i = publishedLessons.findIndex((l) => l.id === lessonId);
  return { prev: i > 0 ? publishedLessons[i - 1] : undefined, next: i >= 0 ? publishedLessons[i + 1] : undefined };
}

export function publishedIn(module: Module): PublishedLesson[] {
  return module.lessons.filter((l): l is PublishedLesson => l.status === 'published');
}

export const plannedLessonCount = modules.reduce((n, m) => n + m.lessons.filter((l) => l.status === 'planned').length, 0);

// ---------------------------------------------------------------------------------------------
// Lazy loaders. Lesson bodies, Java sources and verified outputs become separate chunks.
// ---------------------------------------------------------------------------------------------

const lessonBodies = import.meta.glob<string>('../../content/**/*.md', { query: '?raw', import: 'default' });
const javaSources = import.meta.glob<string>('../../../java-examples/src/main/java/dev/handbook/**/*.java', {
  query: '?raw',
  import: 'default',
});
const expectedOutputs = import.meta.glob<string>('../../../java-examples/src/test/resources/expected-output/*.txt', {
  query: '?raw',
  import: 'default',
});

export function lessonBodyKey(contentPath: string): string {
  return `../../content/${contentPath}`;
}

export async function loadLessonBody(lesson: PublishedLesson): Promise<string> {
  const loader = lessonBodies[lessonBodyKey(lesson.contentPath)];
  if (!loader) throw new Error(`Missing lesson body ${lesson.contentPath}`);
  return loader();
}

export function exampleSourcePath(ref: string): string {
  return `java-examples/src/main/java/dev/handbook/${ref}.java`;
}

export function exampleClassName(ref: string): string {
  return `dev.handbook.${ref.replace('/', '.')}`;
}

export function hasExample(ref: string): boolean {
  return `../../../${exampleSourcePath(ref)}` in javaSources;
}

export async function loadExample(ref: string): Promise<{ source: string; output?: string }> {
  const loader = javaSources[`../../../${exampleSourcePath(ref)}`];
  if (!loader) throw new Error(`Unknown example ${ref}`);
  const simpleName = ref.split('/').pop()!;
  const outputLoader = expectedOutputs[`../../../java-examples/src/test/resources/expected-output/${simpleName}.txt`];
  const [source, output] = await Promise.all([loader(), outputLoader ? outputLoader() : Promise.resolve(undefined)]);
  return { source, output };
}

export const difficultyLabel: Record<PublishedLesson['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  architect: 'Architect',
};
