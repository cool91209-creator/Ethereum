import type {
  Contract,
  ContractDetail,
  ContractTotals,
  ContractsResponse,
  ContractConfigPayload,
} from '../types';
import {
  getContractTodayTransfers,
  getAddressTodayTokenTransfers,
  getTokenTxCountForContract,
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

export async function applyContractConfig(payload: ContractConfigPayload): Promise<void> {
  const addr = payload.contractAddress.toLowerCase();

  // Remove existing entry for same address (if any) before re-fetching
  // Save any existing entry so we can restore it if validation fails
  const existingEntry = cachedContracts.find(c => c.contractAddress === addr) ?? null;
  cachedContracts = cachedContracts.filter(c => c.contractAddress !== addr);

  console.log(`[contractsService] Contract Config: fetching data for ${addr} (${payload.contractNumber})...`);

  // 1. Block boundaries + ETH price + Gas Oracle
  // Rate limiting is handled globally in etherscanRequest (250ms between calls)
  const nowDate = new Date();
  const todayStartTs = Math.floor(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()) / 1000);
  const yesterdayStartTs = todayStartTs - 86400;
  console.log(`[contractsService] Date boundaries: today=${new Date(todayStartTs * 1000).toISOString()}, yesterday=${new Date(yesterdayStartTs * 1000).toISOString()}`);

  const yesterdayBlock = await getBlockByTimestamp(yesterdayStartTs, 'after');
  console.log(`[contractsService] yesterdayBlock=${yesterdayBlock}`);

  const todayBlock = await getBlockByTimestamp(todayStartTs, 'after');
  console.log(`[contractsService] todayBlock=${todayBlock}`);

  const ethPriceData = await getEthPrice();
  console.log(`[contractsService] ETH price=$${ethPriceData.ethusd}`);

  const gasOracleData = await getGasOracle();
  console.log(`[contractsService] Gas=${gasOracleData.ProposeGasPrice} gwei`);

  // 2. Detect if addr is an ERC-20 token contract or a wallet address (EOA)
  const isTokenContract = await getTokenTxCountForContract(addr);
  console.log(`[contractsService] ${addr}: isTokenContract=${isTokenContract}`);

  // 3. Fetch transfers using the correct mode
  let rawYesterdayTxs: TokenTransfer[];
  let rawTodayTxs: TokenTransfer[];
  if (isTokenContract) {
    // addr is an ERC-20 token → fetch transfers of this token involving WATCH_ADDRESS
    rawYesterdayTxs = await getContractTodayTransfers(addr, WATCH_ADDRESS, yesterdayBlock, yesterdayStartTs);
    rawTodayTxs = await getContractTodayTransfers(addr, WATCH_ADDRESS, todayBlock, todayStartTs);
  } else {
    // addr is a wallet address → fetch all ERC-20 transfers from this wallet
    rawYesterdayTxs = await getAddressTodayTokenTransfers(addr, yesterdayBlock, yesterdayStartTs);
    rawTodayTxs = await getAddressTodayTokenTransfers(addr, todayBlock, todayStartTs);
  }

  const yesterdayOnly = rawYesterdayTxs.filter(t => {
    const ts = parseInt(t.timeStamp);
    return ts >= yesterdayStartTs && ts < todayStartTs;
  });
  console.log(`[contractsService] Yesterday raw=${rawYesterdayTxs.length}, filtered=${yesterdayOnly.length}`);
  console.log(`[contractsService] Today txs=${rawTodayTxs.length}`);

  // Outgoing = sent FROM the monitored source (WATCH_ADDRESS for token mode, addr for wallet mode)
  const watchAddr = isTokenContract ? WATCH_ADDRESS.toLowerCase() : addr.toLowerCase();
  let outgoingToday = rawTodayTxs.filter(t => t.from.toLowerCase() === watchAddr);
  let outgoingYesterday = yesterdayOnly.filter(t => t.from.toLowerCase() === watchAddr);

  // For wallet mode: find the dominant outgoing token (most txs today) and narrow to it
  let tokenContractAddr = addr;
  if (!isTokenContract && outgoingToday.length > 0) {
    const tokenCounts = new Map<string, number>();
    for (const t of outgoingToday) {
      const ca = t.contractAddress.toLowerCase();
      tokenCounts.set(ca, (tokenCounts.get(ca) || 0) + 1);
    }
    let maxCount = 0;
    for (const [ca, count] of tokenCounts) {
      if (count > maxCount) { maxCount = count; tokenContractAddr = ca; }
    }
    outgoingToday = outgoingToday.filter(t => t.contractAddress.toLowerCase() === tokenContractAddr);
    outgoingYesterday = outgoingYesterday.filter(t => t.contractAddress.toLowerCase() === tokenContractAddr);
    console.log(`[contractsService] Wallet mode — dominant token: ${tokenContractAddr} (${maxCount} txs today)`);
  }

  const allOutgoing = [...outgoingToday, ...outgoingYesterday];
  const firstTx = allOutgoing.length > 0 ? allOutgoing[allOutgoing.length - 1] : null; // oldest
  const tokenDecimal = firstTx ? parseInt(firstTx.tokenDecimal) || 18 : 18;
  const rawSymbol = firstTx?.tokenSymbol || '';
  const tokenSymbol = rawSymbol || (await getTokenInfo(tokenContractAddr))?.symbol || '';

  // 4. Token price from DeFi Llama
  const tokenPrices = await getTokenPricesUsd([tokenContractAddr]);
  const tokenPriceUsd = tokenPrices.get(tokenContractAddr) || 0;

  const todayAmount = outgoingToday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);
  const yesterdayAmount = outgoingYesterday.reduce((s, t) => s + parseFloat(t.value) / Math.pow(10, tokenDecimal), 0);
  const totalAmount = todayAmount + yesterdayAmount;

  const txCountToday = outgoingToday.length;
  const txCountYesterday = outgoingYesterday.length;

  const tokenFeeUsd = todayAmount * tokenPriceUsd;

  // Gas cost: wallet mode sums ALL outgoing txs (all tokens); token mode uses only this token's txs
  const gasCostTxs = isTokenContract
    ? outgoingToday
    : rawTodayTxs.filter(t => t.from.toLowerCase() === addr.toLowerCase());
  const gasCostEth = gasCostTxs.reduce((s, t) => {
    return s + (parseFloat(t.gasUsed) * parseFloat(t.gasPrice)) / 1e18;
  }, 0);
  const ethPriceUsd = parseFloat(ethPriceData.ethusd) || 0;
  const gasCostUsd = gasCostEth * ethPriceUsd;

  const totalCost = tokenFeeUsd + gasCostUsd;
  const airdropToday = Math.round(todayAmount);
  const airdropYesterday = Math.round(yesterdayAmount);

  const networkGasPriceGwei = parseFloat(gasOracleData.ProposeGasPrice) || 0;
  const activationDate = firstTx ? new Date(parseInt(firstTx.timeStamp) * 1000) : new Date();

  // Determine serial number: max existing + 1
  const maxSerial = cachedContracts.reduce((m, c) => Math.max(m, c.serialNumber), 0);
  const serial = maxSerial + 1;

  const contract: Contract = {
    id: String(serial),
    serialNumber: serial,
    contractNumber: payload.contractNumber || `Eth${String(serial).padStart(3, '0')}`,
    activationTime: activationDate.toISOString(),
    contractAddress: addr,
    contractStatus: txCountToday > 0 ? 'running' : 'stopped',
    tokenSymbol,
    deliveryStrategy: '1+2+3',
    gasLimit: parseFloat(networkGasPriceGwei.toFixed(2)),
    airdropQuantity: Math.round(totalAmount),
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
  };

  cachedContracts.push(contract);
  console.log(`[contractsService] Contract Config: added ${addr} (${tokenSymbol}), ${txCountToday} txs today, ${airdropToday} tokens${!isTokenContract ? ' [wallet mode]' : ''}`);
}
