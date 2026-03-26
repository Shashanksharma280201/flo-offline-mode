import mongoose, { Schema, Document } from "mongoose";

export interface IOvertimeRequest extends Document {
  _id: string;
  operatorId: string;
  operatorName: string;
  clientId: string;
  clientName: string;
  robotId?: string;
  robotName?: string;
  requestedAt: Date;
  requestedDuration: number;
  approvedDuration?: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date;
  overtimeSessionId?: string;
  expirationEmailSent?: boolean;
}

const overtimeRequestSchema = new Schema<IOvertimeRequest>(
  {
    operatorId: {
      type: String,
      required: true,
      index: true
    },
    operatorName: {
      type: String,
      required: true
    },
    clientId: {
      type: String,
      required: true,
      index: true
    },
    clientName: {
      type: String,
      required: true
    },
    robotId: {
      type: String
    },
    robotName: {
      type: String
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    requestedDuration: {
      type: Number,
      required: true,
      min: 0.5,
      max: 12
    },
    approvedDuration: {
      type: Number,
      min: 0.5,
      max: 12
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    approvedBy: {
      type: String
    },
    approvedByName: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    rejectedBy: {
      type: String
    },
    rejectedByName: {
      type: String
    },
    rejectedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    },
    expiresAt: {
      type: Date
    },
    overtimeSessionId: {
      type: String
    },
    expirationEmailSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
overtimeRequestSchema.index({ status: 1, requestedAt: -1 });
overtimeRequestSchema.index({ operatorId: 1, requestedAt: -1 });
overtimeRequestSchema.index({ clientId: 1, status: 1 });

// REMOVED: TTL index that was auto-deleting approved requests after expiry
// This prevented the history tab from showing expired approvals
// We still check expiresAt in the code, but we keep all records for history tracking
// OLD CODE:
// overtimeRequestSchema.index(
//   { expiresAt: 1 },
//   { expireAfterSeconds: 0, partialFilterExpression: { status: "approved" } }
// );

const OvertimeRequestModel = mongoose.model<IOvertimeRequest>(
  "OvertimeRequest",
  overtimeRequestSchema
);

export default OvertimeRequestModel;
