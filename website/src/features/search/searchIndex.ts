import MiniSearch from 'minisearch';

/** One searchable unit: a lesson section, a lesson summary, or a standalone page. */
export interface SearchDoc {
  id: string;
  title: string;
  /** Lesson or page the result belongs to (shown as context). */
  context: string;
  text: string;
  keywords: string;
  /** Router path (may include ?s=section). */
  path: string;
  kind: 'lesson' | 'section' | 'page';
}

export interface SearchResult {
  id: string;
  title: string;
  context: string;
  path: string;
  kind: SearchDoc['kind'];
  snippet: string;
}

/** GitHub-compatible heading slug (matches rehype-slug for the headings we write). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** Strips Markdown syntax enough for indexing; fenced code is kept only as identifiers. */
export function markdownToText(md: string): string {
  return md
    .replace(/```[a-z]*\n([\s\S]*?)```/g, (_m, code: string) => code.replace(/[^\w\s.()]/g, ' '))
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, ' ')
    .replace(/\[!\w+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits a lesson body into its `## ` sections, skipping headings inside code fences. */
export function splitSections(md: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    const m = !inFence && /^## (.+)$/.exec(line);
    if (m) {
      if (current) sections.push({ heading: current.heading, body: current.lines.join('\n') });
      current = { heading: m[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.lines.join('\n') });
  return sections;
}

export function createSearchIndex(docs: SearchDoc[]) {
  const mini = new MiniSearch<SearchDoc>({
    fields: ['title', 'keywords', 'text', 'context'],
    storeFields: ['title', 'context', 'path', 'kind', 'text'],
    searchOptions: {
      boost: { title: 4, keywords: 3, context: 1.5, text: 1 },
      prefix: true,
      fuzzy: 0.15,
      combineWith: 'AND',
    },
  });
  mini.addAll(docs);

  return {
    size: docs.length,
    search(query: string, limit = 12): SearchResult[] {
      const q = query.trim();
      if (q.length < 2) return [];
      let hits = mini.search(q);
      if (hits.length === 0) hits = mini.search(q, { combineWith: 'OR' });
      return hits.slice(0, limit).map((h) => ({
        id: h.id as string,
        title: h.title as string,
        context: h.context as string,
        path: h.path as string,
        kind: h.kind as SearchDoc['kind'],
        snippet: makeSnippet(h.text as string, h.terms),
      }));
    },
  };
}

export type SearchIndex = ReturnType<typeof createSearchIndex>;

export function makeSnippet(text: string, terms: string[], radius = 70): string {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    pos = lower.indexOf(t.toLowerCase());
    if (pos >= 0) break;
  }
  if (pos < 0) return text.slice(0, radius * 2) + (text.length > radius * 2 ? '…' : '');
  const start = Math.max(0, pos - radius);
  const end = Math.min(text.length, pos + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
