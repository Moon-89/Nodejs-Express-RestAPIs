const express = require('express');
const auth = require('../middleware/auth');
const commentController = require('../controllers/commentController');

// Mounted at /api/posts/:postId/comments — needs mergeParams to see :postId.
const nested = express.Router({ mergeParams: true });
nested.get('/', commentController.getComments);
nested.post('/', auth, commentController.createComment);

// Mounted at /api/comments — a comment is addressable on its own once created.
const router = express.Router();
router.get('/:id', commentController.getComment);
router.put('/:id', auth, commentController.updateComment);
router.delete('/:id', auth, commentController.deleteComment);

module.exports = { router, nested };
