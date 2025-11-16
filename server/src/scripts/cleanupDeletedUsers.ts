import mongoose from 'mongoose';
import { User } from '../models/User';
import { Scan } from '../models/Scan';

/**
 * Cleanup script to permanently delete user accounts and their associated data
 * after the 90-day retention period has expired.
 * 
 * This script should be run as a scheduled job (e.g., daily via cron job).
 * 
 * Usage:
 * - Development: ts-node src/scripts/cleanupDeletedUsers.ts
 * - Production: node dist/scripts/cleanupDeletedUsers.js
 */

const RETENTION_PERIOD_DAYS = 90;

async function cleanupDeletedUsers() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Calculate the cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIOD_DAYS);

    console.log(`Looking for users deleted before: ${cutoffDate.toISOString()}`);

    // Find users marked as deleted and past the retention period
    const usersToDelete = await User.find({
      isDeleted: true,
      deletedAt: { $lte: cutoffDate }
    });

    console.log(`Found ${usersToDelete.length} user(s) to permanently delete`);

    if (usersToDelete.length === 0) {
      console.log('No users to delete at this time');
      await mongoose.disconnect();
      return;
    }

    // Process each user
    for (const user of usersToDelete) {
      console.log(`Processing user: ${user._id} (deleted on: ${user.deletedAt})`);

      try {
        // Delete all scans associated with this user
        const scanDeletionResult = await Scan.deleteMany({ user: user._id });
        console.log(`  - Deleted ${scanDeletionResult.deletedCount} scan(s)`);

        // Permanently delete the user
        await User.deleteOne({ _id: user._id });
        console.log(`  - User permanently deleted`);

      } catch (error) {
        console.error(`  - Error deleting user ${user._id}:`, error);
        // Continue with next user even if this one fails
        continue;
      }
    }

    console.log('\nCleanup completed successfully');
    console.log(`Total users permanently deleted: ${usersToDelete.length}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDeletedUsers()
  .then(() => {
    console.log('Script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

