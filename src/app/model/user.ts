/*jslint es5:true*/
import mongoose = require('mongoose');
const Schema = mongoose.Schema;

export interface IUser {
  adid: string;
  name?: string;
  email?: string;
  office?: string;
  phone?: string;
  mobile?: string;
  roles?: string[];
  wbs?: string[];
  lastVisitedOn?: Date;
  subscribe: boolean;
}

export interface User extends IUser, mongoose.Document {
  // nothing extra now

  wbs: mongoose.Types.Array<string>;


}

const user = new Schema({
  adid: {
    type: String,
    lowercase: true,
    index: true,
    unique: true,
  },
  name: String,
  email: String,
  office: String,
  phone: String,
  mobile: String,
  roles: [String],
  wbs: [String],
  lastVisitedOn: Date,
  subscribe: {
    type: Boolean,
    default: false,
  },
});

export const User = mongoose.model<User>('User', user);
