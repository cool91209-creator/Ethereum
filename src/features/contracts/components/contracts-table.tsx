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
import { deleteContract } from '@/lib/api/contracts';
import { ErrorDisplay } from '@/components/ui/error-display';
import { ContractsTableSkeleton } from './contracts-table-skeleton';
import { ContractStatusBadge } from './contract-status-badge';

const EyeIcon = () => (
  <button className="text-gray-400 hover:text-gray-600" aria-label="Toggle visibility">
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </button>
);

function formatActivationTime(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}${dd}/${hh}:${min}`;
  } catch {
    return iso;
  }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (e: React.MouseEvent, contract: Contract) => {
    e.stopPropagation();
    if (!confirm(`Delete contract "${contract.contractNumber}"?`)) return;
    setDeletingId(contract.id);
    try {
      await deleteContract(contract.id);
      setLocalContracts((prev) => {
        const updated = prev
          .filter((c) => c.id !== contract.id)
          .map((c, i) => ({ ...c, serialNumber: i + 1 }));
        setLocalTotals(calcTotals(updated));
        return updated;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setDeletingId(null);
    }
  }, []);

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
        cell: ({ row }) => formatActivationTime(row.original.activationTime),
        size: 110,
      },
      {
        accessorKey: 'contractAddress',
        header: t('contractAddress'),
        size: 140,
      },
      {
        accessorKey: 'contractStatus',
        header: () => (
          <div className="flex items-center gap-1">
            {t('contractStatus')}
            <EyeIcon />
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
            <EyeIcon />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="text-blue-500 font-medium">{row.original.deliveryStrategy}</span>
            <EyeIcon />
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'gasLimit',
        header: () => (
          <div className="flex items-center gap-1">
            {t('gasLimit')}
            <EyeIcon />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span>{typeof row.original.gasLimit === 'number' ? `${row.original.gasLimit}gwei` : row.original.gasLimit}</span>
            <EyeIcon />
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'airdropQuantity',
        header: () => (
          <div className="flex items-center gap-1">
            {t('airdropQuantity')}
            <EyeIcon />
          </div>
        ),
        cell: ({ row }) => {
          const countYesterday = Number(row.original.txCountYesterday ?? 0);
          const countToday = Number(row.original.txCountToday ?? 0);
          const totalCountToday = totals?.totalTxCountToday ?? 0;
          const ratio = totalCountToday > 0 ? ((countToday / totalCountToday) * 100).toFixed(2) : '0';
          return `${countYesterday.toLocaleString()}/${countToday.toLocaleString()}/${ratio}%`;
        },
        size: 160,
      },
      {
        id: 'tokenCost',
        header: t('tokenCost'),
        cell: ({ row }) => {
          const sym = row.original.tokenSymbol;
          const amt = row.original.airdropToday ?? 0;
          const price = row.original.tokenPrice ?? 0;
          const usd = amt * price;
          return (
            <div>
              <div className={`font-semibold ${usd > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                ${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-400">
                {amt.toLocaleString()} {sym || '—'}
              </div>
            </div>
          );
        },
        size: 190,
      },
      {
        accessorKey: 'gasCost',
        header: t('gasCost'),
        cell: ({ row }) => `$${row.original.gasCost.toFixed(2)}`,
        size: 80,
      },
      {
        accessorKey: 'totalCost',
        header: t('totalCost'),
        cell: ({ row }) => `$${row.original.totalCost.toFixed(2)}`,
        size: 80,
      },
      {
        accessorKey: 'averageCost',
        header: t('averageCost'),
        cell: ({ row }) => `$${row.original.averageCost.toFixed(6)}`,
        size: 90,
      },
      {
        accessorKey: 'cumulativeQuantity',
        header: t('cumulativeQuantity'),
        cell: ({ row }) => row.original.cumulativeQuantity.toLocaleString(),
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        size: 44,
        enableSorting: false,
        cell: ({ row }) => (
          <button
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete row"
            disabled={deletingId === row.original.id}
            onClick={(e) => handleDelete(e, row.original)}
          >
            {deletingId === row.original.id ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        ),
      },
    ],
    [t, totals, deletingId, handleDelete]
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
          setLocalTotals(calcTotals(updated));
          return updated;
        }

        const nextSerial = prev.length + 1;
        const now = new Date();
        const activationTime = now.toISOString();
        const newRow: Contract = {
          id: `local-${Date.now()}`,
          serialNumber: nextSerial,
          contractNumber: detail.contractNumber!,
          activationTime,
          contractAddress: String(detail.updates?.contractAddress ?? ''),
          contractStatus: 'preparing',
          tokenSymbol: '',
          deliveryStrategy: '1+2+3',
          gasLimit: (detail.updates?.gasLimit as number) ?? 0,
          airdropQuantity: (detail.updates?.airdropQuantity as number) ?? 0,
          airdropYesterday: 0,
          airdropToday: 0,
          tokenFee: (detail.updates?.tokenFee as number) ?? 0,
          tokenAmount: (detail.updates?.tokenAmount as number) ?? 0,
          tokenWalletAmount: (detail.updates?.tokenWalletAmount as number) ?? 0,
          tokenContractAmount: (detail.updates?.tokenContractAmount as number) ?? 0,
          tokenPrice: (detail.updates?.tokenPrice as number) ?? 0,
          txCountYesterday: 0,
          txCountToday: 0,
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
    const totalAirdropToday = list.reduce((s, c) => s + (Number(c.airdropToday) || 0), 0);
    const totalTxCountToday = list.reduce((s, c) => s + (Number(c.txCountToday) || 0), 0);
    const totalTokenFee = list.reduce((s, c) => s + (c.tokenFee || 0), 0);
    const totalGasCost = list.reduce((s, c) => s + (c.gasCost || 0), 0);
    const totalCost = list.reduce((s, c) => s + (c.totalCost || 0), 0);
    const grandCumulativeQuantity = list.reduce((s, c) => s + (c.cumulativeQuantity || 0), 0);
    return {
      totalAirdropQuantity,
      totalAirdropToday,
      totalTxCountToday,
      totalTokenFee,
      totalGasCost,
      totalCost,
      totalAverageCost: totalCost ? totalCost / Math.max(1, totalAirdropQuantity) : 0,
      grandCumulativeQuantity,
    };
  }

  if (error) {
    return <ErrorDisplay message={error.message} onRetry={retry} />;
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
            {isLoading && contracts.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-sm text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Fetching contract data from Etherscan...
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length > 0 ? (
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
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`empty-${rIdx}`} className="border-b border-eth-border">
                  {columns.map((_, cIdx) => (
                    <td key={`empty-${rIdx}-${cIdx}`} className="px-3 py-2.5 whitespace-nowrap text-gray-400">
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
      <div className="flex flex-col items-end">
        <span>${totals.totalGasCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="text-xs text-gray-400 font-normal">Total Gas Today</span>
      </div>
      <span>${totals.totalCost.toLocaleString()}</span>
      <span>${totals.totalAverageCost}</span>
      <span>{totals.grandCumulativeQuantity.toLocaleString()}</span>
    </div>
  );
}
