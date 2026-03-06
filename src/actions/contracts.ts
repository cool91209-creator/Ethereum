'use server';

import { revalidatePath } from 'next/cache';
import type { ContractDetail } from '@/types';

/**
 * Server Action: Select a contract and persist the selection.
 *
 * In a real app this could write to a session store, cookie, or DB.
 * For now it's a placeholder that revalidates the dashboard path.
 *
 * BACKEND INTEGRATION:
 * Replace the mock logic with a real session/state store call.
 */
export async function selectContract(contractId: string): Promise<ContractDetail> {
  // TODO: Persist selection to session/cookie/DB
  // For now, return mock detail based on ID
  const mockDetails: Record<string, ContractDetail> = {
    'eth-1': {
      contractNumber: 'Eth_002',
      activationTime: '02-27 15:31',
      contractAddress: '0E0252',
      deliveryStrategy: '1+2+3',
      gasLimit: 0.03,
    },
  };

  const detail = mockDetails[contractId] || {
    contractNumber: contractId,
    activationTime: '02-27 15:31',
    contractAddress: '0E0252',
    deliveryStrategy: '1+2+3' as const,
    gasLimit: 0.03,
  };

  return detail;
}

/**
 * Server Action: Refresh dashboard data.
 * Revalidates the main dashboard path to trigger fresh SSR data.
 */
export async function refreshDashboard(): Promise<void> {
  revalidatePath('/');
}
