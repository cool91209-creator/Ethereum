import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  ethPrice: z.number(),
  ethPriceChange: z.number(),
  gasPrice: z.number(),
  totalTokenFee: z.number(),
});
