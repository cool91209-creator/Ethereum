import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n/config';

// Redirect root to default locale route
export default function RootPageRedirect() {
  redirect(`/${defaultLocale}`);
}

/**
 * Main Dashboard Page - Server Component
 *
 * SSR Strategy:
 * - Dashboard summary (header) is fetched server-side for fast first paint
 * - Initial contracts data is fetched server-side and passed to client component
 * - The DashboardShell (client) handles interactive table/chart behavior with CSR
 *
 * BACKEND INTEGRATION:
 * Replace generateMock* calls with:
 *   const summary = await fetchDashboardSummary();
 *   const contracts = await fetchContracts({ page: 1, pageSize: 20 });
 */
/*
 Dashboard root is a redirect to `/${defaultLocale}`. The actual dashboard page
 lives under the dynamic locale route at `src/app/[locale]/page.tsx`.
*/
