import mongoose, { Schema } from "mongoose";
import { IUser } from "./userModel";
import { AppUser } from "./appUserModel";

export type Gps = {
  timestamp: number;
  latitude: number;
  longitude: number;
  baseStationId?: string;
};

const gpsSchema: Schema = new Schema(
  {
    latitude: {
      type: Schema.Types.Number,
      required: true
    },
    longitude: {
      type: Schema.Types.Number,
      required: true
    },
    baseStationId: {
      type: Schema.Types.String,
      required: false
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

export type Maintenance = {
  schedule: number[];
  lastMaintenance: number;
};

const maintenanceSchema = new Schema<Maintenance>(
  {
    schedule: {
      type: [{ type: Schema.Types.Number }],
      required: true
    },
    lastMaintenance: {
      type: Schema.Types.Number,
      required: true
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

export type ManufacturingData = {
  manufacturingPartner?: string;
  manufacturingPartnerOther?: string;
  manufacturingDate?: Date;
  shippingDate?: Date;
  dataCollection?: boolean;
  invoicingStatus?: string;
  features?: string;
  additionalInputs?: string;
  manufacturingStatus?: ManufacturingStatus;
  statusHistory?: StatusHistoryEntry[];
  partsConsumed?: PartsConsumedRecord[];
  bomCompletionStatus?: 'complete' | 'incomplete'; // NEW: Track if all parts are recorded
};

export type ManufacturingStatus =
  | 'created' | 'manufacturing' | 'manufactured'
  | 'qc_pending' | 'qc_approved' | 'deployed';

export type StatusHistoryEntry = {
  status: ManufacturingStatus;
  changedAt: Date;
  changedBy: mongoose.Types.ObjectId | string;
};

export type PartsConsumedRecord = {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  source: 'Flo' | 'GKX' | 'Abhirup'; // NEW: Track where part came from
  consumedAt: Date;
  consumedBy: mongoose.Types.ObjectId | string;
  purpose: 'electrical' | 'mechanical';
  inventoryStatus?: 'sufficient' | 'insufficient' | 'external'; // Track inventory status for Flo parts
};

const manufacturingDataSchema = new Schema<ManufacturingData>(
  {
    manufacturingPartner: {
      type: String,
      enum: ['GKX Engineering', 'Abhirup Technologies', 'Flo Mobility', 'Others'],
      required: false
    },
    manufacturingPartnerOther: {
      type: String,
      required: false
    },
    manufacturingDate: {
      type: Date,
      required: false
    },
    shippingDate: {
      type: Date,
      required: false
    },
    dataCollection: {
      type: Boolean,
      default: false,
      required: false
    },
    invoicingStatus: {
      type: String,
      maxlength: 500,
      required: false
    },
    features: {
      type: String,
      maxlength: 2000,
      required: false
    },
    additionalInputs: {
      type: String,
      maxlength: 2000,
      required: false
    },
    manufacturingStatus: {
      type: String,
      enum: ['created', 'manufacturing', 'manufactured', 'qc_pending', 'qc_approved', 'deployed'],
      default: 'created',
      index: true
    },
    statusHistory: [{
      status: String,
      changedAt: Date,
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    partsConsumed: [{
      itemId: String,
      name: String,
      quantity: Number,
      unit: String,
      source: { type: String, enum: ['Flo', 'GKX', 'Abhirup'] },
      consumedAt: Date,
      consumedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      purpose: String,
      inventoryStatus: { type: String, enum: ['sufficient', 'insufficient', 'external'] }
    }],
    bomCompletionStatus: {
      type: String,
      enum: ['complete', 'incomplete'],
      default: 'incomplete'
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Task History Entry
export type TaskHistoryEntry = {
  date: Date;
  changedBy: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
};

const taskHistorySchema = new Schema<TaskHistoryEntry>(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    changedBy: {
      type: String,
      ref: "User",
      required: true
    },
    field: {
      type: String,
      required: true
    },
    oldValue: {
      type: String,
      required: false
    },
    newValue: {
      type: String,
      required: false
    },
    comment: {
      type: String,
      required: false
    }
  },
  {
    _id: false
  }
);

// Task Type
export type Task = {
  _id?: string;
  title: string;
  description?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Manufacturing' | 'Motor' | 'Issue' | 'General' | 'Maintenance';
  createdBy: string;
  assignedTo?: string;
  createdDate: Date;
  dueDate?: Date;
  completedDate?: Date;
  history: TaskHistoryEntry[];
};

const taskSchema = new Schema<Task>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 2000,
      required: false
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
      required: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      required: true
    },
    category: {
      type: String,
      enum: ['Manufacturing', 'Motor', 'Issue', 'General', 'Maintenance'],
      default: 'General',
      required: true
    },
    createdBy: {
      type: String,
      ref: "User",
      required: true
    },
    assignedTo: {
      type: String,
      ref: "User",
      required: false
    },
    createdDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: false
    },
    completedDate: {
      type: Date,
      required: false
    },
    history: {
      type: [taskHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Battery and Motor Data Type
export type BatteryMotorData = {
  // Battery Information
  batteryId?: string; // Autogenerated: BAT<sequence>
  batteryCode?: string;
  batterySerialNo?: string;
  batteryType?: string; // e.g., Micronix LFP, Inverted LFP (include make, model, vendor)
  bluetoothConnectionSerialNo?: string;
  batteryIdDropdown?: string; // Dropdown from battery code field
  floStackId?: string;

  // Motor Information
  motorType?: string;
  motorModel?: string;
  motorSerialNumber?: string;
  motorId?: string;
};

const motorDataSchema = new Schema<BatteryMotorData>(
  {
    // Battery fields
    batteryId: {
      type: String,
      maxlength: 100,
      required: false
    },
    batteryCode: {
      type: String,
      maxlength: 100,
      required: false
    },
    batterySerialNo: {
      type: String,
      maxlength: 100,
      required: false
    },
    batteryType: {
      type: String,
      maxlength: 200,
      required: false
    },
    bluetoothConnectionSerialNo: {
      type: String,
      maxlength: 100,
      required: false
    },
    batteryIdDropdown: {
      type: String,
      maxlength: 100,
      required: false
    },
    floStackId: {
      type: String,
      maxlength: 100,
      required: false
    },
    // Motor fields
    motorType: {
      type: String,
      enum: ['Brushed DC', 'Brushless DC', 'Stepper', 'Servo', 'AC Induction'],
      required: false
    },
    motorModel: {
      type: String,
      maxlength: 100,
      required: false
    },
    motorSerialNumber: {
      type: String,
      maxlength: 100,
      required: false
    },
    motorId: {
      type: String,
      maxlength: 100,
      required: false
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

// Legacy type alias for backward compatibility
export type MotorData = BatteryMotorData;

// ============================================================================
// SNAPSHOT TYPES - Pre-stored denormalized data for faster queries
// These are updated on specific events instead of querying at runtime
// ============================================================================

// Operator Snapshot - Updated when operator is assigned/changed or checks in
export type OperatorSnapshot = {
  id: string;
  name: string;
  phoneNumber: string;
  checkedInToday: boolean;
  lastCheckInTime?: Date;
};

const operatorSnapshotSchema = new Schema<OperatorSnapshot>(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    checkedInToday: {
      type: Boolean,
      default: false
    },
    lastCheckInTime: {
      type: Date,
      required: false
    }
  },
  {
    _id: false
  }
);

// Client Snapshot - Updated when operator is assigned (copies operator's client)
export type ClientSnapshot = {
  id: string;
  name: string;
  location?: {
    lat: number;
    lng: number;
  };
  operatingHours?: number;
};

const clientSnapshotSchema = new Schema<ClientSnapshot>(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    location: {
      type: {
        lat: Number,
        lng: Number
      },
      required: false
    },
    operatingHours: {
      type: Number,
      required: false
    }
  },
  {
    _id: false
  }
);

// Fleet Snapshot - Updated when fleet is assigned to robot
export type FleetSnapshot = {
  id: string;
  name: string;
  prefix: string;
  modelVersion?: string;
  qcTemplateId?: string;
};

const fleetSnapshotSchema = new Schema<FleetSnapshot>(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    prefix: {
      type: String,
      required: true
    },
    modelVersion: {
      type: String,
      required: false
    },
    qcTemplateId: {
      type: String,
      required: false
    }
  },
  {
    _id: false
  }
);

// Battery History Entry
export type BatteryHistoryEntry = {
  batteryId: string;
  batteryCode: string;
  batterySerialNo: string;
  batteryType: string;
  bluetoothSerialNo: string;
  installationDate: Date;
  removalDate: Date;
  swapReason?: string;
  swappedBy: string;
};

const batteryHistorySchema = new Schema<BatteryHistoryEntry>(
  {
    batteryId: {
      type: String,
      required: true
    },
    batteryCode: {
      type: String,
      required: false
    },
    batterySerialNo: {
      type: String,
      required: false
    },
    batteryType: {
      type: String,
      required: false
    },
    bluetoothSerialNo: {
      type: String,
      required: false
    },
    installationDate: {
      type: Date,
      required: true
    },
    removalDate: {
      type: Date,
      required: true
    },
    swapReason: {
      type: String,
      maxlength: 500,
      required: false
    },
    swappedBy: {
      type: String,
      ref: "User",
      required: true
    }
  },
  {
    _id: false
  }
);

// Current Battery Data
export type CurrentBattery = {
  batteryId: string;
  batteryCode?: string;
  batterySerialNo?: string;
  batteryType?: string;
  bluetoothSerialNo?: string;
  installationDate: Date;
};

const currentBatterySchema = new Schema<CurrentBattery>(
  {
    batteryId: {
      type: String,
      required: true
    },
    batteryCode: {
      type: String,
      required: false
    },
    batterySerialNo: {
      type: String,
      required: false
    },
    batteryType: {
      type: String,
      required: false
    },
    bluetoothSerialNo: {
      type: String,
      required: false
    },
    installationDate: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

export type Robot = {
  _id: string;
  id: string;
  robotType: 'autonomous' | 'manual'; // Type of robot - determines capabilities
  macAddress?: string;
  password: string;
  fleet?: string;
  image?: string;
  desc?: string;
  name: string;
  owner: IUser;
  status?: string;
  access: boolean;
  expiry: Date;
  users?: IUser[];
  appUsers?: AppUser[];
  activeOperator?: AppUser; // Single active operator currently working with the robot
  config?: any;
  maintenance?: Maintenance;
  manufacturingData?: ManufacturingData;
  motorData?: MotorData;
  tasks?: Task[];
  currentBattery?: CurrentBattery;
  batteryHistory?: BatteryHistoryEntry[];
  gps: Gps;

  // ============================================================================
  // SNAPSHOT FIELDS - Pre-stored denormalized data for faster Master Data queries
  // ============================================================================
  operatorSnapshot?: OperatorSnapshot;  // Updated on operator assignment/check-in
  clientSnapshot?: ClientSnapshot;      // Updated on operator assignment
  fleetSnapshot?: FleetSnapshot;        // Updated on fleet assignment
  openIssuesCount: number;              // Updated on issue raise/close
  yesterdayTripCount: number;           // Updated daily via scheduled job

  // Mongoose timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

const RobotSchema: Schema = new Schema<Robot>(
  {
    _id: {
      type: Schema.Types.String,
      required: [true, "Please add Robot ID"]
    },
    robotType: {
      type: String,
      enum: ['autonomous', 'manual'],
      required: false,
      default: 'manual'
    },
    fleet: {
      type: Schema.Types.ObjectId,
      ref: "Fleet",
      required: [false, "Please select robot's Fleet type"]
    },
    macAddress: {
      type: Schema.Types.String,
      required: false,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Allow empty/null values
          // Validate normalized MAC address format: exactly 12 uppercase hex characters
          return /^[0-9A-F]{12}$/.test(v);
        },
        message: 'MAC address must be 12 uppercase hexadecimal characters (e.g., 6825DDCE1A28)'
      }
    },
    password: {
      type: String,
      required: [true, "Please add password"]
    },
    name: {
      type: String,
      required: [true, "Please add name"]
    },
    status: {
      type: String,
      required: false
    },
    desc: {
      type: String,
      required: false
    },
    image: {
      type: String,
      required: false
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please add robot's owner"]
    },
    access: {
      type: Boolean,
      required: true
    },
    expiry: {
      type: Schema.Types.Date,
      required: true
    },
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      required: false
    },
    appUsers: {
      type: [{ type: Schema.Types.ObjectId, ref: "AppUser" }],
      required: false
    },
    activeOperator: {
      type: Schema.Types.ObjectId,
      ref: "AppUser",
      required: false
    },
    config: {
      type: Schema.Types.Mixed,
      required: false
    },
    maintenance: {
      type: maintenanceSchema,
      required: false
    },
    manufacturingData: {
      type: manufacturingDataSchema,
      required: false
    },
    motorData: {
      type: motorDataSchema,
      required: false
    },
    tasks: {
      type: [taskSchema],
      default: []
    },
    currentBattery: {
      type: currentBatterySchema,
      required: false
    },
    batteryHistory: {
      type: [batteryHistorySchema],
      default: []
    },
    gps: {
      type: gpsSchema,
      required: false
    },

    // ============================================================================
    // SNAPSHOT FIELDS - Pre-stored denormalized data for faster Master Data queries
    // ============================================================================
    operatorSnapshot: {
      type: operatorSnapshotSchema,
      required: false
    },
    clientSnapshot: {
      type: clientSnapshotSchema,
      required: false
    },
    fleetSnapshot: {
      type: fleetSnapshotSchema,
      required: false
    },
    openIssuesCount: {
      type: Number,
      default: 0
    },
    yesterdayTripCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);
RobotSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign
    delete ret._id;
  }
});
RobotSchema.set("toObject", { virtuals: true });

// Performance indexes for common queries
// For MAC address lookup (robot authentication via MQTT)
RobotSchema.index({ macAddress: 1 }, { unique: true, sparse: true });

// For fleet-based queries (fleet dashboard)
RobotSchema.index({ fleet: 1 });

// For manufacturing status
RobotSchema.index({ "manufacturingData.manufacturingStatus": 1 });


// For operator->robots lookup (operator dashboard)
RobotSchema.index({ appUsers: 1 });

// For active operator lookup (master data queries)
RobotSchema.index({ activeOperator: 1 });

// For admin->robots lookup (admin panel)
RobotSchema.index({ users: 1 });

// For access control checks (compound index)
RobotSchema.index({ access: 1, expiry: 1 });

// For finding recent robot locations (tracking dashboard)
RobotSchema.index({ "gps.timestamp": -1 });

// Export the model and return your Robot interface
export default mongoose.model<Robot>("Robot", RobotSchema);
