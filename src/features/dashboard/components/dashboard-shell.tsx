'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { Contract, ContractDetail, ContractsResponse } from '@/types';
import { ContractsTable } from '@/features/contracts/components/contracts-table';
import { MetricsChart } from '@/features/metrics/components/metrics-chart';
import { selectContract } from '@/actions/contracts';
import { ContractConfigModal } from '@/features/contracts/components/contract-config-modal';

/**
 * Client Component: Interactive dashboard shell.
 * CSR because it manages selection state, table interactions, and chart updates.
 */
interface DashboardShellProps {
  initialContracts?: ContractsResponse;
}

export function DashboardShell({ initialContracts }: DashboardShellProps) {
  const t = useTranslations('header');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleSelectContract = useCallback(async (contract: Contract) => {
    // Server action call preserved for future integration; no client-side detail panel.
    try {
      await selectContract(contract.id);
    } catch (e) {
      // swallow here; UI-level errors handled where appropriate
      console.error('selectContract failed', e);
    }
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Contract config button row */}
      <div className="flex justify-end px-6 py-2 bg-white">
        <button onClick={() => setIsConfigOpen(true)} className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium">
          {t('contractConfig')}
        </button>
      </div>

      {/* Main content: table + detail panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto bg-white">
          <ContractsTable
            initialData={initialContracts}
            onSelectContract={handleSelectContract}
          />
        </div>
        {/* Detail panel removed per design — reserved for future server-driven details */}
      </div>

      {/* Bottom chart section */}
      <MetricsChart />
      <ContractConfigModal open={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </div>
  );
}
