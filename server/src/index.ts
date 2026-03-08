import 'dotenv/config';
import app from './app';
import { refreshAllContracts } from './services/contractsService';

const PORT = Number(process.env.PORT) || 4000;
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mock data: ${process.env.USE_MOCK_DATA !== 'false' ? 'enabled' : 'disabled'}`);

  // Auto-refresh all contract rows every 5 minutes with live Etherscan data
  setInterval(async () => {
    try {
      await refreshAllContracts();
    } catch (err) {
      console.error('[auto-refresh] Error:', err);
    }
  }, AUTO_REFRESH_MS);
  console.log(`Auto-refresh scheduled every ${AUTO_REFRESH_MS / 1000}s`);
});
