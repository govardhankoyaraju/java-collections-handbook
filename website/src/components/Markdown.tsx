import { lazy, memo, Suspense, useMemo, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { Link } from 'react-router-dom';
import type { Element, ElementContent } from 'hast';
import { CALLOUTS, parseMeta, remarkHandbook, type CalloutKind } from '../utils/remarkHandbook';
import { CodeBlock } from './CodeBlock';
import { JavaExample } from './JavaExample';

const Visualization = lazy(() => import('../visualizations/Visualization'));

function textOf(node: ElementContent | Element): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

export interface MarkdownProps {
  source: string;
  /** Rendered where a ```objectives``` block appears. */
  objectives?: string[];
}

function buildComponents(objectives: string[] | undefined): Components {
  return {
    pre({ node }) {
      const code = node?.children[0];
      if (!code || code.type !== 'element' || code.tagName !== 'code') return <pre />;
      const classes = (code.properties.className as string[] | undefined) ?? [];
      const language = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length);
      const meta = parseMeta(code.properties.dataMeta as string | undefined);
      const text = textOf(code);
      if (language === 'example') {
        return (
          <>
            {text
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .map((ref) => (
                <JavaExample key={ref} refId={ref} />
              ))}
          </>
        );
      }
      if (language === 'viz') {
        return (
          <Suspense fallback={<p className="text-sm text-slate-500">Loading visualization…</p>}>
            <Visualization id={text.trim()} />
          </Suspense>
        );
      }
      if (language === 'objectives') {
        return (
          <ul>
            {(objectives ?? []).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        );
      }
      const badge = meta.badge ?? (language === 'java' ? 'Excerpt — not a complete program' : undefined);
      return <CodeBlock code={text} language={language} title={meta.title} badge={badge} />;
    },
    blockquote({ node, children }) {
      const kind = node?.properties?.dataCallout as CalloutKind | undefined;
      if (!kind) return <blockquote>{children}</blockquote>;
      return (
        <aside className={`callout callout-${kind.toLowerCase()} not-prose-p`} role="note" aria-label={CALLOUTS[kind]}>
          <p className="callout-label">{CALLOUTS[kind]}</p>
          {children}
        </aside>
      );
    },
    table({ children }) {
      return (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table>{children}</table>
        </div>
      );
    },
    a({ href, children }) {
      if (href?.startsWith('/')) return <Link to={href}>{children as ReactNode}</Link>;
      return (
        <a href={href} target="_blank" rel="noreferrer noopener">
          {children}
        </a>
      );
    },
  };
}

const remarkPlugins = [remarkGfm, remarkHandbook];
const rehypePlugins = [rehypeRaw, rehypeSlug];

/**
 * Memoized: component identities must stay stable across parent re-renders, otherwise embedded
 * examples and visualizations would remount (and lose their state) whenever the page re-renders.
 */
export const Markdown = memo(function Markdown({ source, objectives }: MarkdownProps) {
  const objectivesKey = (objectives ?? []).join('\u0000');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const components = useMemo(() => buildComponents(objectives), [objectivesKey]);
  return useMemo(
    () => (
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {source}
      </ReactMarkdown>
    ),
    [source, components],
  );
});
