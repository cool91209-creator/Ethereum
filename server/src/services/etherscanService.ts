import axios from 'axios';

const API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_URL = process.env.ETHERSCAN_BASE_URL || 'https://api.etherscan.io/v2/api';

// Global rate limiter — Etherscan free tier: 5 req/sec max.
// Promise-chain queue ensures requests are serialized with 300ms gaps (~3.3 req/sec),
// even when called concurrently from statsService and contractsService.
let _rateLimitChain: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  _rateLimitChain = _rateLimitChain.then(
    () => new Promise<void>(resolve => setTimeout(resolve, 300))
  );
  return _rateLimitChain;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: unknown;
}

async function etherscanRequest(params: Record<string, string>, attempt = 0): Promise<unknown> {
  await throttle();

  const response = await axios.get<EtherscanResponse>(BASE_URL, {
    params: { ...params, chainid: '1', apikey: API_KEY },
    timeout: 15000,
  });

  const { status, message, result } = response.data;

  if (status !== '1') {
    // 'No transactions found' is normal — return empty array
    if (message === 'No transactions found' || (Array.isArray(result) && result.length === 0)) {
      return [];
    }
    // Rate limit hit — wait with exponential backoff and retry (max 4 times)
    if (typeof result === 'string' && result.toLowerCase().includes('rate limit')) {
      if (attempt >= 4) {
        throw new Error(`[Etherscan] Rate limit persists after ${attempt} retries (action=${params['action']})`);
      }
      const wait = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
      console.warn(`[Etherscan] Rate limit hit (attempt ${attempt + 1}), retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      return etherscanRequest(params, attempt + 1);
    }
    // Any other non-success — throw
    const errMsg = typeof result === 'string' ? result : message;
    throw new Error(`[Etherscan] ${errMsg} (action=${params['action']})`);
  }

  return result;
}

// ─── ETH Price ───────────────────────────────────────────────────────────────

export interface EthPrice {
  ethbtc: string;
  ethbtc_timestamp: string;
  ethusd: string;
  ethusd_timestamp: string;
}

export async function getEthPrice(): Promise<EthPrice> {
  const result = await etherscanRequest({
    module: 'stats',
    action: 'ethprice',
  });
  return result as EthPrice;
}

// ─── Gas Oracle ──────────────────────────────────────────────────────────────

export interface GasOracle {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee: string;
  gasUsedRatio: string;
}

export async function getGasOracle(): Promise<GasOracle> {
  const result = await etherscanRequest({
    module: 'gastracker',
    action: 'gasoracle',
  });
  return result as GasOracle;
}

// ─── Account Balance ─────────────────────────────────────────────────────────

export async function getAccountBalance(address: string): Promise<string> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'balance',
    address,
    tag: 'latest',
  });
  return result as string;
}

// ─── Normal Transactions ─────────────────────────────────────────────────────

export interface EthTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export async function getNormalTransactions(
  address: string,
  startblock = '0',
  endblock = '99999999',
  page = '1',
  offset = '50',
  sort = 'desc'
): Promise<EthTransaction[]> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'txlist',
    address,
    startblock,
    endblock,
    page,
    offset,
    sort,
  });
  return Array.isArray(result) ? result as EthTransaction[] : [];
}

// ─── Token Transfers (ERC20) ─────────────────────────────────────────────────

export interface TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export async function getTokenTransfers(
  address: string,
  page = '1',
  offset = '100',
  sort = 'desc',
  startblock = '0',
  endblock = '99999999'
): Promise<TokenTransfer[]> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'tokentx',
    address,
    startblock,
    endblock,
    page,
    offset,
    sort,
  });
  return Array.isArray(result) ? result as TokenTransfer[] : [];
}

/**
 * Fetch ALL of today's token transfers for a specific contract + wallet.
 * Paginates automatically (200 per page) until all today's transfers are collected.
 * Stops when a page returns fewer than 200 results or contains a tx from before today.
 * Rate limiting is handled globally by throttle() in etherscanRequest.
 */
export async function getContractTodayTransfers(
  contractAddress: string,
  walletAddress: string,
  todayBlock: string,
  todayStartTs: number
): Promise<TokenTransfer[]> {
  const all: TokenTransfer[] = [];
  let page = 1;

  while (true) {
    const result = await etherscanRequest({
      module: 'account',
      action: 'tokentx',
      contractaddress: contractAddress,
      address: walletAddress,
      startblock: todayBlock,
      endblock: '99999999',
      page: String(page),
      offset: '200',
      sort: 'desc',
    });
    const txs = Array.isArray(result) ? result as TokenTransfer[] : [];
    if (txs.length === 0) break;

    // Keep only today's transfers (safety check — startblock should handle this)
    const todayTxs = txs.filter(t => parseInt(t.timeStamp) >= todayStartTs);
    all.push(...todayTxs);

    // If we got a partial page, or some txs were before today, we've exhausted today's data
    if (txs.length < 200 || todayTxs.length < txs.length) break;

    // Etherscan hard limit: page × offset ≤ 10000 (i.e. max 50 pages with offset 200)
    if (page >= 50) break;

    page++;
    // Note: rate limiting is handled globally in etherscanRequest via throttle()
  }

  return all;
}

/**
 * Fetch ALL ERC-20 token transfers for a wallet address across ALL token types
 * (no contractaddress filter), starting from a given block.
 * Used to build the full multi-token breakdown per configured contract.
 */
export async function getAllWalletTokenTransfers(
  walletAddress: string,
  startBlock: string,
  startTs: number
): Promise<TokenTransfer[]> {
  const all: TokenTransfer[] = [];
  let page = 1;

  while (true) {
    const result = await etherscanRequest({
      module: 'account',
      action: 'tokentx',
      address: walletAddress,
      startblock: startBlock,
      endblock: '99999999',
      page: String(page),
      offset: '200',
      sort: 'desc',
    });
    const txs = Array.isArray(result) ? result as TokenTransfer[] : [];
    if (txs.length === 0) break;

    const recent = txs.filter(t => parseInt(t.timeStamp) >= startTs);
    all.push(...recent);

    if (txs.length < 200 || recent.length < txs.length) break;
    if (page >= 50) break;
    page++;
  }

  return all;
}

/**
 * Sample the 50 most recent ERC-20 transfers for a wallet (no time restriction).
 * Used purely to detect whether an address is a wallet (sends other tokens) or a token contract.
 * No startblock — always returns data even when the wallet had no activity today.
 */
export async function sampleWalletTokenTransfers(
  walletAddress: string
): Promise<TokenTransfer[]> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'tokentx',
    address: walletAddress,
    page: '1',
    offset: '50',
    sort: 'desc',
  });
  return Array.isArray(result) ? result as TokenTransfer[] : [];
}

/**
 * Fetch ALL token transfers (any token) sent FROM or TO a wallet address today.
 * Does NOT filter by contractaddress — the token is identified from the results.
 * Rate limiting is handled globally by throttle() in etherscanRequest.
 */
export async function getAddressTodayTokenTransfers(
  walletAddress: string,
  startBlock: string,
  startTs: number
): Promise<TokenTransfer[]> {
  const all: TokenTransfer[] = [];
  let page = 1;

  while (true) {
    const result = await etherscanRequest({
      module: 'account',
      action: 'tokentx',
      address: walletAddress,
      startblock: startBlock,
      endblock: '99999999',
      page: String(page),
      offset: '200',
      sort: 'desc',
    });
    const txs = Array.isArray(result) ? result as TokenTransfer[] : [];
    if (txs.length === 0) break;

    const todayTxs = txs.filter(t => parseInt(t.timeStamp) >= startTs);
    all.push(...todayTxs);

    if (txs.length < 200 || todayTxs.length < txs.length) break;
    if (page >= 50) break;
    page++;
  }

  return all;
}

// ─── Block by Timestamp ─────────────────────────────────────────────────────

export async function getBlockByTimestamp(timestamp: number, closest: 'before' | 'after' = 'before'): Promise<string> {
  const result = await etherscanRequest({
    module: 'block',
    action: 'getblocknobytime',
    timestamp: String(timestamp),
    closest,
  });
  return result as string;
}

// ─── Contract validity check ──────────────────────────────────────────────

/**
 * Returns true if the contract address has ANY ERC-20 transfer history on mainnet.
 * Used to detect invalid/non-existent token addresses before adding a row.
 */
export async function getTokenTxCountForContract(contractAddress: string): Promise<boolean> {
  try {
    const result = await etherscanRequest({
      module: 'account',
      action: 'tokentx',
      contractaddress: contractAddress,
      page: '1',
      offset: '1',
      sort: 'desc',
    });
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}

// ─── Token Balance ─────────────────────────────────────────────────────────

/**
 * Returns the raw (integer, unscaled) ERC-20 balance of `holderAddress` for
 * the token at `contractAddress`.  Divide by 10^tokenDecimal to get the
 * human-readable amount.
 */
export async function getTokenBalance(
  contractAddress: string,
  holderAddress: string
): Promise<string> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'tokenbalance',
    contractaddress: contractAddress,
    address: holderAddress,
    tag: 'latest',
  });
  return (result as string) ?? '0';
}

// ─── Token Info (price per token) ────────────────────────────────────────────────────────────

export interface TokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenPriceUSD: string;
}

export async function getTokenInfo(contractAddress: string): Promise<TokenInfo | null> {
  try {
    const result = await etherscanRequest({
      module: 'token',
      action: 'tokeninfo',
      contractaddress: contractAddress,
    });
    const arr = Array.isArray(result) ? result : [];
    return (arr[0] as TokenInfo) ?? null;
  } catch {
    return null;
  }
}

// ─── ETH Supply ──────────────────────────────────────────────────────────────

export async function getEthSupply(): Promise<string> {
  const result = await etherscanRequest({
    module: 'stats',
    action: 'ethsupply',
  });
  return result as string;
}
