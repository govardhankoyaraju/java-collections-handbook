import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without async clipboard permission.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    document.body.removeChild(area);
    return ok;
  }
}

export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copyText(text);
        setState(ok ? 'copied' : 'failed');
        window.setTimeout(() => setState('idle'), 1800);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
      aria-label={label}
    >
      {state === 'copied' ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}</span>
    </button>
  );
}
