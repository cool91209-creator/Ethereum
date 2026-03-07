import axios from 'axios';

interface DefiLlamaResponse {
  coins: Record<string, { price?: number; decimals?: number; symbol?: string }>;
}

/**
 * Fetch USD prices for Ethereum ERC-20 tokens by contract address.
 * Uses DeFi Llama free API — no API key required, supports batch queries.
 * Format: ethereum:0xaddr1,ethereum:0xaddr2,...
 */
export async function getTokenPricesUsd(contractAddresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (contractAddresses.length === 0) return prices;

  const CHUNK_SIZE = 100;
  for (let i = 0; i < contractAddresses.length; i += CHUNK_SIZE) {
    const chunk = contractAddresses.slice(i, i + CHUNK_SIZE);
    const coins = chunk.map(addr => `ethereum:${addr}`).join(',');
    try {
      const response = await axios.get<DefiLlamaResponse>(
        `https://coins.llama.fi/prices/current/${coins}`,
        { timeout: 15000 }
      );
      for (const [key, val] of Object.entries(response.data.coins)) {
        const addr = key.replace('ethereum:', '').toLowerCase();
        prices.set(addr, val.price ?? 0);
      }
    } catch (err) {
      console.warn('[priceService] DeFi Llama price fetch failed:', err);
    }
  }
  return prices;
}

