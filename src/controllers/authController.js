const User = require('../models/User');
const { signToken } = require('../utils/token');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    // The pre-save hook on the schema hashes the password.
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    // password is select:false on the schema, so ask for it explicitly.
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) { next(err); }
};
