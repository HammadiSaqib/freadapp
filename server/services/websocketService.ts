import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { securityLogger, LogLevel, SecurityEventType } from '../utils/securityLogger.js';
import { ENV_CONFIG } from '../config/environment.js';

const portalAliases = [
  'admin',
  'super-admin',
  'support',
  'affiliate',
  'funding-manager',
  'member',
];

const portalLocalhostOrigins = portalAliases.flatMap((alias) => [
  `http://${alias}.localhost:3001`,
  `http://${alias}.localhost:3000`,
]);

const publicLocalhostOrigins = [
  'http://ref.localhost:3001',
  'http://ref.localhost:3000',
  'http://refadmin.localhost:3001',
  'http://refadmin.localhost:3000',
  'http://onboarding.localhost:3001',
  'http://onboarding.localhost:3000',
];

// Use the same JWT_SECRET as the rest of the application
const JWT_SECRET = ENV_CONFIG.JWT_SECRET;

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
  userEmail?: string;
}

interface SocketUser {
  id: number;
  email: string;
  role: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private userSockets: Map<number, string[]> = new Map(); // userId -> socketIds

  // Getter to access the Socket.IO instance
  public get socketIO(): SocketIOServer {
    return this.io;
  }
  
  // Safe JSON stringify method to handle circular references and large objects
  private safeStringify(obj: any): string {
    try {
      const cache: any[] = [];
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.includes(value)) {
            // Handle circular reference
            return '[Circular Reference]';
          }
          cache.push(value);
        }
        return value;
      });
    } catch (error) {
      console.error('Error in safeStringify:', error);
      return JSON.stringify({ error: 'Failed to stringify object' });
    }
  }

  constructor(server: HTTPServer) {
    // Build CORS origins dynamically, allowing env override in development
    const devOrigins = [
      'http://localhost:3003',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5173',
      ...portalLocalhostOrigins,
      ...publicLocalhostOrigins,
    ];
    const envOrigins: string[] = [];
    if (process.env.CORS_ORIGIN) {
      envOrigins.push(...(process.env.CORS_ORIGIN.includes(',')
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : [process.env.CORS_ORIGIN]));
    }
    if (process.env.FRONTEND_URL) {
      envOrigins.push(process.env.FRONTEND_URL);
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? (process.env.FRONTEND_URL || 'https://mywarmachine.com')
          : [...devOrigins, ...envOrigins],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      connectTimeout: 30000,
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    // Add error handling for socket events
    this.io.engine.on('connection_error', (err) => {
      console.error('Socket.IO connection error:', err);
    });
    
    // Add global error handler for Socket.IO
    this.io.on('error', (err) => {
      console.error('Socket.IO error:', err);
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        console.log('🔌 WebSocket connection attempt:', {
          socketId: socket.id,
          hasAuthToken: !!socket.handshake.auth.token,
          hasAuthHeader: !!socket.handshake.headers.authorization,
          tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address
        });
        
        // Allow connections without token for public access
        if (!token) {
          socket.userId = undefined;
          socket.userRole = 'guest';
          socket.userEmail = 'guest';
          
          console.log('✅ WebSocket guest connection allowed');
          
          securityLogger.logSecurityEvent({
            level: LogLevel.INFO,
            eventType: SecurityEventType.WEBSOCKET_GUEST_CONNECTION,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            message: 'Guest connection allowed',
            metadata: {
              socketId: socket.id
            }
          });
          
          return next();
        }

        try {
          console.log('🔑 JWT_SECRET check:', {
            hasJwtSecret: !!JWT_SECRET,
            jwtSecretLength: JWT_SECRET?.length || 0,
            nodeEnv: process.env.NODE_ENV,
            usingFallback: !process.env.JWT_SECRET
          });
          
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          console.log('🔍 JWT decode result:', {
            hasId: !!decoded.id,
            hasEmail: !!decoded.email,
            hasRole: !!decoded.role,
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role
          });
          
          if (!decoded.id || !decoded.email || !decoded.role) {
            console.log('❌ Invalid token structure');
            return next(new Error('Invalid token structure'));
          }

          // Attach user info to socket
          socket.userId = decoded.id;
          socket.userRole = decoded.role;
          socket.userEmail = decoded.email;

          console.log('✅ WebSocket authentication successful:', {
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role
          });

          // Log connection attempt
          securityLogger.logSecurityEvent({
            level: LogLevel.INFO,
            eventType: SecurityEventType.WEBSOCKET_AUTH_SUCCESS,
            userId: decoded.id,
            email: decoded.email,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            message: 'WebSocket authentication successful',
            metadata: {
              socketId: socket.id,
              role: decoded.role
            }
          });

          next();
        } catch (error) {
          console.log('❌ WebSocket authentication failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            socketId: socket.id
          });
          
          securityLogger.logSecurityEvent({
            level: LogLevel.ERROR,
            eventType: SecurityEventType.WEBSOCKET_AUTH_FAILED,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            message: 'WebSocket authentication failed',
            metadata: {
              socketId: socket.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          next(new Error('Authentication failed'));
        }
      } catch (outerError) {
        console.log('❌ WebSocket middleware error:', outerError);
        next(new Error('Authentication middleware failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`✅ WebSocket connected: ${socket.id} (User: ${socket.userEmail})`);

      // Store user connection (including guests)
      if (socket.userRole === 'guest') {
        // Guest users can join public rooms
        socket.join('public');
        socket.join('pricing_updates');
        console.log(`👤 Guest user connected: ${socket.id}`);
      } else if (socket.userId && socket.userEmail && socket.userRole) {
        this.connectedUsers.set(socket.id, {
          id: socket.userId,
          email: socket.userEmail,
          role: socket.userRole
        });

        // Track user sockets
        const userSockets = this.userSockets.get(socket.userId) || [];
        userSockets.push(socket.id);
        this.userSockets.set(socket.userId, userSockets);

        // Join role-based rooms
        socket.join(`role:${socket.userRole}`);
        socket.join('pricing_updates'); // All authenticated users can receive pricing updates
        if (socket.userRole === 'super_admin') {
          socket.join('super_admin_dashboard');
        }
      }

      // Handle subscription to specific data streams
      socket.on('subscribe', (data: { stream: string; filters?: any }) => {
        const user = this.connectedUsers.get(socket.id);
        if (!user) return;

        // Validate subscription permissions
        if (this.canSubscribeToStream(user.role, data.stream)) {
          socket.join(`stream:${data.stream}`);
          console.log(`📡 User ${user.email} subscribed to ${data.stream}`);
        } else {
          socket.emit('subscription_error', {
            stream: data.stream,
            error: 'Insufficient permissions'
          });
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data: { stream: string }) => {
        socket.leave(`stream:${data.stream}`);
        console.log(`📡 Socket ${socket.id} unsubscribed from ${data.stream}`);
      });

      // Chat-specific event handlers
      socket.on('join_chat', (data: { userId?: number; receiverId?: number }) => {
        if (!socket.userId) return;
        
        const otherUserId = data.userId || data.receiverId;
        if (!otherUserId) {
          console.error('❌ join_chat: No userId or receiverId provided');
          return;
        }
        
        const chatRoom = `chat:${Math.min(socket.userId, otherUserId)}-${Math.max(socket.userId, otherUserId)}`;
        socket.join(chatRoom);
        console.log(`💬 User ${socket.userId} joined chat room: ${chatRoom}`);
      });

      socket.on('leave_chat', (data: { userId: number }) => {
        if (!socket.userId) return;
        
        const chatRoom = `chat:${Math.min(socket.userId, data.userId)}-${Math.max(socket.userId, data.userId)}`;
        socket.leave(chatRoom);
        console.log(`💬 User ${socket.userId} left chat room: ${chatRoom}`);
      });

      socket.on('send_chat_message', (data: { receiverId: number; message: string; ticketReferenceId?: number }) => {
        if (!socket.userId) return;
        
        const chatRoom = `chat:${Math.min(socket.userId, data.receiverId)}-${Math.max(socket.userId, data.receiverId)}`;
        const messageData = {
          senderId: socket.userId,
          senderEmail: socket.userEmail,
          receiverId: data.receiverId,
          message: data.message,
          ticketReferenceId: data.ticketReferenceId,
          timestamp: new Date().toISOString()
        };
        
        // Broadcast to chat room
        this.io.to(chatRoom).emit('chat_message_received', messageData);
        console.log(`💬 Chat message sent from ${socket.userId} to ${data.receiverId}`);
      });

      socket.on('typing_start', (data: { receiverId: number }) => {
        if (!socket.userId) return;
        
        const chatRoom = `chat:${Math.min(socket.userId, data.receiverId)}-${Math.max(socket.userId, data.receiverId)}`;
        socket.to(chatRoom).emit('user_typing', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { receiverId: number }) => {
        if (!socket.userId) return;
        
        const chatRoom = `chat:${Math.min(socket.userId, data.receiverId)}-${Math.max(socket.userId, data.receiverId)}`;
        socket.to(chatRoom).emit('user_typing', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          isTyping: false
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`❌ WebSocket disconnected: ${socket.id} (Reason: ${reason})`);
        
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Remove from user sockets tracking
          const userSockets = this.userSockets.get(user.id) || [];
          const updatedSockets = userSockets.filter(id => id !== socket.id);
          
          if (updatedSockets.length === 0) {
            this.userSockets.delete(user.id);
          } else {
            this.userSockets.set(user.id, updatedSockets);
          }

          this.connectedUsers.delete(socket.id);

          securityLogger.logSecurityEvent({
            level: LogLevel.INFO,
            eventType: SecurityEventType.WEBSOCKET_DISCONNECTED,
            userId: user.id,
            email: user.email,
            ip: socket.handshake.address || 'unknown',
            userAgent: socket.handshake.headers['user-agent'] || 'unknown',
            message: `WebSocket disconnected: ${reason || 'unknown reason'}`,
            metadata: {
              socketId: socket.id,
              reason
            }
          });
        }
      });
    });
  }

  private canSubscribeToStream(userRole: string, stream: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'super_admin': ['plans', 'subscriptions', 'users', 'analytics', 'system', 'scrape_jobs'],
      'admin': ['clients', 'disputes', 'analytics', 'scrape_jobs'],
      'user': ['profile', 'subscriptions', 'scrape_jobs']
    };

    return rolePermissions[userRole]?.includes(stream) || false;
  }

  // Public methods for broadcasting data with enhanced error handling
  public broadcastToSuperAdmins(event: string, data: any) {
    try {
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      
      this.io.to('super_admin_dashboard').emit(event, safeData);
      console.log(`📡 Broadcasted ${event} to super admins`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${event} to super admins:`, error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.WEBSOCKET_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast ${event} to super admins`,
        metadata: {
          event,
          target: 'super_admin_dashboard',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  public broadcastToRole(role: string, event: string, data: any) {
    try {
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      
      this.io.to(`role:${role}`).emit(event, safeData);
      console.log(`📡 Broadcasted ${event} to role: ${role}`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${event} to role ${role}:`, error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.WEBSOCKET_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast ${event} to role ${role}`,
        metadata: {
          event,
          target: `role:${role}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  public broadcastToStream(stream: string, event: string, data: any) {
    try {
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      
      this.io.to(`stream:${stream}`).emit(event, safeData);
      console.log(`📡 Broadcasted ${event} to stream: ${stream}`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${event} to stream ${stream}:`, error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.WEBSOCKET_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast ${event} to stream ${stream}`,
        metadata: {
          event,
          target: `stream:${stream}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  public broadcastToUser(userId: number, event: string, data: any) {
    try {
      const userSockets = this.userSockets.get(userId) || [];
      if (userSockets.length === 0) {
        console.warn(`⚠️ No active sockets found for user ${userId}`);
        return;
      }
      
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, safeData);
      });
      console.log(`📡 Broadcasted ${event} to user ${userId} (${userSockets.length} sockets)`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${event} to user ${userId}:`, error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.WEBSOCKET_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast ${event} to user ${userId}`,
        metadata: {
          event,
          target: `user:${userId}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  public broadcastPlanUpdate(planData: any) {
    try {
      // Validate plan data
      if (!planData || typeof planData !== 'object') {
        throw new Error('Invalid plan data provided');
      }

      if (!planData.id) {
        throw new Error('Plan data missing required id field');
      }

      // Broadcast to super admins
      this.broadcastToSuperAdmins('plan_updated', {
        type: 'plan_update',
        data: planData,
        action: planData.action || 'update'
      });

      // Broadcast to public pricing stream
      this.broadcastToStream('pricing', 'pricing_updated', {
        type: 'pricing_update',
        data: planData,
        action: planData.action || 'update'
      });

      // Broadcast to pricing_updates room (includes guests)
      try {
        // Use safe JSON handling
        const safeData = JSON.parse(this.safeStringify({
          type: 'plan_update',
          data: planData,
          action: planData.action || 'update',
          timestamp: new Date().toISOString()
        }));
        
        this.io.to('pricing_updates').emit('plan_updated', safeData);
      } catch (innerError) {
        console.error('❌ Failed to broadcast to pricing_updates room:', innerError);
      }

      console.log(`✅ Successfully broadcasted plan update for plan ID: ${planData.id}`);
    } catch (error) {
      console.error('❌ Failed to broadcast plan update:', error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.PLAN_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast plan update for plan ID: ${planData?.id || 'unknown'}`,
        metadata: {
          planId: planData?.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          planData: this.safeStringify(planData)
        }
      });
    }
  }

  public broadcastSubscriptionUpdate(subscriptionData: any) {
    try {
      // Validate subscription data
      if (!subscriptionData || typeof subscriptionData !== 'object') {
        throw new Error('Invalid subscription data provided');
      }

      this.broadcastToSuperAdmins('subscription_updated', {
        type: 'subscription_update',
        data: subscriptionData,
        action: subscriptionData.action || 'update'
      });

      console.log(`✅ Successfully broadcasted subscription update for subscription ID: ${subscriptionData.id || 'unknown'}`);
    } catch (error) {
      console.error('❌ Failed to broadcast subscription update:', error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.SUBSCRIPTION_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: `Failed to broadcast subscription update for subscription ID: ${subscriptionData?.id || 'unknown'}`,
        metadata: {
          subscriptionId: subscriptionData?.id || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          // Use safe stringify for error logging
          data: this.safeStringify(subscriptionData)
        }
      });
    }
  }

  public broadcastDashboardStats(stats: any) {
    try {
      // Validate stats data
      if (!stats || typeof stats !== 'object') {
        throw new Error('Invalid stats data provided');
      }

      this.broadcastToSuperAdmins('dashboard_stats_updated', {
        type: 'stats_update',
        data: stats,
        lastUpdated: new Date().toISOString()
      });

      console.log('✅ Successfully broadcasted dashboard stats update');
    } catch (error) {
      console.error('❌ Failed to broadcast dashboard stats:', error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.STATS_BROADCAST_ERROR,
        ip: 'system',
        userAgent: 'system',
        message: 'Failed to broadcast dashboard stats',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          // Use safe stringify for error logging
          statsData: this.safeStringify(stats)
        }
      });
    }
  }

  // Chat-specific broadcast methods
  public broadcastChatMessage(senderId: number, receiverId: number, messageData: any) {
    try {
      const chatRoom = `chat:${Math.min(senderId, receiverId)}-${Math.max(senderId, receiverId)}`;
      
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        ...messageData,
        timestamp: new Date().toISOString()
      }));
      
      this.io.to(chatRoom).emit('chat_message_received', safeData);
      console.log(`💬 Broadcasted chat message from ${senderId} to ${receiverId}`);
    } catch (error) {
      console.error(`❌ Failed to broadcast chat message:`, error);
      securityLogger.logSecurityEvent({
        level: LogLevel.ERROR,
        eventType: SecurityEventType.CHAT_BROADCAST_ERROR,
        ip: 'unknown',
        userAgent: 'unknown',
        message: 'Failed to broadcast chat message',
        metadata: {
          senderId,
          receiverId,
          error: error instanceof Error ? error.message : 'Unknown error',
          // Use safe stringify for error logging
          messagePreview: this.safeStringify(messageData).substring(0, 100) + '...'
        }
      });
    }
  }

  public notifyNewChatMessage(userId: number, messageData: any) {
    try {
      this.broadcastToUser(userId, 'new_chat_notification', {
        type: 'new_message',
        data: messageData
      });
      console.log(`🔔 Sent chat notification to user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to send chat notification:`, error);
      // Log error with safe data
      console.error('Message data preview:', this.safeStringify(messageData).substring(0, 100) + '...');
    }
  }

  public broadcastUserOnlineStatus(userId: number, isOnline: boolean) {
    try {
      // Use safe JSON handling
      const safeData = JSON.parse(this.safeStringify({
        userId,
        isOnline,
        timestamp: new Date().toISOString()
      }));
      
      // Notify all users who have active chats with this user
      this.io.emit('user_status_changed', safeData);
      console.log(`👤 Broadcasted online status for user ${userId}: ${isOnline}`);
    } catch (error) {
      console.error(`❌ Failed to broadcast user status:`, error);
      // Log error with safe data
      console.error(`User status data: userId=${userId}, isOnline=${isOnline}`);
    }
  }

  // Get connection statistics
  public getConnectionStats() {
    const totalConnections = this.connectedUsers.size;
    const roleStats: Record<string, number> = {};
    
    this.connectedUsers.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });

    return {
      totalConnections,
      roleStats,
      connectedUsers: Array.from(this.connectedUsers.values())
    };
  }

  // Graceful shutdown
  public async shutdown() {
    console.log('🔌 Shutting down WebSocket service...');
    
    // Notify all connected clients
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.io.close();
    
    // Clear internal state
    this.connectedUsers.clear();
    this.userSockets.clear();
    
    console.log('✅ WebSocket service shutdown complete');
  }
}

// Singleton instance
let websocketService: WebSocketService | null = null;

export function initializeWebSocketService(server: HTTPServer): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
    console.log('🔌 WebSocket service initialized');
  }
  return websocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return websocketService;
}

export default WebSocketService;
