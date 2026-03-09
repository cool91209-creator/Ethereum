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
import { deleteContract, updateContract } from '@/lib/api/contracts';
import { ErrorDisplay } from '@/components/ui/error-display';
import { ContractsTableSkeleton } from './contracts-table-skeleton';
import { ContractStatusBadge } from './contract-status-badge';


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

// ─── Token icon + switcher for the Token Cost column ─────────────────

const TOKEN_ICON_COLORS: Record<string, string> = {
  USDT: '#26A17B', USDC: '#2775CA', DAI: '#F5AC37',
  WETH: '#627EEA', ETH:  '#627EEA', BNB: '#F3BA2F',
  BUSD: '#F0B90B', MATIC:'#8247E5', SHIB:'#E07D27',
};

// Well-known token contract addresses → CoinGecko image URL
const KNOWN_TOKEN_IMGS: Record<string, string> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  '0xb8c77482e45f1f44de1745f52c74426c631bdd52': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
};

// ─── Inline editable cell ────────────────────────────────────────────

function EditableCell({
  value,
  contractId,
  field,
  onSave,
}: {
  value: string;
  contractId: string;
  field: string;
  onSave: (id: string, field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(contractId, field, trimmed);
    } else {
      setDraft(value);
    }
  }

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded border border-transparent hover:border-blue-200 transition-colors"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="Double-click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      className="border border-blue-400 rounded px-1 py-0.5 text-sm w-full outline-none focus:ring-1 focus:ring-blue-400"
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function TokenIcon({ symbol, contractAddress }: { symbol: string; contractAddress?: string }) {
  const [imgOk, setImgOk] = useState(true);
  const ca    = contractAddress?.toLowerCase() ?? '';
  const color = TOKEN_ICON_COLORS[symbol.toUpperCase()] ?? '#9CA3AF';
  const label = symbol ? symbol.slice(0, 4) : '?';

  // Pick image URL: known list first, then Trust Wallet CDN by contract address
  const imgSrc = KNOWN_TOKEN_IMGS[ca]
    ?? (ca ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${contractAddress}/logo.png` : '');

  if (imgSrc && imgOk) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgSrc}
        alt={symbol}
        width={20}
        height={20}
        className="rounded-full"
        style={{ flexShrink: 0 }}
        onError={() => setImgOk(false)}
      />
    );
  }

  // Fallback: colored letter circle
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold"
      style={{ width: 20, height: 20, fontSize: 7, backgroundColor: color, flexShrink: 0 }}
    >
      {label}
    </span>
  );
}

function TokenCostCell({ contract }: { contract: Contract }) {
  const [idx, setIdx] = useState(0);
  const breakdown = contract.tokenBreakdown;

  if (!breakdown || breakdown.length === 0) {
    const usd = contract.tokenFee ?? 0;
    const amt = contract.airdropToday ?? 0;
    const sym = contract.tokenSymbol;
    return (
      <div>
        <div className={`font-semibold ${usd > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          ${usd.toFixed(2)}
        </div>
        <div className="text-xs text-gray-400">{amt.toLocaleString()} {sym || '—'}</div>
      </div>
    );
  }

  const total = breakdown.length;
  const cur   = breakdown[idx % total];
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-1">
        <TokenIcon symbol={cur.symbol} contractAddress={cur.tokenContract} />
        <span className={`font-semibold text-sm ${cur.amountUsdToday > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          ${cur.amountUsdToday.toFixed(2)}
        </span>
        {total > 1 && (
          <div className="flex items-center ml-auto gap-px">
            <button
              className="text-gray-400 hover:text-blue-500 px-0.5 leading-none"
              style={{ fontSize: 14 }}
              onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + total) % total); }}
              title="Previous token"
            >‹</button>
            <span className="text-[10px] text-gray-400">{idx + 1}/{total}</span>
            <button
              className="text-gray-400 hover:text-blue-500 px-0.5 leading-none"
              style={{ fontSize: 14 }}
              onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % total); }}
              title="Next token"
            >›</button>
          </div>
        )}
      </div>
      <div className="text-xs text-gray-400">
        {cur.amountToday.toLocaleString()} {cur.symbol}
        {cur.amountYesterday > 0 && (
          <span className="ml-1 text-gray-300">/ {cur.amountYesterday.toLocaleString()} yest</span>
        )}
      </div>
    </div>
  );
}

export function ContractsTable({ initialData, onSelectContract }: ContractsTableProps) {
  const t = useTranslations('table');
  const { contracts, totals, pagination, isLoading, error, retry, setPage, setSort } =
    useContracts(initialData);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleInlineSave = useCallback(async (id: string, field: string, value: string) => {
    try {
      await updateContract(id, { [field]: value });
      setLocalContracts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
      setTimeout(() => {
        retry();
        window.dispatchEvent(new Event('contracts:updated'));
      }, 200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  }, [retry]);

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
      setTimeout(() => {
        retry();
        window.dispatchEvent(new Event('contracts:updated'));
      }, 200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setDeletingId(null);
    }
  }, [retry]);

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
        cell: ({ row }) => (
          <EditableCell
            value={row.original.contractNumber}
            contractId={row.original.id}
            field="contractNumber"
            onSave={handleInlineSave}
          />
        ),
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
        cell: ({ row }) => (
          <EditableCell
            value={row.original.contractAddress}
            contractId={row.original.id}
            field="contractAddress"
            onSave={handleInlineSave}
          />
        ),
      },
      {
        accessorKey: 'contractStatus',
        header: t('contractStatus'),
        cell: ({ row }) => <ContractStatusBadge status={row.original.contractStatus} />,
        size: 100,
      },
      {
        accessorKey: 'deliveryStrategy',
        header: t('deliveryStrategy'),
        cell: ({ row }) => (
          <EditableCell
            value={row.original.deliveryStrategy}
            contractId={row.original.id}
            field="deliveryStrategy"
            onSave={handleInlineSave}
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'gasLimit',
        header: t('gasLimit'),
        cell: ({ row }) => (
          <span>{typeof row.original.gasLimit === 'number' ? `${row.original.gasLimit}gwei` : row.original.gasLimit}</span>
        ),
        size: 100,
      },
      {
        accessorKey: 'airdropQuantity',
        header: t('airdropQuantity'),
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
        cell: ({ row }) => <TokenCostCell contract={row.original} />,
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
    [t, totals, deletingId, handleDelete, handleInlineSave]
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
      <span>${totals.totalGasCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span>${totals.totalCost.toLocaleString()}</span>
      <span>${totals.totalAverageCost}</span>
      <span>{totals.grandCumulativeQuantity.toLocaleString()}</span>
    </div>
  );
}
