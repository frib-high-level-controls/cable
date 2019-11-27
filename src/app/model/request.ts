/*jslint es5:true*/
import * as mongoose from 'mongoose';

import * as Debug from 'debug';

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

const debug = Debug('cable:model:request');

const Schema = mongoose.Schema;
const Mixed = Schema.Types.Mixed;
const ObjectId = Schema.Types.ObjectId;

// shared configuration for request and cable schemas
const projectValues: string[] = [];
const originCategoryValues: string[] = [];
const originSubcategoryValues: string[] = [];
const signalClassificationValues: string[] = [];
const traySectionValues: string[] = [];

export function setSysSubData(sysSub: any) {
  const cats = new Set<string>();
  const subs = new Set<string>();
  const sigs = new Set<string>();
  for (const cat of  Object.keys(sysSub)) {
    cats.add(cat);
    for (const sub of Object.keys(sysSub[cat].subcategory)) {
      subs.add(sub);
      for (const sig of Object.keys(sysSub[cat].signal)) {
        sigs.add(sig);
      }
    }
  }
  // Note that this replaces the current values in the same array!
  originCategoryValues.splice(0, originCategoryValues.length, ...Array.from(cats).sort());
  debug('Origin Category values updated: [%s]', originCategoryValues);
  originSubcategoryValues.splice(0, originSubcategoryValues.length, ...Array.from(subs).sort());
  debug('Origin Subcategory values updated: [%s]', originSubcategoryValues);
  signalClassificationValues.splice(0, signalClassificationValues.length, ...Array.from(sigs).sort());
  debug('Signal Classification values updated: [%s]', signalClassificationValues);
}

export function setProjects(projs: any) {
  const values: string[] = [];
  for (const proj of projs) {
    if (proj.value) {
      values.push(String(proj.value));
    }
  }
  projectValues.splice(0, projectValues.length, ...values);
  debug('Project values updated: [%s]', projectValues);
}

export function setTraySections(traysects: any) {
  const values: string[] = [];
  for (const traysect of traysects) {
    if (traysect.value) {
      values.push(String(traysect.value));
    }
  }
  traySectionValues.splice(0, traySectionValues.length, ...values);
  debug('Tray Section values updated: [%s]', traySectionValues);
}

// request status
// 0: saved
// 1: submitted
// 2: approved
// 3: rejected

const requestSchema = new Schema({
  basic: {
    project: {
      type: String,
      validate: {
        validator: (v: any) => projectValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${projectValues.join()}]`,
      },
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
      validate: {
        validator: (v: any) => originCategoryValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${originCategoryValues.join()}]`,
      },
      required: true,
    },
    originSubcategory: {
      type: String,
      validate: {
        validator: (v: any) => originSubcategoryValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${originSubcategoryValues.join()}]`,
      },
      required: true,
    },
    signalClassification: {
      type: String,
      validate: {
        validator: (v: any) => signalClassificationValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${signalClassificationValues.join()}]`,
      },
      required: true,
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      validate: {
        validator: (v: any) => traySectionValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${traySectionValues.join()}]`,
      },
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
      validate: {
        validator: (v: any) => projectValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${projectValues.join()}]`,
      },
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
      validate: {
        validator: (v: any) => originCategoryValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${originCategoryValues.join()}]`,
      },
      required: true,
    },
    originSubcategory: {
      type: String,
      validate: {
        validator: (v: any) => originSubcategoryValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${originSubcategoryValues.join()}]`,
      },
      required: true,
    },
    signalClassification: {
      type: String,
      validate: {
        validator: (v: any) => signalClassificationValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${signalClassificationValues.join()}]`,
      },
      required: true,
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      validate: {
        validator: (v: any) => traySectionValues.includes(v),
        message: (p: any) => `Value '${p.value}' is not a member of enum [${traySectionValues.join()}]`,
      },
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
