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
    /* Required only for accounts that sign in WITH a password.

       An account created through Google or Microsoft has no password and never
       will unless its owner sets one. Keeping `required: true` here would mean
       either inventing a random password nobody can use — which then looks like
       a real credential to anything that reads this collection — or bypassing
       validation on the one write that creates accounts. Neither is honest.

       The function form is evaluated per document, so a password account still
       cannot be saved without one. */
    password: {
      type: String,
      required() {
        return !this.identities?.length;
      },
      minlength: 8,
      select: false,
    },

    /* Federated sign-in links (L6). One entry per provider the owner has used.

       `subject` is the provider's own immutable id for the person — NOT their
       email. Emails change, get reassigned when staff leave, and are the thing
       an attacker can most easily control; the subject is what actually proves
       "this is the same person as last time".

       Stored as an array because one account may be reachable by several
       routes: signed up with a password, later clicked Continue with Microsoft.
       Both should land on the same account rather than making a second one. */
    identities: [
      {
        provider: { type: String, required: true },
        subject: { type: String, required: true },
        email: { type: String, default: '' },
        linkedAt: { type: Date, default: Date.now },
      },
    ],
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
  // A federated-only account has no hash. bcrypt.compare would throw on the
  // undefined; answering "no" is both correct and the same answer a wrong
  // password gets, so password login cannot be used to discover which accounts
  // are Google-only.
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// Whether this account can be signed into with a password at all. Used by the
// sign-in screen to explain "this account uses Microsoft" rather than repeating
// "wrong password" at somebody who never had one.
userSchema.methods.hasPassword = function hasPassword() {
  return Boolean(this.password);
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
    // Provider names only — never the subject, which is an identifier for the
    // provider's benefit and nobody else's.
    identities: (this.identities ?? []).map((i) => i.provider),
  };
};

userSchema.index({ 'identities.provider': 1, 'identities.subject': 1 }, { sparse: true });

export const User = mongoose.model('User', userSchema);
