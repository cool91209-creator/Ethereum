import { z } from 'zod';

export const contractStatusSchema = z.enum([
  'running',
  'preparing',
  'ready',
  'limited',
  'stopped',
]);

export const contractSchema = z.object({
  id: z.string(),
  serialNumber: z.number(),
  contractNumber: z.string(),
  activationTime: z.string(),
  contractAddress: z.string(),
  contractStatus: contractStatusSchema,
  deliveryStrategy: z.literal('1+2+3'),
  gasLimit: z.number(),
  airdropQuantity: z.number(),
  tokenFee: z.number(),
  gasCost: z.number(),
  totalCost: z.number(),
  averageCost: z.number(),
  cumulativeQuantity: z.number(),
});

export const contractTotalsSchema = z.object({
  totalAirdropQuantity: z.number(),
  totalTokenFee: z.number(),
  totalGasCost: z.number(),
  totalCost: z.number(),
  totalAverageCost: z.number(),
  grandCumulativeQuantity: z.number(),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const contractsResponseSchema = z.object({
  data: z.array(contractSchema),
  totals: contractTotalsSchema,
  pagination: paginationMetaSchema,
});

// Query params for fetching contracts
export const contractsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ContractsQuery = z.infer<typeof contractsQuerySchema>;
