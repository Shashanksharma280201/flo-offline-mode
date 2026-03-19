import mongoose, { Schema, Document } from 'mongoose';

/**
 * GPS location subdocument
 */
export type Gps = {
  timestamp: number;
  latitude: number;
  longitude: number;
  baseStationId?: string;
};

/**
 * Robot interface matching cloud schema
 * Simplified for offline mode - only essential fields for Phase 2
 */
export interface Robot extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  macAddress: string;
  gps?: Gps;
  users: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GPS subdocument schema
 */
const gpsSchema = new Schema<Gps>(
  {
    timestamp: {
      type: Number,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    baseStationId: {
      type: String,
      required: false,
    },
  },
  { _id: false, timestamps: true }
);

/**
 * Robot schema matching cloud robotModel.ts
 * Essential fields only - additional fields added in Phase 3 as needed
 */
const robotSchema = new Schema<Robot>(
  {
    name: {
      type: String,
      required: [true, 'Robot name is required'],
      index: true,
    },
    macAddress: {
      type: String,
      required: [true, 'MAC address is required'],
      unique: true,
      index: true,
    },
    gps: {
      type: gpsSchema,
      required: false,
    },
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  { timestamps: true }
);

/**
 * Robot model export
 */
const robotModel = mongoose.model<Robot>('Robot', robotSchema);

export default robotModel;
