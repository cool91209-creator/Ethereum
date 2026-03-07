import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardShell } from '@/features/dashboard/components/dashboard-shell';
import type { DashboardSummary, ContractsResponse } from '@/types';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

async function fetchDashboard(): Promise<DashboardSummary> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[SSR] Failed to fetch dashboard:', err);
    return { ethPrice: 0, ethPriceChange: 0, gasPrice: 0, totalTokenFee: 0 };
  }
}

async function fetchContracts(): Promise<ContractsResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/contracts?page=1&pageSize=20`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[SSR] Failed to fetch contracts:', err);
    return {
      data: [],
      totals: {
        totalAirdropQuantity: 0,
        totalAirdropToday: 0,
        totalTokenFee: 0,
        totalGasCost: 0,
        totalCost: 0,
        totalAverageCost: 0,
        grandCumulativeQuantity: 0,
      },
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };
  }
}

export default async function DashboardPage() {
  const [summary, initialContracts] = await Promise.all([
    fetchDashboard(),
    fetchContracts(),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader summary={summary} />
      <DashboardShell initialContracts={initialContracts} />
    </div>
  );
}
