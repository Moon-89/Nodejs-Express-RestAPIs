const Comment = require('../models/Comment');
const Post = require('../models/Post');

// POST /api/posts/:postId/comments
exports.createComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      body: req.body.body,
      post: post._id,
      author: req.userId,
    });
    res.status(201).json(comment);
  } catch (err) { next(err); }
};

// GET /api/posts/:postId/comments?page=1&limit=20
exports.getComments = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const exists = await Post.exists({ _id: req.params.postId });
    if (!exists) return res.status(404).json({ message: 'Post not found' });

    const filter = { post: req.params.postId };
    const [items, total] = await Promise.all([
      Comment.find(filter)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) { next(err); }
};

exports.getComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('author', 'name email');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    res.json(comment);
  } catch (err) { next(err); }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    if (req.body.body !== undefined) comment.body = req.body.body;
    await comment.save();
    res.json(comment);
  } catch (err) { next(err); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
};
