import { model, Schema } from "mongoose";

type Response = {
  date: Date;
  description: string;
  audioData?: string;
  audioDuration?: number;
};

type NextStep = {
  date: Date;
  description: string;
  audioData?: string;
  audioDuration?: number;
};

type TargetChange = { date: Date; changeReason: string };

export type ClosePlan = {
  description: string;
  audioData?: string;
  audioDuration?: number;
};

export type Lead = {
  id: string;
  stage: number;
  pipelineStage: string;
  pocName: string;
  companyName: string;
  contact: string;
  phoneNumber: string;
  email: string;
  designation: string;
  billingStatus: string;
  city: string;
  product: string;
  source: string;
  sourceDetails: string;
  category: string;
  type: string;
  acv: number;
  tcv: number;
  robotCount: number;
  closePlan: ClosePlan;
  addedBy: string;
  dateAdded: Date;
  linkedinTag: string;
  accountNotes: string;
  news: {
    summary: string;
    timestamp: number;
  };
  targetChanges: TargetChange[];
  nextSteps: NextStep[];
  responses: Response[];
  history: { [date: string]: History };
  stageHistory: StageHistoryEntry[];
};

const ResponseSchema = new Schema<Response>({
  date: {
    type: Schema.Types.Date,
    required: [true, "Date is required"]
  },
  description: {
    type: String,
    default: ""
  },
  audioData: {
    type: String,
    default: ""
  },
  audioDuration: {
    type: Number,
    default: 0
  }
});

const NextStepSchema = new Schema<NextStep>({
  date: {
    type: Schema.Types.Date,
    required: [true, "Date is required"]
  },
  description: {
    type: String,
    default: ""
  },
  audioData: {
    type: String,
    default: ""
  },
  audioDuration: {
    type: Number,
    default: 0
  }
});

const TargetChangeSchema = new Schema<TargetChange>({
  date: {
    type: Schema.Types.Date,
    required: [true, "Date is required"]
  },
  changeReason: {
    type: String
  }
});

const ClosePlanSchema = new Schema<ClosePlan>({
  description: {
    type: String,
    default: ""
  },
  audioData: {
    type: String,
    default: ""
  },
  audioDuration: {
    type: Number,
    default: 0
  }
});

export type History = {
  acv: number;
  tcv: number;
  robotCount: number;
  stage: number;
  product: string;
};

const HistorySchema = new Schema<History>({
  acv: {
    type: Number,
    required: [true, "ACV is required"]
  },
  tcv: {
    type: Number,
    required: [true, "TCV is required"]
  },
  robotCount: {
    type: Number,
    required: [true, "Robot count is required"]
  },
  stage: {
    type: Number,
    required: [true, "Stage is required"]
  },
  product: {
    type: String,
    required: [true, "Product is required"]
  }
});

// Stage history tracking
export interface StageHistoryEntry {
  date: Date;
  previousStage?: number;
  newStage: number;
  previousPipelineStage?: string;
  newPipelineStage?: string;
  changedBy?: string;
}

const StageHistorySchema = new Schema<StageHistoryEntry>(
  {
    date: {
      type: Schema.Types.Date,
      required: [true, "Date is required"]
    },
    previousStage: {
      type: Number
    },
    newStage: {
      type: Number,
      required: [true, "New stage is required"]
    },
    previousPipelineStage: {
      type: String
    },
    newPipelineStage: {
      type: String
    },
    changedBy: {
      type: String,
      ref: "User"
    }
  },
  {
    _id: false
  }
);

const LeadsSchema = new Schema<Lead>(
  {
    pocName: {
      type: String,
      required: [true, "Lead name is required"]
    },
    companyName: {
      type: String,
      required: [true, "Organisation name is required"]
    },
    city: {
      type: String,
      required: [true, "Location is required"]
    },
    stage: {
      type: Number
    },
    pipelineStage: {
      type: String
    },
    contact: {
      type: String
    },
    phoneNumber: {
      type: String
    },
    email: {
      type: String
    },
    designation: {
      type: String
    },
    billingStatus: {
      type: String
    },
    product: {
      type: String
    },
    source: {
      type: String
    },
    sourceDetails: {
      type: String
    },
    category: {
      type: String
    },
    type: {
      type: String
    },
    acv: {
      type: Number
    },
    tcv: {
      type: Number
    },
    robotCount: {
      type: Number
    },
    dateAdded: {
      type: Schema.Types.Date
    },
    addedBy: {
      type: String,
      ref: "User"
    },
    closePlan: {
      type: ClosePlanSchema,
      default: null
    },
    linkedinTag: {
      type: String
    },
    accountNotes: {
      type: String,
      default: ""
    },
    news: {
      summary: {
        type: String
      },
      timestamp: {
        type: Number
      }
    },
    nextSteps: [NextStepSchema],
    responses: [ResponseSchema],
    targetChanges: [TargetChangeSchema],
    history: {
      type: Map,
      of: HistorySchema,
      default: {}
    },
    stageHistory: {
      type: [StageHistorySchema],
      default: []
    }
  },
  { timestamps: true }
);

// Performance indexes for CRM queries
// For pipeline view (filtering by stage)
LeadsSchema.index({ stage: 1 });

// For "my leads" view (user's leads sorted by date added)
LeadsSchema.index({ addedBy: 1, dateAdded: -1 });

// For company name search
LeadsSchema.index({ companyName: 1 });

// For regional analytics (leads by city and stage)
LeadsSchema.index({ city: 1, stage: 1 });

// For email-based lookups
LeadsSchema.index({ email: 1 });

const leadsModel = model("leads", LeadsSchema);
export default leadsModel;
