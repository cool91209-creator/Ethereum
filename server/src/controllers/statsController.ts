import type { Request, Response } from 'express';
import * as statsService from '../services/statsService';

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const data = await statsService.getDashboardStats();
    res.json(data);
  } catch (err) {
    console.error('[getStats]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' });
  }
}
