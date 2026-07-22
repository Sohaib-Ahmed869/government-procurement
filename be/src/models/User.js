import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALL_ROLES, ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select:false so the hash is never returned unless explicitly asked for.
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.EDITOR },
    active: { type: Boolean, default: true, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Hash the password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak the hash / internal flags in JSON responses.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const { _id, name, email, role, active, lastLoginAt, createdAt } = this;
  return { id: _id, name, email, role, active, lastLoginAt, createdAt };
};

export const User = mongoose.model('User', userSchema);
