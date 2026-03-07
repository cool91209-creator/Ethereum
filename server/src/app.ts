import express from 'express';
import cors from 'cors';
import contractsRoutes from './routes/contractsRoutes';
import { listMetrics } from './controllers/metricsController';
import { getDashboard } from './controllers/dashboardController';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/contracts', contractsRoutes);
app.get('/api/metrics',   listMetrics);
app.get('/api/dashboard', getDashboard);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
});

export default app;
