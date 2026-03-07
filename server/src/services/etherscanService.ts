import axios from 'axios';

const API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_URL = process.env.ETHERSCAN_BASE_URL || 'https://api.etherscan.io/v2/api';

interface EtherscanResponse {
  status: string;
  message: string;
  result: unknown;
}

async function etherscanRequest(params: Record<string, string>): Promise<unknown> {
  const response = await axios.get<EtherscanResponse>(BASE_URL, {
    params: { ...params, chainid: '1', apikey: API_KEY },
    timeout: 15000,
  });

  if (response.data.status !== '1') {
    console.warn('[Etherscan] Non-success response:', response.data.message, response.data.result);
  }

  return response.data.result;
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
  sort = 'desc'
): Promise<TokenTransfer[]> {
  const result = await etherscanRequest({
    module: 'account',
    action: 'tokentx',
    address,
    startblock: '0',
    endblock: '99999999',
    page,
    offset,
    sort,
  });
  return Array.isArray(result) ? result as TokenTransfer[] : [];
}

// ─── ETH Supply ──────────────────────────────────────────────────────────────

export async function getEthSupply(): Promise<string> {
  const result = await etherscanRequest({
    module: 'stats',
    action: 'ethsupply',
  });
  return result as string;
}
