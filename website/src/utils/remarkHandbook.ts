import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Code, Paragraph, Text } from 'mdast';

export const CALLOUTS = {
  NOTE: 'Note',
  TIP: 'Tip',
  WARNING: 'Warning',
  CONTRACT: 'API contract (guaranteed by the specification)',
  IMPL: 'JDK implementation detail (OpenJDK 25; may change)',
  MODEL: 'Educational model (not exact JVM state)',
} as const;

export type CalloutKind = keyof typeof CALLOUTS;

/**
 * - Copies a fenced code block's meta string (```java title="..."```) to a data attribute.
 * - Turns `> [!CONTRACT]`-style blockquotes into labelled callouts.
 */
export function remarkHandbook() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code) => {
      if (node.meta) {
        node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), 'data-meta': node.meta } };
      }
    });
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0] as Paragraph | undefined;
      const text = first?.type === 'paragraph' ? (first.children[0] as Text | undefined) : undefined;
      const m = text?.type === 'text' ? /^\[!(\w+)]\s*/.exec(text.value) : null;
      if (!m || !(m[1] in CALLOUTS) || !text) return;
      text.value = text.value.slice(m[0].length);
      node.data = { ...node.data, hProperties: { 'data-callout': m[1] } };
    });
  };
}

export function parseMeta(meta: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!meta) return out;
  for (const m of meta.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}
