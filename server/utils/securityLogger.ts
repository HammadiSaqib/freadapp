import * as fs from 'fs';
import * as path from 'path';
import { ENV_CONFIG } from '../config/environment.js';

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGIN_BLOCKED = 'login_blocked',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_CHANGED = 'password_changed',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SECURITY_VIOLATION = 'security_violation',
  
  // WebSocket related events
  WEBSOCKET_GUEST_CONNECTION = 'websocket_guest_connection',
  WEBSOCKET_AUTH_SUCCESS = 'websocket_auth_success',
  WEBSOCKET_AUTH_FAILED = 'websocket_auth_failed',
  WEBSOCKET_DISCONNECTED = 'websocket_disconnected',
  WEBSOCKET_BROADCAST_ERROR = 'websocket_broadcast_error',
  PLAN_BROADCAST_ERROR = 'plan_broadcast_error',
  SUBSCRIPTION_BROADCAST_ERROR = 'subscription_broadcast_error',
  STATS_BROADCAST_ERROR = 'stats_broadcast_error',
  CHAT_BROADCAST_ERROR = 'chat_broadcast_error'
}

// Security log entry interface
export interface SecurityLogEntry {
  timestamp: string;
  level: LogLevel;
  eventType: SecurityEventType | string;
  userId?: number;
  email?: string;
  ip: string;
  userAgent: string;
  message: string;
  metadata?: Record<string, any>;
  riskScore?: number;
}

// Audit log entry interface
export interface AuditLogEntry {
  timestamp: string;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string | number;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

class SecurityLogger {
  private logDir: string;
  private securityLogFile: string;
  private auditLogFile: string;
  private errorLogFile: string;
  private currentLogLevel: LogLevel;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.securityLogFile = path.join(this.logDir, 'security.log');
    this.auditLogFile = path.join(this.logDir, 'audit.log');
    this.errorLogFile = path.join(this.logDir, 'error.log');
    
    // Set log level based on environment
    this.currentLogLevel = this.getLogLevelFromString(ENV_CONFIG.LOG_LEVEL);
    
    this.ensureLogDirectory();
  }

  private getLogLevelFromString(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }

