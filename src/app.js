const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const { router: commentRoutes } = require('./routes/comments');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

app.use(cors());
app.use(express.json());

// The frontend at "/". Mounted before the routes so it cannot shadow anything
// under /api, and it never interferes with API clients.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Swagger UI's own css/js, served from the installed package instead of a CDN
// so the docs page also works offline.
app.use('/docs/assets', express.static(require('swagger-ui-dist').getAbsoluteFSPath()));

// Both of these render public/docs.html, which points Swagger UI at /openapi.json.
app.get(['/docs', '/api/documentation'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'docs.html'));
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Order matters: unmatched routes first, then the error handler last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
