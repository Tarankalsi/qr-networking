process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes and middleware
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const visitorRoutes = require('./routes/visitor');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
// Cookie parser for reading cookies (refresh token)


const app = express();

app.use(cookieParser());

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));

// Compression and logging
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

const allowedOrigins = [
  "http://localhost:3000"
];

// CORS configuration
app.use(cors({
   origin: function (origin, callback) {

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { Pool } = require('pg');

// Create pool with explicit SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test pool connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database pool connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database pool connection failed:', err.message);
  });

// Session configuration - Updated with better error handling
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false, // Table already exists
    pruneSessionInterval: 60 * 15, // Prune sessions every 15 minutes
    errorLog: (err) => {
      console.error('Session store error:', err.message);
    }
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'networking.sid'
}));

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'anginat-connect-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
const prisma = require('./db'); // Adjust path to your prisma file

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  try {
    await pool.end();
    await prisma.$disconnect();
    console.log('Database connections closed');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  try {
    await pool.end();
    await prisma.$disconnect();
    console.log('Database connections closed');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`🚀 Anginat Connect Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(` Port is running on: http://localhost:${PORT}`);
});

module.exports = app;