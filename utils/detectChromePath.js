/**
 * Utility to detect Chrome installation path on Windows
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Detects Chrome installation path on the current system
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function detectChromePath() {
  // Common Chrome installation paths
  const commonPaths = [
    // Windows paths
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Add more paths as needed
  ];

  // Check if any of the common paths exist
  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      console.log(`Chrome found at: ${chromePath}`);
      return chromePath;
    }
  }

  console.error('Chrome not found in common installation paths');
  return null;
}

module.exports = detectChromePath;

// If this script is run directly, output the detected path
if (require.main === module) {
  const chromePath = detectChromePath();
  if (chromePath) {
    console.log('Chrome detected at:', chromePath);
  } else {
    console.error('Chrome not detected in common paths');
  }
}