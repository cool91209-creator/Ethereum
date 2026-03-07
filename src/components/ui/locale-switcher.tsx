'use client';

import { useState, useEffect } from 'react';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';

export function LocaleSwitcher() {
  const [current, setCurrent] = useState<Locale>('en');

  useEffect(() => {
    // Initialize from pathname (/zh, /vi, /en), then ?locale=, then cookie NEXT_LOCALE
    try {
      const pathLocale = window.location.pathname.split('/')[1] as Locale | '';
      if (pathLocale && locales.includes(pathLocale)) {
        setCurrent(pathLocale);
        return;
      }

      const urlLocale = new URL(window.location.href).searchParams.get('locale') as Locale | null;
      if (urlLocale && locales.includes(urlLocale)) {
        setCurrent(urlLocale);
        return;
      }

      const cookie = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('NEXT_LOCALE='));
      if (cookie) {
        const val = cookie.split('=')[1] as Locale;
        if (val && locales.includes(val)) setCurrent(val);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleChange = (locale: Locale) => {
    setCurrent(locale);
    // Set cookie and reload so server-side messages pick up the new locale
    try {
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`;
    } catch (e) {
      /* ignore */
    }
    // Prefer route-based locale: preserve the rest of the path when switching
    try {
      const pathname = window.location.pathname;
      const parts = pathname.split('/');
      const rest = parts.length > 2 ? '/' + parts.slice(2).join('/') : '';
      const newUrl = `${window.location.origin}/${locale}${rest}${window.location.search}${window.location.hash}`;
      window.location.href = newUrl;
      return;
    } catch (e) {
      // fallback to query param
      const url = new URL(window.location.href);
      url.searchParams.set('locale', locale);
      window.location.href = url.toString();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => handleChange(locale)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            current === locale
              ? 'bg-blue-500 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {localeNames[locale]}
        </button>
      ))}
    </div>
  );
}
