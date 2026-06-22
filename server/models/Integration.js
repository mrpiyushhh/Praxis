const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  mattermost_ws_url: { type: String, default: '' },
  mmauthtoken: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Integration', IntegrationSchema);
