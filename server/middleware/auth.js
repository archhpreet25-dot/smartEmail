
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;

  if (!token) {
    throw new HttpError(401, 'Not authenticated');
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Session expired. Please log in again');
  }

  const user = await User.findById(payload.id);

  if (!user) {
    throw new HttpError(401, 'Account no longer exists');
  }

  req.user = user;
  next();
});

module.exports = { protect };
