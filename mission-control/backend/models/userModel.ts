import mongoose, { Schema, Document, Types } from "mongoose";
import { Robot } from "./robotModel";
import { ClientData } from "./clientModel";
import { PathMap } from "./pathMapModel";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: string;
  permissions?: string[]; // Custom permissions array for granular access control
  notificationPreferance: boolean;
  robots?: Robot[];
  clients?: ClientData[];
  pathMaps?: PathMap[];
  operators?: Types.ObjectId[]; // Specific operators this user can view/manage
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"]
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true
    },
    password: {
      type: String,
      required: [true, "Please add a password"]
    },
    role: {
      type: String,
      required: [true, "Please specify a suitable role for the user"],
      enum: ["admin", "custom"],
      default: "custom"
    },
    permissions: {
      type: [{ type: String }],
      required: false,
      default: []
    },
    notificationPreferance: {
      type: Boolean,
      default: false
    },
    robots: {
      type: [{ type: Schema.Types.String, ref: "Robot" }],
      default: []
    },
    clients: {
      type: [{ type: Schema.Types.ObjectId, ref: "Client" }],
      default: []
    },
    pathMaps: {
      type: [{ type: Schema.Types.ObjectId, ref: "PathMap" }],
      default: []
    },
    operators: {
      type: [{ type: Schema.Types.ObjectId, ref: "AppUser" }],
      required: false,
      default: []
    }
  },
  {
    timestamps: true
  }
);

UserSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    // Only transform _id if it exists (subdocuments don't have _id)
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.password; // Never send password to frontend
  }
});
UserSchema.set("toObject", { virtuals: true });

// Performance indexes for common queries
// For login and email lookups (most critical!)
UserSchema.index({ email: 1 }, { unique: true });

// For robot->users lookup (finding admins for a robot)
UserSchema.index({ robots: 1 });

// For client->users lookup (finding users in a client org)
UserSchema.index({ clients: 1 });

// For role-based queries (admin panels)
UserSchema.index({ role: 1 });

// For operator->users lookup (finding users who can manage an operator)
UserSchema.index({ operators: 1 });

// Export the model and return your IUser interface
export default mongoose.model<IUser>("User", UserSchema);
