/*jslint es5:true*/
import * as mongoose from 'mongoose';

export interface ICableRequest {
  basic: {
    project: string;
    engineer?: string;
    wbs: string;
    originCategory: string;
    originSubcategory: string;
    signalClassification: string;
    cableType?: string,
    service?: string,
    traySection?: string;
    tags?: string[];
    quantity: number;
  };

  from: {
    rack?: string;
    terminationDevice?: string,
    terminationType?: string,
    terminationPort?: string,
    wiringDrawing?: string,
    label?: string,
  };

  to: {
    rack?: string;
    terminationDevice?: string;
    terminationType?: string;
    terminationPort?: string;
    wiringDrawing?: string;
    label?: string;
  };

  required?: {
    label?: boolean;
    benchTerm?: boolean;
    benchTest?: boolean;
    fieldTerm?: boolean;
  };

  ownerProvided: boolean;

  length?: number;
  conduit?: string;
  routing?: Array<{}>;

  comments?: string;
  status?: number;
  createdBy?: string;
  createdOn?: Date;
  updatedBy?: string;
  updatedOn?: Date;
  submittedBy?: string;
  submittedOn?: Date;
  revertedBy?: string;
  revertedOn?: Date;
  approvedBy?: string;
  approvedOn?: Date;
  rejectedBy?: string;
  rejectedOn?: Date;
}

export interface CableRequest extends ICableRequest, mongoose.Document {
  // nothing extra now
}

export interface ICable {
  request_id: string;
  number: string;
  status: number;
  ownerProvided: boolean;

  basic: {
    project: string;
    engineer?: string;
    wbs: string;
    originCategory: string;
    originSubcategory: string;
    signalClassification: string;
    cableType?: string;
    service?: string;
    traySection: string;
    tags: string[];
  };

  from: {
    rack?: string,
    terminationDevice?: string;
    terminationType?: string;
    terminationPort?: string;
    wiringDrawing?: string;
    label?: string;
    readyForTerm?: boolean;
    terminatedBy?: string;
    terminatedOn?: Date;
  };

  to: {
    rack?: string;
    terminationDevice?: string;
    terminationType?: string;
    terminationPort?: string;
    wiringDrawing?: string;
    label?: string;
    readyForTerm?: boolean;
    terminatedBy?: string;
    terminatedOn?: Date;
  };

  required?: {
    label?: boolean;
    benchTerm?: boolean;
    benchTest?: boolean;
    fieldTerm?: boolean;
  };

  length?: number;
  conduit?: string;
  routing?: Array<{}>;

  comments?: string;
  submittedBy?: string;
  submittedOn?: Date;
  approvedBy?: string;
  approvedOn?: Date;
  updatedOn?: Date;
  updatedBy?: string;
  obsoletedOn?: Date;
  obsoletedBy?: string;
  orderedBy?: string;
  orderedOn?: Date;
  receivedBy?: string;
  receivedOn?: Date;
  acceptedBy?: string;
  acceptedOn?: Date;
  labeledBy?: string;
  labeledOn?: Date;
  benchTerminatedBy?: string;
  benchTerminatedOn?: Date;
  benchTestedBy?: string;
  benchTestedOn?: Date;
  pulledBy?: string;
  pulledOn?: Date;
  fieldTerminatedBy?: string;
  fieldTerminatedOn?: Date;
  fieldTestedBy?: string;
  fieldTestedOn?: Date;
  installedBy?: string;
  installedOn?: Date;
  changeHistory: mongoose.Types.ObjectId[];
}

export interface Cable extends ICable, mongoose.Document {
  // nothing extra now
}

export interface IChange {
  cableName?: string;
  property?: string;
  oldValue?: {} | null;
  newValue?: {};
  updatedBy?: string;
  updatedOn?: Date;
}

export interface Change extends IChange, mongoose.Document {
  // nothing extra now
}

export interface IUpdate {
  property?: string;
  oldValue?: {} | null;
  newValue?: {};
}

export interface Update extends IUpdate, mongoose.Document {
  // nothing extra now
}

export interface IMultiChange {
  cableName?: string;
  updates?: IUpdate[];
  updatedBy?: string;
  updatedOn?: Date;
}

export interface MultiChange extends IMultiChange, mongoose.Document {
  // nothing extra now
}

const Schema = mongoose.Schema;
const Mixed = Schema.Types.Mixed;
const ObjectId = Schema.Types.ObjectId;

// shared configuration for request and cable schemas
const projectValues = ['FRIB', 'REA', 'SECAR', 'BECOLA', 'SRFHB', 'BUSINESS'];
const originCategoryValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B'];
const originSubcategoryValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const signalClassificationValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'];
const traySectionValues = ['HPRF', 'DC', 'VLLS', 'LLS', 'HVDC', 'MLS', 'AC', 'MV-AC', 'REF', 'PPS', 'N/A'];

