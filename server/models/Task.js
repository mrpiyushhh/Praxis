const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  projectId: { type: String, required: true }, // Frontend Project UUID
  id: { type: String, required: true }, // Frontend Task UUID
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: { type: String },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  archivedAt: { type: Date }
});

module.exports = mongoose.model('Task', TaskSchema);
