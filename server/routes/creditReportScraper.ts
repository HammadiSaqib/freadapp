/**
 * Credit Report Scraper Routes
 * 
 * API endpoints for scraping credit reports from various platforms
 */

import express from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fetchCreditReport, PLATFORMS } from '../services/scrapers/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation schema for scraper requests
const scraperRequestSchema = z.object({
  platform: z.string().min(1).refine(val => {
    return Object.values(PLATFORMS).includes(val.toLowerCase());
  }, {
    message: 'Unsupported platform'
  }),
  credentials: z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }),
  options: z.object({
    saveHtml: z.boolean().optional(),
    takeScreenshots: z.boolean().optional(),
    outputDir: z.string().optional(),
    ssnLast4: z.string().optional()
  }).optional()
});

function normalizeReportText(value: any): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toReportArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return [value];
  }

  return [];
}

function getPlatformDisplayName(platform: string): string {
  const normalizedPlatform = String(platform || '').toLowerCase();

  switch (normalizedPlatform) {
    case 'identityiq':
      return 'IdentityIQ';
    case 'smartcredit':
      return 'SmartCredit';
    case 'myscoreiq':
      return 'MyScoreIQ';
    case 'myfreescorenow':
      return 'MyFreeScoreNow';
    default:
      return platform;
  }
}

