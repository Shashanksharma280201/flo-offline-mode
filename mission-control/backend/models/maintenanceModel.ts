import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface MaintenanceMetadata {
  robotId: string;
  clientId: ObjectId;
  operatorId: ObjectId;
  _id: string;
}

export interface MaintenanceData extends Document {
  metadata: MaintenanceMetadata;
  timestamp: Date;
  bucketId: string;
}

const MaintenanceMetadataSchema = new Schema<MaintenanceMetadata>({
  clientId: {
    type: Schema.Types.String,
    required: [true, "Client ID is a required field"]
  },
  operatorId: {
    type: Schema.Types.String,
    required: [true, "Operator ID is a required field"]
  },
  robotId: {
    type: Schema.Types.String,
    required: [true, "Entry Type is a required field"]
  }
});

const MaintenanceSchema = new Schema<MaintenanceData>(
  {
    metadata: {
      type: MaintenanceMetadataSchema,
      required: [true, "Metadata is a required field"]
    },
    timestamp: Schema.Types.Date
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

// Performance indexes for maintenance queries
// For robot maintenance history with time range
MaintenanceSchema.index({ "metadata.robotId": 1, timestamp: -1 });

// For client maintenance tracking
MaintenanceSchema.index({ "metadata.clientId": 1, timestamp: -1 });

// For operator maintenance records
MaintenanceSchema.index({ "metadata.operatorId": 1, timestamp: -1 });

// Create and export the MaintenanceData model using the MaintenanceData interface and schema
export default mongoose.model<MaintenanceData>(
  "RobotMaintenance",
  MaintenanceSchema
);
