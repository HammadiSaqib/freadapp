import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store server process and logs
let serverProcess = null;
let logs = [];
let scraperResult = null;

// Start the test server
router.post('/start-server', authenticateToken, async (req, res) => {
  try {
    if (serverProcess) {
      return res.json({
        success: true,
        message: 'Server is already running',
        url: 'http://localhost:3002'
      });
    }

    // Clear previous logs
    logs = [];
    scraperResult = null;

    // Get the path to test-scraper.cjs
    const scraperPath = path.resolve(__dirname, '../../test-scraper.cjs');
    
    // Start the server process
    serverProcess = spawn('node', [scraperPath, '--server']);
    
    // Collect logs
    serverProcess.stdout.on('data', (data) => {
      const logLines = data.toString().split('\n').filter(line => line.trim());
      logs.push(...logLines);
      
      // Check if the server has started
      const serverStartedLine = logLines.find(line => line.includes('Test server running at'));
      if (serverStartedLine) {
        console.log('Test server started successfully');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const logLines = data.toString().split('\n').filter(line => line.trim());
      logs.push(...logLines);
    });
    
    serverProcess.on('close', (code) => {
      logs.push(`Server process exited with code ${code}`);
      serverProcess = null;
    });
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      message: 'Server started successfully',
      url: 'http://localhost:3002'
    });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop the test server
router.post('/stop-server', authenticateToken, (req, res) => {
  try {
    if (!serverProcess) {
      return res.json({
        success: true,
        message: 'Server is not running'
      });
    }
    
    // Kill the server process
    serverProcess.kill();
    logs.push('Server stopped');
    serverProcess = null;
    
    res.json({
      success: true,
      message: 'Server stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping server:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run the scraper
router.post('/run', authenticateToken, async (req, res) => {
  try {
    if (!serverProcess) {
      return res.status(400).json({
        success: false,
        error: 'Server is not running'
      });
    }
    
    const { email, password, clientId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    // Clear previous logs
    logs = [];
    scraperResult = null;
    
    // Get the path to test-scraper.cjs
    const scraperPath = path.resolve(__dirname, '../../test-scraper.cjs');
    
    // Run the scraper
    const args = [scraperPath, email, password];
    if (clientId) {
      args.push(clientId);
    }
    
    const scraperProcess = spawn('node', args);
    
    // Collect logs
    scraperProcess.stdout.on('data', (data) => {
      const logLines = data.toString().split('\n').filter(line => line.trim());
      logs.push(...logLines);
      
      // Try to parse the result data if available
      const resultLine = logLines.find(line => line.includes('Result data:'));
      if (resultLine) {
        const resultIndex = logLines.indexOf(resultLine);
        if (resultIndex >= 0 && resultIndex < logLines.length - 1) {
          try {
            // Try to parse the JSON result
            const jsonStr = logLines.slice(resultIndex + 1).join('\n');
            
            // First try to sanitize the JSON string to handle common issues
            let sanitizedJson = jsonStr
              .replace(/\\'/g, "'")  // Fix escaped single quotes
              .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')  // Add quotes to unquoted keys
              .replace(/,(\s*[}\]])/g, '$1');  // Remove trailing commas
              
            try {
              // Try parsing the sanitized JSON first
              scraperResult = JSON.parse(sanitizedJson);
              console.log('Successfully parsed sanitized JSON');
            } catch (innerError) {
              // If sanitized parsing fails, try the original as fallback
              console.warn('Sanitized JSON parsing failed, trying original:', innerError.message);
              scraperResult = JSON.parse(jsonStr);
            }
          } catch (e) {
            console.error('Error parsing scraper result:', e);
            console.error('Error occurred near position:', e.message);
            
            // Create a partial result with error information
            scraperResult = {
              error: true,
              errorMessage: e.message,
              partialData: true,
              message: 'JSON parsing error - some data may be incomplete'
            };
          }
        }
      }
    });
    
    scraperProcess.stderr.on('data', (data) => {
      const logLines = data.toString().split('\n').filter(line => line.trim());
      logs.push(...logLines);
    });
    
    // Wait for the scraper to finish
    const exitCode = await new Promise(resolve => {
      scraperProcess.on('close', resolve);
    });
    
    logs.push(`Scraper process exited with code ${exitCode}`);
    
    res.json({
      success: exitCode === 0,
      message: exitCode === 0 ? 'Scraper completed successfully' : 'Scraper failed',
      logs,
      result: scraperResult
    });
  } catch (error) {
    console.error('Error running scraper:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get server status
router.get('/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    running: serverProcess !== null,
    url: serverProcess ? 'http://localhost:3002' : null
  });
});

// Get logs
router.get('/logs', authenticateToken, (req, res) => {
  res.json({
    success: true,
    logs,
    result: scraperResult
  });
});

export default router;