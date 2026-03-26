import mongoose, { Schema, Document } from "mongoose";

// Define LoadData schema
export interface LoadData {
  typeOfMaterial: string;
  noOfWorkers: string;
  quantity: string;
}
// Define UnloadData schema
export interface UnloadData {
  noOfWorkers: string;
  isActuatorUsed: boolean;
}

const LoadDataSchema = new Schema<LoadData>(
  {
    typeOfMaterial: { type: Schema.Types.String, required: true },
    noOfWorkers: { type: Schema.Types.String, required: true },
    quantity: { type: Schema.Types.String, required: true }
  },
  {
    _id: false
  }
);
const UnloadDataSchema = new Schema<UnloadData>(
  {
    noOfWorkers: { type: Schema.Types.String, required: true },
    isActuatorUsed: { type: Schema.Types.Boolean, default: false }
  },
  {
    _id: false
  }
);

export interface AppMetaData {
  robotId: string;
  sessionId: string;
  clientId: string;
  operatorId: string;
}
const AppMetaDataSchema = new Schema<AppMetaData>(
  {
    robotId: {
      type: Schema.Types.String,
      ref: "Robot",
      required: [true, "Robot's ID is a required field"]
    },
    sessionId: {
      type: Schema.Types.String,
      required: [true, "Session ID is a required field"]
    },
    clientId: {
      type: Schema.Types.String,
      ref: "Client",
      required: [true, "Client ID is a required field"]
    },
    operatorId: {
      type: Schema.Types.String,
      ref: "AppUser",
      required: [true, "Operator ID is a required field"]
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

export interface SessionDataEntry {
  robotId: string;
  clientId: string;
  operatorId: string;
  loadingStartTimestamp: number;
  loadingEndTimestamp: number;
  unloadingStartTimestamp: number;
  unloadingEndTimestamp: number;
  tripStartTimestamp: number;
  tripEndTimestamp: number;
  returnTripStartTimestamp: number;
  returnTripEndTimestamp: number;
  tripRunningTime: number;
  tripIdleTime: number;
  totalDownTime: number;
  checkInTimestamp?: number;
  checkOutTimestamp?: number;
  loadingData: LoadData;
  unloadingData: UnloadData;
}

// Define SessionDataEntry schema
export interface AppData extends Document {
  metadata: AppMetaData;
  timestamp: Date;
  loadingStartTimestamp: number;
  loadingEndTimestamp: number;
  unloadingStartTimestamp: number;
  unloadingEndTimestamp: number;
  tripStartTimestamp: number;
  tripEndTimestamp: number;
  returnTripStartTimestamp: number;
  returnTripEndTimestamp: number;
  tripRunningTime: number;
  tripIdleTime: number;
  totalDownTime: number;
  checkInTimestamp?: number;
  checkOutTimestamp?: number;
  loadingData: LoadData;
  unloadingData: UnloadData;
}

const AppDataSchema = new Schema<AppData>(
  {
    metadata: {
      type: AppMetaDataSchema,
      required: [true, "MetaData is a required field"]
    },
    timestamp: {
      type: Schema.Types.Date,
      required: [true, "Timestamp is a required field"]
    },
    loadingStartTimestamp: { type: Number, required: true },
    loadingEndTimestamp: { type: Number, required: true },
    unloadingStartTimestamp: { type: Number, required: true },
    unloadingEndTimestamp: { type: Number, required: true },
    tripStartTimestamp: { type: Number, required: true },
    tripEndTimestamp: { type: Number, required: true },
    returnTripStartTimestamp: { type: Number, required: true },
    returnTripEndTimestamp: { type: Number, required: true },
    tripIdleTime: { type: Number, required: true },
    tripRunningTime: { type: Number, required: true },
    totalDownTime: { type: Number, default: 0 },
    checkInTimestamp: { type: Number, required: false },
    checkOutTimestamp: { type: Number, required: false },
    loadingData: { type: LoadDataSchema, required: true },
    unloadingData: { type: UnloadDataSchema, required: true }
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "minutes" // Configuring timeseries settings for querying time-series data
    },
    timestamps: true, // Do not include "createdAt" and "updatedAt" field
    strict: false // Allow storing data that is not defined in the schema
  }
);

// Add proper indexes for timeseries queries
// Compound index for robot-specific queries with time range
AppDataSchema.index({ "metadata.robotId": 1, timestamp: -1 });

// Session lookup (non unique so historic data can reuse timestamps)
AppDataSchema.index({ "metadata.sessionId": 1 });

// Ensure uniqueness per robot+session (prevents duplicates without blocking other robots)
AppDataSchema.index(
  { "metadata.robotId": 1, "metadata.sessionId": 1 },
  { unique: true }
);

// Compound index for client analytics with time range
AppDataSchema.index({ "metadata.clientId": 1, timestamp: -1 });

// Compound index for operator analytics with time range
AppDataSchema.index({ "metadata.operatorId": 1, timestamp: -1 });

// Create and export the AppData model using the AppData interface and schema
export default mongoose.model<AppData>("AppData", AppDataSchema);
