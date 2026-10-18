import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';

hljs.registerLanguage('java', java);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Returns safe HTML: highlight.js escapes its input; unknown languages are escaped verbatim. */
export function highlight(code: string, language: string | undefined): string {
  if (language && hljs.getLanguage(language)) {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  }
  return escapeHtml(code);
}
