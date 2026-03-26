import mongoose, { Schema, Document } from "mongoose";
import { Robot } from "./robotModel";
import { ClientData } from "./clientModel";

export interface SenderInfo {
  id: string;
  name: string;
}

const SenderInfoSchema = new Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);
export interface ThreadData extends Document {
  message: string;
  senderInfo: SenderInfo;
  attachments: boolean;
  id: number;
}

export interface IssueData extends Document {
  id: string;
  title: string;
  robot: Robot;
  client: ClientData;
  status: "open" | "pending" | "closed";
  raisedOnTimestamp: number;
  startTimestamp: number;
  closeTimestamp?: number;
  solution?: string;
  thread: ThreadData[];
  typeOfIssue: "mechanical"| "electrical"| "downtime"| "observation"| "other";
  issueSubCategory?: string;

}

const IssueThreadSchema = new Schema<ThreadData>(
  {
    id: {
      type: Number,
      required: [true, "Message ID is required"]
    },
    message: {
      type: String,
      required: [true, "Message is required"]
    },
    senderInfo: {
      type: SenderInfoSchema,
      required: [true, "Sender name is required"]
    },
    attachments: {
      type: Boolean,
      required: [true, "Attachments are required"]
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

const IssueSchema: Schema = new Schema<IssueData>(
  {
    title: {
      type: String,
      required: [true, "Please add the issue"]
    },
    robot: {
      type: String,
      ref: "Robot",
      required: [true, "Please add ID of the robot"]
    },
    client: {
      type: String,
      ref: "Client",
      required: [true, "Please add ID of the client"]
    },
    raisedOnTimestamp: {
      type: Number,
      required: [true, "Please add the start time of the issue"]
    },
    startTimestamp: {
      type: Number,
      required: [true, "Please add the start time of the issue"]
    },
    closeTimestamp: {
      type: Number
    },
    solution: {
      type: String
    },
    status: {
      type: String,
      default: "open",
      required: [true, "Please add the issue status"]
    },
    typeOfIssue: { 
      type: String, 
      default: 'other' ,
      required: [true, "Please add the issue type"]
    },
    issueSubCategory: {
      type: String,
      default: ""
    },
    thread: [IssueThreadSchema]
  },
  {
    timestamps: true
  }
);
IssueSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
IssueSchema.set("toObject", { virtuals: true });

// Performance indexes for common issue queries
// For robot issue board (showing robot's issues filtered by status)
IssueSchema.index({ robot: 1, status: 1 });

// For recent issues feed (sorted by when they were raised)
IssueSchema.index({ raisedOnTimestamp: -1 });

// For critical alerts dashboard (e.g., open mechanical issues)
IssueSchema.index({ typeOfIssue: 1, status: 1 });

// For client issue tracking
IssueSchema.index({ client: 1, status: 1 });

// Export the model and return your Client interface
export default mongoose.model<IssueData>("Issue", IssueSchema);
