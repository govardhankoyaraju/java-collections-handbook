import { describe, expect, it } from 'vitest';
import { createSearchIndex, makeSnippet, markdownToText, slugify, splitSections } from '../src/features/search/searchIndex';
import { buildDocuments } from '../src/features/search/searchData';
import { publishedLessons } from '../src/content';

describe('search index helpers', () => {
  it('slugifies headings like rehype-slug', () => {
    expect(slugify('1. Learning Objectives')).toBe('1-learning-objectives');
    expect(slugify('13. Alternatives and Trade-offs')).toBe('13-alternatives-and-trade-offs');
  });

  it('splits sections and ignores headings inside code fences', () => {
    const md = '## A\ntext\n```java\n## not a heading\n```\n## B\nmore';
    expect(splitSections(md).map((s) => s.heading)).toEqual(['A', 'B']);
  });

  it('strips markdown for indexing', () => {
    expect(markdownToText('**bold** [link](/x) `code` > [!NOTE] note')).toBe('bold link code note');
  });

  it('makes snippets around the first matching term', () => {
    const text = 'a'.repeat(200) + ' treeify ' + 'b'.repeat(200);
    expect(makeSnippet(text, ['treeify'])).toContain('treeify');
  });
});

describe('search over real content', () => {
  const docs = buildDocuments();
  const index = createSearchIndex(docs);

  it('indexes every published lesson and its 18 sections', () => {
    for (const lesson of publishedLessons) {
      expect(docs.filter((d) => d.id.startsWith(`${lesson.id}#`))).toHaveLength(18);
      expect(docs.some((d) => d.id === lesson.id)).toBe(true);
    }
  });

  it('finds deep technical terms and links to the right lesson section', () => {
    const results = index.search('treeify');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path.startsWith('/learn/maps/hashmap-internals-collisions-and-resizing'))).toBe(true);
    const lru = index.search('removeEldestEntry');
    expect(lru[0].path).toContain('linkedhashmap-and-lru-cache');
  });

  it('supports prefix and fuzzy matching and returns nothing for very short queries', () => {
    expect(index.search('sequen').length).toBeGreaterThan(0);
    expect(index.search('hashmao').length).toBeGreaterThan(0);
    expect(index.search('a')).toEqual([]);
  });

  it('finds standalone pages', () => {
    expect(index.search('hierarchy explorer').some((r) => r.path === '/reference/hierarchy')).toBe(true);
  });
});
