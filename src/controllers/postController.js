const Post = require('../models/Post');
const Comment = require('../models/Comment');

exports.createPost = async (req, res, next) => {
  try {
    const { title, content, tags, published } = req.body;
    const post = await Post.create({ title, content, tags, published, author: req.userId });
    res.status(201).json(post);
  } catch (err) { next(err); }
};

// GET /api/posts?page=1&limit=10&tag=node&author=<id>&q=express
exports.getPosts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filter = {};
    if (req.query.tag) filter.tags = req.query.tag.toLowerCase();
    if (req.query.author) filter.author = req.query.author;
    if (req.query.q) filter.title = { $regex: req.query.q, $options: 'i' };

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({ page, limit, total, pages: Math.ceil(total / limit), items });
  } catch (err) { next(err); }
};

exports.getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) { next(err); }
};

exports.updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const { title, content, tags, published } = req.body;
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags;
    if (published !== undefined) post.published = published;

    await post.save();
    res.json(post);
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await post.deleteOne();
    await Comment.deleteMany({ post: post._id }); // don't leave orphaned comments behind
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
};
