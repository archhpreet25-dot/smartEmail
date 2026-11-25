
const Email = require('../models/Email');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { transporter, configured, fromAddress } = require('../utils/mailer');

const same = (a, b) => String(a) === String(b);

const unreadFor = (id) =>
  Email.countDocuments({
    to: id,
    read: false,
    deletedByRecipient: false,
  });

const pushUnread = async (req, userId) =>
  req.app
    .get('io')
    .to('user:' + userId)
    .emit('unread:update', {
      unread: await unreadFor(userId),
    });

exports.unreadCount = asyncHandler(async (req, res) =>
  res.json({ unread: await unreadFor(req.user._id) })
);

exports.inbox = asyncHandler(async (req, res) => {
  res.json(
    await Email.find({
      to: req.user._id,
      deletedByRecipient: false,
    })
      .populate('from', 'name email')
      .sort('-createdAt')
      .limit(200)
  );
});

exports.sent = asyncHandler(async (req, res) => {
  res.json(
    await Email.find({
      from: req.user._id,
      deletedBySender: false,
    })
      .populate('to', 'name email')
      .sort('-createdAt')
      .limit(200)
  );
});

// Workflow: validate -> Nodemailer/SMTP -> save in MongoDB -> find recipient -> Socket.IO notification.
exports.send = asyncHandler(async (req, res) => {
  const toEmail = String(req.body.to || '').trim().toLowerCase();
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.body || '').trim();

  if (!/^\S+@\S+\.\S+$/.test(toEmail)) {
    throw new HttpError(400, 'Enter a valid recipient email address');
  }

  if (!subject) {
    throw new HttpError(400, 'Subject is required');
  }

  if (!body) {
    throw new HttpError(400, 'Write a message before sending');
  }

  const recipient = await User.findOne({ email: toEmail });

  let smtpStatus, smtpResponse;

  try {
    const info = await transporter.sendMail({
      from: `"${req.user.name.replace(/"/g, '')}" <${fromAddress}>`,
      replyTo: req.user.email,
      to: toEmail,
      subject,
      text: body,
    });

    smtpStatus = configured ? 'sent' : 'simulated';

    smtpResponse = configured
      ? String(info.response || 'accepted').slice(0, 300)
      : 'No SMTP configured: delivered inside the app only';
  } catch (err) {
    smtpStatus = 'failed';
    smtpResponse = String(err.message).slice(0, 300);
  }

  const email = await Email.create({
    from: req.user._id,
    to: recipient?._id || null,
    toEmail,
    subject,
    body,
    smtpStatus,
    smtpResponse,
  });

  await email.populate([
    { path: 'from', select: 'name email' },
    { path: 'to', select: 'name email' },
  ]);

  let notified = false;

  if (recipient) {
    const io = req.app.get('io');
    const room = 'user:' + recipient._id;

    notified =
      (io.sockets.adapter.rooms.get(room)?.size || 0) > 0; // is the recipient connected right now?

    io.to(room).emit('email:new', {
      _id: email._id,
      from: {
        name: req.user.name,
        email: req.user.email,
      },
      subject,
      preview: body.slice(0, 140),
      createdAt: email.createdAt,
      unread: await unreadFor(recipient._id),
    });
  }

  // SMTP success only means the receiving server accepted the message, not that it reached an inbox.
  if (smtpStatus === 'failed' && !recipient) {
    throw new HttpError(
      502,
      `The mail server rejected the message: ${smtpResponse}`
    );
  }

  res.status(201).json({
    email,
    delivered: !!recipient,
    notified,
    smtpStatus,
  });
});

exports.get = asyncHandler(async (req, res) => {
  const email = await Email.findById(req.params.id)
    .populate('from', 'name email')
    .populate('to', 'name email');

  const isTo = email && same(email.to?._id, req.user._id);
  const isFrom = email && same(email.from._id, req.user._id);

  if (
    !email ||
    (!isTo && !isFrom) ||
    (isTo && !isFrom && email.deletedByRecipient) ||
    (isFrom && !isTo && email.deletedBySender)
  ) {
    throw new HttpError(404, 'Email not found');
  }

  if (isTo && !email.read) {
    email.read = true;
    email.readAt = new Date();

    await email.save();
    await pushUnread(req, req.user._id);
  }

  res.json({ email });
});

exports.markUnread = asyncHandler(async (req, res) => {
  const email = await Email.findOne({
    _id: req.params.id,
    to: req.user._id,
  });

  if (!email) {
    throw new HttpError(404, 'Email not found');
  }

  email.read = false;
  email.readAt = undefined;

  await email.save();
  await pushUnread(req, req.user._id);

  res.json({ email });
});

exports.readAll = asyncHandler(async (req, res) => {
  await Email.updateMany(
    { to: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );

  await pushUnread(req, req.user._id);

  res.json({ unread: 0 });
});

exports.remove = asyncHandler(async (req, res) => {
  const email = await Email.findById(req.params.id);

  if (!email) {
    throw new HttpError(404, 'Email not found');
  }

  const isTo = same(email.to, req.user._id);
  const isFrom = same(email.from, req.user._id);

  if (!isTo && !isFrom) {
    throw new HttpError(404, 'Email not found');
  }

  if (isFrom) {
    email.deletedBySender = true;
  }

  if (isTo) {
    email.deletedByRecipient = true;
  }

  await email.save();
  await pushUnread(req, req.user._id);

  res.json({ message: 'Email deleted' });
});
