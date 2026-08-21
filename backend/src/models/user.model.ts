import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import { UserRole, CONSTANTS } from '../config/constants';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): PublicUser;
}

export interface PublicUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Static methods interface ──────────────────────────────────────────────────

interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(CONSTANTS.USER_ROLES),
        message: 'Role must be admin or manager',
      },
      required: [true, 'Role is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// email unique index is already created by `unique: true` in the schema field definition
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// ─── Pre-save hook: hash password ─────────────────────────────────────────────

userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ─── Instance methods ──────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function (): PublicUser {
  return {
    _id: this._id.toString(),
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// ─── Static methods ────────────────────────────────────────────────────────────

userSchema.statics.findByEmail = function (email: string): Promise<IUser | null> {
  // .select('+password') to explicitly include the password field
  return this.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

// ─── Model ─────────────────────────────────────────────────────────────────────

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
