// Import required modules
import mongoose, { Schema } from "mongoose";
import { GPS_VALIDATION_CONFIG, GPSCorrectionType } from "../constants/gps";

// Define the Point interface representing 3D coordinates
export interface Point {
  x: number;
  y: number;
  z: number;
}

// Define the Quaternion interface representing a 4D vector
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

// Define the IMU (Inertial Measurement Unit) interface representing IMU data
export interface Imu {
  timestamp: Date;
  orientation: Quaternion;
  orientationCovariance: number[];
  angularVelocity: Point;
  angularVelocityCovariance: number[];
  linearAcceleration: Point;
  linearAccelerationCovariance: number[];
}

// Define the GNSS (Global Navigation Satellite System) interface representing GNSS data
export interface Gnss {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number;
  isOutlier?: boolean;
  correctionType?: string;
}

// Define the PayloadWeight interface representing payload weight data
export interface PayloadWeight {
  data: number;
  timestamp: Date;
}

// Define the Altitude interface representing altitude data
export interface Altitude {
  data: number;
  timestamp: Date;
}

// Define the Distance interface representing distance data
export interface Distance {
  data: number;
  timestamp: Date;
}

// Define the Video interface representing video data
export interface Video {
  bucket: string;
  key: string;
  startTimestamp: number;
  endTimestamp: number;
}

// Define the Battery interface representing battery data
export interface Battery {
  frameId?: string;
  timestamp: Date;
  voltage: number;
  current: number;
  charge: number;
  capacity: number;
  designCapacity: number;
  percentage: number;
  powerSupplyStatus: number;
  powerSupplyHealth: number;
  powerSupplyTechnology: number;
  present: boolean;
  cellVoltage: number[];
  cellTemperature: number[];
}

export interface MMRData {
  timestamp: Date;
  leftCytronTemp: number;
  rightCytronTemp: number;
  mmrVoltage: number;
  mmrCurrent: number;
  mmrPower: number;
  mmrPeakPower: number;
  throttle: number;
  steering: number;
  actuator: number;
  light: number;
  baroTemperature: number;
  baroAltitude: number;
}

interface BatteryErrorPoint {
  timestamp: number;
  error: number;
}

export interface BatteryErrors {
  errorCode1: BatteryErrorPoint;
  errorCode2: BatteryErrorPoint;
  errorCode3: BatteryErrorPoint;
  errorCode4: BatteryErrorPoint;
  errorCode5: BatteryErrorPoint;
  errorCode6: BatteryErrorPoint;
  errorCode7: BatteryErrorPoint;
  errorCode8: BatteryErrorPoint;
}

export interface SessionInfo {
  name: string;
  distanceTravelled: number;
  operationTime: number;
  energyConsumed: number;
  sessionEndTimestamp: Date;
  videos: Video[];
}

// Define the SensorMetaData interface representing sensor metadata
export interface SensorMetaData {
  robotId: string;
  sessionId: string;
}

// Define the Sensor interface representing a sensor document in the database
export interface SensorData {
  metadata: SensorMetaData;
  timestamp: number;
  sessionInfo: SessionInfo;
  imu?: Imu[];
  gnss?: Gnss[];
  payloadWeight?: PayloadWeight[];
  altitude?: Altitude[];
  distance?: Distance[];
  battery?: Battery[];
  batteryErrors?: BatteryErrors;
  mmr?: MMRData[];
}

