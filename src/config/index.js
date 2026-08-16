const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devweekends',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not set. Copy .env.sample to .env and set a strong secret.');
}

module.exports = config;