  private writeToFile(filePath: string, content: string): void {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} ${content}\n`;
      fs.appendFileSync(filePath, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private formatSecurityLog(entry: SecurityLogEntry): string {
    const levelStr = LogLevel[entry.level];
    const metadata = entry.metadata ? JSON.stringify(entry.metadata) : '';
    const riskScore = entry.riskScore ? `[RISK:${entry.riskScore}]` : '';
    
    return `[${levelStr}] [${entry.eventType}] ${riskScore} User:${entry.userId || 'N/A'}(${entry.email || 'N/A'}) IP:${entry.ip} UA:${entry.userAgent} - ${entry.message} ${metadata}`;
  }

  private formatAuditLog(entry: AuditLogEntry): string {
    const status = entry.success ? 'SUCCESS' : 'FAILED';
    const oldValues = entry.oldValues ? JSON.stringify(entry.oldValues) : '';
    const newValues = entry.newValues ? JSON.stringify(entry.newValues) : '';
    const error = entry.errorMessage ? `Error: ${entry.errorMessage}` : '';
    
    return `[${status}] User:${entry.userId} Action:${entry.action} Resource:${entry.resource}(${entry.resourceId || 'N/A'}) IP:${entry.ip} Old:${oldValues} New:${newValues} ${error}`;
  }

  private inferLevelFromEventType(eventType: string): LogLevel {
    const normalized = eventType.toLowerCase();
    if (normalized.includes('error') || normalized.includes('failed') || normalized.includes('unauthorized') || normalized.includes('violation')) {
      return LogLevel.ERROR;
    }
    if (normalized.includes('warn') || normalized.includes('blocked') || normalized.includes('locked')) {
      return LogLevel.WARN;
    }
    return LogLevel.INFO;
  }

  // Security event logging
  logSecurityEvent(entry: Omit<SecurityLogEntry, 'timestamp'>): void;
  logSecurityEvent(eventType: SecurityEventType | string, metadata?: Record<string, any>): void;
  logSecurityEvent(
    entryOrEventType: Omit<SecurityLogEntry, 'timestamp'> | (SecurityEventType | string),
    metadata?: Record<string, any>
  ): void {
    const entry: Omit<SecurityLogEntry, 'timestamp'> = typeof entryOrEventType === 'string'
      ? {
          level: this.inferLevelFromEventType(entryOrEventType),
          eventType: entryOrEventType,
          userId: typeof metadata?.userId === 'number' ? metadata.userId : undefined,
          email: typeof metadata?.email === 'string' ? metadata.email : undefined,
          ip: typeof metadata?.ip === 'string' ? metadata.ip : 'unknown',
          userAgent: typeof metadata?.userAgent === 'string' ? metadata.userAgent : 'unknown',
          message: typeof metadata?.message === 'string' ? metadata.message : entryOrEventType,
          metadata,
          riskScore: typeof metadata?.riskScore === 'number' ? metadata.riskScore : undefined
        }
      : entryOrEventType;

    if (!this.shouldLog(entry.level)) {
      return;
    }

    const fullEntry: SecurityLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const logContent = this.formatSecurityLog(fullEntry);
    this.writeToFile(this.securityLogFile, logContent);

    // Also log to console in development
    if (ENV_CONFIG.NODE_ENV === 'development') {
      console.log(`🔒 SECURITY: ${logContent}`);
    }

    // Log critical events to error log as well
    if (entry.level === LogLevel.ERROR) {
      this.writeToFile(this.errorLogFile, logContent);
    }
  }

  // Audit trail logging
  logAuditEvent(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const logContent = this.formatAuditLog(fullEntry);
    this.writeToFile(this.auditLogFile, logContent);

    // Also log to console in development
    if (ENV_CONFIG.NODE_ENV === 'development') {
      console.log(`📋 AUDIT: ${logContent}`);
    }
  }

  // Convenience methods for common security events
  logLoginSuccess(userId: number, email: string, ip: string, userAgent: string): void {
    this.logSecurityEvent({
      level: LogLevel.INFO,
      eventType: SecurityEventType.LOGIN_SUCCESS,
      userId,
      email,
      ip,
      userAgent,
      message: 'User logged in successfully'
    });
  }

  logLoginFailure(email: string, ip: string, userAgent: string, reason: string): void {
    this.logSecurityEvent({
      level: LogLevel.WARN,
      eventType: SecurityEventType.LOGIN_FAILURE,
      email,
      ip,
      userAgent,
      message: `Login failed: ${reason}`,
      riskScore: 3
    });
  }

  logAccountLocked(userId: number, email: string, ip: string, userAgent: string): void {
    this.logSecurityEvent({
      level: LogLevel.ERROR,
      eventType: SecurityEventType.ACCOUNT_LOCKED,
      userId,
      email,
      ip,
      userAgent,
      message: 'Account locked due to multiple failed login attempts',
      riskScore: 8
    });
  }

  logUnauthorizedAccess(path: string, ip: string, userAgent: string, userId?: number): void {
    this.logSecurityEvent({
      level: LogLevel.ERROR,
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      userId,
      ip,
      userAgent,
      message: `Unauthorized access attempt to ${path}`,
      metadata: { path },
      riskScore: 7
    });
  }

  logRateLimitExceeded(ip: string, userAgent: string, endpoint: string): void {
    this.logSecurityEvent({
      level: LogLevel.WARN,
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip,
      userAgent,
      message: `Rate limit exceeded for endpoint ${endpoint}`,
      metadata: { endpoint },
      riskScore: 5
    });
  }

  logSuspiciousActivity(description: string, ip: string, userAgent: string, userId?: number, metadata?: Record<string, any>): void {
    this.logSecurityEvent({
      level: LogLevel.ERROR,
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ip,
      userAgent,
      message: description,
      metadata,
      riskScore: 9
    });
  }

  logDataAccess(userId: number, resource: string, resourceId: string | number, ip: string, userAgent: string): void {
    this.logAuditEvent({
      userId,
      action: 'READ',
      resource,
      resourceId,
      ip,
      userAgent,
      success: true
    });
  }

  logDataModification(
    userId: number,
    action: string,
    resource: string,
    resourceId: string | number,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    ip: string,
    userAgent: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    this.logAuditEvent({
      userId,
      action,
      resource,
      resourceId,
      oldValues,
      newValues,
      ip,
      userAgent,
      success,
      errorMessage
    });
  }

  // Log rotation (simple implementation)
  rotateLogsIfNeeded(): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const files = [this.securityLogFile, this.auditLogFile, this.errorLogFile];

    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          if (stats.size > maxSize) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = `${file}.${timestamp}`;
            fs.renameSync(file, rotatedFile);
            console.log(`📋 Rotated log file: ${file} -> ${rotatedFile}`);
          }
        }
      } catch (error) {
        console.error(`Failed to rotate log file ${file}:`, error);
      }
    });
  }

  // Get recent security events (for monitoring dashboard)
  getRecentSecurityEvents(limit: number = 100): SecurityLogEntry[] {
    try {
      if (!fs.existsSync(this.securityLogFile)) {
        return [];
      }

      const content = fs.readFileSync(this.securityLogFile, 'utf8');
      const lines = content.trim().split('\n');
      const recentLines = lines.slice(-limit);

      return recentLines.map(line => {
        // Simple parsing - in production, consider using structured logging
        const parts = line.split(' ');
        return {
          timestamp: parts[0],
          level: LogLevel.INFO, // Default
          eventType: SecurityEventType.SECURITY_VIOLATION, // Default
          ip: 'unknown',
          userAgent: 'unknown',
          message: line
        };
      });
    } catch (error) {
      console.error('Failed to read security log:', error);
      return [];
    }
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

// Export the SecurityLogger class
export { SecurityLogger };

// Export convenience functions
export const logSecurityEvent = (entry: Omit<SecurityLogEntry, 'timestamp'>) => 
  securityLogger.logSecurityEvent(entry);

export const logAuditEvent = (entry: Omit<AuditLogEntry, 'timestamp'>) => 
  securityLogger.logAuditEvent(entry);

export const logLoginSuccess = (userId: number, email: string, ip: string, userAgent: string) =>
  securityLogger.logLoginSuccess(userId, email, ip, userAgent);

export const logLoginFailure = (email: string, ip: string, userAgent: string, reason: string) =>
  securityLogger.logLoginFailure(email, ip, userAgent, reason);

export const logUnauthorizedAccess = (path: string, ip: string, userAgent: string, userId?: number) =>
  securityLogger.logUnauthorizedAccess(path, ip, userAgent, userId);

export const logSuspiciousActivity = (description: string, ip: string, userAgent: string, userId?: number, metadata?: Record<string, any>) =>
  securityLogger.logSuspiciousActivity(description, ip, userAgent, userId, metadata);

export default securityLogger;