const mongoose = require('mongoose');

/**
 * Connect to MongoDB safely.
 * @param {string} [uri] - Optional MongoDB connection URI (falls back to process.env.MONGODB_URI or process.env.MONGO_URI)
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri) => {
    const mongoUri = (uri || process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
    if (!mongoUri) {
        console.error('FATAL: MONGODB_URI is not set in environment variables.');
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(mongoUri);
        console.log(`Connected to MongoDB Atlas! Host: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
