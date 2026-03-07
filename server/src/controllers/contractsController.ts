import type { Request, Response } from 'express';
import * as contractsService from '../services/contractsService';
import type { ContractConfigPayload } from '../types';

export async function listContracts(req: Request, res: Response): Promise<void> {
  try {
    const page     = Math.max(1, Number(req.query['page'])     || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query['pageSize']) || 20));

    const data = await contractsService.getContracts(page, pageSize);
    res.json(data);
  } catch (err) {
    console.error('[listContracts]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch contracts' });
  }
}

export async function getContract(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const detail = await contractsService.getContractById(id);

    if (!detail) {
      res.status(404).json({ code: 'NOT_FOUND', message: `Contract ${id} not found` });
      return;
    }

    res.json(detail);
  } catch (err) {
    console.error('[getContract]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch contract' });
  }
}

export async function deleteContractById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const deleted = contractsService.deleteContract(id);
    if (!deleted) {
      res.status(404).json({ code: 'NOT_FOUND', message: `Contract ${id} not found` });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[deleteContractById]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to delete contract' });
  }
}

export async function configureContract(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as ContractConfigPayload;

    if (!body.contractNumber || !body.contractAddress) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'contractNumber and contractAddress are required' });
      return;
    }

    await contractsService.applyContractConfig(body);
    res.json({ success: true });
  } catch (err) {
    console.error('[configureContract]', err);
    const message = err instanceof Error ? err.message : 'Failed to apply contract config';
    res.status(500).json({ code: 'INTERNAL_ERROR', message });
  }
}
