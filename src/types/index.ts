// Contract status enum matching the dashboard states
export type ContractStatus = 'running' | 'preparing' | 'ready' | 'limited' | 'stopped';

// Delivery strategy type
export type DeliveryStrategy = '1+2+3';

// Single contract row in the main table
export interface Contract {
  id: string;
  serialNumber: number;
  contractNumber: string;
  activationTime: string;
  contractAddress: string;
  contractStatus: ContractStatus;
  tokenSymbol: string;
  deliveryStrategy: DeliveryStrategy;
  gasLimit: number; // gwei as float
  airdropQuantity: number;
  airdropYesterday: number;
  airdropToday: number;
  tokenFee: number;
  tokenAmount: number;
  tokenWalletAmount: number;
  tokenContractAmount: number;
  tokenPrice: number;
  txCountYesterday: number;
  txCountToday: number;
  gasCost: number;
  totalCost: number;
  averageCost: number;
  cumulativeQuantity: number;
  tokenBreakdown?: TokenBreakdownItem[];
}

// Aggregated totals row shown at bottom of table
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

// Paginated response shape for contracts
export interface ContractsResponse {
  data: Contract[];
  totals: ContractTotals;
  pagination: PaginationMeta;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

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

// One bar in a chart column — one contract's data for that hour
export interface ContractBarData {
  contractNumber: string;
  txCount: number;
  avgGasGwei: number;
}

// Single hour column in the metrics chart
export interface MetricsBucket {
  hour: string; // "00", "01", ... "23"
  bars: ContractBarData[]; // one entry per configured contract
}

// Metrics history response
export interface MetricsHistoryResponse {
  data: MetricsBucket[];
  pagination: PaginationMeta;
}

// Dashboard summary shown in the header
export interface DashboardSummary {
  ethPrice: number;
  ethPriceChange: number;
  gasPrice: number;
  totalTokenFee: number;
}

// Selected contract detail for the right panel
export interface ContractDetail {
  contractNumber: string;
  activationTime: string;
  contractAddress: string;
  deliveryStrategy: DeliveryStrategy;
  gasLimit: number;
}

// Normalized API error
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}
