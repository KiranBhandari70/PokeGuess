import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: '⚡' },
  experience: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
}, { timestamps: true });

const resultSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },
  score: { type: Number, required: true, min: 0 },
  correct: { type: Number, required: true },
  rounds: { type: Number, required: true },
  difficulty: { type: String, required: true },
  streak: { type: Number, required: true },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
