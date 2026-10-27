import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: '⚡' },
  experience: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
