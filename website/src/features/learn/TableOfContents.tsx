import { useEffect, useState } from 'react';

export interface TocItem {
  id: string;
  text: string;
}

/** Reads headings from the rendered article so ids always match what rehype-slug produced. */
export function useHeadings(containerId: string, deps: unknown[]): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([]);
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const read = () => {
      const next = Array.from(el.querySelectorAll('h2[id]')).map((h) => ({ id: h.id, text: h.textContent ?? '' }));
      // Only update when the headings actually changed; code highlighting and lazy examples mutate the DOM too.
      setItems((prev) =>
        prev.length === next.length && prev.every((p, i) => p.id === next[i].id && p.text === next[i].text) ? prev : next,
      );
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { childList: true });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return items;
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  return true;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-64px 0px -70% 0px' },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">On this page</p>
      <ol className="space-y-1 border-l border-slate-200 dark:border-slate-800">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(i.id);
                setActive(i.id);
              }}
              className={`-ml-px block border-l py-0.5 pl-3 ${active === i.id ? 'border-sky-600 font-medium text-sky-800 dark:text-sky-300' : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
