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

    /* A learner's own profile, and their notification preferences.

       Both lived in localStorage, which meant two things: they did not follow
       anyone to a second device, and every account opened on the SAME seeded
       profile — a Procurement Officer at the Department of Finance in Canberra,
       with a bio about the evaluation module. That was one person's details
       shown to everyone who signed up.

       Not the InstructorProfile model: that one is a public, reviewed record
       attached to published courses. This is private to the account and needs
       no approval to change.

       `settings` is a free-form map on purpose. Every key in it is a toggle the
       client owns, and adding one should not be a migration — the alternative
       is a schema field per checkbox and a deploy to add a notification type. */
    profile: {
      title: { type: String, default: '', trim: true, maxlength: 120 },
      organisation: { type: String, default: '', trim: true, maxlength: 160 },
      location: { type: String, default: '', trim: true, maxlength: 120 },
      bio: { type: String, default: '', trim: true, maxlength: 2000 },
      website: { type: String, default: '', trim: true, maxlength: 300 },
    },

    settings: {
      type: Map,
      of: Boolean,
      default: () => new Map(),
    },
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
  return {
    id: _id,
    name,
    email,
    role,
    active,
    lastLoginAt,
    createdAt,
    // Plain objects, not a Mongoose subdocument and a Map: this is the shape
    // that goes over the wire, and a Map serialises to `{}` through JSON.
    profile: {
      title: this.profile?.title ?? '',
      organisation: this.profile?.organisation ?? '',
      location: this.profile?.location ?? '',
      bio: this.profile?.bio ?? '',
      website: this.profile?.website ?? '',
    },
    settings: this.settings ? Object.fromEntries(this.settings) : {},
  };
};

export const User = mongoose.model('User', userSchema);
