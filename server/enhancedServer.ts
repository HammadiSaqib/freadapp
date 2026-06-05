import express from 'express';
import { initializeDatabaseAdapter } from './database/databaseAdapter.js';
import { loadEnvironmentConfig } from './config/environment.js';
import { SECURITY_CONFIG } from './config/security.js';
import {
  securityHeaders,
  corsMiddleware,
  rateLimit,
  sanitizeInputs,
  limitRequestSize,
  requestLogger,
  errorHandler,
  authenticateToken,
  optionalAuth
} from './middleware/securityMiddleware.js';

// Enhanced route imports
import authRoutes from './routes/authRoutes.js';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  bulkUpdateClients
} from './routes/enhancedClientRoutes.js';
import {
  getDisputes,
  getDispute,
  createDispute,
  updateDispute,
  deleteDispute,
  getDisputeStats,
  bulkUpdateDisputes
} from './routes/enhancedDisputeRoutes.js';
import {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getPerformanceMetrics,
  getClientAnalytics,
  getFinancialInsights,
  getRecentActivities
} from './routes/enhancedAnalyticsRoutes.js';

export async function createEnhancedServer() {
  const app = express();

  // Canonicalize host: strip leading "www." for localhost and production domain
  app.use((req, res, next) => {
    const host = String(req.headers.host || '').toLowerCase();
    if (/^www\.localhost(?::\d+)?$/.test(host)) {
      const targetHost = host.replace(/^www\./, '');
      return res.redirect(301, `http://${targetHost}${req.originalUrl}`);
    } else if (/^www\.thescoremachine\.com(?::\d+)?$/.test(host)) {
      return res.redirect(301, `https://thescoremachine.com${req.originalUrl}`);
    }
    next();
  });

  // Load configuration and initialize database adapter
  const config = loadEnvironmentConfig();
  const dbType = process.env.DATABASE_TYPE === 'mysql' ? 'mysql' : 'sqlite';
  await initializeDatabaseAdapter(config, dbType);
  
  console.log(`🗄️  Enhanced Server: Using ${dbType.toUpperCase()} database adapter`);

  // =============================================================================
  // SECURITY MIDDLEWARE (Applied in order)
  // =============================================================================
  
  // 1. Security headers (first to ensure all responses have security headers)
  app.use(securityHeaders);
  
  // 2. Request logging for security monitoring
  app.use(requestLogger);
  
  // 3. CORS with enhanced security
  app.use(corsMiddleware);
  
  // 4. Request size limiting
  app.use(limitRequestSize());
  
  // 5. Body parsing with size limits
  app.use(express.json({ 
    limit: SECURITY_CONFIG.VALIDATION.MAX_REQUEST_SIZE,
    strict: true
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: SECURITY_CONFIG.VALIDATION.MAX_REQUEST_SIZE,
    parameterLimit: 100
  }));
  
  // 6. Input sanitization
  app.use(sanitizeInputs);
  
  // 7. Global rate limiting
  app.use(rateLimit());

  // =============================================================================
  // HEALTH CHECK & MONITORING
  // =============================================================================
  
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // =============================================================================
  // AUTHENTICATION ROUTES (Public)
  // =============================================================================
  
  // Enhanced auth routes with stricter rate limiting
  app.use('/api/auth', rateLimit({
    windowMs: SECURITY_CONFIG.RATE_LIMIT.AUTH_WINDOW_MS,
    maxRequests: SECURITY_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  }), authRoutes);

  // =============================================================================
  // PROTECTED API ROUTES
  // =============================================================================
  
  // Client Management Routes
  app.get('/api/clients', authenticateToken, getClients);
  app.get('/api/clients/:id', authenticateToken, getClient);
  app.post('/api/clients', authenticateToken, createClient);
  app.put('/api/clients/:id', authenticateToken, updateClient);
  app.delete('/api/clients/:id', authenticateToken, deleteClient);
  app.patch('/api/clients/bulk', authenticateToken, bulkUpdateClients);
  
  // Dispute Management Routes
  app.get('/api/disputes', authenticateToken, getDisputes);
  app.get('/api/disputes/:id', authenticateToken, getDispute);
  app.post('/api/disputes', authenticateToken, createDispute);
  app.put('/api/disputes/:id', authenticateToken, updateDispute);
  app.delete('/api/disputes/:id', authenticateToken, deleteDispute);
  app.get('/api/disputes/stats/overview', authenticateToken, getDisputeStats);
  app.patch('/api/disputes/bulk', authenticateToken, bulkUpdateDisputes);
  
  // Analytics Routes
  app.get('/api/analytics/dashboard', authenticateToken, getDashboardAnalytics);
  app.get('/api/analytics/revenue', authenticateToken, getRevenueAnalytics);
  app.get('/api/analytics/performance', authenticateToken, getPerformanceMetrics);
  app.get('/api/analytics/clients', authenticateToken, getClientAnalytics);
  app.get('/api/analytics/financial', authenticateToken, getFinancialInsights);
  app.get('/api/analytics/activities', authenticateToken, getRecentActivities);

  // =============================================================================
  // DEVELOPMENT/DEBUG ROUTES (Only in development)
  // =============================================================================
  
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/debug/current-user', authenticateToken, (req: any, res) => {
      res.json({
        user: req.user,
        message: 'Current authenticated user info'
      });
    });
    
    app.get('/api/debug/security-headers', (_req, res) => {
      res.json({
        message: 'Security headers are being applied',
        headers: Object.keys(res.getHeaders())
      });
    });
  }

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  
  // 404 handler for undefined routes
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });
  
  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

// Start server function
export async function startEnhancedServer(port: number = 3001) {
  try {
    const app = await createEnhancedServer();
    
    const server = app.listen(port, () => {
      console.log(`🚀 Enhanced CreditRepairPro API Server running on port ${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Security: Enhanced middleware active`);
      console.log(`🛡️  Rate limiting: ${SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS} requests per ${SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS / 1000}s`);
      console.log(`🔐 JWT: ${SECURITY_CONFIG.JWT.EXPIRES_IN} expiration`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log('⚠️  Production mode: Debug endpoints disabled');
      }
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start enhanced server:', error);
    process.exit(1);
  }
}

// Export for use in other files
export default createEnhancedServer;
