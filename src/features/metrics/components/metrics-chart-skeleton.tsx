import { Skeleton } from '@/components/ui/skeleton';

export function MetricsChartSkeleton() {
  return (
    <div className="bg-white border-t border-eth-border">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end gap-1 h-40">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-end gap-px w-full justify-center h-32">
                <div className="flex flex-col items-center flex-1">
                  <Skeleton className="w-4 h-3 mb-0.5" />
                  <div style={{ height: `${40 + Math.random() * 40}%` }}><Skeleton className="w-full h-full rounded-t" /></div>
                  <Skeleton className="w-4 h-2 mt-0.5" />
                </div>
                <div className="flex flex-col items-center flex-1">
                  <Skeleton className="w-4 h-3 mb-0.5" />
                  <div style={{ height: `${40 + Math.random() * 40}%` }}><Skeleton className="w-full h-full rounded-t" /></div>
                  <Skeleton className="w-4 h-2 mt-0.5" />
                </div>
              </div>
              <Skeleton className="w-5 h-3 mt-1" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 px-4 py-2 bg-gray-50 border-t border-eth-border">
        <Skeleton className="w-40 h-4" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
