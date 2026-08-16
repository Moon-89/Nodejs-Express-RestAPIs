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

// Serves the docs page, the OpenAPI spec and Swagger UI's own assets. Mounted
// before the routes so it cannot shadow anything under /api.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Both of these render public/docs.html, which points Swagger UI at /openapi.json.
app.get(['/docs', '/api/documentation'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'docs.html'));
});

// Nothing to show at the root of an API, so send visitors to the documentation.
app.get('/', (req, res) => res.redirect('/docs'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Order matters: unmatched routes first, then the error handler last.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
