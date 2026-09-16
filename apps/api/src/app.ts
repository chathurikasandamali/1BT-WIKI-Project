// apps/api/src/app.ts

import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';
import { errorResponse } from '@/types/userTypes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check — always available even if DB is down
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

export const appReady: Promise<void> = (async () => {
  // Let route-loading failures reject appReady so the server does not start.
  const { default: v1Router } = await import('@routes/index.js');

  // Mount all v1 routes under /api/v1
  app.use('/api/v1', v1Router);

  // ---------------------------------------------------------------------------
  // Global error handler — MUST be registered AFTER all routes.
  // Moved inside appReady so it sits last in the middleware stack regardless
  // of whether route loading is sync or async.
  // Handles AppError (domain errors) and unexpected errors uniformly.
  // ---------------------------------------------------------------------------
  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof AppError) {
        res.status(err.statusCode).json(errorResponse(err.message));
        return;
      }
      // eslint-disable-next-line no-console
      console.error('Unhandled error:', err);
      res.status(500).json(errorResponse('Internal server error'));
    }
  );
})();

export default app;
