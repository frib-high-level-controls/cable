var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var user = new Schema({
  id : {type: String, index: true, unique: true},
  name: String,
  email: String,
  office: String,
  phone: String,
  mobile: String,
  roles: [String]
});

var User = mongoose.model('User', user);
module.exports = {
  User: User
};