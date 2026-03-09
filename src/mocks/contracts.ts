import type { Contract, ContractTotals, ContractsResponse } from '@/types';

const statuses: Contract['contractStatus'][] = [
  'running', 'preparing', 'ready', 'ready', 'ready',
  'ready', 'limited', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped',
];

const addresses = [
  '0E0252', '0E0234', '353535', '53536', '757532',
  '567890', '134567', '464577', '373573', '377587', '709704', '862869',
];

export function generateMockContracts(): Contract[] {
  const base = Array.from({ length: 13 }, (_, i) => {
    const qty = Math.floor(5000 + Math.random() * 20000);
    return {
      id: `eth-${i + 1}`,
      serialNumber: i + 1,
      contractNumber: i === 0 ? 'Eth_002' : `Eth${String(i + 2).padStart(3, '0')}`,
      activationTime: '0227/15:31',
      contractAddress: addresses[i] || `${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      contractStatus: statuses[i] || 'stopped',
      deliveryStrategy: '1+2+3' as const,
      gasLimit: 0.03,
      airdropQuantity: qty,
      tokenFee: 100,
      gasCost: 25,
      totalCost: 125,
      averageCost: 0.0125,
      cumulativeQuantity: qty * (i + 1),
    } as Contract;
  });

  return base;
}

export function generateMockTotals(all?: Contract[]): ContractTotals {
  const arr = all ?? generateMockContracts();
  const totalAirdropQuantity = arr.reduce((s, c) => s + (c.airdropQuantity as number), 0);
  const totalTokenFee = arr.reduce((s, c) => s + (c.tokenFee ?? 0), 0);
  const totalGasCost = arr.reduce((s, c) => s + (c.gasCost ?? 0), 0);
  const totalCost = arr.reduce((s, c) => s + (c.totalCost ?? 0), 0);
  const grandCumulativeQuantity = arr.reduce((s, c) => s + (c.cumulativeQuantity ?? 0), 0);

  return {
    totalAirdropQuantity,
    totalAirdropToday: 0,
    totalTxCountToday: 0,
    totalTokenFee,
    totalGasCost,
    totalCost,
    totalAverageCost: totalCost ? totalCost / totalAirdropQuantity : 0,
    grandCumulativeQuantity,
  };
}

export function generateMockContractsResponse(
  page = 1,
  pageSize = 20
): ContractsResponse {
  const allContracts = generateMockContracts();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = allContracts.slice(start, end);

  return {
    data,
    totals: generateMockTotals(allContracts),
    pagination: {
      page,
      pageSize,
      total: allContracts.length,
      totalPages: Math.ceil(allContracts.length / pageSize),
    },
  };
}
