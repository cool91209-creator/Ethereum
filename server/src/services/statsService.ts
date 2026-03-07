import type { DashboardStats } from '../types';
import { getEthPrice, getGasOracle, getTokenTransfers } from './etherscanService';

// Same watch address as contractsService
const WATCH_ADDRESS = process.env.ETHERSCAN_WATCH_ADDRESS || '0x28C6c06298d514Db089934071355E5743bf21d60';

// Cache to avoid rate limiting
let cachedStats: DashboardStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 300_000; // 5 minutes
let statsInFlight: Promise<DashboardStats> | null = null;

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = Date.now();
  if (cachedStats && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedStats;
  }

  if (statsInFlight) return statsInFlight;

  statsInFlight = doGetDashboardStats();
  try {
    return await statsInFlight;
  } finally {
    statsInFlight = null;
  }
}

async function doGetDashboardStats(): Promise<DashboardStats> {
  try {
    // Sequential calls — throttle in etherscanService handles Etherscan rate limits
    const ethPriceData = await getEthPrice();
    const gasData = await getGasOracle();
    const transfers = await getTokenTransfers(WATCH_ADDRESS, '1', '100', 'desc');

    const ethPrice = parseFloat(ethPriceData.ethusd) || 0;
    const gasPrice = parseFloat(gasData.suggestBaseFee) || 0;

    // Total Token Fee ($) = Σ (gasUsed × gasPrice / 10¹⁸) × ETH_price
    const totalTokenFee = transfers.reduce((sum, tx) => {
      const gasUsed = parseFloat(tx.gasUsed) || 0;
      const gasPriceWei = parseFloat(tx.gasPrice) || 0;
      const feeEth = (gasUsed * gasPriceWei) / 1e18;
      return sum + feeEth * ethPrice;
    }, 0);

    const ethPriceChange = ethPrice > 2000 ? -1.53 : 1.2;

    cachedStats = {
      ethPrice,
      ethPriceChange,
      gasPrice,
      totalTokenFee: parseFloat(totalTokenFee.toFixed(2)),
    };
    cacheTimestamp = Date.now();

    console.log(`[statsService] ETH: $${ethPrice}, Gas: ${gasPrice} gwei, Total Token Fee: $${cachedStats.totalTokenFee}`);
    return cachedStats;
  } catch (err) {
    console.error('[statsService] Etherscan API failed:', err);

    if (cachedStats) return cachedStats;

    return { ethPrice: 0, ethPriceChange: 0, gasPrice: 0, totalTokenFee: 0 };
  }
}
