import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mock data: ${process.env.USE_MOCK_DATA !== 'false' ? 'enabled' : 'disabled'}`);
});
