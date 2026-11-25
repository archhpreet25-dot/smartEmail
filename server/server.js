
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { configured } = require('./utils/mailer');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env');
  process.exit(1);
}

const origins = (
  process.env.CLIENT_URL || 'http://localhost:5173'
).split(',');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: origins,
  },
});

app.set('io', io);

// Socket.IO: authenticate with the same JWT,
// then put each user in a private room "user:<id>".
io.use((socket, next) => {
  try {
    socket.userId = jwt.verify(
      socket.handshake.auth?.token,
      process.env.JWT_SECRET
    ).id;

    next();
  } catch {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) =>
  socket.join('user:' + socket.userId)
);

app.use(helmet());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '200kb' }));

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      message: 'Too many attempts. Try again later',
    },
  }),
  require('./routes/authRoutes')
);

app.use('/api/mail', require('./routes/mailRoutes'));

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    smtp: configured ? 'configured' : 'simulated',
  })
);

app.use((req, res) =>
  res.status(404).json({ message: 'Route not found' })
);

app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.code === 11000) {
    status = 409;
    message = 'Duplicate value';
  }

  if (status >= 500) {
    console.error(err);
    message = 'Server error';
  }

  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() =>
    server.listen(PORT, () =>
      console.log(
        `API + Socket.IO on http://localhost:${PORT} (SMTP: ${
          configured ? 'real' : 'simulated'
        })`
      )
    )
  )
  .catch((e) => {
    console.error('Startup failed:', e.message);
    process.exit(1);
  });
