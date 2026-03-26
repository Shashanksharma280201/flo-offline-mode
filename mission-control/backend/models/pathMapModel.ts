import mongoose, { Schema, Types } from "mongoose";
import { IUser } from "./userModel";

export interface Point2 {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  theta: number;
}
export interface Path {
  id: string;
  utm: Point2[];
  gps: LatLng[];
  destStationId: string;
}

export interface Paths {
  [stationId: string]: Path[];
}

export interface Boundary {
  id: string;
  utm: Point2[];
  gps: LatLng[];
}

export interface Obstacle {
  id: string;
  utm: Point2[];
  gps: LatLng[];
  boundaryId: string;
}

export interface Mission extends Document {
  id: string;
  name: string;
  mission: Path[];
}
export interface PathMap {
  id: string;
  _id: Types.ObjectId;
  name: string;
  frame?: string;
  lidarMapName?: string;
  owner: Types.ObjectId;
  users: IUser[];
  paths?: Paths;
  boundaries: Boundary[];
  obstacles: Obstacle[];
  stations: Station[];
  missions: Mission[];
}

const Point2Schema = new Schema<Point2>(
  {
    x: { type: Schema.Types.Number, required: true },
    y: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false
  }
);

const LatLngSchema = new Schema<LatLng>(
  {
    lat: { type: Schema.Types.Number, required: true },
    lng: { type: Schema.Types.Number, required: true }
  },
  {
    _id: false
  }
);

const PathSchema = new mongoose.Schema(
  {
    id: { type: Schema.Types.String, required: true },
    utm: { type: [Point2Schema], required: true },
    gps: { type: [LatLngSchema], required: true },
    destStationId: { type: Schema.Types.String, required: true }
  },
  {
    _id: false
  }
);

const StationSchema = new Schema<Station>({
  id: { type: Schema.Types.String, required: true },
  lat: { type: Schema.Types.Number, required: true },
  lng: { type: Schema.Types.Number, required: true },
  x: { type: Schema.Types.Number, required: true },
  y: { type: Schema.Types.Number, required: true },
  theta: { type: Schema.Types.Number, required: true }
});

const MissionSchema = new Schema({
  name: { type: Schema.Types.String, required: true },
  mission: { type: [PathSchema], required: false } // An array of arrays of Point2 documents
});

const BoundarySchema = new Schema({
  id: { type: Schema.Types.String, required: true },
  utm: { type: [Point2Schema], required: true },
  gps: { type: [LatLngSchema], required: true }
});

const ObstacleSchema = new Schema({
  id: { type: Schema.Types.String, required: true },
  utm: { type: [Point2Schema], required: true },
  gps: { type: [LatLngSchema], required: true },
  boundaryId: { type: Schema.Types.String, required: true }
});

const PathMapSchema = new Schema<PathMap>(
  {
    name: {
      type: Schema.Types.String,
      required: [true, "Please add Path map's name"]
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please add Path map's owner"]
    },
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: [true, "Please add atleast one user"]
    },
    frame: {
      type: Schema.Types.String,
      required: false
    },
    lidarMapName: {
      type: Schema.Types.String,
      required: false
    },
    paths: {
      type: Schema.Types.Mixed,
      required: false
    },
    stations: { type: [StationSchema], required: true },
    missions: {
      type: [MissionSchema],
      required: [true, "Please add Path map's name"]
    },
    boundaries: {
      type: [BoundarySchema],
      required: false
    },
    obstacles: {
      type: [ObstacleSchema],
      required: false
    }
  },
  {
    timestamps: true
  }
);

PathMapSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
PathMapSchema.set("toObject", { virtuals: true });
// Export the model and return your Robot interface
export default mongoose.model<PathMap>("PathMap", PathMapSchema);
