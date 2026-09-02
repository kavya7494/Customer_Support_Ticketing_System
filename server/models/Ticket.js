const mongoose = require('mongoose');

// Message sub-schema (embedded in Ticket)
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['client', 'agent', 'system'],
    required: true
  },
  senderName: String,
  message: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  isInternal: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }],
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'],
    default: 'Open'
  },
  urgency: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  concern: {
    type: String,
    enum: [
      'Login Issue',
      'Payment Issue',
      'Technical Problem',
      'Account Issue',
      'Security Issue',
      'Bug Report',
      'Feature Request',
      'General Question'
    ],
    default: 'General Question'
  },
  department: {
    type: String,
    enum: ['Technical Support', 'Billing & Payments', 'Account & Access', 'Security', 'General Support'],
    default: 'General Support'
  },
  tags: [String],
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: Date,
  messages: [messageSchema],
  internalNotes: [messageSchema],
  slaDeadline: Date,
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: Date,
  priorityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  firstResponseAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  // Browser/OS metadata
  metadata: {
    browser: String,
    os: String,
    source: {
      type: String,
      default: 'web'
    },
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes for commonly queried fields
ticketSchema.index({ status: 1 });
ticketSchema.index({ urgency: 1 });
ticketSchema.index({ department: 1 });
ticketSchema.index({ assignedAgent: 1 });
ticketSchema.index({ client: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ slaDeadline: 1 });
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ escalated: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
