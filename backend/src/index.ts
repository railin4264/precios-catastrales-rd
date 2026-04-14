import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './config/passport';
import { prisma } from './config/prisma';
import apiRoutes from './routes/api.route';
import authRoutes from './routes/auth.route';
import paymentRoutes from './routes/payment.route';
import adminRoutes from './routes/admin.route';
import impactRoutes from './routes/impact.route';
import { usageLogger } from './middleware/usageLog.middleware';

dotenv.config();

const app = express();

// Trust proxy is required for express-rate-limit to work correctly in Railway/cloud environments
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;

// CORS — allow configured frontend URL, Railway subdomains, or fallback for local dev
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list OR is a Railway subdomain
    const isAllowed = allowedOrigins.includes(origin);
    const isRailwaySubdomain = origin.endsWith('.up.railway.app');

    if (isAllowed || isRailwaySubdomain) {
      return callback(null, true);
    }
    
    console.warn(`[CORS Blocked]: Origin ${origin} not in allowed list.`);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(passport.initialize());
app.use('/api', usageLogger);

// Routes — rate limiting is applied per-route in api.route.ts
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/payments', paymentRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/impact', impactRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

// Basic error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function startServer() {
  try {
    await prisma.$connect();
    // Ensure the unaccent extension exists — needed for accent-insensitive search
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    console.log('Connected to PostgreSQL');
    console.log('unaccent extension ready');

    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();

