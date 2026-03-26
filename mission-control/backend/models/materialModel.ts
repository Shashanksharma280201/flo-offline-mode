import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  id: string;
  name: string;
  isActive: boolean;
}

const MaterialSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please add the material type"],
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

MaterialSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
MaterialSchema.set("toObject", { virtuals: true });

// Export the model and return your IMaterial interface
export default mongoose.model<IMaterial>("Material", MaterialSchema);
