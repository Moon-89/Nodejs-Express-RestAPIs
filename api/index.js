// Serverless entry point for Vercel. Local development still uses server.js,
// which calls app.listen(); serverless platforms never listen on a port and
// instead invoke this exported handler per request.
require('dotenv').config();

// Loaded lazily inside the handler: src/config throws when JWT_SECRET is missing,
// and a throw at module scope crashes the whole function with an unreadable
// FUNCTION_INVOCATION_FAILED page instead of telling you what is wrong.
let app;
let connectDB;

module.exports = async (req, res) => {
  try {
    if (!app) {
      app = require('../src/app');
      connectDB = require('../src/config/db');
    }
  } catch (err) {
    console.error('Startup failed', err);
    return res.status(500).json({
      message: 'Server misconfigured: ' + err.message,
      hint: 'Set MONGO_URI and JWT_SECRET in the deployment environment variables.',
    });
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection failed', err);
    return res.status(503).json({
      message: 'Database unavailable: ' + err.message,
      hint: 'Check MONGO_URI, and allow 0.0.0.0/0 under Atlas Network Access.',
    });
  }

  return app(req, res);
};
