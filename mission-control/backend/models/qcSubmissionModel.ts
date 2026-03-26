import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

// Answer type
export type QCAnswer = {
  questionId: number;
  tabId: string;
  categoryId: string;
  status: "passed" | "repaired" | "replaced" | null;
  remarks?: string;
  imageUrls?: string[]; // Array of S3/Azure image URLs
  textResponse?: string; // For text-based questions (e.g., "What is the weight recorded?")
};

// Edit history entry
export type QCEditHistory = {
  editedBy: IUser | string;
  editedAt: Date;
  changes: string; // JSON string of changes
};

// Main QC Submission interface
export interface IQCSubmission extends Document {
  _id: string;
  robotId: string;
  submittedBy: IUser | string;
  submittedAt?: Date;
  status: "draft" | "submitted" | "approved";

  // Dynamic metadata based on template header fields
  metadata: Record<string, any>;

  // Answers array
  answers: QCAnswer[];

  // Dynamic sign-off data based on template sign-off fields
  signOff: Record<string, any>;

  // Completion tracking
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;

  // Audit trail
  history: QCEditHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// Answer schema
const answerSchema = new Schema<QCAnswer>(
  {
    questionId: {
      type: Number,
      required: [true, "Question ID is required"]
    },
    tabId: {
      type: String,
      required: [true, "Tab ID is required"]
    },
    categoryId: {
      type: String,
      required: [true, "Category ID is required"]
    },
    status: {
      type: String,
      enum: ["passed", "repaired", "replaced", null],
      default: null
    },
    remarks: {
      type: String,
      maxlength: 500
    },
    imageUrls: {
      type: [String],
      default: []
    },
    textResponse: {
      type: String,
      maxlength: 1000
    }
  },
  { _id: false }
);

// Edit history schema
const editHistorySchema = new Schema<QCEditHistory>(
  {
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

// Main QC Submission schema
const QCSubmissionSchema = new Schema<IQCSubmission>(
  {
    robotId: {
      type: String,
      ref: "Robot",
      required: [true, "Robot ID is required"]
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitter is required"]
    },
    submittedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved"],
      default: "draft"
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    answers: {
      type: [answerSchema],
      default: []
    },
    signOff: {
      type: Schema.Types.Mixed,
      default: {}
    },
    totalQuestions: {
      type: Number,
      required: [true, "Total questions count is required"],
      min: [1, "Total questions must be at least 1"]
    },
    answeredQuestions: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    history: {
      type: [editHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast queries
QCSubmissionSchema.index({ robotId: 1, submittedAt: -1 });
QCSubmissionSchema.index({ submittedBy: 1 });
QCSubmissionSchema.index({ status: 1 });
QCSubmissionSchema.index({ createdAt: -1 });

// Virtual: Pass rate percentage
QCSubmissionSchema.virtual("passRate").get(function () {
  if (this.answeredQuestions === 0) return 0;

  // Handle case where answers is excluded via .select()
  if (!this.answers || !Array.isArray(this.answers)) return 0;

  const passedCount = this.answers.filter(
    (answer) => answer.status === "passed"
  ).length;

  return Math.round((passedCount / this.answeredQuestions) * 100);
});

// Pre-save middleware: Calculate completion stats
QCSubmissionSchema.pre("save", function (next) {
  // Remove duplicate answers (keep only the latest answer for each questionId)
  const uniqueAnswersMap = new Map();
  this.answers.forEach((answer) => {
    uniqueAnswersMap.set(answer.questionId, answer);
  });
  this.answers = Array.from(uniqueAnswersMap.values());

  // Count answered questions (non-null status)
  this.answeredQuestions = this.answers.filter(
    (answer) => answer.status !== null
  ).length;

  // Calculate completion percentage
  if (this.totalQuestions > 0) {
    const rawPercentage = (this.answeredQuestions / this.totalQuestions) * 100;
    // Clamp to 0-100 range to prevent validation errors (handles edge cases like duplicate answers)
    this.completionPercentage = Math.min(
      100,
      Math.max(0, Math.round(rawPercentage))
    );
  } else {
    // If totalQuestions is 0 or invalid, set to 0 to prevent NaN/Infinity
    this.completionPercentage = 0;
  }

  // Set submittedAt timestamp when status changes to submitted
  if (this.status === "submitted" && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  next();
});

// JSON transformation
QCSubmissionSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    // Only transform _id if it exists (subdocuments like answers/history don't have _id)
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  }
});

QCSubmissionSchema.set("toObject", { virtuals: true });

export default mongoose.model<IQCSubmission>(
  "QCSubmission",
  QCSubmissionSchema
);
