import mongoose, { Schema, Document, Types } from "mongoose";
import { Robot } from "./robotModel";

export interface AppUser extends Document {
  id: string;
  name: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string;
  imageUrl: string;
  panCardImageUrls?: string[];
  aadharCardImageUrls?: string[];
  clientId?: Types.ObjectId;
  isActive?: boolean;
  leaveRequests: LeaveRequest[];
  robots?: Robot[];
}

export interface LeaveRequest extends Document {
  _id: Types.ObjectId;
  startingTimestamp: number;
  endingTimestamp: number;
  reasonForLeave: string;
}

const LeaveRequestSchema: Schema = new Schema<LeaveRequest>(
  {
    startingTimestamp: { type: Number, required: true },
    endingTimestamp: { type: Number, required: true },
    reasonForLeave: { type: String, required: true }
  },
  {
    timestamps: true
  }
);

const AppUserSchema: Schema = new Schema<AppUser>(
  {
    name: {
      type: String,
      required: [true, "Please add a name"]
    },
    phoneNumber: {
      type: String,
      required: [true, "Please add an email"],
      unique: true
    },
    password: {
      type: String,
      required: [true, "Please add a password"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    dateOfBirth: {
      type: String
    },
    imageUrl: {
      type: String
    },
    panCardImageUrls: {
      type: [String],
      default: []
    },
    aadharCardImageUrls: {
      type: [String],
      default: []
    },
    robots: {
      type: [{ type: Schema.Types.String, ref: "Robot" }]
    },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    leaveRequests: { type: [LeaveRequestSchema], default: [] }
  },
  {
    timestamps: true
  }
);

AppUserSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
AppUserSchema.set("toObject", { virtuals: true });

// Performance indexes for operator queries
// For operator login (phone number lookup)
AppUserSchema.index({ phoneNumber: 1 }, { unique: true });

// For finding operators by client
AppUserSchema.index({ clientId: 1 });

// Compound index for getAllOperators query (clientId + isActive filter)
// This optimizes the common pattern: find({ clientId }).select(...fields including isActive)
AppUserSchema.index({ clientId: 1, isActive: 1 });

// For filtering active/inactive operators
AppUserSchema.index({ isActive: 1 });

// For finding operators assigned to specific robots
AppUserSchema.index({ robots: 1 });

// Export the model and return your IAppUser interface
export default mongoose.model<AppUser>("AppUser", AppUserSchema);
