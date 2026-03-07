import type { Request, Response } from 'express';
import * as metricsService from '../services/metricsService';

export async function listMetrics(req: Request, res: Response): Promise<void> {
  try {
    const page     = Math.max(1, Number(req.query['page'])     || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query['pageSize']) || 24));

    const data = await metricsService.getMetricsHistory(page, pageSize);
    res.json(data);
  } catch (err) {
    console.error('[listMetrics]', err);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch metrics' });
  }
}
