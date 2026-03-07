import { pool } from '../db/pool';
import type { MetricsBucket, MetricsHistoryResponse } from '../types';
import type { RowDataPacket } from 'mysql2';

const USE_MOCK = process.env.USE_MOCK_DATA !== 'false';

function buildMockBuckets(): MetricsBucket[] {
  const primary   = [128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157,
                     128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157];
  const secondary = [157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128,
                     157, 128, 157, 128, 157, 128, 157, 128, 157, 128, 157, 128];

  return Array.from({ length: 24 }, (_, i) => ({
    hour:           String(i).padStart(2, '0'),
    primaryValue:   primary[i]   ?? 128,
    secondaryValue: secondary[i] ?? 157,
    primaryGas:     0.03,
    secondaryGas:   0.023,
  }));
}

export async function getMetricsHistory(page: number, pageSize: number): Promise<MetricsHistoryResponse> {
  if (USE_MOCK) {
    const all   = buildMockBuckets();
    const start = (page - 1) * pageSize;
    return {
      data: all.slice(start, start + pageSize),
      pagination: { page, pageSize, total: all.length, totalPages: Math.ceil(all.length / pageSize) },
    };
  }

  const offset = (page - 1) * pageSize;
  const [[dataRows], [countRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT hour, primary_value, secondary_value, primary_gas, secondary_gas
       FROM metrics_buckets
       ORDER BY hour ASC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    ),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM metrics_buckets`),
  ]);

  const total = Number(countRows[0].total);
  const data: MetricsBucket[] = dataRows.map((r: RowDataPacket) => ({
    hour:           String(r['hour']).trim(),
    primaryValue:   Number(r['primary_value']),
    secondaryValue: Number(r['secondary_value']),
    primaryGas:     Number(r['primary_gas']),
    secondaryGas:   Number(r['secondary_gas']),
  }));

  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
