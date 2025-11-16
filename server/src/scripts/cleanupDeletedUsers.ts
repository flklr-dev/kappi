import mongoose from 'mongoose';
import { User } from '../models/User';
import { Scan } from '../models/Scan';

/**
 * Cleanup script for permanently deleting soft-deleted users and their associated data
 * after 90 days retention period.
 * 
 * This script should be run daily via a cron job or task scheduler.
 * 
 * Usage:
 * - Development: npx ts-node src/scripts/cleanupDeletedUsers.ts
 * - Production: node dist/scripts/cleanupDeletedUsers.js
 */

const RETENTION_DAYS = 90;

async function cleanupDeletedUsers() {
  try {
    console.log('='.repeat(60));
    console.log('Starting cleanup of deleted users and data');
    console.log('Retention period:', RETENTION_DAYS, 'days');
    console.log('='.repeat(60));

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kappi';
      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    }

    // Calculate the cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    console.log('Cutoff date:', cutoffDate.toISOString());

    // Find users that have been soft-deleted for more than 90 days
    const usersToDelete = await User.find({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate }
    }).select('_id email deletedAt');

    console.log(`\nFound ${usersToDelete.length} users to permanently delete`);

    if (usersToDelete.length === 0) {
      console.log('No users to delete. Exiting.');
      return;
    }

    let deletedUserCount = 0;
    let deletedScanCount = 0;

    // Process each user
    for (const user of usersToDelete) {
      console.log(`\nProcessing user: ${user._id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Deleted at: ${user.deletedAt?.toISOString()}`);

      try {
        // Delete all scans associated with this user
        const scanDeleteResult = await Scan.deleteMany({ user: user._id });
        deletedScanCount += scanDeleteResult.deletedCount || 0;
        console.log(`  Deleted ${scanDeleteResult.deletedCount} scans`);

        // Permanently delete the user
        await User.deleteOne({ _id: user._id });
        deletedUserCount++;
        console.log(`  User permanently deleted`);
      } catch (error) {
        console.error(`  Error deleting user ${user._id}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Cleanup completed successfully');
    console.log(`Total users permanently deleted: ${deletedUserCount}`);
    console.log(`Total scans deleted: ${deletedScanCount}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('Error during cleanup:', error);
    console.error('='.repeat(60));
    throw error;
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupDeletedUsers()
    .then(() => {
      console.log('\nCleanup script finished. Disconnecting from database...');
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nCleanup script failed:', error);
      mongoose.disconnect();
      process.exit(1);
    });
}

export { cleanupDeletedUsers };

