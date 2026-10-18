import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Java Collections & Utilities Handbook` : 'Java Collections & Utilities Handbook';
  }, [title]);
}
