const mongoose = require('mongoose');

const creatorSchema = mongoose.Schema({
  userType: { type: String, default: 'creator' },
  firstName: String,
  lastName: String,
  pageName: { type: String, required: true },
  profileURL: String,
  category: String,
  description: String,
  email: String,
  password: String,
  audience: [],
  projects: [],
  exclusives: [],
});

module.exports = mongoose.model('Creator', creatorSchema);
