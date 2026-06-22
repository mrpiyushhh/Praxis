const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  id: { type: String, required: true }, // Frontend UUID
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  createdAt: { type: Date, default: Date.now }
});

ProjectSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Project', ProjectSchema);
