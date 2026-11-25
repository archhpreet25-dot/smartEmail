
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 60,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    settings: {
      voiceAnnounce: {
        type: Boolean,
        default: true,
      }, // speak "new email" automatically

      speechRate: {
        type: Number,
        default: 1,
        min: 0.5,
        max: 2,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
