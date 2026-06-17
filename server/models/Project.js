const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  id: { type: String, required: true }, // Frontend UUID
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
