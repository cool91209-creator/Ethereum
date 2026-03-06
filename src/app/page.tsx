import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';
import { generateMockDashboardSummary } from '@/mocks/dashboard';
import { generateMockContractsResponse } from '@/mocks/contracts';

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
export default async function DashboardPage() {
  // SSR: Fetch initial data server-side
  const summary = generateMockDashboardSummary();
  // Start with an empty contracts list — rows are added by the Contract Config flow
  const initialContracts = {
    data: [],
    totals: {
      totalAirdropQuantity: 0,
      totalTokenFee: 0,
      totalGasCost: 0,
      totalCost: 0,
      totalAverageCost: 0,
      grandCumulativeQuantity: 0,
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
  };

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader summary={summary} />
      <DashboardShell initialContracts={initialContracts} />
    </div>
  );
}
