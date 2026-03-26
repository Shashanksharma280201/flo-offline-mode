import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

// Edit history entry for audit trail
export interface IEditHistory {
  field: string;
  oldValue: string;
  newValue: string;
  editedBy: IUser | string;
  editedAt: Date;
}

const editHistorySchema = new Schema<IEditHistory>(
  {
    field: {
      type: String,
      required: true
    },
    oldValue: {
      type: String,
      required: true
    },
    newValue: {
      type: String,
      required: true
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  { _id: false }
);

// Robot reference in shipment
export interface IRobotReference {
  robotId: string;
  name: string;
  serialNumber?: string;
}

const robotReferenceSchema = new Schema<IRobotReference>(
  {
    robotId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    serialNumber: {
      type: String,
      required: false
    }
  },
  { _id: false }
);

// Inventory item reference in shipment
export interface IItemReference {
  inventoryItemId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  customDescription?: string; // For "OTHERS" items
}

const itemReferenceSchema = new Schema<IItemReference>(
  {
    inventoryItemId: {
      type: String,
      required: true
    },
    itemId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ["pieces", "meters", "kilograms", "liters", "sets", "boxes"]
    },
    customDescription: {
      type: String,
      required: false,
      maxlength: 500
    }
  },
  { _id: false }
);

// Main Shipment interface
export interface IShipment extends Document {
  shipmentId: string;
  type: "robot" | "miscellaneous";
  status: "in-transit" | "delivered" | "cancelled";

  // Robot shipping specific
  robots?: IRobotReference[];
  additionalItems?: IItemReference[];

  // Miscellaneous shipping specific
  items?: IItemReference[];

  description?: string;

  // Location and dates
  startLocation: string;
  endLocation: string;
  startDate: Date;
  endDate: Date;
  actualDeliveryDate?: Date;

  // Audit trail
  createdBy: IUser | string;
  editHistory: IEditHistory[];

  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema: Schema = new Schema<IShipment>(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ["robot", "miscellaneous"],
      required: [true, "Shipment type is required"]
    },
    status: {
      type: String,
      enum: ["in-transit", "delivered", "cancelled"],
      default: "in-transit",
      required: true
    },

    // Robot shipping fields
    robots: {
      type: [robotReferenceSchema],
      required: false,
      validate: {
        validator: function(this: IShipment, value: IRobotReference[]) {
          // Robots required only for robot type shipments
          if (this.type === "robot") {
            return value && value.length > 0;
          }
          return true;
        },
        message: "At least one robot is required for robot shipments"
      }
    },
    additionalItems: {
      type: [itemReferenceSchema],
      default: []
    },

    // Miscellaneous shipping fields
    items: {
      type: [itemReferenceSchema],
      required: false,
      validate: {
        validator: function(this: IShipment, value: IItemReference[]) {
          // Items required only for miscellaneous type shipments
          if (this.type === "miscellaneous") {
            return value && value.length > 0;
          }
          return true;
        },
        message: "At least one item is required for miscellaneous shipments"
      }
    },

    description: {
      type: String,
      maxlength: 1000
    },

    startLocation: {
      type: String,
      required: [true, "Start location is required"],
      maxlength: 200
    },
    endLocation: {
      type: String,
      required: [true, "End location is required"],
      maxlength: 200
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"]
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function(this: IShipment, value: Date) {
          return value >= this.startDate;
        },
        message: "End date must be after start date"
      }
    },
    actualDeliveryDate: {
      type: Date,
      required: false
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    editHistory: {
      type: [editHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Virtual for shipment duration
ShipmentSchema.virtual("duration").get(function () {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for delivery status
ShipmentSchema.virtual("deliveryStatus").get(function () {
  if (this.status === "delivered" && this.actualDeliveryDate) {
    return "delivered";
  }
  if (this.status === "cancelled") {
    return "cancelled";
  }
  const today = new Date();
  const expectedDate = new Date(this.endDate);
  if (expectedDate < today) {
    return "overdue";
  }
  return "on-time";
});

// JSON transformation
ShipmentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  }
});
ShipmentSchema.set("toObject", { virtuals: true });

// Indexes for performance
ShipmentSchema.index({ shipmentId: 1 }, { unique: true });
ShipmentSchema.index({ type: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ "robots.robotId": 1 }); // For robot lookup
ShipmentSchema.index({ startDate: -1 });
ShipmentSchema.index({ endDate: 1 });
ShipmentSchema.index({ createdAt: -1 });

export default mongoose.model<IShipment>("Shipment", ShipmentSchema);
