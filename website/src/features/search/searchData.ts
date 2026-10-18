import { lessonBodyKey, lessonPath, getModule, publishedLessons } from '../../content';
import { staticPages } from '../../app/staticPages';
import { markdownToText, slugify, splitSections, type SearchDoc } from './searchIndex';

// Eager here, but this module is only loaded (dynamically) when search is first opened.
const bodies = import.meta.glob<string>('../../../content/**/*.md', { query: '?raw', import: 'default', eager: true });

export function buildDocuments(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const lesson of publishedLessons) {
    const module = getModule(lesson.moduleId)!;
    const context = `Module ${module.number} · ${module.title}`;
    docs.push({
      id: lesson.id,
      title: lesson.title,
      context,
      text: `${lesson.description} ${lesson.objectives.join(' ')}`,
      keywords: lesson.keywords.join(' '),
      path: lessonPath(lesson),
      kind: 'lesson',
    });
    const body = bodies[lessonBodyKey(lesson.contentPath).replace('../../', '../../../')];
    if (!body) continue;
    for (const { heading, body: sectionBody } of splitSections(body)) {
      docs.push({
        id: `${lesson.id}#${slugify(heading)}`,
        title: heading.replace(/^\d+\.\s*/, ''),
        context: lesson.title,
        text: markdownToText(sectionBody),
        keywords: '',
        path: lessonPath(lesson, slugify(heading)),
        kind: 'section',
      });
    }
  }
  for (const page of staticPages) {
    docs.push({ id: `page:${page.path}`, title: page.title, context: page.section, text: page.description, keywords: page.keywords, path: page.path, kind: 'page' });
  }
  return docs;
}
