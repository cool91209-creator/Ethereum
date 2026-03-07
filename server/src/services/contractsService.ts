import { pool } from '../db/pool';
import type {
  Contract,
  ContractDetail,
  ContractTotals,
  ContractsResponse,
  ContractConfigPayload,
} from '../types';

const USE_MOCK = process.env.USE_MOCK_DATA !== 'false';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATUSES: Contract['contractStatus'][] = [
  'running', 'preparing', 'ready', 'ready', 'ready',
  'ready', 'limited', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped', 'stopped',
];

const MOCK_ADDRESSES = [
  '0E0252', '0E0234', '353535', '53536', '757532',
  '567890', '134567', '464577', '373573', '377587', '709704', '862869', '999001',
];

function buildMockContracts(): Contract[] {
  return Array.from({ length: 13 }, (_, i) => {
    const qty = 5000 + (i + 1) * 1500;
    return {
      id: String(i + 1),
      serialNumber: i + 1,
      contractNumber: i === 0 ? 'Eth_002' : `Eth${String(i + 2).padStart(3, '0')}`,
      activationTime: '2024-02-27T15:31:00Z',
      contractAddress: MOCK_ADDRESSES[i] ?? `${String(i).padStart(6, '0')}`,
      contractStatus: MOCK_STATUSES[i] ?? 'stopped',
      deliveryStrategy: '1+2+3',
      gasLimit: 0.03,
      airdropQuantity: qty,
      tokenFee: 100,
      gasCost: 25,
      totalCost: 125,
      averageCost: 0.0125,
      cumulativeQuantity: qty * (i + 1),
    };
  });
}

function computeTotals(contracts: Contract[]): ContractTotals {
  const totalAirdropQuantity  = contracts.reduce((s, c) => s + c.airdropQuantity, 0);
  const totalTokenFee         = contracts.reduce((s, c) => s + c.tokenFee, 0);
  const totalGasCost          = contracts.reduce((s, c) => s + c.gasCost, 0);
  const totalCost             = contracts.reduce((s, c) => s + c.totalCost, 0);
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

// ─── DB row → Contract ────────────────────────────────────────────────────────

function rowToContract(row: Record<string, unknown>, index: number): Contract {
  return {
    id:                String(row['id']),
    serialNumber:      index + 1,
    contractNumber:    String(row['contract_number']),
    activationTime:    String(row['activation_time']),
    contractAddress:   String(row['contract_address']),
    contractStatus:    row['contract_status'] as Contract['contractStatus'],
    deliveryStrategy:  String(row['delivery_strategy']) as '1+2+3',
    gasLimit:          Number(row['gas_limit']),
    airdropQuantity:   Number(row['airdrop_quantity']),
    tokenFee:          Number(row['token_fee']),
    gasCost:           Number(row['gas_cost']),
    totalCost:         Number(row['total_cost']),
    averageCost:       Number(row['average_cost']),
    cumulativeQuantity: Number(row['cumulative_quantity']),
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function getContracts(page: number, pageSize: number): Promise<ContractsResponse> {
  if (USE_MOCK) {
    const all    = buildMockContracts();
    const start  = (page - 1) * pageSize;
    const data   = all.slice(start, start + pageSize);
    return {
      data,
      totals: computeTotals(all),
      pagination: { page, pageSize, total: all.length, totalPages: Math.ceil(all.length / pageSize) },
    };
  }

  const offset = (page - 1) * pageSize;
  const [dataResult, countResult, totalsResult] = await Promise.all([
    pool.query(
      `SELECT * FROM contracts ORDER BY id ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM contracts`),
    pool.query(`
      SELECT
        SUM(airdrop_quantity)   AS total_airdrop_quantity,
        SUM(token_fee)          AS total_token_fee,
        SUM(gas_cost)           AS total_gas_cost,
        SUM(total_cost)         AS total_cost,
        SUM(cumulative_quantity) AS grand_cumulative_quantity
      FROM contracts
    `),
  ]);

  const total      = countResult.rows[0].total as number;
  const tr         = totalsResult.rows[0] as Record<string, unknown>;
  const totalCost  = Number(tr['total_cost']);
  const totalQty   = Number(tr['total_airdrop_quantity']);

  return {
    data:   dataResult.rows.map((r, i) => rowToContract(r as Record<string, unknown>, offset + i)),
    totals: {
      totalAirdropQuantity:   totalQty,
      totalTokenFee:          Number(tr['total_token_fee']),
      totalGasCost:           Number(tr['total_gas_cost']),
      totalCost,
      totalAverageCost:       totalQty ? totalCost / totalQty : 0,
      grandCumulativeQuantity: Number(tr['grand_cumulative_quantity']),
    },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getContractById(id: string): Promise<ContractDetail | null> {
  if (USE_MOCK) {
    const all = buildMockContracts();
    const contract = all.find((c) => c.id === id);
    if (!contract) return null;
    return {
      contractNumber:  contract.contractNumber,
      activationTime:  contract.activationTime,
      contractAddress: contract.contractAddress,
      deliveryStrategy: contract.deliveryStrategy,
      gasLimit:        contract.gasLimit,
    };
  }

  const result = await pool.query(`SELECT * FROM contracts WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as Record<string, unknown>;
  return {
    contractNumber:   String(r['contract_number']),
    activationTime:   String(r['activation_time']),
    contractAddress:  String(r['contract_address']),
    deliveryStrategy: String(r['delivery_strategy']) as '1+2+3',
    gasLimit:         Number(r['gas_limit']),
  };
}

export async function applyContractConfig(payload: ContractConfigPayload): Promise<void> {
  if (USE_MOCK) return; // no-op in mock mode

  await pool.query(
    `UPDATE contracts
     SET contract_address = $1, gas_limit = $2
     WHERE contract_number = $3`,
    [payload.contractAddress, payload.gasLimit, payload.contractNumber]
  );
}
