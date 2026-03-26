import mongoose, { Schema, Document, Types } from "mongoose";

// TypeScript interface
export interface Billing extends Document {
  robotId: string;
  clientId: Types.ObjectId | string;
  startDate: Date;
  endDate?: Date;
  amount: number;
  status: BillingStatus;
  createdDate: Date;
  createdBy: string;
  history: {
    action: string;
    changedBy: string;
    updatedAt: Date;
    changes?: any;
  }[];
}

// Status enum
export enum BillingStatus {
  NOTBILLING = "not billing",
  BILLING = "billing",
  POC = "poc",
  SOLD = "sold",
  PAIDPOC = "paid poc",
  NA = "N/A",
  WORKORDERPENDING = "work order pending"
}

// Mongoose schema
const BillingSchema = new Schema<Billing>(
  {
    robotId: {
      type: String,
      ref: "Robot",
      required: true,
      index: true
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: false
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(BillingStatus),
      required: true,
      default: BillingStatus.BILLING,
      index: true
    },
    createdBy: {
      type: String,
      required: true
    },
    history: [
      {
        action: String,
        changedBy: String,
        updatedAt: Date,
        changes: Object
      }
    ]
  },
  {
    timestamps: true,
    collection: "billing"
  }
);

// Create and export model
export const Billing = mongoose.model<Billing>("Billing", BillingSchema);
