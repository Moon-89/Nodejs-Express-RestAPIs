// Verifies MONGO_URI actually connects (handy right after pasting an Atlas string
// into .env). Prints the host and database it reached, then exits.
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const config = require('../src/config');

// Never print the password that sits in the Atlas connection string.
const redact = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

(async () => {
  console.log(`Connecting to ${redact(config.mongoUri)}`);

  try {
    const conn = await connectDB();
    const collections = await conn.db.listCollections().toArray();

    console.log(`OK  host: ${conn.host}`);
    console.log(`OK  database: ${conn.name}`);
    console.log(
      collections.length
        ? `OK  collections: ${collections.map((c) => c.name).join(', ')}`
        : 'OK  no collections yet (they are created on the first write)'
    );
  } catch (err) {
    console.error(`FAILED  ${err.message}`);
    if (/ENOTFOUND|querySrv/.test(err.message)) {
      console.error('Hint: the cluster hostname is wrong, or you are offline.');
    } else if (/Authentication failed|bad auth/i.test(err.message)) {
      console.error('Hint: wrong user/password. Special characters must be URL-encoded (@ -> %40).');
    } else if (/whitelist|IP address/i.test(err.message)) {
      console.error('Hint: add your IP (or 0.0.0.0/0) under Atlas -> Network Access.');
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
