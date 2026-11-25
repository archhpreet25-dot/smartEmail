
const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    }, // null = external address

    toEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    body: {
      type: String,
      required: true,
      maxlength: 50000,
    },

    read: {
      type: Boolean,
      default: false,
    },

    readAt: Date,

    smtpStatus: {
      type: String,
      enum: ['sent', 'simulated', 'failed'],
      required: true,
    },

    smtpResponse: {
      type: String,
      default: '',
    },

    deletedBySender: {
      type: Boolean,
      default: false,
    },

    deletedByRecipient: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Email', emailSchema);
