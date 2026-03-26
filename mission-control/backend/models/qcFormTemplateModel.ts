import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

// Question type
export type QCQuestion = {
  questionId: number;
  questionText: string; // Renamed from 'question' to match frontend
  // question?: string; // Kept for backward compatibility
  // checkMethod?: string; // Optional, not in use right now
  // passCriteria?: string; // Optional, not in use right now
  order: number;
  required: boolean;
  responseType: "checkbox"; // | "text" | "number"; // removed but can be used later
  requiresImage?: boolean;
  requiresText?: boolean; // kept for backward compatibility
};

// Category type
export type QCCategory = {
  categoryId: string;
  categoryName: string;
  order: number;
  questions: QCQuestion[];
};

// Tab type
export type QCTab = {
  tabId: string;
  tabName: string;
  order: number;
  categories: QCCategory[];
};

// Header field type
export type QCHeaderField = {
  fieldId: string;
  fieldName: string;
  fieldType: "text" | "date" | "dropdown" | "number";
  required: boolean;
  options?: string[];
};

// Sign-off field type
export type QCSignOffField = {
  fieldId: string;
  fieldName: string;
  fieldType: "text" | "signature" | "textarea";
  required: boolean;
};

// Main QC Form Template interface
export interface IQCFormTemplate extends Document {
  _id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  tabs: QCTab[];
  headerFields: QCHeaderField[];
  signOffFields: QCSignOffField[];
  createdBy: IUser | string;
  updatedBy?: IUser | string;
  createdAt: Date;
  updatedAt: Date;
  totalQuestions: number; // Virtual property - calculated from tabs/categories/questions
}

// Question schema
const questionSchema = new Schema<QCQuestion>(
  {
    questionId: {
      type: Number,
      required: [true, "Question ID is required"]
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      maxlength: 500
    },
    // Alias for backward compatibility if needed, or migration
    // question: {
    //   type: String,
    //   required: false, // Made optional as we move to questionText
    //   maxlength: 500
    // },
    // checkMethod: {
    //   type: String,
    //   required: false, // Made optional for V2 simplified format
    //   maxlength: 1000
    // },
    // passCriteria: {
    //   type: String,
    //   required: false, // Made optional for V2 simplified format
    //   maxlength: 1000
    // },
    order: {
      type: Number,
      required: true
    },
    required: {
      type: Boolean,
      default: true
    },
    // NEW: Dynamic UI rendering flags
    requiresImage: {
      type: Boolean,
      default: false
    },
    requiresText: {
      type: Boolean,
      default: false
    },
    responseType: {
      type: String,
      enum: ["checkbox", "text", "number"], // Added text/number support
      default: "checkbox"
    }
  },
  { _id: false }
);

// Category schema
const categorySchema = new Schema<QCCategory>(
  {
    categoryId: {
      type: String,
      required: [true, "Category ID is required"]
    },
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      maxlength: 200
    },
    order: {
      type: Number,
      required: true
    },
    questions: {
      type: [questionSchema],
      default: []
    }
  },
  { _id: false }
);

// Tab schema
const tabSchema = new Schema<QCTab>(
  {
    tabId: {
      type: String,
      required: [true, "Tab ID is required"]
    },
    tabName: {
      type: String,
      required: [true, "Tab name is required"],
      maxlength: 100
    },
    order: {
      type: Number,
      required: true
    },
    categories: {
      type: [categorySchema],
      default: []
    }
  },
  { _id: false }
);

// Header field schema
const headerFieldSchema = new Schema<QCHeaderField>(
  {
    fieldId: {
      type: String,
      required: [true, "Field ID is required"]
    },
    fieldName: {
      type: String,
      required: [true, "Field name is required"],
      maxlength: 100
    },
    fieldType: {
      type: String,
      enum: ["text", "date", "dropdown", "number"],
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    options: {
      type: [String],
      required: false
    }
  },
  { _id: false }
);

// Sign-off field schema
const signOffFieldSchema = new Schema<QCSignOffField>(
  {
    fieldId: {
      type: String,
      required: [true, "Field ID is required"]
    },
    fieldName: {
      type: String,
      required: [true, "Field name is required"],
      maxlength: 100
    },
    fieldType: {
      type: String,
      enum: ["text", "signature", "textarea"],
      required: true
    },
    required: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

// Main QC Form Template schema
const QCFormTemplateSchema = new Schema<IQCFormTemplate>(
  {
    name: {
      type: String,
      required: [true, "Form template name is required"],
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 1000
    },
    version: {
      type: String,
      required: [true, "Version is required"],
      maxlength: 20
    },
    isActive: {
      type: Boolean,
      default: false
    },
    tabs: {
      type: [tabSchema],
      required: [true, "At least one tab is required"],
      validate: {
        validator: function (tabs: QCTab[]) {
          return tabs.length > 0;
        },
        message: "Form must have at least one tab"
      }
    },
    headerFields: {
      type: [headerFieldSchema],
      default: []
    },
    signOffFields: {
      type: [signOffFieldSchema],
      default: []
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"]
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

// Indexes
QCFormTemplateSchema.index({ isActive: 1 });
QCFormTemplateSchema.index({ version: 1 });
QCFormTemplateSchema.index({ createdAt: -1 });

// Virtual: Total question count
QCFormTemplateSchema.virtual("totalQuestions").get(function () {
  let count = 0;
  this.tabs.forEach((tab) => {
    tab.categories.forEach((category) => {
      count += category.questions.length;
    });
  });
  return count;
});

// Pre-save middleware: Ensure only one active template
QCFormTemplateSchema.pre("save", async function (next) {
  if (this.isActive) {
    // Deactivate all other templates
    await mongoose
      .model("QCFormTemplate")
      .updateMany(
        { _id: { $ne: this._id }, isActive: true },
        { $set: { isActive: false } }
      );
  }
  next();
});

// JSON transformation
QCFormTemplateSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    // Keep _id as id string
    ret.id = ret._id.toString();
  }
});

QCFormTemplateSchema.set("toObject", { virtuals: true });

export default mongoose.model<IQCFormTemplate>(
  "QCFormTemplate",
  QCFormTemplateSchema
);