// request status
// 0: saved
// 1: submitted
// 2: approved
// 3: rejected

const requestSchema = new Schema({
  basic: {
    project: {
      type: String,
      enum: projectValues,
      uppercase: true,
      required: true,
    },
    engineer: String,
    wbs: {
      type: String,
      required: true,
    },
    originCategory: {
      type: String,
      enum: originCategoryValues,
      required: true,
    },
    originSubcategory: {
      type: String,
      enum: originSubcategoryValues,
      required: true,
    },
    signalClassification: {
      type: String,
      enum: signalClassificationValues,
      required: true,
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      enum: traySectionValues,
    },
    tags: [String],
    quantity: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },
  },

  from: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String,
  },

  to: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String,
  },

  required: {
    label: Boolean,
    benchTerm: Boolean,
    benchTest: Boolean,
    fieldTerm: Boolean,
  },

  ownerProvided: {
    type: Boolean,
    default: false,
  },

  length: Number,
  conduit: String,
  routing: [Mixed],

  comments: String,
  status: {
    type: Number,
    index: true,
  },
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
  submittedBy: String,
  submittedOn: Date,
  revertedBy: String,
  revertedOn: Date,
  approvedBy: String,
  approvedOn: Date,
  rejectedBy: String,
  rejectedOn: Date,
});

// cable status
// procuring
//   100: approved
//   101: ordered
//   102: received
//   103: accepted
// installing
//   200: ready for installation
//   201: labeled
//   202: bench terminated
//   203: bench tested
//   249: ready for pulled
//   250: pulled
//   251: field terminated
//   252: field tested
// working: 3xx
//   300: installed
// failed: 4xx
// obsoleted: 5xx
//   501: not needed

const cableSchema = new Schema({
  request_id: String,
  number: {
    type: String,
    index: true,
    unique: true,
  },
  status: {
    type: Number,
    index: true,
  },
  ownerProvided: {
    type: Boolean,
    default: false,
  },
  basic: {
    project: {
      type: String,
      enum: projectValues,
      uppercase: true,
      required: true,
    },
    engineer: String,
    wbs: {
      type: String,
      required: true,
    },
    originCategory: {
      type: String,
      enum: originCategoryValues,
      required: true,
    },
    originSubcategory: {
      type: String,
      enum: originSubcategoryValues,
      required: true,
    },
    signalClassification: {
      type: String,
      enum: signalClassificationValues,
      required: true,
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      enum: traySectionValues,
    },
    tags: [String],
  },

  from: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String,
    readyForTerm: Boolean,
    terminatedBy: String,
    terminatedOn: Date,
  },

  to: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String,
    readyForTerm: Boolean,
    terminatedBy: String,
    terminatedOn: Date,
  },

  required: {
    label: Boolean,
    benchTerm: Boolean,
    benchTest: Boolean,
    fieldTerm: Boolean,
  },

  length: Number,
  conduit: String,
  routing: [Mixed],

  comments: String,
  submittedBy: String,
  submittedOn: Date,
  approvedBy: String,
  approvedOn: Date,
  updatedOn: Date,
  updatedBy: String,
  obsoletedOn: Date,
  obsoletedBy: String,
  orderedBy: String,
  orderedOn: Date,
  receivedBy: String,
  receivedOn: Date,
  acceptedBy: String,
  acceptedOn: Date,
  labeledBy: String,
  labeledOn: Date,
  benchTerminatedBy: String,
  benchTerminatedOn: Date,
  benchTestedBy: String,
  benchTestedOn: Date,
  pulledBy: String,
  pulledOn: Date,
  fieldTerminatedBy: String,
  fieldTerminatedOn: Date,
  fieldTestedBy: String,
  fieldTestedOn: Date,
  installedBy: String,
  installedOn: Date,
  changeHistory: [ObjectId],
});

const changeSchema = new Schema({
  cableName: String,
  property: String,
  oldValue: Mixed,
  newValue: Mixed,
  updatedBy: String,
  updatedOn: Date,
});

const updateSchema = new Schema({
  property: String,
  oldValue: Mixed,
  newValue: Mixed,
});

const multiChangeSchema = new Schema({
  cableName: String,
  updates: [updateSchema],
  updatedBy: String,
  updatedOn: Date,
});

export const CableRequest = mongoose.model<CableRequest>('Request', requestSchema);
export const Cable = mongoose.model<Cable>('Cable', cableSchema);
export const Change = mongoose.model<Change>('Change', changeSchema);
export const MultiChange = mongoose.model<MultiChange>('MultiChange', multiChangeSchema);
