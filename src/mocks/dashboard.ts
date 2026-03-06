import type { DashboardSummary } from '@/types';

export function generateMockDashboardSummary(): DashboardSummary {
  return {
    ethPrice: 2031.11,
    ethPriceChange: -1.53,
    gasPrice: 0.038,
    totalAirdropAmount: 5888000,
  };
}
