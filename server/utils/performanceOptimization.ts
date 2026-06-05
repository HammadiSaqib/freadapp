import { Database } from 'better-sqlite3';
import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';
import { SecurityLogger } from './securityLogger';

// Performance monitoring interface
interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  parameters?: any[];
  resultCount?: number;
  cacheHit?: boolean;
}

// Cache configuration
interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  updateAgeOnGet: boolean;
}

// Query optimization patterns
interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  indexSuggestions: string[];
  estimatedImprovement: number;
}

// Performance optimizer class
export class DatabasePerformanceOptimizer {
  private queryCache: LRUCache<string, any>;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private securityLogger: SecurityLogger;
  private slowQueryThreshold: number = 1000; // 1 second
  private cacheConfig: CacheConfig;

  constructor(cacheConfig: CacheConfig = {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5 minutes
    updateAgeOnGet: true
  }) {
    this.cacheConfig = cacheConfig;
    this.queryCache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
      updateAgeOnGet: cacheConfig.updateAgeOnGet
    });
    this.securityLogger = new SecurityLogger();
  }

  // Execute query with performance monitoring and caching
  async executeOptimizedQuery<T>(
    db: Database,
    query: string,
    parameters: any[] = [],
    options: {
      cacheable?: boolean;
      cacheKey?: string;
      timeout?: number;
    } = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const cacheKey = options.cacheKey || this.generateCacheKey(query, parameters);
    
    // Check cache first if cacheable
    if (options.cacheable !== false) {
      const cachedResult = this.queryCache.get(cacheKey);
      if (cachedResult) {
        const endTime = performance.now();
        this.recordMetrics({
          query,
          executionTime: endTime - startTime,
          timestamp: new Date(),
          parameters,
          resultCount: cachedResult.length,
          cacheHit: true
        });
        return cachedResult;
      }
    }

    try {
      // Execute query with timeout
      const stmt = db.prepare(query);
      const result = stmt.all(...parameters) as T[];
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Cache result if cacheable
      if (options.cacheable !== false && result.length > 0) {
        this.queryCache.set(cacheKey, result);
      }

      // Record performance metrics
      this.recordMetrics({
        query,
        executionTime,
        timestamp: new Date(),
        parameters,
        resultCount: result.length,
        cacheHit: false
      });

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        this.securityLogger.logSecurityEvent('SLOW_QUERY_DETECTED', {
          query: this.sanitizeQueryForLogging(query),
          executionTime,
          resultCount: result.length,
          threshold: this.slowQueryThreshold
        });
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      this.securityLogger.logSecurityEvent('QUERY_EXECUTION_ERROR', {
        query: this.sanitizeQueryForLogging(query),
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: endTime - startTime
      });
      throw error;
    }
  }

  // Generate cache key from query and parameters
  private generateCacheKey(query: string, parameters: any[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
    const paramString = JSON.stringify(parameters);
    return `${normalizedQuery}:${paramString}`;
  }

  // Record performance metrics
  private recordMetrics(metrics: QueryPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  // Sanitize query for logging (remove sensitive data)
  private sanitizeQueryForLogging(query: string): string {
    return query
      .replace(/\b\d{4}\b/g, 'XXXX') // Mask potential SSN last 4
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'EMAIL_MASKED') // Mask emails
      .replace(/\b\d{10,}\b/g, 'PHONE_MASKED'); // Mask phone numbers
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    cacheHitRate: number;
    topSlowQueries: QueryPerformanceMetrics[];
  } {
    const totalQueries = this.performanceMetrics.length;
    const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length;
    const slowQueries = this.performanceMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
    
    const averageExecutionTime = totalQueries > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
      : 0;
    
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    
    const topSlowQueries = this.performanceMetrics
      .filter(m => !m.cacheHit)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      cacheHitRate,
      topSlowQueries
    };
  }

  // Clear cache
  clearCache(): void {
    this.queryCache.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    const totalQueries = this.performanceMetrics.length;
    const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length;
    
    return {
      size: this.queryCache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
    };
  }
}

