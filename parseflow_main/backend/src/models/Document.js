const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  filename: { type: String, required: true },
  filePath: { type: String, required: true },
  document_type: { type: String, default: 'Unknown' },
  category: { type: String, default: 'Other' },
  folder: { type: String, default: 'Other/Unknown' },
  accuracy: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  processing_time_ms: { type: Number, default: 0 },
  method: { type: String, default: 'Unknown' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  extracted_text: { type: String, default: '' },
  encryptedData: { type: String, default: '' },
  fileHash: { type: String, default: '' },
  llm_analysis: {
    summary: { type: String, default: '' },
    key_fields: { type: Object, default: {} }
  },
  storage: {
    category: { type: String, default: 'Other' },
    docType: { type: String, default: 'Unknown' },
    localPath: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    folder: { type: String, default: 'Other/Unknown' },
    googleDrive: {
      fileId: { type: String, default: null },
      fileUrl: { type: String, default: null }
    },
    googleDriveUrl: { type: String, default: null }
  },
  classification: {
    document_type: { type: String, default: 'Unknown' },
    category: { type: String, default: 'Other' },
    accuracy: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    method: { type: String, default: 'Unknown' }
  },
  memory_status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  memory_extracted_at: { type: Date, default: null },
  memory_error: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

documentSchema.index({ userId: 1, createdAt: -1 });
documentSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Document', documentSchema);