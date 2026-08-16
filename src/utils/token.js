const jwt = require('jsonwebtoken');
const config = require('../config');

exports.signToken = (user) =>
  jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
