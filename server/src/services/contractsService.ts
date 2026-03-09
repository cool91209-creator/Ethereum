import type {
  Contract,
  ContractDetail,
  ContractTotals,
  ContractsResponse,
  ContractConfigPayload,
  TokenBreakdownItem,
} from '../types';
import {
  getContractTodayTransfers,
  getAllWalletTokenTransfers,
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
      gasLimit: 0.03,
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

export function updateContract(id: string, updates: Partial<Pick<Contract, 'contractNumber' | 'contractAddress' | 'deliveryStrategy'>>): boolean {
  const contract = cachedContracts.find((c) => c.id === id);
  if (!contract) return false;
  if (updates.contractNumber !== undefined) contract.contractNumber = updates.contractNumber;
  if (updates.contractAddress !== undefined) contract.contractAddress = updates.contractAddress.toLowerCase();
  if (updates.deliveryStrategy !== undefined) contract.deliveryStrategy = updates.deliveryStrategy;
  return true;
}

export function deleteContract(id: string): boolean {
  const idx = cachedContracts.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  contractHourlyMap.delete(cachedContracts[idx].contractAddress);
  cachedContracts.splice(idx, 1);
  // Re-number serials to stay consecutive
  cachedContracts.forEach((c, i) => { c.serialNumber = i + 1; });
  return true;
}

// ─── Per-contract hourly tx data (for the metrics chart) ─────────────────────

// Keyed by contractAddress → 24-slot array (index = GMT+7 hour)
const contractHourlyMap = new Map<string, Array<{ txCount: number; avgGasGwei: number }>>();

function emptyHourly(): Array<{ txCount: number; avgGasGwei: number }> {
  return Array.from({ length: 24 }, () => ({ txCount: 0, avgGasGwei: 0 }));
}

/** Fills all 24 hour slots with the same daily total so every bar shows the same height/count. */
function buildDailyBuckets(txCountToday: number, avgGasGwei: number): Array<{ txCount: number; avgGasGwei: number }> {
  return Array.from({ length: 24 }, () => ({ txCount: txCountToday, avgGasGwei }));
}

/** Returns per-hour data for every configured contract, in table order. */
export function getContractHourlyData(): Array<{ contractNumber: string; hourly: Array<{ txCount: number; avgGasGwei: number }> }> {
  return cachedContracts.map(c => ({
    contractNumber: c.contractNumber,
    hourly: contractHourlyMap.get(c.contractAddress) ?? emptyHourly(),
  }));
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
  tokenBreakdown: TokenBreakdownItem[];
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
  const sameTokenCount     = sample.filter(t => t.contractAddress.toLowerCase() === addr.toLowerCase()).length;
  const otherTokenActivity = sample.filter(t => t.contractAddress.toLowerCase() !== addr.toLowerCase());
  // If > 50% of sample transfers have contractAddress === addr, this IS a token contract
  // (not a wallet). Scam/fake tokens sent to popular contracts cause false positives otherwise.
  const isTokenContract    = sample.length > 0 && sameTokenCount > sample.length * 0.5;
  console.log(`[fetchLiveData] ${addr}: sample=${sample.length}, sameToken=${sameTokenCount}, otherToken=${otherTokenActivity.length}, isTokenContract=${isTokenContract}`);

  let rawYesterdayTxs: TokenTransfer[];
  let rawTodayTxs: TokenTransfer[];
  let tokenContractAddr = addr;
  let isWalletMode = false;
  // Declared here so both branches can populate them; reused for multi-token breakdown below.
  let multiTodayRaw:     TokenTransfer[];
  let multiYesterdayRaw: TokenTransfer[];
  const addrLow = addr.toLowerCase();

  if (sample.length === 0) {
    // No token transfers found at all for this address — return empty data
    console.log(`[fetchLiveData] ${addr}: no token transfers found — returning empty data`);
    const tokenInfo = await getTokenInfo(addr);
    return {
      isWalletMode: false,
      tokenContractAddr: addr,
      tokenSymbol: tokenInfo?.symbol || fallbackSymbol || '',
      tokenPriceUsd: 0,
      txCountToday: 0,
      txCountYesterday: 0,
      airdropToday: 0,
      airdropYesterday: 0,
      gasCostUsd: 0,
      tokenFeeUsd: 0,
      totalCost: 0,
      networkGasPriceGwei: parseFloat(gasOracleData.ProposeGasPrice) || 0,
      tokenBreakdown: [],
    };
  }

  if (!isTokenContract && otherTokenActivity.length > 0) {
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
    // Primary counts: transfers of the dominant token involving this wallet
    rawYesterdayTxs = await getContractTodayTransfers(tokenContractAddr, addr, yesterdayBlock, yesterdayStartTs);
    rawTodayTxs     = await getContractTodayTransfers(tokenContractAddr, addr, todayBlock, todayStartTs);
    // Multi-token breakdown: ALL ERC-20 transfers for this wallet (no contractaddress filter)
    multiTodayRaw     = await getAllWalletTokenTransfers(addrLow, todayBlock,     todayStartTs);
    multiYesterdayRaw = await getAllWalletTokenTransfers(addrLow, yesterdayBlock, yesterdayStartTs);
  } else {
    // Token mode: addr IS the ERC-20 token contract (e.g. USDT).
    // Use contractaddress + address filter so Etherscan returns only transfers of this
    // specific token for the WATCH_ADDRESS. This avoids the 10,000-row API cap that
    // caused the old "fetch all tokens then filter client-side" approach to miss data
    // for high-volume wallets like Binance.
    console.log(`[fetchLiveData] token mode — fetching ${addr} transfers for WATCH_ADDRESS`);
    rawTodayTxs     = await getContractTodayTransfers(addr, WATCH_ADDRESS, todayBlock, todayStartTs);
    rawYesterdayTxs = await getContractTodayTransfers(addr, WATCH_ADDRESS, yesterdayBlock, yesterdayStartTs);
    console.log(`[fetchLiveData] token mode — rawToday=${rawTodayTxs.length}, rawYesterday=${rawYesterdayTxs.length}`);
    // For multi-token breakdown in token mode, the only token is the contract itself
    multiTodayRaw     = rawTodayTxs;
    multiYesterdayRaw = rawYesterdayTxs;
  }

  const yesterdayOnly = rawYesterdayTxs.filter(t => {
    const ts = parseInt(t.timeStamp);
    return ts >= yesterdayStartTs && ts < todayStartTs;
  });
  console.log(`[fetchLiveData] today=${rawTodayTxs.length}, yesterday=${yesterdayOnly.length}`);

  // Filter to outgoing transfers only.
  // Wallet mode: from == wallet addr (the wallet sends tokens)
  // Token mode:  from == WATCH_ADDRESS (the watch address sends this token)
  const allRaw         = [...rawTodayTxs, ...yesterdayOnly];
  const outgoingAddr   = isWalletMode ? addrLow : WATCH_ADDRESS.toLowerCase();
  const fromFilterHits = allRaw.filter(t => t.from.toLowerCase() === outgoingAddr).length;
  const useToFallback  = isWalletMode && fromFilterHits === 0 && allRaw.length > 0;
  if (useToFallback) console.warn(`[fetchLiveData] from-filter=0 in wallet mode — using to≠addr fallback`);

  const outgoingToday = useToFallback
    ? rawTodayTxs.filter(t => t.to.toLowerCase() !== addrLow)
    : rawTodayTxs.filter(t => t.from.toLowerCase() === outgoingAddr);

  const outgoingYesterday = useToFallback
    ? yesterdayOnly.filter(t => t.to.toLowerCase() !== addrLow)
    : yesterdayOnly.filter(t => t.from.toLowerCase() === outgoingAddr);

  console.log(`[fetchLiveData] outgoing filter (${outgoingAddr.slice(0,10)}): today=${outgoingToday.length}/${rawTodayTxs.length}, yesterday=${outgoingYesterday.length}/${yesterdayOnly.length}`);

  const allOutgoing  = [...outgoingToday, ...outgoingYesterday];
  const firstTx      = allOutgoing.length > 0 ? allOutgoing[allOutgoing.length - 1] : null;
  const tokenDecimal = firstTx ? parseInt(firstTx.tokenDecimal) || 18 : 18;
  const rawSymbol    = firstTx?.tokenSymbol || '';
  const tokenSymbol  = rawSymbol || fallbackSymbol || (await getTokenInfo(tokenContractAddr))?.symbol || '';

  // multiTodayRaw / multiYesterdayRaw were already fetched in the mode branch above.
  // Wallet mode  → fetched with address=wallet (all tokens the wallet sent/received)
  // Token mode   → fetched with address=WATCH_ADDRESS (all tokens the watch address interacted with)
  const multiYesterday = multiYesterdayRaw.filter(t => {
    const ts = parseInt(t.timeStamp);
    return ts >= yesterdayStartTs && ts < todayStartTs;
  });

  // Direction filter for multi-token breakdown — same logic as primary filter.
  // Both modes: only count outgoing transfers (from == outgoingAddr).
  const multiFromHits      = [...multiTodayRaw, ...multiYesterday].filter(t => t.from.toLowerCase() === outgoingAddr).length;
  const multiUseToFallback = isWalletMode && multiFromHits === 0 && (multiTodayRaw.length + multiYesterday.length) > 0;
  const multiOutToday = multiUseToFallback
    ? multiTodayRaw.filter(t => t.to.toLowerCase() !== addrLow)
    : multiTodayRaw.filter(t => t.from.toLowerCase() === outgoingAddr);
  const multiOutYesterday = multiUseToFallback
    ? multiYesterday.filter(t => t.to.toLowerCase() !== addrLow)
    : multiYesterday.filter(t => t.from.toLowerCase() === outgoingAddr);

  // Group by ERC-20 token contract address
  type TkEntry = { symbol: string; dec: number; amt: number; amtY: number; cnt: number; cntY: number };
  const tkMap = new Map<string, TkEntry>();
  const accTk = (txs: TokenTransfer[], day: 'today' | 'yesterday') => {
    for (const t of txs) {
      const ca  = t.contractAddress.toLowerCase();
      const dec = parseInt(t.tokenDecimal) || 18;
      const val = parseFloat(t.value) / Math.pow(10, dec);
      const e   = tkMap.get(ca);
      if (e) {
        if (day === 'today') { e.amt  += val; if (t.value !== '0') e.cnt++;  }
        else                  { e.amtY += val; if (t.value !== '0') e.cntY++; }
      } else {
        tkMap.set(ca, day === 'today'
          ? { symbol: t.tokenSymbol || '', dec, amt: val,  amtY: 0,   cnt: t.value !== '0' ? 1 : 0, cntY: 0 }
          : { symbol: t.tokenSymbol || '', dec, amt: 0,    amtY: val, cnt: 0,                        cntY: t.value !== '0' ? 1 : 0 }
        );
      }
    }
  };
  accTk(multiOutToday,     'today');
  accTk(multiOutYesterday, 'yesterday');

  // Fetch prices for ALL discovered tokens (single call replaces old single-token call)
  const allTokenAddrs = [...new Set([tokenContractAddr, ...tkMap.keys()])];
  const tokenPrices   = await getTokenPricesUsd(allTokenAddrs);
  const tokenPriceUsd = tokenPrices.get(tokenContractAddr) || 0;

  // Build sorted breakdown (highest today-USD first)
  const tokenBreakdown: TokenBreakdownItem[] = [];
  for (const [ca, e] of tkMap) {
    const price = tokenPrices.get(ca) || 0;
    tokenBreakdown.push({
      tokenContract:    ca,
      symbol:           e.symbol,
      amountToday:      Math.round(e.amt),
      amountYesterday:  Math.round(e.amtY),
      amountUsdToday:   parseFloat((e.amt  * price).toFixed(2)),
      txCountToday:     e.cnt,
      txCountYesterday: e.cntY,
    });
  }
  tokenBreakdown.sort((a, b) => b.amountUsdToday - a.amountUsdToday);

  const todayAmount     = outgoingToday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);
  const yesterdayAmount = outgoingYesterday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);

  // Count only non-zero-value transfers (mirrors explorer "Hide zero-amount transfers")
  const txCountToday     = outgoingToday.filter(t => t.value !== '0').length;
  const txCountYesterday = outgoingYesterday.filter(t => t.value !== '0').length;
  console.log(`[fetchLiveData] txToday=${txCountToday} (raw=${outgoingToday.length}), txYesterday=${txCountYesterday}`);

  // Store daily total in all 24 hour slots — chart shows same value in every bar (like the mock)
  const nonZeroToday = outgoingToday.filter(t => t.value !== '0');
  const avgGasGwei   = nonZeroToday.length
    ? parseFloat((nonZeroToday.reduce((s, t) => s + parseFloat(t.gasPrice) / 1e9, 0) / nonZeroToday.length).toFixed(3))
    : 0;
  contractHourlyMap.set(addr, buildDailyBuckets(txCountToday, avgGasGwei));

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
    airdropToday:        Math.round(todayAmount),
    airdropYesterday:    Math.round(yesterdayAmount),
    gasCostUsd,
    tokenFeeUsd,
    totalCost,
    networkGasPriceGwei: parseFloat(gasOracleData.ProposeGasPrice) || 0,
    tokenBreakdown,
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
    gasLimit:         0.03,
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
    tokenBreakdown:   live.tokenBreakdown,
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
    gasLimit:          0.03,
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
    tokenBreakdown:    live.tokenBreakdown,
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
