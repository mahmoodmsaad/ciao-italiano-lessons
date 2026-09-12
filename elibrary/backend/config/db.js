import mongoose from 'mongoose';
import { config } from './env.js';

let memoryServer = null;

/**
 * MONGO_URI set ho to usi se connect karta hai.
 * Warna ek in-memory MongoDB start kar deta hai taake project bina kisi
 * database installation ke chal jaye (sirf demo/testing ke liye).
 */
export async function connectDB() {
  let uri = config.mongoUri;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('elibrary');
    console.warn('[warn] MONGO_URI set nahi hai - in-memory demo database chalaya ja raha hai.');
    console.warn('[warn] Restart par saara data delete ho jayega.');
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