function getReportCandidates(rawReport: any): any[] {
  const seen = new Set<any>();
  const candidates: any[] = [];
  const queue = [
    rawReport,
    rawReport?.data,
    rawReport?.reportData,
    rawReport?.data?.reportData,
    rawReport?.reportData?.reportData,
    rawReport?.reportData?.data,
    rawReport?.data?.data,
    rawReport?.data?.reportData?.reportData,
  ];

  for (const candidate of queue) {
    if (!candidate || typeof candidate !== 'object' || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    candidates.push(candidate);
  }

  return candidates;
}

function extractNameFromEntry(entry: any): string {
  if (!entry || typeof entry !== 'object') {
    return '';
  }

  const fullNameFromParts = [
    normalizeReportText(entry?.FirstName ?? entry?.NameFirst),
    normalizeReportText(entry?.Middle ?? entry?.MiddleName),
    normalizeReportText(entry?.LastName ?? entry?.NameLast),
  ].filter(Boolean).join(' ').trim();

  return fullNameFromParts || normalizeReportText(entry?.FullName ?? entry?.Name);
}

function extractConsumerName(rawReport: any): string {
  for (const candidate of getReportCandidates(rawReport)) {
    for (const nameEntry of toReportArray(candidate?.Name)) {
      const extractedName = extractNameFromEntry(nameEntry);
      if (extractedName) {
        return extractedName;
      }
    }

    const personalInfoNameCandidates = [
      candidate?.personalInfo?.name,
      candidate?.PersonalInfo?.name,
      ...toReportArray(candidate?.personalInfo?.names),
      ...toReportArray(candidate?.personalInfo?.Name),
      ...toReportArray(candidate?.PersonalInfo?.names),
      ...toReportArray(candidate?.PersonalInfo?.Name),
    ];

    for (const nameEntry of personalInfoNameCandidates) {
      const extractedName = extractNameFromEntry(nameEntry);
      if (extractedName) {
        return extractedName;
      }
    }
  }

  return '';
}

function hasMeaningfulReportData(rawReport: any): boolean {
  for (const candidate of getReportCandidates(rawReport)) {
    const sections = [
      candidate?.Name,
      candidate?.Address,
      candidate?.DOB,
      candidate?.Score,
      candidate?.Employer,
      candidate?.Inquiries,
      candidate?.PublicRecords,
      candidate?.Accounts,
      candidate?.personalInfo?.names,
      candidate?.personalInfo?.addresses,
      candidate?.personalInfo?.employers,
      candidate?.personalInfo?.Name,
      candidate?.PersonalInfo?.names,
      candidate?.PersonalInfo?.Address,
      candidate?.PersonalInfo?.Employer,
    ];

    if (sections.some((section) => toReportArray(section).length > 0)) {
      return true;
    }

    if (extractNameFromEntry(candidate?.personalInfo?.name) || extractNameFromEntry(candidate?.PersonalInfo?.name)) {
      return true;
    }

    const scoreValues = Object.values(candidate?.scores || {}).filter((value) => Number(value) > 0);
    if (scoreValues.length > 0) {
      return true;
    }
  }

  return false;
}

function createInvalidScrapedReportError(reason: 'missing_client_name' | 'empty_report', message: string) {
  const error = new Error(message) as Error & {
    status?: number;
    code?: string;
    reason?: string;
  };

  error.status = 422;
  error.code = 'INVALID_SCRAPED_REPORT';
  error.reason = reason;

  return error;
}

function assertValidScrapedReport(rawReport: any, platform: string) {
  const platformDisplayName = getPlatformDisplayName(platform);
  const hasReportData = hasMeaningfulReportData(rawReport);
  const consumerName = extractConsumerName(rawReport);

  if (!hasReportData) {
    throw createInvalidScrapedReportError(
      'empty_report',
      `The ${platformDisplayName} report came back empty. The client may have updated their monitoring password, or the monitoring subscription may need renewal.`
    );
  }

  if (!consumerName) {
    throw createInvalidScrapedReportError(
      'missing_client_name',
      `We couldn't verify the client name in the ${platformDisplayName} report. Please double-check the monitoring email and password. If those are correct, the client may have updated their password or the subscription may need renewal.`
    );
  }
}

function cleanupScrapedArtifact(filePathValue: any) {
  if (!filePathValue || typeof filePathValue !== 'string') {
    return;
  }

  try {
    const resolvedPath = path.isAbsolute(filePathValue)
      ? filePathValue
      : path.resolve(process.cwd(), filePathValue);

    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  } catch (cleanupError) {
    console.warn('Failed to remove invalid scraped report artifact:', cleanupError);
  }
}

/**
 * @route POST /api/credit-reports/scrape
 * @desc Scrape credit report from specified platform
 * @access Private
 */
router.post('/scrape', authenticateToken, async (req, res) => {
  let artifactPath: string | null = null;

  try {
    // Validate request body
    const validationResult = scraperRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors
      });
    }
    
    const { platform, credentials, options } = validationResult.data;
    const { clientId } = req.query;
    
    // Set default options
    const scraperOptions = {
      saveHtml: false,
      takeScreenshots: false,
      outputDir: './scraper-output',
      clientId: clientId ? parseInt(clientId as string) : undefined,
      ...options
    };
    
    // Start scraping process
    console.log(`Starting credit report scrape for platform: ${platform}${clientId ? ` for client ID: ${clientId}` : ''}`);
    
    const result = await fetchCreditReport(
      platform,
      credentials.username,
      credentials.password,
      scraperOptions
    );
    
    // Extract reportData and filePath from the result
    const { reportData, filePath } = result;
    artifactPath = filePath || reportData?.filePath || null;

    assertValidScrapedReport(reportData, platform);
    
    // Save report history to database
    const historyData = {
      client_id: clientId,
      platform: platform,
      report_path: filePath || reportData.filePath || null,
      status: 'completed'
    };
    
    // Import database functions
    const { getDatabase } = await import('../database/schema');
    const db = getDatabase();
    
    // Insert history data into credit_report_history table
    await new Promise((resolve, reject) => {
      const insertSql = `
        INSERT INTO credit_report_history 
        (client_id, platform, report_path, status) 
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(
        insertSql, 
        [historyData.client_id, historyData.platform, historyData.report_path, historyData.status],
        function(err) {
          if (err) {
            console.error('Failed to save credit report history:', err);
            reject(err);
            return;
          }
          console.log('Credit report history saved successfully, ID:', this.lastID);
          resolve(this.lastID);
        }
      );
    });
    
    return res.status(200).json({
      success: true,
      message: 'Credit report scraped successfully',
      data: reportData,
      filePath: filePath
    });
  } catch (error) {
    console.error('Credit report scraper error:', error);

    if ((error as any)?.code === 'INVALID_SCRAPED_REPORT') {
      cleanupScrapedArtifact(artifactPath);
    }

    const statusCode = Number((error as any)?.status) || 500;
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to scrape credit report',
      code: (error as any)?.code,
      reason: (error as any)?.reason,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/platforms
 * @desc Get list of supported platforms
 * @access Private
 */
router.get('/platforms', authenticateToken, (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      platforms: Object.values(PLATFORMS)
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch supported platforms'
    });
  }
});

/**
 * @route GET /api/credit-reports/json-file
 * @desc Get content of a JSON file
 * @access Private
 */
router.get('/json-file', authenticateToken, async (req, res) => {
  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Read the JSON file
    const fileContent = fs.readFileSync(path, 'utf8');
    let jsonData;
    
    try {
      jsonData = JSON.parse(fileContent);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON file'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: jsonData
    });
  } catch (error) {
    console.error('Error reading JSON file:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to read JSON file',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/history
 * @desc Get credit report history for a client or all clients
 * @access Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.query;
    const userId = req.user.id;
    
    console.log('🔍 DEBUG: GET /api/credit-reports/history request received');
    console.log('🔍 DEBUG: User ID:', userId);
    console.log('🔍 DEBUG: Client ID:', clientId || 'not specified');
    console.log('🔍 DEBUG: Is Super Admin:', req.user.is_super_admin ? 'Yes' : 'No');
    console.log('🔍 DEBUG: User object:', JSON.stringify(req.user, null, 2));
    
    // Import database functions from schema
    const { getDatabase, allQuery, getQuery } = await import('../database/schema');
    const db = getDatabase();
    
    // Build query based on whether clientId is provided
    let query = `
      SELECT 
        crh.id, 
        crh.client_id, 
        crh.platform,
        crh.report_path,
        crh.status,
        crh.created_at as report_date,
        crh.created_at,
        crh.experian_score,
        crh.equifax_score,
        crh.transunion_score,
        crh.credit_score,
        c.first_name, 
        c.last_name, 
        c.previous_credit_score
      FROM credit_report_history crh
      LEFT JOIN clients c ON crh.client_id = c.id
    `;
    
    const queryParams = [];
    
    // Add user filter if not a super admin
    if (!req.user.is_super_admin) {
      query += ' WHERE c.user_id = ?';
      queryParams.push(userId);
    }
    
    // Add client filter if clientId is provided
    if (clientId) {
      query += queryParams.length > 0 ? ' AND crh.client_id = ?' : ' WHERE crh.client_id = ?';
      queryParams.push(clientId);
    }
    
    query += ' ORDER BY crh.created_at DESC';
    
    console.log('🔍 DEBUG: SQL Query:', query);
    console.log('🔍 DEBUG: Query Parameters:', queryParams);
    
    try {
      // Execute the query using the database adapter functions directly
      const reports = await allQuery(query, queryParams);
      console.log('🔍 DEBUG: Query returned rows:', reports ? reports.length : 0);
      
      // Process reports to include score data from database columns
      const reportsWithData = [];
      
      if (reports && reports.length > 0) {
        console.log('🔍 DEBUG: First row sample:', JSON.stringify(reports[0], null, 2));
        
        for (const report of reports) {
          let reportWithData = { ...report };
          
          // Create reportData structure using database columns
          reportWithData.reportData = {
            Score: []
          };
          
          // Add scores from database columns if they exist
          if (report.experian_score) {
            reportWithData.reportData.Score.push({
              BureauId: 1,
              Score: report.experian_score.toString(),
              ScoreType: "VantageScore3",
              DateScore: report.created_at
            });
          }
          
          if (report.equifax_score) {
            reportWithData.reportData.Score.push({
              BureauId: 2,
              Score: report.equifax_score.toString(),
              ScoreType: "VantageScore3",
              DateScore: report.created_at
            });
          }
          
          if (report.transunion_score) {
            reportWithData.reportData.Score.push({
              BureauId: 3,
              Score: report.transunion_score.toString(),
              ScoreType: "VantageScore3",
              DateScore: report.created_at
            });
          }
          
          console.log('🔍 DEBUG: Created reportData for report ID:', report.id, 'with', reportWithData.reportData.Score.length, 'scores');
          
          reportsWithData.push(reportWithData);
        }
      } else {
        console.log('🔍 DEBUG: No rows returned from query');
        
        // Check if the table exists and has data
        const dbType = process.env.DATABASE_URL?.startsWith('mysql://') ? 'mysql' : 'sqlite';
        
        if (dbType === 'mysql') {
          const tableExists = await getQuery(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?", 
            [process.env.MYSQL_DATABASE || 'creditrepair_db', 'credit_report_history']
          );
          console.log('🔍 DEBUG: credit_report_history table exists:', tableExists && tableExists.count > 0 ? 'Yes' : 'No');
          
          if (tableExists && tableExists.count > 0) {
            const rowCount = await getQuery("SELECT COUNT(*) as count FROM credit_report_history", []);
            console.log('🔍 DEBUG: Total rows in credit_report_history:', rowCount ? rowCount.count : 'unknown');
          }
        } else {
          // SQLite check
          const tableExists = await getQuery(
            "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='credit_report_history'", []
          );
          console.log('🔍 DEBUG: credit_report_history table exists:', tableExists && tableExists.count > 0 ? 'Yes' : 'No');
          
          if (tableExists && tableExists.count > 0) {
            const rowCount = await getQuery("SELECT count(*) as count FROM credit_report_history", []);
            console.log('🔍 DEBUG: Total rows in credit_report_history:', rowCount ? rowCount.count : 'unknown');
          }
        }
      }
      
      return res.status(200).json({
        success: true,
        data: reportsWithData
      });
    } catch (error) {
      console.error('Error fetching credit report history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch credit report history',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error fetching credit report history:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch credit report history',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/client/:clientId
 * @desc Get latest credit report for a specific client
 * @access Private
 */
// Client-specific credit report endpoint for dashboard
router.get('/client/:clientId', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const numericClientId = Number(clientId);
    
    console.log('🔍 DEBUG: Fetching credit report for client', clientId, 'user', userId, 'role', userRole);

    if (!Number.isFinite(numericClientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID'
      });
    }
    
    // Match the client workspace ownership rules used elsewhere in the app.
    const db = getDatabaseAdapter();
    const normalizedRole = String(userRole || '').toLowerCase();
    const isFundingManager = normalizedRole === 'funding_manager';
    const isSuperAdmin = normalizedRole === 'super_admin';
    const isClient = normalizedRole === 'client';
    let hasClientAccess = false;

    if (isFundingManager || isSuperAdmin) {
      hasClientAccess = true;
    } else if (isClient) {
      hasClientAccess = Number(userId) === numericClientId;
    } else {
      let baseUserId = Number(userId);

      if (normalizedRole !== 'admin') {
        const employeeLinks = await db.executeQuery(
          'SELECT admin_id FROM employees WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT 1',
          [userId, 'active']
        );
        if (Array.isArray(employeeLinks) && (employeeLinks[0] as any)?.admin_id) {
          baseUserId = Number((employeeLinks[0] as any).admin_id);
        }
      }

      const accessibleClients = await db.executeQuery(
        `SELECT id
         FROM clients
         WHERE id = ?
           AND (user_id = ? OR user_id IN (
             SELECT user_id FROM employees WHERE admin_id = ? AND status = ?
           ))
         LIMIT 1`,
        [numericClientId, baseUserId, baseUserId, 'active']
      );
      hasClientAccess = Array.isArray(accessibleClients) && accessibleClients.length > 0;
    }

    if (!hasClientAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }
    
    // Use the MySQL connection directly for debugging
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'creditrepair_db'
    });

    const [rows] = await connection.execute(
      `SELECT 
        crh.id,
        crh.client_id,
        crh.platform,
        crh.report_path,
        crh.status,
        crh.created_at,
        c.first_name,
        c.last_name,
        c.platform_email as email
      FROM credit_report_history crh
      JOIN clients c ON crh.client_id = c.id
      WHERE crh.client_id = ?
      ORDER BY crh.created_at DESC
      LIMIT 1`,
      [numericClientId]
    );
    
    await connection.end();
    
    console.log('🔍 DEBUG: Direct MySQL query returned', rows?.length || 0, 'rows');
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No credit report found for this client'
      });
    }
    
    const reportRecord = rows[0]; // Get first result from array
    
    // Read the report file
    if (reportRecord.report_path) {
      let reportData = {};
      try {
        const typedReport = reportRecord as { report_path?: string; first_name?: string; last_name?: string };
        
        console.log('🔍 DEBUG: Attempting to load file from path:', typedReport.report_path);
        
        // Handle both absolute and relative paths
        let fullPath = typedReport.report_path;
        if (typedReport.report_path && !path.isAbsolute(typedReport.report_path)) {
          fullPath = path.join(process.cwd(), typedReport.report_path);
        }
        
        console.log('🔍 DEBUG: Full resolved path:', fullPath);
        console.log('🔍 DEBUG: File exists check:', fs.existsSync(fullPath));
        
        if (typedReport.report_path && fs.existsSync(fullPath)) {
          // Read from JSON file
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          const parsedContent = JSON.parse(fileContent);
          reportData = parsedContent.reportData || parsedContent;
          console.log('🔍 DEBUG: Successfully loaded JSON file data');
          console.log('🔍 DEBUG: reportData keys:', Object.keys(reportData));
        } else {
          console.log('❌ DEBUG: File does not exist at path:', fullPath);
        }
      } catch (err) {
        console.error('Error parsing report data:', err);
        return res.status(500).json({
          success: false,
          message: 'Error reading credit report file'
        });
      }
      
      // Return the same structure as funding manager endpoint
      return res.status(200).json({
        success: true,
        data: {
          metadata: {
            ...reportRecord,
            client_name: `${reportRecord.first_name || ''} ${reportRecord.last_name || ''}`.trim()
          },
          reportData: reportData
        }
      });
    }
    
    // If no report path, return basic info with same structure
    return res.status(200).json({
      success: true,
      data: {
        metadata: {
          ...reportRecord,
          client_name: `${reportRecord.first_name || ''} ${reportRecord.last_name || ''}`.trim()
        },
        reportData: {}
      }
    });
  } catch (error) {
    console.error('Error fetching credit report by client ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/credit-reports/:id
 * @desc Get specific credit report by ID
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    
    // Import database functions from schema
    const { getDatabase } = await import('../database/schema');
    const db = getDatabase();
    
    // First verify that the report belongs to a client of the current user
    const report = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          cr.id, 
          cr.client_id, 
          c.first_name, 
          c.last_name, 
          cr.bureau, 
          cr.score as credit_score, 
          c.previous_credit_score, 
          cr.accounts_total, 
          cr.negative_accounts, 
          cr.inquiries_count, 
          cr.public_records, 
          cr.report_date,
          cr.report_data,
          cr.json_file_path,
          cr.created_at
        FROM credit_reports cr
        JOIN clients c ON cr.client_id = c.id
        WHERE cr.id = ? AND c.user_id = ?`,
        [reportId, userId],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Credit report not found'
      });
    }
    
    // Parse the report_data JSON or read from file
    let reportData = {};
    try {
      const typedReport = report as { json_file_path?: string; report_data?: string; first_name?: string; last_name?: string };
      
      if (typedReport.json_file_path && fs.existsSync(typedReport.json_file_path)) {
        // Read from JSON file if path exists
        const fileContent = fs.readFileSync(typedReport.json_file_path, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        reportData = parsedContent.reportData || {};
      } else if (typedReport.report_data) {
        // Fallback to report_data field if file doesn't exist
        reportData = JSON.parse(typedReport.report_data);
      }
    } catch (err) {
      console.error('Error parsing report data:', err);
    }
    
    // Combine the report metadata with the parsed report data
    const typedReport = report as Record<string, any>;
    const fullReport = {
      ...typedReport,
      client_name: `${typedReport.first_name || ''} ${typedReport.last_name || ''}`,
      report_data: reportData
    };
    
    return res.status(200).json({
      success: true,
      data: fullReport
    });
  } catch (error) {
    console.error('Error fetching credit report:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch credit report',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route GET /api/credit-reports/fetch
 * @desc Fetch credit report from specified platform
 * @access Private
 */
router.get('/fetch', authenticateToken, async (req, res) => {
  let artifactPath: string | null = null;

  try {
    // Get query parameters
    const { platform, username, password, clientId, ssnLast4 } = req.query;
    
    // Validate required parameters
    if (!platform || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: platform, username, and password are required'
      });
    }
    
    // Validate platform
    if (!Object.values(PLATFORMS).includes(platform.toString().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported platform'
      });
    }
    
    // Set default options
    const scraperOptions = {
      saveHtml: false,
      takeScreenshots: false,
      outputDir: './scraper-output',
      clientId: clientId ? parseInt(clientId as string, 10) : undefined,
      ...(ssnLast4 ? { ssnLast4: String(ssnLast4) } : {})
    };
    
    console.log(`Fetching credit report for platform: ${platform}${clientId ? `, client ID: ${clientId}` : ''}`);
    
    // Start scraping process
    console.log(`Starting credit report fetch for platform: ${platform}`);
    
    const result = await fetchCreditReport(
      platform.toString(),
      username.toString(),
      password.toString(),
      scraperOptions
    );
    
    // Extract reportData and filePath from the result
    const { reportData, filePath } = result;
    artifactPath = filePath || reportData?.filePath || null;

    assertValidScrapedReport(reportData, platform.toString());
    
    return res.status(200).json({
      success: true,
      message: 'Credit report fetched successfully',
      data: reportData,
      filePath: filePath
    });
  } catch (error) {
    console.error('Credit report fetch error:', error);

    if ((error as any)?.code === 'INVALID_SCRAPED_REPORT') {
      cleanupScrapedArtifact(artifactPath);
    }

    const statusCode = Number((error as any)?.status) || 500;
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to fetch credit report',
      code: (error as any)?.code,
      reason: (error as any)?.reason,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});



export default router;
