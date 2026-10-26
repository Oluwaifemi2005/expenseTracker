/**
 * Idempotent Migration Script: Assign Legacy Transactions to a User
 * 
 * Usage:
 *   node scripts/migrateLegacyTransactions.js [--dry-run] [--email user@example.com] [--user-id <id>]
 * 
 * Options:
 *   --dry-run   Preview which transactions will be claimed without modifying the database.
 *   --email     Assign unowned transactions to the user matching this email.
 *   --user-id   Assign unowned transactions to the user matching this ObjectId.
 *   (default)   If neither --email nor --user-id is supplied, assigns to the oldest registered user.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const runMigration = async () => {
    const isDryRun = process.argv.includes('--dry-run');
    const emailIndex = process.argv.indexOf('--email');
    const targetEmail = emailIndex !== -1 ? process.argv[emailIndex + 1] : null;
    const userIdIndex = process.argv.indexOf('--user-id');
    const targetUserId = userIdIndex !== -1 ? process.argv[userIdIndex + 1] : null;

    const mongoUri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
    if (!mongoUri) {
        console.error('ERROR: MONGODB_URI or MONGO_URI is missing from environment variables.');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully.');

        // 1. Identify unowned/legacy transactions
        const legacyFilter = {
            $or: [
                { user: { $exists: false } },
                { user: null }
            ]
        };

        const legacyTransactions = await Transaction.find(legacyFilter).lean();
        console.log(`Found ${legacyTransactions.length} unowned legacy transaction(s).`);

        if (legacyTransactions.length === 0) {
            console.log('Database is already fully user-isolated. No legacy transactions to migrate.');
            await mongoose.disconnect();
            process.exit(0);
        }

        // 2. Identify the target owner
        let targetUser = null;
        if (targetUserId) {
            targetUser = await User.findById(targetUserId);
            if (!targetUser) {
                console.error(`ERROR: User with ID "${targetUserId}" not found.`);
                await mongoose.disconnect();
                process.exit(1);
            }
        } else if (targetEmail) {
            targetUser = await User.findOne({ email: targetEmail.toLowerCase().trim() });
            if (!targetUser) {
                console.error(`ERROR: User with email "${targetEmail}" not found.`);
                await mongoose.disconnect();
                process.exit(1);
            }
        } else {
            targetUser = await User.findOne().sort({ createdAt: 1 });
            if (!targetUser && !isDryRun) {
                console.error('ERROR: No registered users found in the database. Please register a user first before running legacy migration.');
                await mongoose.disconnect();
                process.exit(1);
            }
        }

        if (targetUser) {
            console.log(`Target owner: ${targetUser.name} (${targetUser.email}) [ID: ${targetUser._id}]`);
        } else {
            console.log('Target owner: None yet (no user registered in database).');
        }

        if (isDryRun) {
            console.log('\n[DRY RUN MODE] The following unowned transactions will be claimed once a user is assigned:');
            legacyTransactions.forEach((tx, idx) => {
                console.log(`  ${idx + 1}. [${tx._id}] ${tx.description} - ${tx.type}: $${tx.amount} (${tx.category || 'Other'})`);
            });
            console.log('\nDry run complete. No modifications were made.');
            await mongoose.disconnect();
            process.exit(0);
        }

        // 3. Perform atomic update
        const updateResult = await Transaction.updateMany(legacyFilter, {
            $set: { user: targetUser._id }
        });

        console.log(`\nMigration successful!`);
        console.log(`Updated ${updateResult.modifiedCount} transaction(s) to owner ${targetUser.email}.`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed with error:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
};

if (require.main === module) {
    runMigration();
}

module.exports = runMigration;
