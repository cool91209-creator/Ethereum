import { z } from 'zod';

export const contractStatusSchema = z.enum([
  'running',
  'preparing',
  'ready',
  'limited',
  'stopped',
]);

export const tokenBreakdownItemSchema = z.object({
  tokenContract:    z.string(),
  symbol:           z.string(),
  amountToday:      z.number(),
  amountYesterday:  z.number(),
  amountUsdToday:   z.number(),
  txCountToday:     z.number(),
  txCountYesterday: z.number(),
});

export const contractSchema = z.object({
  id: z.string(),
  serialNumber: z.number(),
  contractNumber: z.string(),
  activationTime: z.string(),
  contractAddress: z.string(),
  contractStatus: contractStatusSchema,
  tokenSymbol: z.string(),
  deliveryStrategy: z.literal('1+2+3'),
  gasLimit: z.number(),
  airdropQuantity: z.number(),
  airdropYesterday: z.number(),
  airdropToday: z.number(),
  tokenFee: z.number(),
  tokenAmount: z.number(),
  tokenWalletAmount: z.number(),
  tokenContractAmount: z.number(),
  tokenPrice: z.number(),
  txCountYesterday: z.number(),
  txCountToday: z.number(),
  gasCost: z.number(),
  totalCost: z.number(),
  averageCost: z.number(),
  cumulativeQuantity: z.number(),
  tokenBreakdown: z.array(tokenBreakdownItemSchema).optional(),
});

export const contractTotalsSchema = z.object({
  totalAirdropQuantity: z.number(),
  totalAirdropToday: z.number(),
  totalTxCountToday: z.number(),
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
