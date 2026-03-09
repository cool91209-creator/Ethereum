import { z } from 'zod';
import { paginationMetaSchema } from './contracts';

const contractBarDataSchema = z.object({
  contractNumber: z.string(),
  txCount:        z.number(),
  avgGasGwei:     z.number(),
});

export const metricsBucketSchema = z.object({
  hour: z.string(),
  bars: z.array(contractBarDataSchema),
});

export const metricsHistoryResponseSchema = z.object({
  data: z.array(metricsBucketSchema),
  pagination: paginationMetaSchema,
});

// Query params for metrics history endpoint
export const metricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(24),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
