import { Router } from 'express';
import { listContracts, getContract, configureContract, deleteContractById, refreshContracts } from '../controllers/contractsController';
import { getStats } from '../controllers/statsController';

const router = Router();

// GET /api/contracts/stats  — must be before /:id so "stats" is not treated as an id
router.get('/stats', getStats);

// GET /api/contracts
router.get('/', listContracts);

// GET /api/contracts/:id
router.get('/:id', getContract);

// POST /api/contracts/config
router.post('/config', configureContract);

// DELETE /api/contracts/:id
router.delete('/:id', deleteContractById);

// POST /api/contracts/refresh  — re-fetch live Etherscan data for all rows
router.post('/refresh', refreshContracts);

export default router;
