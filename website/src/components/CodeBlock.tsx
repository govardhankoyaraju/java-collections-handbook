import { useMemo } from 'react';
import { highlight } from '../utils/highlight';
import { CopyButton } from './CopyButton';

export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  /** Short label shown on the right of the header, e.g. "Excerpt" or "Runnable". */
  badge?: string;
  maxHeight?: number;
}

export function CodeBlock({ code, language, title, badge, maxHeight }: CodeBlockProps) {
  const trimmed = code.replace(/\n$/, '');
  const html = useMemo(() => highlight(trimmed, language), [trimmed, language]);
  return (
    <figure className="code-block not-prose my-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900">
      <figcaption className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700/80 dark:text-slate-400">
        <span className="truncate font-mono">{title ?? language ?? 'text'}</span>
        <span className="flex shrink-0 items-center gap-2">
          {badge && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {badge}
            </span>
          )}
          <CopyButton text={trimmed} />
        </span>
      </figcaption>
      <pre
        className="overflow-x-auto p-4 text-[13px] leading-relaxed"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
        tabIndex={0}
        aria-label={title ? `Code: ${title}` : 'Code block'}
      >
        <code className={`hljs language-${language ?? 'text'}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </figure>
  );
}
