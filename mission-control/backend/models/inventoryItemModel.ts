import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

// Transaction history entry
export interface ITransaction {
  type: "add" | "remove" | "adjustment";
  quantity: number;
  previousQty: number;
  newQty: number;
  date: Date;
  performedBy: IUser | string;
  notes?: string;
  vendorRef?: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: {
      type: String,
      enum: ["add", "remove", "adjustment"],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousQty: {
      type: Number,
      required: true
    },
    newQty: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    notes: {
      type: String,
      maxlength: 500
    },
    vendorRef: {
      type: String
    }
  },
  { _id: false }
);

// Vendor information
export interface IVendor {
  name: string;
  orderLink?: string;
  credentials?: {
    username?: string;
    password?: string;
  };
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  orderDate: Date;
  expectedArrivalDate: Date;
  actualArrivalDate?: Date;
  orderNumber?: string;
  notes?: string;
}

const vendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"]
    },
    orderLink: {
      type: String,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          // Basic URL validation
          return /^https?:\/\/.+/.test(v);
        },
        message: "Please enter a valid URL"
      }
    },
    credentials: {
      username: String,
      password: String // TODO: Consider encryption in production
    },
    contactPerson: String,
    phoneNumber: {
      type: String,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          // Basic phone validation (supports international formats)
          return /^[\d\s+()-]+$/.test(v);
        },
        message: "Please enter a valid phone number"
      }
    },
    email: {
      type: String,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Please enter a valid email"
      }
    },
    orderDate: {
      type: Date,
      required: [true, "Order date is required"]
    },
    expectedArrivalDate: {
      type: Date,
      required: [true, "Expected arrival date is required"]
    },
    actualArrivalDate: Date,
    orderNumber: String,
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  { _id: false }
);

// Main InventoryItem interface
export interface IInventoryItem extends Document {
  itemId: string;
  name: string;
  category: "mechanical" | "electronics";
  quantity: number;
  unit: string;
  description?: string;
  location?: string;
  minStockLevel?: number;
  vendor: IVendor;
  transactions: ITransaction[];
  createdBy: IUser | string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema = new Schema<IInventoryItem>(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: 200
    },
    category: {
      type: String,
      enum: ["mechanical", "electronics"],
      required: [true, "Category is required"]
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0,
      default: 0
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      enum: ["pieces", "meters", "kilograms", "liters", "sets", "boxes"]
    },
    description: {
      type: String,
      maxlength: 1000
    },
    location: {
      type: String,
      maxlength: 200
    },
    minStockLevel: {
      type: Number,
      min: 0
    },
    vendor: {
      type: vendorSchema,
      required: [true, "Vendor information is required"]
    },
    transactions: {
      type: [transactionSchema],
      default: []
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual for stock status
InventoryItemSchema.virtual("stockStatus").get(function () {
  if (this.quantity === 0) return "out-of-stock";
  if (this.minStockLevel && this.quantity <= this.minStockLevel) {
    return "low-stock";
  }
  return "in-stock";
});

// Virtual for delivery status
InventoryItemSchema.virtual("deliveryStatus").get(function () {
  if (this.vendor.actualArrivalDate) {
    return "delivered";
  }
  const today = new Date();
  const expectedDate = new Date(this.vendor.expectedArrivalDate);
  if (expectedDate < today) {
    return "overdue";
  }
  return "pending";
});

// JSON transformation
InventoryItemSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  }
});
InventoryItemSchema.set("toObject", { virtuals: true });

// Indexes for performance
InventoryItemSchema.index({ itemId: 1 }, { unique: true });
InventoryItemSchema.index({ category: 1 });
InventoryItemSchema.index({ name: "text" }); // Text search
InventoryItemSchema.index({ quantity: 1 });
InventoryItemSchema.index({ "vendor.orderDate": -1 });
InventoryItemSchema.index({ "vendor.expectedArrivalDate": 1 });

export default mongoose.model<IInventoryItem>(
  "InventoryItem",
  InventoryItemSchema
);
