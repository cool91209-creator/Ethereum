import type { MetricsBucket, MetricsHistoryResponse } from '@/types';

// Generate 24 hourly buckets matching the screenshot chart
export function generateMockMetricsBuckets(): MetricsBucket[] {
  const primaryValues = [
    128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157,
    128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157,
  ];
  const secondaryValues = [
    157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128,
    157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128,
  ];

  return Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, '0'),
    bars: [
      { contractNumber: 'primary', txCount: primaryValues[i] || 128, avgGasGwei: 0.03 },
      { contractNumber: 'secondary', txCount: secondaryValues[i] || 157, avgGasGwei: 0.023 },
    ],
  }));
}

export function generateMockMetricsResponse(
  page = 1,
  pageSize = 24
): MetricsHistoryResponse {
  const allBuckets = generateMockMetricsBuckets();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: allBuckets.slice(start, end),
    pagination: {
      page,
      pageSize,
      total: allBuckets.length,
      totalPages: Math.ceil(allBuckets.length / pageSize),
    },
  };
}
