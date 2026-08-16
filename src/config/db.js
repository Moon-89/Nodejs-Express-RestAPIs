const mongoose = require('mongoose');
const config = require('./index');

// Serverless platforms (Vercel) reuse a warm container across requests, but module
// scope is not guaranteed to survive. Caching the connection on `global` means we
// dial MongoDB once per container instead of once per request — without it you
// exhaust the Atlas connection limit quickly.
let cached = global.__mongooseConn;
if (!cached) {
  cached = global.__mongooseConn = { conn: null, promise: null };
}

// Tuned for MongoDB Atlas: a small pool because each serverless container holds its
// own connection, and a short server-selection timeout so a wrong URI or a missing
// Network Access rule fails in ~10s instead of hanging for the 30s default.
const connectOptions = {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 10,
};

// Note: the URI is only read on the first call; later calls reuse the cached connection.
const connectDB = async (uri = config.mongoUri) => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, connectOptions).then((m) => {
      console.log('MongoDB connected');
      return m.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // clear it so the next request can retry
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
