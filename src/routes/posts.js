const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const postController = require('../controllers/postController');
const { nested: commentRoutes } = require('./comments');

router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.post('/', auth, postController.createPost);
router.put('/:id', auth, postController.updatePost);
router.delete('/:id', auth, postController.deletePost);

router.use('/:postId/comments', commentRoutes);

module.exports = router;
