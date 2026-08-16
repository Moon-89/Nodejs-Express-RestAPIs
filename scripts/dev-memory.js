// Runs the API against a throwaway in-memory MongoDB, so you can try the
// endpoints without installing MongoDB. Data is wiped when you stop the server.
require('dotenv').config();

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('In-memory MongoDB started (data is NOT saved between restarts)');

  const app = require('../src/app');
  const config = require('../src/config');

  app.listen(config.port, () => console.log(`Server running on http://localhost:${config.port}`));

  const shutdown = async () => {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
