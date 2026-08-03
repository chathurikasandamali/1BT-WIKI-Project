import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
