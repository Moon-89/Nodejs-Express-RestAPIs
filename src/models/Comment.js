const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  body: { type: String, required: true, trim: true, maxlength: 1000 },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);