// Define the Mongoose schema for the Point interface
const PointSchema = new Schema<Point>(
  {
    x: { type: Schema.Types.Number, required: true },
    y: { type: Schema.Types.Number, required: true },
    z: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Quaternion interface
const QuaternionSchema = new Schema<Quaternion>(
  {
    x: { type: Schema.Types.Number, required: true },
    y: { type: Schema.Types.Number, required: true },
    z: { type: Schema.Types.Number, required: true },
    w: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

const BatteryErrorPointSchema = new Schema<BatteryErrorPoint>(
  {
    timestamp: { type: Schema.Types.Number, required: true },
    error: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

const BatteryErrorSchema = new Schema<BatteryErrors>(
  {
    errorCode1: [BatteryErrorPointSchema],
    errorCode2: [BatteryErrorPointSchema],
    errorCode3: [BatteryErrorPointSchema],
    errorCode4: [BatteryErrorPointSchema],
    errorCode5: [BatteryErrorPointSchema],
    errorCode6: [BatteryErrorPointSchema],
    errorCode7: [BatteryErrorPointSchema],
    errorCode8: [BatteryErrorPointSchema]
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Imu interface
const ImuSchema = new Schema<Imu>(
  {
    timestamp: { type: Schema.Types.Date, required: true },
    orientation: QuaternionSchema,
    orientationCovariance: { type: [Schema.Types.Number], required: true },
    angularVelocity: PointSchema,
    angularVelocityCovariance: { type: [Schema.Types.Number], required: true },
    linearAcceleration: PointSchema,
    linearAccelerationCovariance: {
      type: [Schema.Types.Number],
      required: true
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Gnss interface
const GnssSchema = new Schema<Gnss>(
  {
    timestamp: { type: Schema.Types.Date, required: true },
    latitude: {
      type: Schema.Types.Number,
      required: true,
      min: [GPS_VALIDATION_CONFIG.MIN_LATITUDE, "Latitude must be >= -90"],
      max: [GPS_VALIDATION_CONFIG.MAX_LATITUDE, "Latitude must be <= 90"],
      validate: {
        validator: (v: number) => !Number.isNaN(v) && Number.isFinite(v),
        message: "Latitude must be a valid number"
      }
    },
    longitude: {
      type: Schema.Types.Number,
      required: true,
      min: [
        GPS_VALIDATION_CONFIG.MIN_LONGITUDE,
        "Longitude must be >= -180"
      ],
      max: [GPS_VALIDATION_CONFIG.MAX_LONGITUDE, "Longitude must be <= 180"],
      validate: {
        validator: (v: number) => !Number.isNaN(v) && Number.isFinite(v),
        message: "Longitude must be a valid number"
      }
    },
    speed: {
      type: Schema.Types.Number,
      required: true,
      min: [0, "Speed cannot be negative"],
      max: [
        GPS_VALIDATION_CONFIG.MAX_SPEED_KMPH,
        `Speed must be <= ${GPS_VALIDATION_CONFIG.MAX_SPEED_KMPH} km/h`
      ]
    },
    isOutlier: {
      type: Schema.Types.Boolean,
      default: false,
      required: false
    },
    correctionType: {
      type: Schema.Types.String,
      enum: Object.values(GPSCorrectionType),
      default: GPSCorrectionType.NONE,
      required: false
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the PayloadWeight interface
const PayloadWeightSchema = new Schema<PayloadWeight>(
  {
    data: { type: Schema.Types.Number, required: true },
    timestamp: { type: Schema.Types.Date, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Altitude interface
const AltitudeSchema = new Schema<Altitude>(
  {
    data: { type: Schema.Types.Number, required: true },
    timestamp: { type: Schema.Types.Date, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Distance interface
const DistanceSchema = new Schema<Distance>(
  {
    data: { type: Schema.Types.Number, required: true },
    timestamp: { type: Schema.Types.Date, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Video interface
const VideoSchema = new Schema<Video>(
  {
    bucket: { type: Schema.Types.String, required: true },
    key: { type: Schema.Types.String, required: true },
    startTimestamp: { type: Schema.Types.Number, required: true },
    endTimestamp: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Battery interface
const BatterySchema = new Schema<Battery>({
  frameId: { type: Schema.Types.String, required: false },
  timestamp: { type: Schema.Types.Date, required: true },
  voltage: { type: Schema.Types.Number, required: true },
  current: { type: Schema.Types.Number, required: true },
  charge: { type: Schema.Types.Number, required: true },
  capacity: { type: Schema.Types.Number, required: true },
  designCapacity: { type: Schema.Types.Number, required: true },
  percentage: { type: Schema.Types.Number, required: true },
  powerSupplyStatus: { type: Schema.Types.Number, required: true },
  powerSupplyHealth: { type: Schema.Types.Number, required: true },
  powerSupplyTechnology: { type: Schema.Types.Number, required: true },
  present: { type: Schema.Types.Boolean, required: true },
  cellVoltage: { type: [Schema.Types.Number], required: true },
  cellTemperature: { type: [Schema.Types.Number], required: true }
});

const SessionInfoSchema = new Schema<SessionInfo>(
  {
    name: {
      type: Schema.Types.String,
      required: true
    },
    distanceTravelled: {
      type: Schema.Types.Number,
      required: true
    },
    operationTime: {
      type: Schema.Types.Number,
      required: true
    },
    energyConsumed: {
      type: Schema.Types.Number,
      required: true
    },
    sessionEndTimestamp: {
      type: Schema.Types.Date,
      required: true
    },
    videos: {
      type: [VideoSchema],
      required: true
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

const SensorMetaDataSchema = new Schema<SensorMetaData>(
  {
    robotId: {
      type: Schema.Types.String,
      ref: "Robot",
      unique: true,
      required: [true, "Robot's ID is a required field"]
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

const MMRSchema = new Schema(
  {
    timestamp: {
      type: Schema.Types.Date,
      required: [true, "timestamp is a required field"]
    },
    leftCytronTemp: {
      type: Schema.Types.Number,
      required: [true, "Left Cytron Temperature is a required field"]
    },
    rightCytronTemp: {
      type: Schema.Types.Number,
      required: [true, "Right Cytron Temperature is a required field"]
    },
    mmrVoltage: {
      type: Schema.Types.Number,
      required: [true, "MMR Voltage is a required field"]
    },
    mmrCurrent: {
      type: Schema.Types.Number,
      required: [true, "MMR current is a required field"]
    },
    mmrPower: {
      type: Schema.Types.Number,
      required: [true, "MMR Power is a required field"]
    },
    mmrPeakPower: {
      type: Schema.Types.Number,
      required: [true, "MMR peak power is a required field"]
    },
    throttle: {
      type: Schema.Types.Number,
      required: [true, "Throttle is a required field"]
    },
    steering: {
      type: Schema.Types.Number,
      required: [true, "Steering is a required field"]
    },
    actuator: {
      type: Schema.Types.Number,
      required: [true, "Actuator is a required field"]
    },
    light: {
      type: Schema.Types.Number,
      required: [true, "Light is a required field"]
    },
    baroTemperature: {
      type: Schema.Types.Number,
      required: [true, "Barometer temperature is a required field"]
    },
    baroAltitude: {
      type: Schema.Types.Number,
      required: [true, "Barometer altitude is a required field"]
    }
  },
  {
    _id: false // Do not include "_id" field in the document
  }
);

// Define the Mongoose schema for the Sensor interface
const SensorSchema = new Schema(
  {
    metadata: {
      type: SensorMetaDataSchema,
      required: [true, "MetaData is a required field"]
    },
    timestamp: {
      type: Schema.Types.Date,
      required: [true, "timestamp is a required field"]
    },
    sessionInfo: {
      type: SessionInfoSchema,
      required: [true, "Session Info is a required field"]
    },
    imu: { type: [ImuSchema], required: false },
    gnss: { type: [GnssSchema], required: false },
    payloadWeight: { type: [PayloadWeightSchema], required: false },
    altitude: { type: [AltitudeSchema], required: false },
    distance: { type: [DistanceSchema], required: false },
    battery: { type: [BatterySchema], required: false },
    mmr: { type: [MMRSchema], required: false },
    batteryErrors: { type: BatteryErrorSchema, required: false }
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

// Modify the toJSON method to remove "_id" field from the serialized document
SensorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

// Performance indexes for timeseries queries
// Basic timestamp index (keep existing)
SensorSchema.index({ timestamp: 1 });

// Compound index for robot-specific queries with time range (most critical!)
// Used when fetching sensor data for a specific robot over time
SensorSchema.index({ "metadata.robotId": 1, timestamp: -1 });

// For session analysis (finding all sensor data for a specific session)
SensorSchema.index({ "metadata.sessionId": 1 });

// Modify the toObject method to remove "_id" field from the object representation
SensorSchema.set("toObject", { virtuals: true });

// Create and export the Sensor model using the Sensor interface and schema
export default mongoose.model<SensorData>("Sensor", SensorSchema);
