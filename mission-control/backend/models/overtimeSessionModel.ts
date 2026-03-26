import mongoose, { Schema, Document } from "mongoose";

export interface IOvertimeSession extends Document {
  _id: string;
  requestId: string; // Link to OvertimeRequest
  operatorId: string;
  operatorName: string;
  clientId: string;
  clientName: string;
  approvedDuration: number; // Hours approved (from request)
  checkInTime: Date;
  checkOutTime?: Date;
  actualDuration?: number; // Hours actually worked
  status: "active" | "completed" | "cancelled";
  location: {
    lat: number;
    lng: number;
  };
  checkOutLocation?: {
    lat: number;
    lng: number;
  };
  isEarlyCheckout?: boolean;
  earlyCheckoutReason?: string;
}

const overtimeSessionSchema = new Schema<IOvertimeSession>(
  {
    requestId: {
      type: String,
      required: true,
      index: true
    },
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
    approvedDuration: {
      type: Number,
      required: true,
      min: 0.5,
      max: 12
    },
    checkInTime: {
      type: Date,
      required: true
    },
    checkOutTime: {
      type: Date
    },
    actualDuration: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      index: true
    },
    location: {
      type: {
        lat: {
          type: Number,
          required: true
        },
        lng: {
          type: Number,
          required: true
        }
      },
      required: true,
      _id: false
    },
    checkOutLocation: {
      type: {
        lat: {
          type: Number,
          required: true
        },
        lng: {
          type: Number,
          required: true
        }
      },
      _id: false
    },
    isEarlyCheckout: {
      type: Boolean,
      default: false
    },
    earlyCheckoutReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
// Find active session for operator
overtimeSessionSchema.index({ operatorId: 1, status: 1 });

// Client reporting and analytics
overtimeSessionSchema.index({ clientId: 1, checkInTime: -1 });

// Status-based queries
overtimeSessionSchema.index({ status: 1, checkInTime: -1 });

// Early checkout tracking
overtimeSessionSchema.index({ isEarlyCheckout: 1, checkInTime: -1 });

const OvertimeSessionModel = mongoose.model<IOvertimeSession>(
  "OvertimeSession",
  overtimeSessionSchema
);

export default OvertimeSessionModel;
