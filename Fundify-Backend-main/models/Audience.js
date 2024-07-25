const mongoose = require('mongoose');

const audienceSchema = mongoose.Schema({
  userType: { type: String, default: 'audience' },
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  creators: [],
  projects: [],
});

module.exports = mongoose.model('Audience', audienceSchema);
