import mongoose, { Schema, Types } from "mongoose";

export interface GeorefPoint {
  point_id: number;
  timestamp: number;
  map_x: number;
  map_y: number;
  map_z: number;
  map_yaw: number;
  utm_x: number;
  utm_y: number;
  utm_z: number;
  utm_yaw: number;
}

export interface MapMetadata {
  resolution: number;
  origin: number[];
  negate: number;
  occupied_thresh: number;
  free_thresh: number;
  mode: string;
}

export interface LidarMap {
  _id: Types.ObjectId;
  name: string;
  s3FolderPath: string;
  map3dFileName: string;
  map2dPgmFileName: string;
  map2dYamlFileName: string;
  georefFileName: string;
  mapMetadata?: MapMetadata;
  georefPoints?: GeorefPoint[];
  status: "ready" | "mapping" | "failed";
  robotId?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

const GeorefPointSchema = new Schema<GeorefPoint>(
  {
    point_id: { type: Schema.Types.Number, required: true },
    timestamp: { type: Schema.Types.Number, required: true },
    map_x: { type: Schema.Types.Number, required: true },
    map_y: { type: Schema.Types.Number, required: true },
    map_z: { type: Schema.Types.Number, required: true },
    map_yaw: { type: Schema.Types.Number, required: true },
    utm_x: { type: Schema.Types.Number, required: true },
    utm_y: { type: Schema.Types.Number, required: true },
    utm_z: { type: Schema.Types.Number, required: true },
    utm_yaw: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false
  }
);

const MapMetadataSchema = new Schema<MapMetadata>(
  {
    resolution: { type: Schema.Types.Number, required: true },
    origin: { type: [Schema.Types.Number], required: true },
    negate: { type: Schema.Types.Number, required: true },
    occupied_thresh: { type: Schema.Types.Number, required: true },
    free_thresh: { type: Schema.Types.Number, required: true },
    mode: { type: Schema.Types.String, required: true }
  },
  {
    _id: false
  }
);

const LidarMapSchema = new Schema<LidarMap>(
  {
    name: {
      type: Schema.Types.String,
      required: [true, "Please add LIDAR map's name"],
      unique: true
    },
    s3FolderPath: {
      type: Schema.Types.String,
      required: [true, "Please add S3 folder path"]
    },
    map3dFileName: {
      type: Schema.Types.String,
      required: [true, "Please add 3D map file name"]
    },
    map2dPgmFileName: {
      type: Schema.Types.String,
      required: [true, "Please add 2D PGM map file name"]
    },
    map2dYamlFileName: {
      type: Schema.Types.String,
      required: [true, "Please add 2D YAML map file name"]
    },
    georefFileName: {
      type: Schema.Types.String,
      required: [true, "Please add georef file name"]
    },
    mapMetadata: {
      type: MapMetadataSchema,
      required: false
    },
    georefPoints: {
      type: [GeorefPointSchema],
      required: false
    },
    status: {
      type: Schema.Types.String,
      enum: ["ready", "mapping", "failed"],
      default: "ready",
      required: true
    },
    robotId: {
      type: Schema.Types.String,
      required: false
    },
    fileSize: {
      type: Schema.Types.Number,
      required: false
    }
  },
  {
    timestamps: true
  }
);

LidarMapSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    delete ret._id;
  }
});

LidarMapSchema.set("toObject", { virtuals: true });

export default mongoose.model<LidarMap>("LidarMap", LidarMapSchema);
