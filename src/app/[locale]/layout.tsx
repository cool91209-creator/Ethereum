import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { locales, type Locale } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Ethereum Airdrop Dashboard',
  description: 'Ethereum airdrop contract management dashboard',
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> | { locale: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const localeParam = resolvedParams.locale as Locale;
  if (!locales.includes(localeParam)) {
    notFound();
  }

  setRequestLocale(localeParam);

  const messages = (await import(`@/lib/i18n/messages/${localeParam}.json`)).default;

  return (
    <NextIntlClientProvider locale={localeParam} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
