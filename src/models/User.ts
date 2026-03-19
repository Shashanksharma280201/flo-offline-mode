import mongoose, { Schema, Document } from 'mongoose';

/**
 * User interface matching cloud schema
 * Simplified for offline mode - web user authentication
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'operator' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User schema for web UI authentication
 * Mirrors cloud userModel.ts with simplified fields for offline operation
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    name: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'operator', 'viewer'],
      default: 'operator'
    }
  },
  {
    timestamps: true
  }
);

// Create unique index on email
userSchema.index({ email: 1 }, { unique: true });

/**
 * User model export
 */
const User = mongoose.model<IUser>('User', userSchema);

export default User;
