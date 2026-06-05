/**
 * Test script for MyFreeScoreNow scraper
 * 
 * This script tests the MyFreeScoreNow scraper functionality and can be used with the web interface
 * at http://localhost:3001/credit-reports/scraper
 * 
 * Usage: node test-scraper.cjs <username> <password> [clientId]
 */

// Create a simple wrapper to use the ES module in CommonJS
const fetchMyFreeScoreNowReport = async (credentials, options) => {
  try {
    // Dynamically import the ES module
    const { default: fetchReport } = await import('./server/services/scrapers/myFreeScoreNowScraper.js');
    return fetchReport(credentials.username, credentials.password, options);
  } catch (error) {
    console.error('Error importing or running scraper:', error.message);
    throw error;
  }
};

// Function to start a local server for testing if needed
const startLocalServer = async () => {
  try {
    // Only import if we need to start the server
    const { default: express } = await import('express');
    const { default: cors } = await import('cors');
    const app = express();
    
    app.use(cors());
    app.use(express.json());
    
    // Simple endpoint to test the scraper
    app.post('/api/test-scraper', async (req, res) => {
      try {
        const { username, password, clientId } = req.body;
        
        const options = {
          saveHtml: true,
          takeScreenshots: true,
          outputDir: './scraper-output',
          clientId: clientId ? parseInt(clientId, 10) : undefined
        };
        
        const result = await fetchMyFreeScoreNowReport({ username, password }, options);
        
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    const PORT = 3002;
    app.listen(PORT, () => {
      console.log(`Test server running at http://localhost:${PORT}`);
    });
    
    return app;
  } catch (error) {
    console.error('Failed to start local server:', error);
    return null;
  }
};

// Set to track circular references during JSON stringification
const seen = new Set();

// Helper function to safely stringify JSON with circular reference handling
function safeStringify(obj) {
  try {
    // Reset the seen set before each stringification
    seen.clear();
    
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references and invalid JSON values
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      // Handle other non-serializable values
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (value instanceof RegExp) {
        return value.toString();
      }
      if (value instanceof Error) {
        return `[Error: ${value.message}]`;
      }
      if (value === undefined) {
        return null; // Convert undefined to null for valid JSON
      }
      
      return value;
    }, 2);
  } catch (error) {
    console.error('Error in safeStringify:', error.message);
    return JSON.stringify({ error: 'Failed to stringify object', reason: error.message });
  } finally {
    // Always clear the set after use
    seen.clear();
  }
}

async function testScraper(startServer = false) {
  try {
    // Start local server if requested
    let server = null;
    if (startServer) {
      console.log('Starting local test server...');
      server = await startLocalServer();
      if (!server) {
        console.error('Failed to start local server. Make sure express and cors are installed.');
        console.log('You can install them with: npm install express cors');
      }
      // If we're just starting the server, don't run the scraper
      if (startServer && !process.argv.includes('--run-scraper')) {
        console.log('Server started successfully. Waiting for API requests...');
        return { serverStarted: true };
      }
    }
    // Get command line arguments
    const args = process.argv.slice(2);
    
    // Use hardcoded credentials for testing if not provided
    const username = args[0] || "Kristabadi2021@gmail.com";
    const password = args[1] || "Badi2021!!";
    const clientId = args[2] ? parseInt(args[2], 10) : undefined;
    
    console.log('Using credentials for testing');
    console.log(`Username: ${username}`);
    console.log(`Password: ${'*'.repeat(password.length)}`);
    if (clientId) {
      console.log(`Client ID: ${clientId}`);
    }
    
    console.log('🔄 Starting MyFreeScoreNow scraper test...');
    
    // Configure scraper options
    const options = {
      saveHtml: true,
      takeScreenshots: true,
      outputDir: './scraper-output',
      clientId: clientId
    };
    
    // Run the scraper
    const credentials = {
      username,
      password
    };
    
    const result = await fetchMyFreeScoreNowReport(credentials, options);
    
    console.log('✅ Scraper test completed successfully!');
    console.log('📊 Result data:');
    try {
      // Use our safe stringify function
      const resultString = safeStringify(result);
      console.log(resultString);
    } catch (stringifyError) {
      console.error('Error stringifying result:', stringifyError.message);
      console.log('Result structure:', Object.keys(result || {}));
    }
    
    // Check if we have scores in the result
    if (result && result.scores) {
      console.log('\n📊 Credit scores:');
      console.log(`  Equifax: ${result.scores.equifax || 'N/A'}`);
      console.log(`  TransUnion: ${result.scores.transunion || 'N/A'}`);
      console.log(`  Experian: ${result.scores.experian || 'N/A'}`);
    }
    
    // Check if we have account summary in the result
    if (result && result.summary && result.summary.transunion) {
      console.log('\n📋 Account summary:');
      console.log(`  Total accounts: ${result.summary.transunion.totalAccounts || 'N/A'} (TransUnion)`);
      console.log(`  Open accounts: ${result.summary.transunion.openAccounts || 'N/A'} (TransUnion)`);
    }
    
    console.log('\n📁 Output saved to ./scraper-output directory');
    
    // Print instructions for web interface
    console.log('\n🌐 To use with web interface:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Open http://localhost:3001/credit-reports/scraper in your browser');
    console.log('3. Enter the same credentials and select a client if needed');
    
    return result;
  } catch (error) {
    console.error('❌ Scraper test failed:', error.message);
    process.exit(1);
  }
}

// Check if this script is being run directly or imported
if (require.main === module) {
  // Get command line arguments
  const args = process.argv.slice(2);
  const startServer = args.includes('--server');
  
  // Run the scraper
  testScraper(startServer);
}

// Export the functions for use in other scripts
module.exports = {
  fetchMyFreeScoreNowReport,
  testScraper
};