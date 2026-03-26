import mongoose, { ObjectId, Schema } from "mongoose";
import { IUser } from "./userModel";
import { AppUser } from "./appUserModel";
import { LatLng } from "./pathMapModel";
import { GPS_VALIDATION_CONFIG } from "../constants/gps";

export type ClientData = {
  id: string;
  name: string;
  owner: IUser;
  checkInTimeWithZone: string;
  operatingHours: number;
  users?: IUser[];
  isActive: boolean;
  materials?: ObjectId[];
  appUsers?: AppUser[];
  location?: LatLng;
  geofenceRadius?: number;
};

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
    _id: false // Do not include "_id" field in the document
  }
);

const ClientSchema: Schema = new Schema<ClientData>(
  {
    name: {
      type: String,
      required: [true, "Please add name"]
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please add Client's owner"]
    },
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: false
    },
    appUsers: {
      type: [{ type: Schema.Types.ObjectId, ref: "AppUser" }],
      required: false
    },
    checkInTimeWithZone: {
      type: String,
      required: true
    },
    operatingHours: {
      type: Schema.Types.Number,
      required: true
    },
    location: {
      type: LatLngSchema,
      required: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    materials: {
      type: [{ type: Schema.Types.ObjectId, ref: "Material" }],
      required: false,
      unique: true
    },
    geofenceRadius: {
      type: Schema.Types.Number,
      default: GPS_VALIDATION_CONFIG.DEFAULT_GEOFENCE_RADIUS_METERS,
      min: [100, "Geofence radius must be at least 100 meters"],
      max: [50000, "Geofence radius must not exceed 50 km"],
      required: false
    }
  },
  {
    timestamps: true
  }
);

ClientSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
ClientSchema.set("toObject", { virtuals: true });

// Performance indexes for client queries
// For client name search
ClientSchema.index({ name: 1 });

// For filtering active/inactive clients
ClientSchema.index({ isActive: 1 });

// For finding clients owned by a user
ClientSchema.index({ owner: 1 });

// For finding clients with specific operators
ClientSchema.index({ appUsers: 1 });

// Export the model and return your Client interface
export default mongoose.model<ClientData>("Client", ClientSchema);
