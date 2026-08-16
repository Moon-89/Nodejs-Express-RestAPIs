const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  content: { type: String, required: true, trim: true },
  tags: [{ type: String, trim: true, lowercase: true }],
  published: { type: Boolean, default: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
