import mongoose, { Schema, Document } from "mongoose";

export interface DowntimeMetaData {
  robotId: string;
  clientId: string;
  sessionId: string;
  operatorId: string;
}

export interface DowntimeData extends Document {
  metadata: DowntimeMetaData;
  task: "loading" | "trip" | "unloading" | "returnTrip" | "idle";
  timestamp: number;
  downtimeStartTimestamp: number;
  downtimeEndTimestamp?: number;
}

export type DowntimeEntry = {
  robotId: string;
  downtimeDuration: number;
  downtimeStartTimestamp: number;
  downtimeEndTimestamp: number;
  task: "loading" | "trip" | "unloading" | "returnTrip" | "idle";
  operatorId: string;
  clientId: string;
};

const DowntimeMetaDataSchema = new Schema<DowntimeMetaData>(
  {
    robotId: {
      type: Schema.Types.String,
      required: [true, "Robot's ID is a required field"]
    },
    clientId: {
      type: Schema.Types.String,
      required: [true, "Client ID is a required field"]
    },
    operatorId: {
      type: Schema.Types.String,
      required: [true, "Operator ID is a required field"]
    },
    sessionId: {
      type: Schema.Types.String,
      unique: true,
      required: [true, "Session ID is a required field"]
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

const DowntimeSchema = new Schema(
  {
    metadata: {
      type: DowntimeMetaDataSchema,
      required: [true, "MetaData is a required field"]
    },
    timestamp: {
      type: Schema.Types.Date,
      required: [true, "Timestamp is a required field"]
    },
    downtimeStartTimestamp: { type: Number, required: true },
    downtimeEndTimestamp: { type: Number },
    task: { type: String, default: "idle" }
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "metadata",
      granularity: "minutes" // Configuring timeseries settings for querying time-series data
    },
    timestamps: false, // Do not include "createdAt" and "updatedAt" field
    strict: false // Allow storing data that is not defined in the schema
  }
);

// Create and export the DowntimeData model using the DowntimeData interface and schema
export default mongoose.model<DowntimeData>("Downtime", DowntimeSchema);

// Establish a relationship between DowntimeData and robots collection
DowntimeSchema.index({ robotId: 1 });
