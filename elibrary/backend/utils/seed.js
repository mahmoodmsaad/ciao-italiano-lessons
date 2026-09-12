/**
 * Demo data database mein daalne ke liye:  npm run seed
 * Warning: ye purana saara data delete kar deta hai.
 */
import { connectDB, disconnectDB, isMemoryDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';

async function run() {
  try {
    await connectDB();

    if (isMemoryDB()) {
      console.error('\n[error] MONGO_URI set nahi hai.');
      console.error('[error] In-memory database seed karne ka koi faida nahi - process band hote hi data chala jayega.');
      console.error('[error] .env mein MONGO_URI set karein, phir dobara try karein.\n');
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
    console.error('[seed] Fail ho gaya:', err.message);
    process.exit(1);
  }
}

run();
