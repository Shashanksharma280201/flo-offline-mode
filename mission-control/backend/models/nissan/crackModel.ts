import { model, Schema } from "mongoose";

export type Crack = {
  sessionId: string;
  deviceId: string;
  images: {
    [camera: string]: {
      key: string;
      lat?: number;
      lng?: number;
      confidence: number;
      time: number;
    }[];
  };
};

const crackSchema = new Schema<Crack>({
  sessionId: {
    type: String,
    ref: "nissanSensor",
    required: [true, "Please provide a title for the tutorial."]
  },
  deviceId: {
    type: String,
    ref: "robots",
    required: [true, "Device ID is a required field"]
  },
  images: {
    type: Map,
    of: [
      {
        key: { type: String, required: true },
        lat: { type: Number },
        lng: { type: Number },
        confidence: { type: Number, required: true },
        time: { type: Number, required: true }
      }
    ],
    required: true
  }
});

const CrackModel = model("nissanCrack", crackSchema);
export default CrackModel;
