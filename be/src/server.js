import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env, s3Configured } from './config/env.js';

async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`\n[server] API listening on http://localhost:${env.port}`);
      // eslint-disable-next-line no-console
      console.log(`[server] environment: ${env.nodeEnv}`);
      if (!s3Configured) {
        // eslint-disable-next-line no-console
        console.log('[server] NOTE: S3 not configured — media/video uploads are disabled until you add AWS keys to .env');
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

start();
