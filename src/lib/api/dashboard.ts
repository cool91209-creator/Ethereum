import type { DashboardSummary } from '@/types';
import { dashboardSummarySchema } from '@/lib/schemas/dashboard';
import { apiClient } from './client';

/**
 * BACKEND INTEGRATION:
 * Replace /api/dashboard with your real endpoint path.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/api/dashboard');

  if (!response.success || response.error) {
    throw new Error(response.error?.message || 'Failed to fetch dashboard summary');
  }

  const parsed = dashboardSummarySchema.parse(response.data);
  return parsed;
}
