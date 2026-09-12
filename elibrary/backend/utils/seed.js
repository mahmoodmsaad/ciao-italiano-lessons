/**
 * Loads demo data into the database:  npm run seed
 * Warning: this deletes all existing data first.
 */
import { connectDB, disconnectDB, isMemoryDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';

async function run() {
  try {
    await connectDB();

    if (isMemoryDB()) {
      console.error('\n[error] MONGO_URI is not set.');
      console.error('[error] Seeding an in-memory database has no effect - the data disappears when the process exits.');
      console.error('[error] Set MONGO_URI in .env and try again.\n');
      await disconnectDB();
      process.exit(1);
    }

    const result = await seedDatabase({ log: (msg) => console.log(`[seed] ${msg}`) });

    console.log('\nDemo accounts:');
    console.log('  Admin    -> admin@university.edu.pk / admin123');
    console.log('  Student  -> ariba@university.edu.pk / student123');
    console.log(`\nSeeding complete: ${result.books} books, ${result.users} users.\n`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
  }
}

run();
