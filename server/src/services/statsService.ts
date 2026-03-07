import { pool } from '../db/pool';
import type { DashboardStats } from '../types';

const USE_MOCK = process.env.USE_MOCK_DATA !== 'false';

export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    return {
      ethPrice:           2031.11,
      ethPriceChange:     -1.53,
      gasPrice:           0.038,
      totalAirdropAmount: 5888000,
    };
  }

  const result = await pool.query(
    `SELECT eth_price, eth_price_change, gas_price, total_airdrop_amount
     FROM stats
     ORDER BY recorded_at DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return { ethPrice: 0, ethPriceChange: 0, gasPrice: 0, totalAirdropAmount: 0 };
  }

  const r = result.rows[0] as Record<string, unknown>;
  return {
    ethPrice:           Number(r['eth_price']),
    ethPriceChange:     Number(r['eth_price_change']),
    gasPrice:           Number(r['gas_price']),
    totalAirdropAmount: Number(r['total_airdrop_amount']),
  };
}
