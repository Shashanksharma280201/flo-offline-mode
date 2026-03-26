import mongoose, { Schema } from "mongoose";

export type PartsConsumption = {
  electrical: {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  mechanical: {
    itemId: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
};

export type SensorConfiguration = {
  sensorType: string;
  model?: string;
  quantity: number;
  specifications?: string;
}[];

export type FleetData = {
  id: string;
  name: string;
  prefix: string;
  maintenanceSteps: {
    step: string;
    tag: string;
    referenceImageUrl?: string;
  }[];
  modelVersion: string;
  partsConsumption?: PartsConsumption;
  sensors?: SensorConfiguration;
  qcTemplateId?: mongoose.Types.ObjectId;
};

const MaintenanceStepSchema = new Schema({
  step: {
    type: String,
    required: [true, "Please add step"]
  },
  tag: {
    type: String,
    required: [true, "Please add tag"]
  },
  referenceImageUrl: {
    type: String,
    required: false
  }
});

const FleetSchema: Schema = new Schema<FleetData>(
  {
    name: {
      type: String,
      required: [true, "Please add name"]
    },
    prefix: {
      type: String,
      required: [true, "Please add prefix"]
    },
    maintenanceSteps: {
      type: [MaintenanceStepSchema]
    },
    modelVersion: {
      type: String,
      required: true,
      default: 'V1',
      index: true
    },
    partsConsumption: {
      electrical: [{
        itemId: String,
        name: String,
        quantity: Number,
        unit: String
      }],
      mechanical: [{
        itemId: String,
        name: String,
        quantity: Number,
        unit: String
      }]
    },
    sensors: [{
      sensorType: String,
      model: String,
      quantity: Number,
      specifications: String
    }],
    qcTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'QCFormTemplate'
    }
  },
  {
    timestamps: true
  }
);
FleetSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
FleetSchema.set("toObject", { virtuals: true });

// Performance indexes for fleet queries
// For fleet name lookup
FleetSchema.index({ name: 1 });

// For fleet prefix search (robot naming)
FleetSchema.index({ prefix: 1 });

// Export the model and return your Fleet interface
export default mongoose.model<FleetData>("Fleet", FleetSchema);
