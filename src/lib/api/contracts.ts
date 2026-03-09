import type { ContractsResponse } from '@/types';
import type { ContractsQuery } from '@/lib/schemas/contracts';
import { contractsResponseSchema } from '@/lib/schemas/contracts';
import { apiClient } from './client';

/**
 * BACKEND INTEGRATION:
 * Replace /api/contracts with your real endpoint path.
 * The apiClient handles proxy routing automatically.
 */
export async function updateContract(id: string, updates: Record<string, string | number>): Promise<void> {
  const response = await apiClient.patch<{ success: boolean }>(`/api/contracts/${id}`, updates);
  if (!response.success || response.error) {
    throw new Error(response.error?.message || 'Failed to update contract');
  }
}

export async function deleteContract(id: string): Promise<void> {
  const response = await apiClient.delete<{ success: boolean }>(`/api/contracts/${id}`);
  if (!response.success || response.error) {
    throw new Error(response.error?.message || 'Failed to delete contract');
  }
}

export async function fetchContracts(query: ContractsQuery): Promise<ContractsResponse> {
  const response = await apiClient.get<ContractsResponse>('/api/contracts', {
    page: query.page,
    pageSize: query.pageSize,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  if (!response.success || response.error) {
    throw new Error(response.error?.message || 'Failed to fetch contracts');
  }

  // Validate response shape
  const parsed = contractsResponseSchema.parse(response.data);
  return parsed;
}
