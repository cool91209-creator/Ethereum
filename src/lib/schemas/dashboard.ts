import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  ethPrice: z.number(),
  ethPriceChange: z.number(),
  gasPrice: z.number(),
  totalAirdropAmount: z.number(),
});
