const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  action: { 
    type: String, 
    enum: [
      'Document Uploaded', 
      'Memory Created', 
      'Memory Updated', 
      'Memory Deleted', 
      'Memory Rebuilt',
      'Document Deleted'
    ],
    required: true 
  },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  createdAt: { type: Date, default: Date.now }
});

activitySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
