const mongoose = require('mongoose');

const projectSchema = mongoose.Schema({
  pageName: String,
  email: String,
  title: String,
  description: String,
  amount: Number,
  projectURL: String,
  audience: [],
});

module.exports = mongoose.model('Project', projectSchema);
