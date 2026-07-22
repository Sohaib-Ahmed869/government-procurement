import dotenv from 'dotenv';

dotenv.config();

// Centralised, typed access to environment variables. Import `env` everywhere
// instead of reading process.env directly, so defaults live in one place.
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  // This API's own public base URL — used to build image URLs that stream S3
  // objects back through the server (so a private bucket still serves images).
  apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 5000}`).replace(/\/$/, ''),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || '',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    resetSecret: process.env.JWT_RESET_SECRET || 'dev-insecure-reset-secret',
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  },

  s3: {
    region: process.env.AWS_REGION || 'ap-southeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 512,
  },

  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Government Procurement <no-reply@example.com>',
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
    name: process.env.SEED_ADMIN_NAME || 'Site Admin',
  },
};

// True once real S3 credentials are present. Upload routes use this to fail
// gracefully with a clear message before the client pastes their keys.
export const s3Configured = Boolean(
  env.s3.accessKeyId && env.s3.secretAccessKey && env.s3.bucket,
);

export const mailConfigured = Boolean(env.mail.host);
