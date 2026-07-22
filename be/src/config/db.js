import mongoose from 'mongoose';
import { env } from './env.js';

// Connects to MongoDB. Called once at startup from server.js. Fails fast with a
// clear message if MONGO_URI is missing or unreachable.
export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error(
      'MONGO_URI is not set. Copy be/.env.example to be/.env and add your MongoDB connection string.',
    );
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] MongoDB error:', err.message);
  });

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
