import mongoose from 'mongoose';
import { User } from '../models/User';

/**
 * Migration script to add soft deletion fields to existing users.
 * 
 * This script ensures all existing users have the new soft deletion fields
 * with proper default values. This is optional since Mongoose will automatically
 * add defaults when querying, but running this migration ensures consistency.
 * 
 * Usage:
 * - Development: ts-node src/scripts/migrateUsersSoftDelete.ts
 * - Production: node dist/scripts/migrateUsersSoftDelete.js
 */

async function migrateUsers() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Count users that need migration
    const usersNeedingMigration = await User.countDocuments({
      $or: [
        { isDeleted: { $exists: false } },
        { deletedAt: { $exists: false } }
      ]
    });

    console.log(`Found ${usersNeedingMigration} user(s) that need migration`);

    if (usersNeedingMigration === 0) {
      console.log('No users need migration');
      await mongoose.disconnect();
      return;
    }

    // Update all users to have the new fields
    const result = await User.updateMany(
      {
        $or: [
          { isDeleted: { $exists: false } },
          { deletedAt: { $exists: false } }
        ]
      },
      {
        $set: {
          isDeleted: false
        },
        $setOnInsert: {
          deletedAt: null,
          originalEmail: null
        }
      }
    );

    console.log(`Migration completed successfully`);
    console.log(`- Matched: ${result.matchedCount} documents`);
    console.log(`- Modified: ${result.modifiedCount} documents`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUsers()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

