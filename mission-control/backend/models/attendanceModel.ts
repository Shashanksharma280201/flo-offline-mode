import mongoose, { Schema, Document } from "mongoose";
import { LatLng } from "./pathMapModel";

export interface AttendanceMetaData {
  operatorId: string;
  clientId: string;
  entryType: "checkIn" | "checkOut";
}

export interface AttendanceData extends Document {
  metadata: AttendanceMetaData;
  location: LatLng;
  startingTimestamp: number;
  checkInStatus?: "ontime" | "early" | "late";
  isOvertimeSession?: boolean;
  overtimeRequestId?: string;
  overtimeApprovedDuration?: number;
  overtimeActualDuration?: number;
  overtimeStartTime?: Date;
  overtimeEndTime?: Date;
  overtimeCost?: number;
  autoCheckedOut?: boolean;
  autoCheckOutReason?: string;
  autoCheckOutTime?: Date;
}

const LatLngSchema: Schema = new Schema<LatLng>(
  {
    lat: {
      type: Number,
      required: [true, "Please add Latitude"]
    },
    lng: {
      type: Number,
      required: [true, "Please add longitude"]
    }
  },
  {
    _id: false
  }
);

const AttendanceMetaDataSchema = new Schema<AttendanceMetaData>({
  clientId: {
    type: Schema.Types.String,
    required: [true, "Client ID is a required field"]
  },
  operatorId: {
    type: Schema.Types.String,
    required: [true, "Operator ID is a required field"]
  },
  entryType: {
    type: Schema.Types.String,
    required: [true, "Entry Type is a required field"]
  }
});

const AttendanceSchema = new Schema(
  {
    metadata: {
      type: AttendanceMetaDataSchema,
      required: [true, "MetaData is a required field"]
    },
    location: LatLngSchema,
    startingTimestamp: Schema.Types.Date,
    checkInStatus: String,
    isOvertimeSession: {
      type: Boolean,
      default: false
    },
    overtimeRequestId: String,
    overtimeApprovedDuration: Number,
    overtimeActualDuration: Number,
    overtimeStartTime: Date,
    overtimeEndTime: Date,
    overtimeCost: Number,
    autoCheckedOut: {
      type: Boolean,
      default: false
    },
    autoCheckOutReason: String,
    autoCheckOutTime: Date
  },
  {
    timeseries: {
      timeField: "startingTimestamp",
      metaField: "metadata",
      granularity: "minutes" // Configuring timeseries settings for querying time-series data
    },
    strict: false // Allow storing data that is not defined in the schema
  }
);

// Performance indexes for attendance queries
// For operator attendance history with time range
AttendanceSchema.index({ "metadata.operatorId": 1, startingTimestamp: -1 });

// For client attendance tracking
AttendanceSchema.index({ "metadata.clientId": 1, startingTimestamp: -1 });

// For filtering by entry type (checkIn/checkOut)
AttendanceSchema.index({ "metadata.entryType": 1 });

// For check-in status analytics (on-time vs late)
AttendanceSchema.index({ checkInStatus: 1 });

// For overtime session queries
AttendanceSchema.index({ isOvertimeSession: 1, overtimeStartTime: -1 });
AttendanceSchema.index({ overtimeRequestId: 1 });

export default mongoose.model<AttendanceData>("Attendance", AttendanceSchema);
