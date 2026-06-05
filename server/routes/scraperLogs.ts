/**
 * Scraper Logs Routes
 * 
 * API endpoints for managing the test-scraper.cjs script and displaying logs
 */

import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const router = express.Router();

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test-scraper.cjs file
const scraperPath = path.resolve(__dirname, '../../test-scraper.cjs');

// Store the server process
let serverProcess: any = null;

// Validation schema for scraper requests
const scraperRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  clientId: z.number().optional()
});

/**
 * @route POST /api/scraper/start-server
 * @desc Start the test scraper server
 * @access Private
 */
router.post('/start-server', authenticateToken, async (req, res) => {
  try {
    // Check if server is already running
    if (serverProcess) {
      return res.status(400).json({
        success: false,
        message: 'Server is already running'
      });
    }
    
    // Start the server process without hardcoded credentials
    serverProcess = spawn('node', [scraperPath, '--server'], {
      cwd: path.resolve(__dirname, '../..')
    });
    
    let output = '';
    let error = '';
    
    // Collect output
    serverProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data: Buffer) => {
      error += data.toString();
    });
    
    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    if (error && !output.includes('Test server running')) {
      serverProcess.kill();
      serverProcess = null;
      
      return res.status(500).json({
        success: false,
        message: 'Failed to start server',
        error
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Server started successfully',
      output
    });
  } catch (error: any) {
    console.error('Error starting server:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to start server',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scraper/stop-server
 * @desc Stop the test scraper server
 * @access Private
 */
router.post('/stop-server', authenticateToken, (req, res) => {
  try {
    // Check if server is running
    if (!serverProcess) {
      return res.status(400).json({
        success: false,
        message: 'Server is not running'
      });
    }
    
    // Stop the server process
    serverProcess.kill();
    serverProcess = null;
    
    return res.status(200).json({
      success: true,
      message: 'Server stopped successfully'
    });
  } catch (error: any) {
    console.error('Error stopping server:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to stop server',
      error: error.message
    });
  }
});

/**
 * @route POST /api/scraper/run
 * @desc Run the test scraper
 * @access Private
 */
router.post('/run', authenticateToken, async (req, res) => {
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
    
    const { username, password, clientId } = validationResult.data;
    
    // Prepare command arguments
    const args = [scraperPath, username, password];
    if (clientId) {
      args.push(clientId.toString());
    }
    
    // Run the scraper
    const scraperProcess = spawn('node', args, {
      cwd: path.resolve(__dirname, '../..')
    });
    
    let output = '';
    let error = '';
    const logs: any[] = [];
    
    // Collect output
    scraperProcess.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      output += chunk;
      
      // Parse log entries
      chunk.split('\n').forEach(line => {
        if (line.trim()) {
          let level = 'info';
          if (line.includes('✅')) level = 'success';
          if (line.includes('❌')) level = 'error';
          if (line.includes('⚠️')) level = 'warning';
          
          logs.push({
            timestamp: new Date().toISOString(),
            message: line.trim(),
            level
          });
        }
      });
    });
    
    scraperProcess.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString();
      error += chunk;
      
      // Parse error entries
      chunk.split('\n').forEach(line => {
        if (line.trim()) {
          logs.push({
            timestamp: new Date().toISOString(),
            message: line.trim(),
            level: 'error'
          });
        }
      });
    });
    
    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      scraperProcess.on('close', resolve);
    });
    
    // Parse the result data
    let resultData = null;
    try {
      // Look for JSON data in the output
      const jsonMatch = output.match(/\{[\s\S]*?\"scores\"[\s\S]*?\}/g);
      if (jsonMatch) {
        try {
          resultData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Error parsing JSON from regex match:', parseError);
          
          try {
            // Try to extract a more precise JSON object using a stricter regex
            const stricterJsonMatch = output.match(/\{[\s\S]*?"scores"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g);
            if (stricterJsonMatch) {
              resultData = JSON.parse(stricterJsonMatch[0]);
              console.log('Recovered JSON data using stricter regex pattern');
            } else {
              // Try to clean the string by removing control characters
              const cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
              try {
                resultData = JSON.parse(cleanedJson);
                console.log('Recovered JSON data by cleaning control characters');
              } catch (cleanError) {
                console.error('Failed to parse cleaned JSON:', cleanError);
                
                // Try more aggressive approach to fix JSON format issues
                let sanitizedJson = jsonMatch[0].replace(/[^\x20-\x7E]/g, ''); // Remove non-printable chars
                
                // Fix common JSON syntax issues
                sanitizedJson = sanitizedJson
                  .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Ensure property names are quoted
                  .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
                  .replace(/,\s*}/g, '}') // Remove trailing commas in objects
                  .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
                  .replace(/\\'/g, "'") // Fix escaped single quotes
                  .replace(/\\"/g, '\\"') // Ensure double quotes are properly escaped
                  .replace(/"\s*\n\s*"/g, '","') // Fix newlines between strings
                  .replace(/"\s*\r\s*"/g, '","'); // Fix carriage returns between strings
                  
                // Fix unterminated strings - look for strings that start with " but don't end with "
                const stringRegex = /"[^"\\]*(?:\\.[^"\\]*)*(?=[,}\]])/g;
                sanitizedJson = sanitizedJson.replace(stringRegex, (match) => match + '"');
                
                // Additional fix for unterminated strings at the end of the JSON
                if (sanitizedJson.match(/"[^"]*$/)) {
                  sanitizedJson += '"';
                }
                
                try {
                  resultData = JSON.parse(sanitizedJson);
                  console.log('Recovered JSON data using enhanced sanitization');
                } catch (sanitizeError) {
                  console.error('Failed to parse sanitized JSON:', sanitizeError);
                  console.error('Error position:', (sanitizeError as SyntaxError).message);
                  
                  // Last resort: try to fix the specific position mentioned in the error
                  const errorMatch = (sanitizeError as SyntaxError).message.match(/position (\d+)/);
                  if (errorMatch && errorMatch[1]) {
                    const errorPos = parseInt(errorMatch[1]);
                    console.log('Attempting to fix JSON at position:', errorPos);
                    
                    // Show context around the error
                    const contextStart = Math.max(0, errorPos - 20);
                    const contextEnd = Math.min(sanitizedJson.length, errorPos + 20);
                    console.log('Context:', sanitizedJson.substring(contextStart, contextEnd));
                    
                    // Try to fix common issues at error position
                    const fixedJson = sanitizedJson.substring(0, errorPos) + 
                                     '"' + 
                                     sanitizedJson.substring(errorPos);
                    
                    try {
                      resultData = JSON.parse(fixedJson);
                      console.log('Recovered JSON data by fixing specific position');
                    } catch (finalError) {
                      console.error('All JSON recovery attempts failed');
                      throw new Error('Failed to parse scraper result data after multiple recovery attempts');
                    }
                  } else {
                    throw new Error('Failed to parse scraper result data after multiple recovery attempts');
                  }
                }
              }
            }
          } catch (recoveryError) {
            console.error('All JSON recovery attempts failed:', recoveryError);
            throw new Error('Failed to parse scraper result data');
          }
        }
        
        // Save the result data as JSON in the reports folder
        if (resultData) {
          // Create reports directory if it doesn't exist
          const reportsDir = path.resolve(__dirname, '../reports');
          if (!existsSync(reportsDir)) {
            await fs.mkdir(reportsDir, { recursive: true });
          }
          
          // Add client information to the result data
          const clientInfo = {
            clientId: clientId || 'unknown',
            username: username,
            timestamp: new Date().toISOString(),
            reportDate: new Date().toLocaleDateString()
          };
          
          const reportData = {
            clientInfo,
            reportData: resultData
          };
          
          // Generate filename with client info and timestamp
          const filename = `client_${clientId || 'unknown'}_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          const filePath = path.join(reportsDir, filename);
          
          // Write the JSON file
          await fs.writeFile(filePath, JSON.stringify(reportData, null, 2));
          
          // Add file path to result data
          resultData.savedReportPath = filePath;
        }
      }
    } catch (err) {
      console.error('Error parsing or saving result data:', err);
    }
    
    if (exitCode !== 0) {
      return res.status(500).json({
        success: false,
        message: 'Scraper failed',
        error,
        logs
      });
    }
    
    return res.status(200).json({
      success: true,
      message: resultData ? 'Scraper completed successfully' : 'Scraper completed but no data was returned',
      data: resultData || {
        // Provide a minimal fallback result structure when scraper returns null
        status: "completed",
        timestamp: new Date().toISOString(),
        message: "Scraper process completed but no data was returned. Check logs for details."
      },
      logs,
      savedReport: resultData?.savedReportPath ? true : false,
      savedReportPath: resultData?.savedReportPath
    });
  } catch (error: any) {
    console.error('Error running scraper:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to run scraper',
      error: error.message
    });
  }
});

/**
 * @route GET /api/scraper/status
 * @desc Check if the test server is running
 * @access Private
 */
router.get('/status', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    isRunning: serverProcess !== null
  });
});

export default router;