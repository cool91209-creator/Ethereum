import { Skeleton } from '@/components/ui/skeleton';

export function ContractsTableSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-eth-border">
              {Array.from({ length: 13 }).map((_, i) => (
                <th key={i} className="px-3 py-3">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 11 }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-eth-border">
                {/* Serial Number */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-6" /></td>
                {/* Contract Number */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-16" /></td>
                {/* Activation Time */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-20" /></td>
                {/* Contract Address */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-16" /></td>
                {/* Status */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-12" /></td>
                {/* Strategy */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-14" /></td>
                {/* Gas Limit */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-18" /></td>
                {/* Airdrop Qty */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-28" /></td>
                {/* Token Fee */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-12" /></td>
                {/* Gas Cost */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-10" /></td>
                {/* Total Cost */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-12" /></td>
                {/* Avg Cost */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-14" /></td>
                {/* Cumulative */}
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-14" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Totals skeleton */}
      <div className="flex items-center justify-end gap-8 px-4 py-3 border-t border-eth-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
  );
}
