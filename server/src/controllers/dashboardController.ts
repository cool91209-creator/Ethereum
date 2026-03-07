import type { Request, Response } from 'express';
import * as statsService from '../services/statsService';

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  try {
    const data = await statsService.getDashboardStats();
    res.json(data);
  } catch (err) {
    console.error('[getDashboard]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard' });
  }
}
