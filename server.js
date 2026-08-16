require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const config = require('./src/config');

connectDB()
  .then(() => {
    app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
  })
  .catch((err) => {
    console.error('Failed to connect to DB', err);
    process.exit(1);
  });
