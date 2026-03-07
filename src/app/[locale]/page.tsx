import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';
import { generateMockDashboardSummary } from '@/mocks/dashboard';

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
