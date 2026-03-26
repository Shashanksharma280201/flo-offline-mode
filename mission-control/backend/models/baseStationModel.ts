import mongoose, { Schema } from "mongoose";
import { LatLng } from "./pathMapModel";

export type BaseStationData = {
  id: string;
  mac: string;
  location: LatLng;
  online: boolean;
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
const BaseStationSchema: Schema = new Schema<BaseStationData>(
  {
    mac: {
      type: String,
      required: [true, "Please add mac address of the Base Station"],
      unique: true
    },
    location: {
      type: LatLngSchema,
      required: true
    },
    online: {
      type: Boolean,
      required: true
    }
  },
  {
    timestamps: true
  }
);
BaseStationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
BaseStationSchema.set("toObject", { virtuals: true });
// Export the model and return your Fleet interface
export default mongoose.model<BaseStationData>(
  "BaseStation",
  BaseStationSchema
);
