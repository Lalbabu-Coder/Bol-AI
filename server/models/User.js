import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required']
    },
    role: {
      type: String,
      enum: {
        values: ['owner', 'admin', 'agent', 'superadmin'],
        message: 'Role must be either owner, admin, agent, or superadmin'
      },
      default: 'agent'
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      required: true
    },
    lockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password if it is modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to evaluate active lockout bounds
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Register multi-tenant plugin to auto-filter query and enforce scoping
userSchema.plugin(tenantPlugin);

export const User = mongoose.model('User', userSchema);
export default User;
