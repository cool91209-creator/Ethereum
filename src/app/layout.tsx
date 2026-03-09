import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { defaultLocale } from '@/lib/i18n/config';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ethereum Airdrop Dashboard',
  description: 'Ethereum airdrop contract management dashboard',
};

/**
 * Root Layout - Server Component
 * Wraps the entire app with i18n provider and global styles.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale: string;
  let messages: any;

  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch {
    locale = defaultLocale;
    messages = (await import(`@/lib/i18n/messages/${defaultLocale}.json`)).default;
  }

  // Fallback if messages is null/undefined
  if (!messages) {
    messages = (await import(`@/lib/i18n/messages/${defaultLocale}.json`)).default;
  }

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
