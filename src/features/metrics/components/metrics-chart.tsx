'use client';

import { useTranslations } from 'next-intl';
import { useMetrics } from '@/lib/hooks/use-metrics';
import { ErrorDisplay } from '@/components/ui/error-display';
import { MetricsChartSkeleton } from './metrics-chart-skeleton';

export function MetricsChart() {
  const t = useTranslations('chart');
  const at = useTranslations('actions');
  const { buckets, isLoading, error, retry } = useMetrics();

  if (isLoading) return <MetricsChartSkeleton />;
  if (error) return <ErrorDisplay message={error.message} onRetry={retry} />;

  const maxValue = Math.max(...buckets.flatMap((b) => [b.primaryValue, b.secondaryValue]), 1);

  return (
    <div className="bg-white border-t border-eth-border">
      {/* Chart bars */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end gap-1 h-40">
          {buckets.map((bucket) => (
            <div key={bucket.hour} className="flex-1 flex flex-col items-center gap-0.5">
              {/* Pair of bars per hour */}
              <div className="flex items-end gap-px w-full justify-center h-32">
                {/* Primary bar (green/lighter) */}
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-green-600 font-medium mb-0.5">
                    {bucket.primaryValue}
                  </span>
                  <div
                    className="w-full bg-green-300 rounded-t"
                    style={{
                      height: `${(bucket.primaryValue / maxValue) * 100}%`,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5">{bucket.primaryGas}</span>
                </div>
                {/* Secondary bar (green/darker) */}
                <div className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-green-700 font-medium mb-0.5">
                    {bucket.secondaryValue}
                  </span>
                  <div
                    className="w-full bg-green-400 rounded-t"
                    style={{
                      height: `${(bucket.secondaryValue / maxValue) * 100}%`,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[9px] text-blue-400 mt-0.5">{bucket.secondaryGas}</span>
                </div>
              </div>
              {/* Hour label */}
              <span className="text-xs text-gray-600 font-medium mt-1">{bucket.hour}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 bg-yellow-50 border-t border-eth-border">
        <span className="text-sm text-gray-600">
          {t('duration', { minutes: 3, bars: 20 })}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            aria-label={at('play')}
          >
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            aria-label={at('pause')}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-5m10 0v5M17 14v-2.5" />
            </svg>
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            aria-label={at('scrollDown')}
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
