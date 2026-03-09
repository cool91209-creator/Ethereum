export type ContractStatus = 'running' | 'preparing' | 'ready' | 'limited' | 'stopped';
export type DeliveryStrategy = '1+2+3';

/** One token that the distributor wallet sent today and/or yesterday. */
export interface TokenBreakdownItem {
  tokenContract:   string;
  symbol:          string;
  amountToday:     number;
  amountYesterday: number;
  amountUsdToday:  number;
  txCountToday:    number;
  txCountYesterday: number;
}

export interface Contract {
  id: string;
  serialNumber: number;
  contractNumber: string;
  activationTime: string;
  contractAddress: string;
  contractStatus: ContractStatus;
  tokenSymbol: string;
  deliveryStrategy: DeliveryStrategy;
  gasLimit: number;
  airdropQuantity: number;
  airdropYesterday: number;
  airdropToday: number;
  tokenFee: number;
  tokenAmount: number;       // wallet + contract combined (decimal-normalised)
  tokenWalletAmount: number;  // wallet's holding of this token
  tokenContractAmount: number;// contract's self-holding of its own token
  tokenPrice: number;
  txCountYesterday: number;   // count of outgoing token transactions yesterday
  txCountToday: number;       // count of outgoing token transactions today
  gasCost: number;
  totalCost: number;
  averageCost: number;
  cumulativeQuantity: number;
  tokenBreakdown?: TokenBreakdownItem[];
}

export interface ContractDetail {
  contractNumber: string;
  activationTime: string;
  contractAddress: string;
  deliveryStrategy: DeliveryStrategy;
  gasLimit: number;
}

export interface ContractTotals {
  totalAirdropQuantity: number;
  totalAirdropToday: number;
  totalTxCountToday: number;
  totalTokenFee: number;
  totalGasCost: number;
  totalCost: number;
  totalAverageCost: number;
  grandCumulativeQuantity: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ContractsResponse {
  data: Contract[];
  totals: ContractTotals;
  pagination: PaginationMeta;
}

export interface DashboardStats {
  ethPrice: number;
  ethPriceChange: number;
  gasPrice: number;
  totalTokenFee: number;
}

export interface ContractConfigPayload {
  contractNumber: string;
  contractAddress: string;
  gasLimit: number;
}

export interface ContractBarData {
  contractNumber: string;
  txCount: number;
  avgGasGwei: number;
}

export interface MetricsBucket {
  hour: string; // "00" – "23"
  bars: ContractBarData[]; // one entry per configured contract
}

export interface MetricsHistoryResponse {
  data: MetricsBucket[];
  pagination: PaginationMeta;
}
