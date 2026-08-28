import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, s3Configured, mailConfigured } from './config/env.js';
import apiRoutes from './routes/index.js';
import fileRoutes from './modules/files/files.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin/no-origin (curl, server-to-server) and configured clients.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  /* Stripe's webhook signature is computed over the RAW request bytes, so this
     one path must reach its handler unparsed — JSON.parse followed by a
     re-stringify produces different bytes and every signature check fails.
     Mounted BEFORE express.json, which would otherwise consume the stream. */
  app.use('/api/lms/commerce/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  // Basic rate limit on the API surface.
  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }),
  );

  // Health / readiness — reports whether S3 and mail are wired yet.
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        env: env.nodeEnv,
        s3Configured,
        mailConfigured,
        time: new Date().toISOString(),
      },
    });
  });

  // Public asset streaming (S3 proxy) — outside the /api rate limiter so image
  // loads aren't throttled.
  app.use('/files', fileRoutes);

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
