import app, { appReady } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

appReady
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error('API failed to start — routes did not mount:', err);
    // Use exitCode rather than process.exit() so the event loop can flush logs.
    process.exitCode = 1;
  });
