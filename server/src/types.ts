export type ContractStatus = 'running' | 'preparing' | 'ready' | 'limited' | 'stopped';
export type DeliveryStrategy = '1+2+3';

export interface Contract {
  id: string;
  serialNumber: number;
  contractNumber: string;
  activationTime: string;
  contractAddress: string;
  contractStatus: ContractStatus;
  deliveryStrategy: DeliveryStrategy;
  gasLimit: number;
  airdropQuantity: number;
  tokenFee: number;
  gasCost: number;
  totalCost: number;
  averageCost: number;
  cumulativeQuantity: number;
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
  totalAirdropAmount: number;
}

export interface ContractConfigPayload {
  contractNumber: string;
  contractAddress: string;
  gasLimit: number;
}

export interface MetricsBucket {
  hour: string;
  primaryValue: number;
  secondaryValue: number;
  primaryGas: number;
  secondaryGas: number;
}

export interface MetricsHistoryResponse {
  data: MetricsBucket[];
  pagination: PaginationMeta;
}
