import { describe, expect, it } from 'vitest';
import { findLesson, getModuleBySlug, hasExample, lessonPath, loadExample, loadLessonBody, modules, neighbours, publishedLessons } from '../src/content';
import { assessmentById } from '../content/assessments';

describe('curriculum metadata', () => {
  it('has 26 modules and resolves every published lesson by route', () => {
    expect(modules).toHaveLength(26);
    for (const l of publishedLessons) {
      const [, , moduleSlug, lessonSlug] = lessonPath(l).split('/');
      expect(findLesson(moduleSlug, lessonSlug)).toBe(l);
      expect(getModuleBySlug(moduleSlug)?.id).toBe(l.moduleId);
      expect(assessmentById.get(l.assessmentId)?.lessonId).toBe(l.id);
      l.examples.forEach((e) => expect(hasExample(e), e).toBe(true));
    }
  });

  it('links lessons in curriculum order', () => {
    const first = publishedLessons[0];
    const last = publishedLessons[publishedLessons.length - 1];
    expect(neighbours(first.id).prev).toBeUndefined();
    expect(neighbours(first.id).next).toBe(publishedLessons[1]);
    expect(neighbours(last.id).next).toBeUndefined();
  });

  it('loads lesson bodies, sources and verified outputs', async () => {
    const body = await loadLessonBody(publishedLessons[0]);
    expect(body).toContain('## 18. Official References');
    const ex = await loadExample('m07/HashMapIndexing');
    expect(ex.source).toContain('package dev.handbook.m07;');
    expect(ex.output).toContain('bucket 0 holds [Aa, BB]');
    const library = await loadExample('m07/LruCache');
    expect(library.output).toBeUndefined();
  });
});
