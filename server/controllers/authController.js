
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const sign = (u) =>
  jwt.sign({ id: u._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

const pub = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  settings: {
    voiceAnnounce: u.settings?.voiceAnnounce ?? true,
    speechRate: u.settings?.speechRate ?? 1,
  },
});

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw new HttpError(400, 'Name, email and password are required');
  }

  if (password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  if (await User.findOne({ email: email.toLowerCase().trim() })) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
  });

  res.status(201).json({ token: sign(user), user: pub(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
  }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Incorrect email or password');
  }

  res.json({ token: sign(user), user: pub(user) });
});

exports.me = (req, res) => res.json({ user: pub(req.user) });

exports.updateSettings = asyncHandler(async (req, res) => {
  const { voiceAnnounce, speechRate } = req.body;

  if (typeof voiceAnnounce === 'boolean') {
    req.user.settings.voiceAnnounce = voiceAnnounce;
  }

  if (speechRate !== undefined) {
    const r = Number(speechRate);

    if (!(r >= 0.5 && r <= 2)) {
      throw new HttpError(400, 'Speech rate must be between 0.5 and 2');
    }

    req.user.settings.speechRate = r;
  }

  await req.user.save();

  res.json({ user: pub(req.user) });
});

// Autocomplete for the Compose "To" field.
exports.searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 40);

  if (q.length < 2) return res.json([]);

  const rx = new RegExp(
    q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  );

  res.json(
    await User.find({
      $or: [{ name: rx }, { email: rx }],
    })
      .select('name email')
      .limit(8)
  );
});
