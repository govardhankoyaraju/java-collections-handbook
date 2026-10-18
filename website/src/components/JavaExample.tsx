import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { exampleClassName, exampleSourcePath, loadExample } from '../content';
import { CodeBlock } from './CodeBlock';

/** Renders a runnable example straight from java-examples/, plus its test-verified output. */
export function JavaExample({ refId }: { refId: string }) {
  const [data, setData] = useState<{ source: string; output?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadExample(refId)
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [refId]);

  if (error) return <p className="text-red-700 dark:text-red-400">Could not load example {refId}: {error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading example {refId}…</p>;

  const command = `cd java-examples && ./gradlew run -q -PmainClass=${exampleClassName(refId)}`;
  return (
    <section className="not-prose my-6" aria-label={`Runnable example ${refId}`}>
      <CodeBlock code={data.source} language="java" title={exampleSourcePath(refId)} badge="Runnable · compiled & tested" maxHeight={560} />
      <div className="-mt-3 rounded-b-lg border border-t-0 border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700/80 dark:bg-slate-950">
        <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Play size={12} aria-hidden /> Run it
        </p>
        <code className="mt-1 block overflow-x-auto whitespace-pre font-mono text-[12px] text-slate-700 dark:text-slate-300">{command}</code>
      </div>
      {data.output ? (
        <CodeBlock
          code={data.output}
          language="text"
          title="Expected output (Temurin 25, verified by ExpectedOutputTest)"
          badge="Real JVM output"
        />
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          No expected output is shown for this example: it is either a library class used by another example or its output is
          nondeterministic (see the explanation in the text).
        </p>
      )}
    </section>
  );
}
