'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
} from '@tanstack/react-table';
import type { Contract, ContractsResponse, ContractTotals } from '@/types';
import { useContracts } from '@/lib/hooks/use-contracts';
import { ErrorDisplay } from '@/components/ui/error-display';
import { ContractsTableSkeleton } from './contracts-table-skeleton';
import { ContractStatusBadge } from './contract-status-badge';

interface ContractsTableProps {
  initialData?: ContractsResponse;
  onSelectContract?: (contract: Contract) => void;
}

export function ContractsTable({ initialData, onSelectContract }: ContractsTableProps) {
  const t = useTranslations('table');
  const { contracts, totals, pagination, isLoading, error, retry, setPage, setSort } =
    useContracts(initialData);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      if (newSorting.length > 0) {
        setSort(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc');
      }
    },
    [sorting, setSort]
  );

  const columns = useMemo<ColumnDef<Contract>[]>(
    () => [
      {
        accessorKey: 'serialNumber',
        header: t('serialNumber'),
        size: 50,
        enableSorting: false,
      },
      {
        accessorKey: 'contractNumber',
        header: t('contractNumber'),
        size: 100,
      },
      {
        accessorKey: 'activationTime',
        header: t('activationTime'),
        size: 110,
      },
      {
        accessorKey: 'contractAddress',
        header: t('contractAddress'),
        size: 100,
      },
      {
        accessorKey: 'contractStatus',
        header: () => (
          <div className="flex items-center gap-1">
            {t('contractStatus')}
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => <ContractStatusBadge status={row.original.contractStatus} />,
        size: 100,
      },
      {
        accessorKey: 'deliveryStrategy',
        header: () => (
          <div className="flex items-center gap-1">
            {t('deliveryStrategy')}
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="text-blue-500 font-medium">{row.original.deliveryStrategy}</span>
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'gasLimit',
        header: () => (
          <div className="flex items-center gap-1">
            {t('gasLimit')}
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span>{typeof row.original.gasLimit === 'number' ? `${row.original.gasLimit}gwei` : row.original.gasLimit}</span>
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'airdropQuantity',
        header: () => (
          <div className="flex items-center gap-1">
            {t('airdropQuantity')}
            <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        ),
        size: 140,
      },
      // Percentage column computed from row value vs totals
      {
        id: 'airdropPercent',
        header: () => <div className="text-xs text-gray-500">{t('airdropPercent')}</div>,
        cell: ({ row }) => {
          const qty = Number(row.original.airdropQuantity ?? 0);
          const total = totals?.totalAirdropQuantity ?? 0;
          if (!total) return '—';
          const pct = (qty / total) * 100;
          return `${pct.toFixed(2)}%`;
        },
        size: 100,
      },
      {
        accessorKey: 'tokenFee',
        header: t('tokenFee'),
        cell: ({ row }) => `$${row.original.tokenFee}`,
        size: 80,
      },
      {
        accessorKey: 'gasCost',
        header: t('gasCost'),
        cell: ({ row }) => `$${row.original.gasCost}`,
        size: 80,
      },
      {
        accessorKey: 'totalCost',
        header: t('totalCost'),
        cell: ({ row }) => `$${row.original.totalCost}`,
        size: 80,
      },
      {
        accessorKey: 'averageCost',
        header: t('averageCost'),
        cell: ({ row }) => `$${row.original.averageCost}`,
        size: 90,
      },
      {
        accessorKey: 'cumulativeQuantity',
        header: t('cumulativeQuantity'),
        cell: ({ row }) => row.original.cumulativeQuantity.toLocaleString(),
        size: 100,
      },
    ],
    [t, totals]
  );

  // Keep a local copy of contracts to allow immediate UI updates when config is applied
  const [localContracts, setLocalContracts] = useState<Contract[]>(contracts);
  const [localTotals, setLocalTotals] = useState(totals ?? null);

  // Sync when upstream contracts change (e.g., refetch)
  useEffect(() => setLocalContracts(contracts), [contracts]);
  useEffect(() => setLocalTotals(totals ?? null), [totals]);
  const table = useReactTable({
    data: localContracts,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: handleSortingChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pagination?.totalPages ?? -1,
    enableRowSelection: true,
  });

  if (isLoading && contracts.length === 0) {
    return <ContractsTableSkeleton />;
  }

  if (error) {
    return <ErrorDisplay message={error.message} onRetry={retry} />;
  }

  // When there is no data yet, we still render the table headers so the layout is stable.
  // Rows will show as empty placeholders until data is added via the Contract Config flow.

  // Listen for external updates (e.g., Contract Config submit)
  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as { contractNumber?: string; updates?: Partial<Contract> };
      if (!detail || !detail.contractNumber) return;

      setLocalContracts((prev) => {
        const exists = prev.find((c) => c.contractNumber === detail.contractNumber);
        if (exists) {
          const updated = prev.map((c) =>
            c.contractNumber === detail.contractNumber ? { ...c, ...(detail.updates ?? {}) } : c
          );
          // update local totals
          setLocalTotals(calcTotals(updated));
          return updated;
        }

        // create a new contract row using provided updates and sensible defaults
        const nextSerial = prev.length + 1;
        const now = new Date();
        const activationTime = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const newRow: Contract = {
          id: `local-${Date.now()}`,
          serialNumber: nextSerial,
          contractNumber: detail.contractNumber,
          activationTime,
          contractAddress: (detail.updates?.contractAddress as string) ?? '',
          contractStatus: 'preparing',
          deliveryStrategy: '1+2+3',
          gasLimit: (detail.updates?.gasLimit as number) ?? 0,
          airdropQuantity: (detail.updates?.airdropQuantity as number) ?? 0,
          tokenFee: (detail.updates?.tokenFee as number) ?? 0,
          gasCost: (detail.updates?.gasCost as number) ?? 0,
          totalCost: (detail.updates?.totalCost as number) ?? 0,
          averageCost: (detail.updates?.averageCost as number) ?? 0,
          cumulativeQuantity: (detail.updates?.cumulativeQuantity as number) ?? 0,
        };

        const updated = [newRow, ...prev];
        setLocalTotals(calcTotals(updated));
        return updated;
      });
    }

    function onRefresh() {
      retry();
    }

    window.addEventListener('contracts:update', onUpdate as EventListener);
    window.addEventListener('contracts:refresh', onRefresh as EventListener);
    return () => {
      window.removeEventListener('contracts:update', onUpdate as EventListener);
      window.removeEventListener('contracts:refresh', onRefresh as EventListener);
    };
  }, [retry]);

  function calcTotals(list: Contract[]): ContractTotals {
    const totalAirdropQuantity = list.reduce((s, c) => s + (Number(c.airdropQuantity) || 0), 0);
    const totalTokenFee = list.reduce((s, c) => s + (c.tokenFee || 0), 0);
    const totalGasCost = list.reduce((s, c) => s + (c.gasCost || 0), 0);
    const totalCost = list.reduce((s, c) => s + (c.totalCost || 0), 0);
    const grandCumulativeQuantity = list.reduce((s, c) => s + (c.cumulativeQuantity || 0), 0);
    return {
      totalAirdropQuantity,
      totalTokenFee,
      totalGasCost,
      totalCost,
      totalAverageCost: totalCost ? totalCost / Math.max(1, totalAirdropQuantity) : 0,
      grandCumulativeQuantity,
    };
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-eth-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                    role={header.column.getCanSort() ? 'button' : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-eth-border hover:bg-blue-50/50 cursor-pointer transition-colors ${
                    row.getIsSelected() ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    row.toggleSelected();
                    onSelectContract?.(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // Render placeholder empty rows to keep the table structure visible
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`empty-${rIdx}`} className="border-b border-eth-border">
                  {columns.map((col, cIdx) => (
                    <td key={`empty-${rIdx}-${cIdx}`} className="px-3 py-2.5 whitespace-nowrap text-gray-400">
                      {/* leave blank value for user to fill later */}
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Row */}
      {(totals ?? localTotals) && <TotalsRow totals={(totals ?? localTotals) as ContractTotals} />}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-eth-border">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TotalsRow({ totals }: { totals: ContractTotals }) {
  return (
    <div className="flex items-center justify-end gap-8 px-4 py-3 bg-white border-t border-eth-border text-sm font-semibold text-blue-600">
      <span>{totals.totalAirdropQuantity.toLocaleString()}</span>
      <span>${totals.totalTokenFee.toLocaleString()}</span>
      <span>${totals.totalGasCost.toLocaleString()}</span>
      <span>${totals.totalCost.toLocaleString()}</span>
      <span>${totals.totalAverageCost}</span>
      <span>{totals.grandCumulativeQuantity.toLocaleString()}</span>
    </div>
  );
}
