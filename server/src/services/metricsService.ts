import type { MetricsBucket, MetricsHistoryResponse } from '../types';
import { getContractHourlyData } from './contractsService';

export async function getMetricsHistory(page: number, pageSize: number): Promise<MetricsHistoryResponse> {
  const contractData = getContractHourlyData();

  // One column per configured contract. hourly[0] holds the daily total
  // (all 24 slots are identical because buildDailyBuckets fills them uniformly).
  const all: MetricsBucket[] = contractData.map((c, i) => ({
    hour: String(i).padStart(2, '0'),          // "00", "01", ... = contract position
    bars: [{
      contractNumber: c.contractNumber,
      txCount:    c.hourly[0].txCount,
      avgGasGwei: c.hourly[0].avgGasGwei,
    }],
  }));

  const start = (page - 1) * pageSize;
  return {
    data: all.slice(start, start + pageSize),
    pagination: { page, pageSize, total: all.length, totalPages: Math.ceil(all.length / pageSize) },
  };
}
