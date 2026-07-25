import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config/config.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import { initWebSocketServer } from './websocket.js';
import errorHandler from './middleware/error.js';
import workflowRoutes from './routes/workflowRoutes.js';
import { startWorkflowSweep } from './services/workflow/workflowSweep.js';
import billingRoutes from './routes/billingRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })
);

// 2. CORS configuration (allowing credential pass-through for HTTP-Only Refresh cookies)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        config.clientUrl,
        'http://localhost:5173',
        'http://localhost',
        'http://localhost:80',
        'http://127.0.0.1:5173',
        'http://127.0.0.1'
      ];
      if (
        allowedOrigins.includes(origin) || 
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy error: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Rate Limiter (restrict excessive traffic)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use('/api', limiter);

// 4. Request Logging (Morgan)
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// 5. Body Parsing
app.use(
  express.json({
    limit: '10kb',
    verify: (req, res, buf) => {
      // Store the raw request payload buffer on the request object for signature checking
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true })); // Required to parse incoming Twilio form callbacks

// 6. Routes
app.use('/', healthRoutes); // Mount health route at root level (GET /health)
app.use('/api/auth', authRoutes); // Mount authentication endpoints
app.use('/api/knowledge-base', knowledgeBaseRoutes); // Mount multi-tenant KB endpoints
app.use('/api/chat', chatRoutes); // Mount public/private chat endpoints
app.use('/api/crm', crmRoutes); // Mount protected CRM endpoints
app.use('/api/whatsapp', whatsappRoutes); // Mount public/private whatsapp endpoints
app.use('/api/voice', voiceRoutes); // Mount protected/public voice endpoints
app.use('/api/workflows', workflowRoutes); // Mount protected workflow rules & logs endpoints
app.use('/api/billing', billingRoutes); // Mount billing & subscription endpoints
app.use('/api/analytics', analyticsRoutes); // Mount analytics dashboards endpoints
app.use('/api/admin', adminRoutes); // Mount platform superadmin endpoints


// 7. Undefined Route Handler
app.use('*', (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found on this server.`);
  err.statusCode = 404;
  err.code = 'ROUTE_NOT_FOUND';
  next(err);
});

// 8. Centralized Global Error Handler
app.use(errorHandler);

// 9. Startup sequence
const startServer = async () => {
  // Wait for Database before opening server listener
  await connectDB();
  
  const server = app.listen(config.port, () => {
    process.stdout.write(`Backend Service successfully initialized on Port ${config.port} (${config.nodeEnv} mode).\n`);
  });
  initWebSocketServer(server);
  
  // Start the automated inactivity checks sweep
  startWorkflowSweep();
};

startServer();
