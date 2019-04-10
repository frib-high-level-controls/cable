/*jslint es5:true*/
import * as mongoose from 'mongoose';

export interface ICableType {
  name: string;
  service?: string;
  conductorNumber: number;
  conductorSize: string;
  fribType: string;
  typeNumber: string;
  pairing?: string;
  shielding?: string;
  outerDiameter?: string;
  voltageRating?: string;
  raceway?: string;
  tunnelHotcell?: boolean;
  otherRequirements?: string;
  manufacturer?: string;
  partNumber?: string;
  altManufacturer?: string;
  altPartNumber?: string;
  createdBy?: string;
  createdOn?: Date;
  updatedBy?: string;
  updatedOn?: Date;
}

export interface CableType extends ICableType, mongoose.Document {
  // nothing extra now
}

const Schema = mongoose.Schema;

const cableType = new Schema({
  name: {
    type: String,
    index: true,
    unique: true,
    match: /\d+C_\w+_\w+_\d\d\d/,
    required: true,
  },
  service: String,
  conductorNumber: {
    type: Number,
    required: true,
  },
  conductorSize: {
    type: String,
    required: true,
  },
  fribType: {
    type: String,
    enum: {

      values: ['7-Pole', 'Multi', 'PwrAC', 'PwrDC', 'ArmPwrDC', 'Coax', 'Hardline', 'RigidLine',
                'Cat6', 'TCtypeJ', 'TCtypeK', 'Sfib', 'SMfiber', 'MMfiber', 'PMMfiberRAD', 'Triax'],
      message: 'enum validator failed for "{PATH}" with value "{VALUE}"',
    },
    required: true,
  },
  typeNumber: {
    type: String,
    required: true,
  },
  pairing: String,
  shielding: String,
  outerDiameter: String,
  voltageRating: String,
  raceway: String,
  tunnelHotcell: Boolean,
  otherRequirements: String,
  manufacturer: String,
  partNumber: String,
  altManufacturer: String,
  altPartNumber: String,
  createdBy: String,
  createdOn: Date,
  updatedBy: String,
  updatedOn: Date,
});

export const CableType = mongoose.model<CableType>('CableType', cableType);
