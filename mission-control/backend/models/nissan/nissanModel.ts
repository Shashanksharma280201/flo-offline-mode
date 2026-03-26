import mongoose, { Schema, Types } from "mongoose";

export type NissanMetaData = {
  deviceId: string;
  sessionId: string;
  sensorReading: Types.ObjectId;
  cracks: Types.ObjectId;
  leaningPole: Types.ObjectId;
  pole: Types.ObjectId;
  potHole: Types.ObjectId;
  whitelineBlur: Types.ObjectId;
  crosswalkBlur: Types.ObjectId;
};

type NissanData = {
  metadata: NissanMetaData;
  timestamp: Date;
};

const metadataSchema = new Schema<NissanMetaData>(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is a required field"],
      ref: "robots"
    },
    sessionId: {
      type: String
    },
    cracks: {
      type: Schema.Types.ObjectId,
      ref: "nissanCrack"
    },
    leaningPole: {
      type: Schema.Types.ObjectId,
      ref: "nissanLeaningPole"
    },
    pole: {
      type: Schema.Types.ObjectId,
      ref: "nissanPole"
    },
    potHole: {
      type: Schema.Types.ObjectId,
      ref: "nissanPothole"
    },
    crosswalkBlur: {
      type: Schema.Types.ObjectId,
      ref: "nissanCrosswalkBlur"
    }
  },
  { timestamps: false }
);

const NissanSchema = new Schema<NissanData>(
  {
    metadata: {
      type: metadataSchema,
      required: [true, "MetaData is a required field"]
    },
    timestamp: {
      type: Schema.Types.Date,
      required: [true, "timestamp is a required field"]
    }
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
NissanSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

// Add index to timestamps
NissanSchema.index({ timestamp: 1 });

// Modify the toObject method to remove "_id" field from the object representation
NissanSchema.set("toObject", { virtuals: true });

// Create and export the Sensor model using the Sensor interface and schema
export default mongoose.model("Nissan", NissanSchema);
