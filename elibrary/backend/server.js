import app from './app.js';
import { config } from './config/env.js';
import { connectDB, isMemoryDB } from './config/db.js';
import { seedDatabase } from './utils/seedData.js';

async function start() {
  try {
    await connectDB();

    // Demo mode: the in-memory database starts empty, so seed it here.
    if (isMemoryDB()) {
      await seedDatabase({ log: (msg) => console.log(`[seed] ${msg}`) });
      console.log('[seed] Demo login -> admin@university.edu.pk / admin123');
      console.log('[seed] Demo login -> ariba@university.edu.pk / student123');
    }

    app.listen(config.port, () => {
      console.log(`[server] E-Library API is running at http://localhost:${config.port}`);
      console.log(`[server] Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