// Query optimization suggestions
export class QueryOptimizer {
  // Analyze query and suggest optimizations
  static analyzeQuery(query: string): QueryOptimization {
    const suggestions: string[] = [];
    let optimizedQuery = query;
    let estimatedImprovement = 0;

    // Check for missing WHERE clauses in SELECT statements
    if (query.toLowerCase().includes('select') && !query.toLowerCase().includes('where')) {
      suggestions.push('Consider adding WHERE clause to limit result set');
      estimatedImprovement += 20;
    }

    // Check for SELECT * usage
    if (query.toLowerCase().includes('select *')) {
      suggestions.push('Avoid SELECT *, specify only needed columns');
      optimizedQuery = query.replace(/select \*/gi, 'SELECT specific_columns');
      estimatedImprovement += 15;
    }

    // Check for missing LIMIT in potentially large result sets
    if (query.toLowerCase().includes('select') && !query.toLowerCase().includes('limit')) {
      suggestions.push('Consider adding LIMIT clause for large result sets');
      estimatedImprovement += 10;
    }

    // Check for inefficient LIKE patterns
    if (query.toLowerCase().includes('like \'%')) {
      suggestions.push('Leading wildcard in LIKE prevents index usage');
      estimatedImprovement += 25;
    }

    // Check for missing indexes on commonly queried columns
    const whereMatch = query.match(/where\s+(\w+)\s*=/gi);
    if (whereMatch) {
      whereMatch.forEach(match => {
        const column = match.replace(/where\s+|\s*=/gi, '');
        suggestions.push(`Consider adding index on column: ${column}`);
      });
      estimatedImprovement += 30;
    }

    // Check for inefficient JOINs
    if (query.toLowerCase().includes('join') && !query.toLowerCase().includes('on')) {
      suggestions.push('Ensure JOINs have proper ON conditions');
      estimatedImprovement += 40;
    }

    return {
      originalQuery: query,
      optimizedQuery,
      indexSuggestions: suggestions,
      estimatedImprovement
    };
  }

  // Generate optimized indexes based on query patterns
  static generateIndexSuggestions(queries: string[]): string[] {
    const indexSuggestions: Set<string> = new Set();

    queries.forEach(query => {
      const lowerQuery = query.toLowerCase();
      
      // Extract WHERE conditions
      const whereMatches = query.match(/where\s+(\w+)\s*[=<>]/gi);
      if (whereMatches) {
        whereMatches.forEach(match => {
          const column = match.replace(/where\s+|\s*[=<>].*/gi, '');
          indexSuggestions.add(`CREATE INDEX IF NOT EXISTS idx_${column} ON table_name(${column});`);
        });
      }

      // Extract ORDER BY columns
      const orderMatches = query.match(/order\s+by\s+(\w+)/gi);
      if (orderMatches) {
        orderMatches.forEach(match => {
          const column = match.replace(/order\s+by\s+/gi, '');
          indexSuggestions.add(`CREATE INDEX IF NOT EXISTS idx_${column}_sort ON table_name(${column});`);
        });
      }

      // Extract JOIN conditions
      const joinMatches = query.match(/join\s+\w+\s+on\s+(\w+)\s*=\s*(\w+)/gi);
      if (joinMatches) {
        joinMatches.forEach(match => {
          const parts = match.match(/on\s+(\w+)\s*=\s*(\w+)/i);
          if (parts) {
            indexSuggestions.add(`CREATE INDEX IF NOT EXISTS idx_${parts[1]}_join ON table_name(${parts[1]});`);
            indexSuggestions.add(`CREATE INDEX IF NOT EXISTS idx_${parts[2]}_join ON table_name(${parts[2]});`);
          }
        });
      }
    });

    return Array.from(indexSuggestions);
  }
}

// Connection pool manager for better resource utilization
export class ConnectionPoolManager {
  private pools: Map<string, Database[]> = new Map();
  private maxPoolSize: number = 10;
  private activeConnections: Map<string, number> = new Map();

