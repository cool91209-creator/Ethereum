import type { MetricsHistoryResponse } from '@/types';
import type { MetricsQuery } from '@/lib/schemas/metrics';
import { metricsHistoryResponseSchema } from '@/lib/schemas/metrics';
import { apiClient } from './client';

/**
 * BACKEND INTEGRATION:
 * Replace /api/metrics/history with your real endpoint path.
 */
export async function fetchMetricsHistory(query: MetricsQuery): Promise<MetricsHistoryResponse> {
  const response = await apiClient.get<MetricsHistoryResponse>('/api/metrics', {
    from: query.from,
    to: query.to,
    page: query.page,
    pageSize: query.pageSize,
  });

  if (!response.success || response.error) {
    throw new Error(response.error?.message || 'Failed to fetch metrics');
  }

  const parsed = metricsHistoryResponseSchema.parse(response.data);
  return parsed;
}
