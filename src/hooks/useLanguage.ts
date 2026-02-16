// ═══════════════════════════════════════
// AIdark — Language Hook
// ═══════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { getLang, setLang, t as translate, type Lang } from '@/lib/i18n';

export function useLanguage() {
  const [lang, _setLang] = useState<Lang>(getLang());

  useEffect(() => {
    const handler = () => _setLang(getLang());
    window.addEventListener('langchange', handler);
    return () => window.removeEventListener('langchange', handler);
  }, []);

  const changeLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    _setLang(newLang);
  }, []);

  const t = useCallback((key: string) => translate(key), [lang]);

  return { lang, changeLang, t };
}