  constructor(maxPoolSize: number = 10) {
    this.maxPoolSize = maxPoolSize;
  }

  // Get connection from pool
  getConnection(dbPath: string): Database | null {
    const pool = this.pools.get(dbPath) || [];
    const active = this.activeConnections.get(dbPath) || 0;

    if (pool.length > 0) {
      const connection = pool.pop()!;
      this.activeConnections.set(dbPath, active + 1);
      return connection;
    }

    if (active < this.maxPoolSize) {
      // Create new connection if pool not at max capacity
      const Database = require('better-sqlite3');
      const connection = new Database(dbPath);
      this.activeConnections.set(dbPath, active + 1);
      return connection;
    }

    return null; // Pool exhausted
  }

  // Return connection to pool
  releaseConnection(dbPath: string, connection: Database): void {
    const pool = this.pools.get(dbPath) || [];
    const active = this.activeConnections.get(dbPath) || 0;

    pool.push(connection);
    this.pools.set(dbPath, pool);
    this.activeConnections.set(dbPath, Math.max(0, active - 1));
  }

  // Close all connections in pool
  closeAllConnections(): void {
    this.pools.forEach((pool, dbPath) => {
      pool.forEach(connection => {
        try {
          connection.close();
        } catch (error) {
          console.error(`Error closing connection for ${dbPath}:`, error);
        }
      });
    });
    
    this.pools.clear();
    this.activeConnections.clear();
  }

  // Get pool statistics
  getPoolStats(): Record<string, { poolSize: number; activeConnections: number }> {
    const stats: Record<string, { poolSize: number; activeConnections: number }> = {};
    
    this.pools.forEach((pool, dbPath) => {
      stats[dbPath] = {
        poolSize: pool.length,
        activeConnections: this.activeConnections.get(dbPath) || 0
      };
    });
    
    return stats;
  }
}

// Batch operation optimizer
export class BatchOperationOptimizer {
  // Optimize bulk insert operations
  static optimizeBulkInsert<T>(
    db: Database,
    tableName: string,
    records: T[],
    batchSize: number = 1000
  ): { insertedCount: number; executionTime: number } {
    const startTime = performance.now();
    let insertedCount = 0;

    // Begin transaction for better performance
    const transaction = db.transaction((batch: T[]) => {
      const columns = Object.keys(batch[0] as any);
      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      const stmt = db.prepare(query);

      for (const record of batch) {
        const values = columns.map(col => (record as any)[col]);
        stmt.run(...values);
        insertedCount++;
      }
    });

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      transaction(batch);
    }

    const endTime = performance.now();
    return {
      insertedCount,
      executionTime: endTime - startTime
    };
  }

  // Optimize bulk update operations
  static optimizeBulkUpdate<T>(
    db: Database,
    tableName: string,
    updates: Array<{ id: number | string; data: Partial<T> }>,
    batchSize: number = 1000
  ): { updatedCount: number; executionTime: number } {
    const startTime = performance.now();
    let updatedCount = 0;

    const transaction = db.transaction((batch: Array<{ id: number | string; data: Partial<T> }>) => {
      for (const update of batch) {
        const columns = Object.keys(update.data);
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
        const stmt = db.prepare(query);
        
        const values = [...columns.map(col => (update.data as any)[col]), update.id];
        const result = stmt.run(...values);
        updatedCount += result.changes;
      }
    });

    // Process in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      transaction(batch);
    }

    const endTime = performance.now();
    return {
      updatedCount,
      executionTime: endTime - startTime
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new DatabasePerformanceOptimizer();
export const connectionPool = new ConnectionPoolManager();

// Utility functions
export const optimizeQuery = (query: string) => QueryOptimizer.analyzeQuery(query);
export const generateIndexes = (queries: string[]) => QueryOptimizer.generateIndexSuggestions(queries);

export default {
  DatabasePerformanceOptimizer,
  QueryOptimizer,
  ConnectionPoolManager,
  BatchOperationOptimizer,
  performanceOptimizer,
  connectionPool,
  optimizeQuery,
  generateIndexes
};