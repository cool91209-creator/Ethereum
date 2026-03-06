'use client';

import { useState, useEffect } from 'react';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';

export function LocaleSwitcher() {
  const [current, setCurrent] = useState<Locale>('en');

  useEffect(() => {
    // Initialize from URL ?locale= or cookie NEXT_LOCALE
    try {
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
    // Also append locale to URL to be robust in environments where cookies are restricted
    const url = new URL(window.location.href);
    url.searchParams.set('locale', locale);
    window.location.href = url.toString();
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
