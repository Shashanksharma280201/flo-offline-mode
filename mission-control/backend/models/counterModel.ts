import mongoose, { Schema } from "mongoose";

export type Counter = {
  _id: string;
  sequenceValue: number;
};

const CounterSchema: Schema = new Schema<Counter>({
  _id: {
    type: String,
    required: true
  },
  sequenceValue: {
    type: Number,
    required: true,
    default: 0
  }
});

export default mongoose.model<Counter>("Counter", CounterSchema);
