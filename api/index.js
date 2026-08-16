// Serverless entry point for Vercel. Local development still uses server.js,
// which calls app.listen(); serverless platforms never listen on a port and
// instead invoke this exported handler per request.
require('dotenv').config();

const app = require('../src/app');
const connectDB = require('../src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Database connection failed', err);
    return res.status(503).json({ message: 'Database unavailable' });
  }

  return app(req, res);
};
