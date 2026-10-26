const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name.'],
        trim: true,
        minlength: [1, 'Name must be at least 1 character.'],
        maxlength: [60, 'Name cannot exceed 60 characters.']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email address.'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password.'],
        minlength: [8, 'Password must be at least 8 characters long.'],
        select: false // Never include password by default in queries
    }
}, {
    timestamps: true
});

/**
 * Hash password with bcryptjs before saving document (salt rounds: 12).
 * Only hashes the password if it has been modified or is new.
 */
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compare a plain candidate password with the hashed password stored in the database.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) {
        throw new Error('Password hash is not loaded on user document.');
    }
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Ensure sensitive fields are stripped whenever user is serialized to JSON.
 */
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        ret.id = ret._id;
        return ret;
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
