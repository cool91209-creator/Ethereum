import { DashboardHeaderSkeleton } from '@/features/dashboard/components/dashboard-header-skeleton';
import { ContractsTableSkeleton } from '@/features/contracts/components/contracts-table-skeleton';
import { MetricsChartSkeleton } from '@/features/metrics/components/metrics-chart-skeleton';

/**
 * Route-level loading UI.
 * Shown while the server component (page.tsx) is streaming.
 * Skeletons match the actual layout shape.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-screen">
      <DashboardHeaderSkeleton />
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto bg-white">
          <ContractsTableSkeleton />
        </div>
        {/* Detail panel skeleton removed */}
      </div>
      <MetricsChartSkeleton />
    </div>
  );
}
