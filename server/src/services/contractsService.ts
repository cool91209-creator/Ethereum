import type {
  Contract,
  ContractDetail,
  ContractTotals,
  ContractsResponse,
  ContractConfigPayload,
} from '../types';
import {
  getContractTodayTransfers,
  sampleWalletTokenTransfers,
  getTokenInfo,
  getEthPrice,
  getGasOracle,
  getBlockByTimestamp,
  type TokenTransfer,
} from './etherscanService';
import { getTokenPricesUsd } from './priceService';

// Watch address: the wallet whose outgoing token transfers are monitored per token contract.
const WATCH_ADDRESS = process.env.ETHERSCAN_WATCH_ADDRESS || '0x28C6c06298d514Db089934071355E5743bf21d60';

// ─── In-memory contract store ─────────────────────────────────────────────────────────────────────

let cachedContracts: Contract[] = [];

// ─── Map Etherscan token transfers → Contract rows ───────────────────────────

function mapTransfersToContracts(
  transfers: TokenTransfer[],
  ethPriceUsd: number,
  networkGasPriceGwei: number,
  tokenPrices: Map<string, number>,
  todayTotals: Map<string, { amount: number; count: number; gasCostEth: number }>  // accurate per-contract outgoing totals for today
): Contract[] {
  // Group transfers by contract address
  const grouped = new Map<string, TokenTransfer[]>();
  for (const tx of transfers) {
    const addr = tx.contractAddress.toLowerCase();
    if (!grouped.has(addr)) grouped.set(addr, []);
    grouped.get(addr)!.push(tx);
  }

  // Calculate today/yesterday boundaries (UTC midnight)
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime() / 1000;
  const yesterdayStart = todayStart - 86400; // 24h before today start

  let serial = 0;
  const contracts: Contract[] = [];

  for (const [contractAddr, txs] of grouped) {
    serial++;
    // Only count outgoing transfers (from == watch address) for all metrics
    const outgoingTxs = txs.filter(t => t.from.toLowerCase() === WATCH_ADDRESS.toLowerCase());
    const firstTx = (outgoingTxs.length > 0 ? outgoingTxs[outgoingTxs.length - 1] : txs[txs.length - 1]); // oldest
    const latestTx = (outgoingTxs.length > 0 ? outgoingTxs[0] : txs[0]); // newest

    const tokenDecimal = parseInt(firstTx.tokenDecimal) || 18;
    const tokenSymbol = firstTx.tokenSymbol || '';
    const tokenName = firstTx.tokenName || '';
    const totalValue = outgoingTxs.reduce(
      (sum, t) => sum + parseFloat(t.value) / Math.pow(10, tokenDecimal),
      0
    );
    const airdropQuantity = Math.round(totalValue);

    // Split outgoing transactions into yesterday and today based on real timestamps
    let yesterdayValue = 0;
    let todayValue = 0;
    let bulkTodayCount = 0;
    for (const t of outgoingTxs) {
      const ts = parseInt(t.timeStamp);
      const val = parseFloat(t.value) / Math.pow(10, tokenDecimal);
      if (ts >= todayStart) {
        todayValue += val;
        bulkTodayCount++;
      } else if (ts >= yesterdayStart) {
        yesterdayValue += val;
      }
    }
    const airdropYesterday = Math.round(yesterdayValue);
    // airdropToday: use per-contract accurate outgoing count if available, else fall back to bulk
    const accurateTodayData = todayTotals.get(contractAddr);
    const airdropToday = accurateTodayData !== undefined
      ? Math.round(accurateTodayData.amount)
      : Math.round(todayValue);
    const txCountToday = accurateTodayData?.count ?? bulkTodayCount;

    // Count outgoing transactions yesterday from bulk data
    let txCountYesterday = 0;
    for (const t of outgoingTxs) {
      const ts = parseInt(t.timeStamp);
      if (ts >= yesterdayStart && ts < todayStart) txCountYesterday++;
    }

    // Token Fee ($) = total outgoing tokens transferred today × token_price
    const tokenPriceUsd = tokenPrices.get(contractAddr) || 0;
    const todayAmtForFee = accurateTodayData !== undefined ? accurateTodayData.amount : todayValue;
    const tokenFeeUsd = todayAmtForFee * tokenPriceUsd;

    // Gas Fee — use actual gasPrice×gasUsed from today's outgoing txs if available (Batch 5 data),
    // otherwise fall back to estimating with current network gas price across all bulk txs
    const gasCostUsd = accurateTodayData?.gasCostEth !== undefined
      ? accurateTodayData.gasCostEth * ethPriceUsd
      : txs.reduce((sum, t) => {
          const gasUsed = parseFloat(t.gasUsed);
          const feeEth = (gasUsed * networkGasPriceGwei) / 1e9;
          return sum + feeEth * ethPriceUsd;
        }, 0);

    // 3. Total Fee = Token Fee + Gas Fee
    const totalCost = tokenFeeUsd + gasCostUsd;

    // Determine status using transaction count, value, and position to
    // produce a realistic spread: Running → Preparing → Ready → Limited → Stopped
    const latestTimestamp = parseInt(latestTx.timeStamp) * 1000;
    const ageMs = Date.now() - latestTimestamp;
    const ageHours = ageMs / (1000 * 60 * 60);
    // Score: higher = more active. Combines recency + tx count + value
    const recencyScore = Math.max(0, 100 - ageHours * 2);
    const txCountScore = Math.min(txs.length * 15, 50);
    const valueScore = Math.min(totalValue / 1000, 30);
    const activityScore = recencyScore + txCountScore + valueScore;

    let status: Contract['contractStatus'];
    if (activityScore > 155) status = 'running';
    else if (activityScore > 140) status = 'preparing';
    else if (activityScore > 128) status = 'ready';
    else if (activityScore > 118) status = 'limited';
    else status = 'stopped';

    // Activation time
    const activationDate = new Date(parseInt(firstTx.timeStamp) * 1000);

    contracts.push({
      id: String(serial),
      serialNumber: serial,
      contractNumber: `Eth${String(serial).padStart(3, '0')}`,
      activationTime: activationDate.toISOString(),
      contractAddress: contractAddr,
      contractStatus: status,
      tokenSymbol,
      deliveryStrategy: '1+2+3',
      gasLimit: parseFloat(networkGasPriceGwei.toFixed(2)),
      airdropQuantity,
      airdropYesterday,
      airdropToday,
      tokenFee: parseFloat(tokenFeeUsd.toFixed(2)),
      tokenAmount: airdropToday,
      tokenWalletAmount: airdropToday,
      tokenContractAmount: 0,
      tokenPrice: parseFloat(tokenPriceUsd.toFixed(10)),
      txCountYesterday,
      txCountToday,
      gasCost: parseFloat(gasCostUsd.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      averageCost: airdropToday > 0 ? parseFloat((totalCost / airdropToday).toFixed(6)) : 0,
      cumulativeQuantity: txCountYesterday + txCountToday,
    });
  }

  // Only return contracts that have outgoing transactions today
  return contracts.filter(c => c.txCountToday > 0);
}

function computeTotals(contracts: Contract[]): ContractTotals {
  const totalAirdropQuantity = contracts.reduce((s, c) => s + c.airdropQuantity, 0);
  const totalAirdropToday = contracts.reduce((s, c) => s + c.airdropToday, 0);
  const totalTxCountToday = contracts.reduce((s, c) => s + c.txCountToday, 0);
  const totalTokenFee = contracts.reduce((s, c) => s + c.tokenFee, 0);
  const totalGasCost = contracts.reduce((s, c) => s + c.gasCost, 0);
  const totalCost = contracts.reduce((s, c) => s + c.totalCost, 0);
  const grandCumulativeQuantity = contracts.reduce((s, c) => s + c.cumulativeQuantity, 0);
  return {
    totalAirdropQuantity,
    totalAirdropToday,
    totalTxCountToday,
    totalTokenFee,
    totalGasCost,
    totalCost,
    totalAverageCost: totalAirdropQuantity ? totalCost / totalAirdropQuantity : 0,
    grandCumulativeQuantity,
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function getContracts(page: number, pageSize: number): Promise<ContractsResponse> {
  // Return from in-memory cache only — no auto-fetch from Etherscan.
  // Contracts are added individually via applyContractConfig().
  const all = cachedContracts;
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
  const contract = cachedContracts.find((c) => c.id === id);
  if (!contract) return null;

  return {
    contractNumber: contract.contractNumber,
    activationTime: contract.activationTime,
    contractAddress: contract.contractAddress,
    deliveryStrategy: contract.deliveryStrategy,
    gasLimit: contract.gasLimit,
  };
}

export function deleteContract(id: string): boolean {
  const idx = cachedContracts.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  cachedContracts.splice(idx, 1);
  // Re-number serials to stay consecutive
  cachedContracts.forEach((c, i) => { c.serialNumber = i + 1; });
  return true;
}

// ─── Live data fetcher (shared by applyContractConfig and refreshSingleContract) ──

interface LiveData {
  isWalletMode: boolean;
  tokenContractAddr: string;
  tokenSymbol: string;
  tokenPriceUsd: number;
  txCountToday: number;
  txCountYesterday: number;
  airdropToday: number;
  airdropYesterday: number;
  gasCostUsd: number;
  tokenFeeUsd: number;
  totalCost: number;
  networkGasPriceGwei: number;
}

async function fetchLiveData(addr: string, fallbackSymbol = ''): Promise<LiveData> {
  // Use GMT+7 midnight as day boundaries to match what users see in block explorers.
  // GMT+7 = UTC+25200s. Floor current time (in GMT+7) to the nearest day to get today's start.
  const GMT7_OFFSET_SEC = 7 * 3600; // 25200
  const nowTs           = Math.floor(Date.now() / 1000);
  const nowGmt7         = nowTs + GMT7_OFFSET_SEC;
  const todayStartTs    = Math.floor(nowGmt7 / 86400) * 86400 - GMT7_OFFSET_SEC; // GMT+7 midnight in UTC
  const yesterdayStartTs = todayStartTs - 86400;
  console.log(`[fetchLiveData] GMT+7 today starts at UTC ${new Date(todayStartTs * 1000).toISOString()}`);

  const yesterdayBlock = await getBlockByTimestamp(yesterdayStartTs, 'after');
  const todayBlock     = await getBlockByTimestamp(todayStartTs, 'after');
  const ethPriceData   = await getEthPrice();
  const gasOracleData  = await getGasOracle();

  // Detect mode by sampling the most recent 50 ERC-20 transfers (no time restriction).
  // This always works even when the wallet had no activity today.
  // "wallet mode"  = addr participates in transfers of tokens ≠ addr → it sends tokens itself
  // "token mode"   = addr IS the ERC-20 token contract; WATCH_ADDRESS sends it
  const sample             = await sampleWalletTokenTransfers(addr);
  const otherTokenActivity = sample.filter(t => t.contractAddress.toLowerCase() !== addr.toLowerCase());
  console.log(`[fetchLiveData] ${addr}: sample=${sample.length}, otherTokenActivity=${otherTokenActivity.length}`);

  let rawYesterdayTxs: TokenTransfer[];
  let rawTodayTxs: TokenTransfer[];
  let tokenContractAddr = addr;
  let isWalletMode = false;

  if (otherTokenActivity.length > 0) {
    isWalletMode = true;
    const outCounts   = new Map<string, number>();
    const totalCounts = new Map<string, number>();
    for (const t of otherTokenActivity) {
      const ca = t.contractAddress.toLowerCase();
      totalCounts.set(ca, (totalCounts.get(ca) || 0) + 1);
      if (t.from.toLowerCase() === addr.toLowerCase())
        outCounts.set(ca, (outCounts.get(ca) || 0) + 1);
    }
    let maxOut = 0;
    for (const [ca, count] of outCounts)   { if (count > maxOut)   { maxOut = count; tokenContractAddr = ca; } }
    if (!maxOut) {
      let maxTotal = 0;
      for (const [ca, count] of totalCounts) { if (count > maxTotal) { maxTotal = count; tokenContractAddr = ca; } }
      console.log(`[fetchLiveData] wallet mode — dominant token (by total, from=0): ${tokenContractAddr}`);
    } else {
      console.log(`[fetchLiveData] wallet mode — dominant outgoing token: ${tokenContractAddr} (${maxOut} sample txs)`);
    }
    rawYesterdayTxs = await getContractTodayTransfers(tokenContractAddr, addr, yesterdayBlock, yesterdayStartTs);
    rawTodayTxs     = await getContractTodayTransfers(tokenContractAddr, addr, todayBlock, todayStartTs);
  } else {
    console.log(`[fetchLiveData] token mode — querying ${addr} × WATCH_ADDRESS`);
    rawYesterdayTxs = await getContractTodayTransfers(addr, WATCH_ADDRESS, yesterdayBlock, yesterdayStartTs);
    rawTodayTxs     = await getContractTodayTransfers(addr, WATCH_ADDRESS, todayBlock, todayStartTs);
  }

  const yesterdayOnly = rawYesterdayTxs.filter(t => {
    const ts = parseInt(t.timeStamp);
    return ts >= yesterdayStartTs && ts < todayStartTs;
  });
  console.log(`[fetchLiveData] today=${rawTodayTxs.length}, yesterday=${yesterdayOnly.length}`);

  const addrLower  = addr.toLowerCase();
  const watchAddr  = isWalletMode ? addrLower : WATCH_ADDRESS.toLowerCase();

  // Check from-filter across ALL raw data (today + yesterday).
  // Etherscan tx.from = tx initiator, not ERC-20 Transfer "from". If wallet sends via
  // an intermediate contract, from≠wallet everywhere → use to≠addr fallback for both days.
  const allRaw         = [...rawTodayTxs, ...yesterdayOnly];
  const fromFilterHits = allRaw.filter(t => t.from.toLowerCase() === watchAddr).length;
  const useToFallback  = isWalletMode && fromFilterHits === 0 && allRaw.length > 0;
  if (useToFallback) console.warn(`[fetchLiveData] from-filter=0 in wallet mode — using to≠addr fallback`);

  const outgoingToday     = useToFallback
    ? rawTodayTxs.filter(t => t.to.toLowerCase() !== addrLower)
    : rawTodayTxs.filter(t => t.from.toLowerCase() === watchAddr);
  const outgoingYesterday = useToFallback
    ? yesterdayOnly.filter(t => t.to.toLowerCase() !== addrLower)
    : yesterdayOnly.filter(t => t.from.toLowerCase() === watchAddr);

  const allOutgoing  = [...outgoingToday, ...outgoingYesterday];
  const firstTx      = allOutgoing.length > 0 ? allOutgoing[allOutgoing.length - 1] : null;
  const tokenDecimal = firstTx ? parseInt(firstTx.tokenDecimal) || 18 : 18;
  const rawSymbol    = firstTx?.tokenSymbol || '';
  const tokenSymbol  = rawSymbol || fallbackSymbol || (await getTokenInfo(tokenContractAddr))?.symbol || '';

  const tokenPrices  = await getTokenPricesUsd([tokenContractAddr]);
  const tokenPriceUsd = tokenPrices.get(tokenContractAddr) || 0;

  const todayAmount     = outgoingToday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);
  const yesterdayAmount = outgoingYesterday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);

  // Count only non-zero-value transfers (mirrors explorer "Hide zero-amount transfers")
  const txCountToday     = outgoingToday.filter(t => t.value !== '0').length;
  const txCountYesterday = outgoingYesterday.filter(t => t.value !== '0').length;
  console.log(`[fetchLiveData] txToday=${txCountToday} (raw=${outgoingToday.length}), txYesterday=${txCountYesterday}`);

  const tokenFeeUsd = todayAmount * tokenPriceUsd;
  const gasCostEth  = outgoingToday.reduce((s, t) => s + (parseFloat(t.gasUsed) * parseFloat(t.gasPrice)) / 1e18, 0);
  const ethPriceUsd = parseFloat(ethPriceData.ethusd) || 0;
  const gasCostUsd  = gasCostEth * ethPriceUsd;
  const totalCost   = tokenFeeUsd + gasCostUsd;

  return {
    isWalletMode,
    tokenContractAddr,
    tokenSymbol,
    tokenPriceUsd,
    txCountToday,
    txCountYesterday,
    airdropToday:     Math.round(todayAmount),
    airdropYesterday: Math.round(yesterdayAmount),
    gasCostUsd,
    tokenFeeUsd,
    totalCost,
    networkGasPriceGwei: parseFloat(gasOracleData.ProposeGasPrice) || 0,
  };
}

// ─── Apply Contract Config ────────────────────────────────────────────────────

export async function applyContractConfig(payload: ContractConfigPayload): Promise<void> {
  const addr = payload.contractAddress.toLowerCase();
  cachedContracts = cachedContracts.filter(c => c.contractAddress !== addr);
  console.log(`[contractsService] Contract Config: fetching live data for ${addr} (${payload.contractNumber})...`);

  const live = await fetchLiveData(addr);

  const maxSerial = cachedContracts.reduce((m, c) => Math.max(m, c.serialNumber), 0);
  const serial    = maxSerial + 1;

  cachedContracts.push({
    id: String(serial),
    serialNumber: serial,
    contractNumber:  payload.contractNumber || `Eth${String(serial).padStart(3, '0')}`,
    activationTime:  new Date().toISOString(),
    contractAddress: addr,
    contractStatus:  live.txCountToday > 0 ? 'running' : 'stopped',
    tokenSymbol:     live.tokenSymbol,
    deliveryStrategy: '1+2+3',
    gasLimit:         parseFloat(live.networkGasPriceGwei.toFixed(2)),
    airdropQuantity:  live.airdropToday + live.airdropYesterday,
    airdropYesterday: live.airdropYesterday,
    airdropToday:     live.airdropToday,
    tokenFee:         parseFloat(live.tokenFeeUsd.toFixed(2)),
    tokenAmount:      live.airdropToday,
    tokenWalletAmount: live.airdropToday,
    tokenContractAmount: 0,
    tokenPrice:       parseFloat(live.tokenPriceUsd.toFixed(10)),
    txCountYesterday: live.txCountYesterday,
    txCountToday:     live.txCountToday,
    gasCost:          parseFloat(live.gasCostUsd.toFixed(2)),
    totalCost:        parseFloat(live.totalCost.toFixed(2)),
    averageCost:      live.airdropToday > 0 ? parseFloat((live.totalCost / live.airdropToday).toFixed(6)) : 0,
    cumulativeQuantity: live.txCountYesterday + live.txCountToday,
  });
  console.log(`[contractsService] Added ${addr} (${live.tokenSymbol}), ${live.txCountToday} txs today [${live.isWalletMode ? 'wallet' : 'token'} mode]`);
}

// ─── Auto-refresh ─────────────────────────────────────────────────────────────

async function refreshSingleContract(contract: Contract): Promise<void> {
  const addr = contract.contractAddress.toLowerCase();
  const live = await fetchLiveData(addr, contract.tokenSymbol);
  const idx  = cachedContracts.findIndex(c => c.id === contract.id);
  if (idx === -1) return; // deleted while refreshing
  cachedContracts[idx] = {
    ...cachedContracts[idx],
    contractStatus:    live.txCountToday > 0 ? 'running' : 'stopped',
    tokenSymbol:       live.tokenSymbol || cachedContracts[idx].tokenSymbol,
    gasLimit:          parseFloat(live.networkGasPriceGwei.toFixed(2)),
    airdropQuantity:   live.airdropToday + live.airdropYesterday,
    airdropYesterday:  live.airdropYesterday,
    airdropToday:      live.airdropToday,
    tokenFee:          parseFloat(live.tokenFeeUsd.toFixed(2)),
    tokenAmount:       live.airdropToday,
    tokenWalletAmount: live.airdropToday,
    tokenPrice:        parseFloat(live.tokenPriceUsd.toFixed(10)),
    txCountYesterday:  live.txCountYesterday,
    txCountToday:      live.txCountToday,
    gasCost:           parseFloat(live.gasCostUsd.toFixed(2)),
    totalCost:         parseFloat(live.totalCost.toFixed(2)),
    averageCost:       live.airdropToday > 0 ? parseFloat((live.totalCost / live.airdropToday).toFixed(6)) : 0,
    cumulativeQuantity: live.txCountYesterday + live.txCountToday,
  };
  console.log(`[contractsService] Refreshed ${addr}: ${live.txCountToday} txs today, ${live.airdropToday} tokens`);
}

export async function refreshAllContracts(): Promise<void> {
  if (cachedContracts.length === 0) return;
  console.log(`[contractsService] Auto-refresh: updating ${cachedContracts.length} contract(s)...`);
  const snapshot = [...cachedContracts];
  for (const c of snapshot) {
    try {
      await refreshSingleContract(c);
    } catch (err) {
      console.error(`[contractsService] Refresh failed for ${c.contractAddress}: ${err}`);
    }
  }
  console.log(`[contractsService] Auto-refresh complete.`);
}
