import { Skeleton } from '@/components/ui/skeleton';

export function DashboardHeaderSkeleton() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-eth-border">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-24 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-12 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-10 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
      <Skeleton className="w-72 h-6" />
    </header>
  );
}
