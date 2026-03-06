import { z } from 'zod';
import { paginationMetaSchema } from './contracts';

export const metricsBucketSchema = z.object({
  hour: z.string(),
  primaryValue: z.number(),
  secondaryValue: z.number(),
  primaryGas: z.number(),
  secondaryGas: z.number(),
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
