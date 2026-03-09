'use client';

import { useMetrics } from '@/lib/hooks/use-metrics';
import { ErrorDisplay } from '@/components/ui/error-display';
import { MetricsChartSkeleton } from './metrics-chart-skeleton';

// Bar area height in pixels — used for explicit px heights so bars render correctly
const BAR_AREA_PX = 80;

// Green shades per contract index (cycles if > 6)
const BAR_COLORS = ['#86efac', '#22c55e', '#2dd4bf', '#059669', '#a3e635', '#22d3ee'];

export function MetricsChart() {
  const { buckets, isLoading, error, retry } = useMetrics();

  if (isLoading) return <MetricsChartSkeleton />;
  if (error)     return <ErrorDisplay message={error.message} onRetry={retry} />;

  // buckets.length = number of configured contracts (1 bucket per contract)
  const maxTx = Math.max(...buckets.map(b => b.bars[0]?.txCount ?? 0), 1);

  return (
    <div className="bg-white border-t border-eth-border">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end gap-3">
          {buckets.length === 0 ? (
            // No contracts yet — show a thin placeholder baseline
            <div className="flex-1 flex items-end" style={{ height: `${BAR_AREA_PX + 40}px` }}>
              <div className="w-full bg-gray-100 rounded-t" style={{ height: '3px' }} />
            </div>
          ) : (
            buckets.map((bucket, idx) => {
              const bar    = bucket.bars[0];
              const barPx  = bar && maxTx > 0
                ? Math.max(Math.round((bar.txCount / maxTx) * BAR_AREA_PX), bar.txCount > 0 ? 6 : 2)
                : 2;
              const color  = BAR_COLORS[idx % BAR_COLORS.length];
              return (
                <div key={bucket.hour} className="flex flex-col items-center" style={{ minWidth: '40px' }}>
                  {/* tx count label */}
                  <span className="text-[11px] font-semibold mb-1" style={{ color: idx === 0 ? '#16a34a' : '#0d9488' }}>
                    {bar && bar.txCount > 0 ? bar.txCount : ''}
                  </span>
                  {/* bar — explicit px height */}
                  <div
                    className="w-10 rounded-t"
                    style={{ height: `${barPx}px`, backgroundColor: color }}
                  />
                  {/* gas label */}
                  <span className="text-[9px] text-gray-400 mt-1">
                    {bar && bar.avgGasGwei > 0 ? bar.avgGasGwei : ''}
                  </span>
                  {/* contract position label */}
                  <span className="text-xs text-gray-600 font-medium mt-0.5">{bucket.hour}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
