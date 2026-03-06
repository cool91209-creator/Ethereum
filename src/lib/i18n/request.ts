import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, type Locale } from './config';

export default getRequestConfig(async (req) => {
  // Detect locale from URL query `?locale=`, then cookie `NEXT_LOCALE`, then default
  try {
    const url = new URL(req.url);
    const localeQuery = url.searchParams.get('locale');
    const cookieLocale = (req.cookies && req.cookies.get && req.cookies.get('NEXT_LOCALE')?.value) || undefined;
    const locale = (localeQuery || cookieLocale || defaultLocale) as Locale;

    return {
      locale,
      messages: (await import(`./messages/${locale}.json`)).default,
    };
  } catch (err) {
    // Fallback to default locale
    return {
      locale: defaultLocale,
      messages: (await import(`./messages/${defaultLocale}.json`)).default,
    };
  }
});
