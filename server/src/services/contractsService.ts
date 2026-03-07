import type {
  Contract,
  ContractDetail,
  ContractTotals,
  ContractsResponse,
  ContractConfigPayload,
} from '../types';
import {
  getTokenTransfers,
  getEthPrice,
  type TokenTransfer,
} from './etherscanService';

// Well-known Ethereum addresses with real token transfer activity
// Using Binance Hot Wallet as default — has many token airdrops/transfers
const WATCH_ADDRESS = process.env.ETHERSCAN_WATCH_ADDRESS || '0x28C6c06298d514Db089934071355E5743bf21d60';

// ─── Cache to avoid hitting Etherscan rate limits ────────────────────────────

let cachedContracts: Contract[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

// ─── Map Etherscan token transfers → Contract rows ───────────────────────────

function mapTransfersToContracts(transfers: TokenTransfer[], ethPriceUsd: number): Contract[] {
  // Group transfers by contract address
  const grouped = new Map<string, TokenTransfer[]>();
  for (const tx of transfers) {
    const addr = tx.contractAddress.toLowerCase();
    if (!grouped.has(addr)) grouped.set(addr, []);
    grouped.get(addr)!.push(tx);
  }

  let cumulativeQty = 0;
  let serial = 0;
  const contracts: Contract[] = [];

  for (const [contractAddr, txs] of grouped) {
    serial++;
    const firstTx = txs[txs.length - 1]; // oldest
    const latestTx = txs[0]; // newest

    const tokenDecimal = parseInt(firstTx.tokenDecimal) || 18;
    const totalValue = txs.reduce(
      (sum, t) => sum + parseFloat(t.value) / Math.pow(10, tokenDecimal),
      0
    );
    const airdropQuantity = Math.round(totalValue);

    // Gas cost in ETH
    const totalGasUsedWei = txs.reduce(
      (sum, t) => sum + (parseFloat(t.gasUsed) * parseFloat(t.gasPrice)),
      0
    );
    const gasCostEth = totalGasUsedWei / 1e18;
    const gasCostUsd = gasCostEth * ethPriceUsd;

    // Token fee (value transferred in USD equivalent)
    const tokenFeeUsd = totalValue * 0.001; // estimate 0.1% fee

    const totalCost = gasCostUsd + tokenFeeUsd;
    cumulativeQty += airdropQuantity;

    // Determine status based on transaction recency
    const latestTimestamp = parseInt(latestTx.timeStamp) * 1000;
    const ageMs = Date.now() - latestTimestamp;
    const ageHours = ageMs / (1000 * 60 * 60);
    let status: Contract['contractStatus'];
    if (ageHours < 1) status = 'running';
    else if (ageHours < 6) status = 'preparing';
    else if (ageHours < 24) status = 'ready';
    else if (ageHours < 72) status = 'limited';
    else status = 'stopped';

    // Gas limit in gwei (average gas price from transactions)
    const avgGasPrice = txs.reduce((s, t) => s + parseFloat(t.gasPrice), 0) / txs.length;
    const gasLimitGwei = avgGasPrice / 1e9;

    // Activation time
    const activationDate = new Date(parseInt(firstTx.timeStamp) * 1000);

    contracts.push({
      id: String(serial),
      serialNumber: serial,
      contractNumber: `Eth${String(serial).padStart(3, '0')}`,
      activationTime: activationDate.toISOString(),
      contractAddress: contractAddr.slice(0, 10) + '...' + contractAddr.slice(-6),
      contractStatus: status,
      deliveryStrategy: '1+2+3',
      gasLimit: parseFloat(gasLimitGwei.toFixed(4)),
      airdropQuantity,
      tokenFee: parseFloat(tokenFeeUsd.toFixed(2)),
      gasCost: parseFloat(gasCostUsd.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      averageCost: airdropQuantity > 0 ? parseFloat((totalCost / airdropQuantity).toFixed(6)) : 0,
      cumulativeQuantity: cumulativeQty,
    });
  }

  return contracts;
}

function computeTotals(contracts: Contract[]): ContractTotals {
  const totalAirdropQuantity = contracts.reduce((s, c) => s + c.airdropQuantity, 0);
  const totalTokenFee = contracts.reduce((s, c) => s + c.tokenFee, 0);
  const totalGasCost = contracts.reduce((s, c) => s + c.gasCost, 0);
  const totalCost = contracts.reduce((s, c) => s + c.totalCost, 0);
  const grandCumulativeQuantity = contracts.reduce((s, c) => s + c.cumulativeQuantity, 0);
  return {
    totalAirdropQuantity,
    totalTokenFee,
    totalGasCost,
    totalCost,
    totalAverageCost: totalAirdropQuantity ? totalCost / totalAirdropQuantity : 0,
    grandCumulativeQuantity,
  };
}

async function fetchFromEtherscan(): Promise<Contract[]> {
  const now = Date.now();
  if (cachedContracts.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedContracts;
  }

  console.log('[contractsService] Fetching real data from Etherscan...');
  const [transfers, ethPriceData] = await Promise.all([
    getTokenTransfers(WATCH_ADDRESS, '1', '100', 'desc'),
    getEthPrice(),
  ]);

  const ethPriceUsd = parseFloat(ethPriceData.ethusd) || 0;
  cachedContracts = mapTransfersToContracts(transfers, ethPriceUsd);
  cacheTimestamp = now;

  console.log(`[contractsService] Loaded ${cachedContracts.length} contracts from ${transfers.length} token transfers`);
  return cachedContracts;
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function getContracts(page: number, pageSize: number): Promise<ContractsResponse> {
  const all = await fetchFromEtherscan();
  const start = (page - 1) * pageSize;
  const data = all.slice(start, start + pageSize);

  return {
    data,
    totals: computeTotals(all),
    pagination: {
      page,
      pageSize,
      total: all.length,
      totalPages: Math.ceil(all.length / pageSize),
    },
  };
}

export async function getContractById(id: string): Promise<ContractDetail | null> {
  const all = await fetchFromEtherscan();
  const contract = all.find((c) => c.id === id);
  if (!contract) return null;

  return {
    contractNumber: contract.contractNumber,
    activationTime: contract.activationTime,
    contractAddress: contract.contractAddress,
    deliveryStrategy: contract.deliveryStrategy,
    gasLimit: contract.gasLimit,
  };
}

export async function applyContractConfig(_payload: ContractConfigPayload): Promise<void> {
  // Config updates are not applicable when data comes from Etherscan
  // This is a read-only view of real blockchain data
}
