/*jslint es5:true*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;
var ObjectId = Schema.Types.ObjectId;

// shared configuration for request and cable schemas
var projectValues = ['FRIB', 'REA', 'SECAR', 'BECOLA', 'SRFHB', 'BUSINESS'];
var originCategoryValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B'];
var originSubcategoryValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
var signalClassificationValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'];
var traySectionValues = ['HPRF', 'DC', 'VLLS', 'LLS', 'HVDC', 'MLS', 'AC', 'MV-AC', 'REF', 'PPS', 'N/A'];

// request status
// 0: saved
// 1: submitted
// 2: approved
// 3: rejected

var request = new Schema({
  basic: {
    project: {
      type: String,
      enum: projectValues,
      uppercase: true,
      required: true
    },
    engineer: String,
    wbs: {
      type: String,
      required: true
    },
    originCategory: {
      type: String,
      enum: originCategoryValues,
      required: true
    },
    originSubcategory: {
      type: String,
      enum: originSubcategoryValues,
      required: true
    },
    signalClassification: {
      type: String,
      enum: signalClassificationValues,
      required: true
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      enum: traySectionValues
    },
    tags: [String],
    quantity: {
      type: Number,
      min: 1,
      max: 100,
      default: 1
    }
  },

  from: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String
  },

  to: {
    rack: String,
    terminationDevice: String,
    terminationType: String,
    terminationPort: String,
    wiringDrawing: String,
    label: String
  },

  required: {
    label: Boolean,
    benchTerm: Boolean,
    benchTest: Boolean,
    fieldTerm: Boolean
  },

  ownerProvided: {
    type: Boolean,
    default: false
  },

  length: Number,
  conduit: String,
  routing: [Mixed],

  comments: String,
  status: {
    type: Number,
    index: true
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
  rejectedOn: Date
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

var cable = new Schema({
  request_id: String,
  number: {
    type: String,
    index: true,
    unique: true
  },
  status: {
    type: Number,
    index: true
  },
  ownerProvided: {
    type: Boolean,
    default: false
  },
  basic: {
    project: {
      type: String,
      enum: projectValues,
      uppercase: true,
      required: true
    },
    engineer: String,
    wbs: {
      type: String,
      required: true
    },
    originCategory: {
      type: String,
      enum: originCategoryValues,
      required: true
    },
    originSubcategory: {
      type: String,
      enum: originSubcategoryValues,
      required: true
    },
    signalClassification: {
      type: String,
      enum: signalClassificationValues,
      required: true
    },
    cableType: String,
    service: String,
    traySection: {
      type: String,
      enum: traySectionValues
    },
    tags: [String]
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
    terminatedOn: Date
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
    terminatedOn: Date
  },

  required: {
    label: Boolean,
    benchTerm: Boolean,
    benchTest: Boolean,
    fieldTerm: Boolean
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
  changeHistory: [ObjectId]
});

var change = new Schema({
  cableName: String,
  property: String,
  oldValue: Mixed,
  newValue: Mixed,
  updatedBy: String,
  updatedOn: Date
});

var update = new Schema({
  property: String,
  oldValue: Mixed,
  newValue: Mixed
});

var multiChange = new Schema({
  cableName: String,
  updates: [update],
  updatedBy: String,
  updatedOn: Date
});

var Request = mongoose.model('Request', request);
var Cable = mongoose.model('Cable', cable);
var Change = mongoose.model('Change', change);
var MultiChange = mongoose.model('MultiChange', multiChange);


module.exports = {
  Cable: Cable,
  Change: Change,
  MultiChange: MultiChange,
  Request: Request
};
