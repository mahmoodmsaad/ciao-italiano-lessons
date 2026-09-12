import mongoose from 'mongoose';
import { config } from './env.js';

let memoryServer = null;

/**
 * Connects to MONGO_URI when it is set.
 * Otherwise it starts an in-memory MongoDB so the project runs without any
 * database installation (demo and testing only).
 */
export async function connectDB() {
  let uri = config.mongoUri;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('elibrary');
    console.warn('[warn] MONGO_URI is not set - starting an in-memory demo database instead.');
    console.warn('[warn] All data will be lost when the server restarts.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] MongoDB connected: ${mongoose.connection.name}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

export const isMemoryDB = () => memoryServer !== null;
