const fs = require('fs');
const path = require('path');

/**
 * Test script to verify SQL syntax in groups.ts is correct
 * This script parses the SQL queries and checks for proper escaping
 */

async function testSQLSyntax() {
  console.log('🔍 Testing SQL syntax in groups.ts...\n');
  
  try {
    // Read the groups.ts file
    const groupsFilePath = path.join(__dirname, 'server', 'routes', 'groups.ts');
    const fileContent = fs.readFileSync(groupsFilePath, 'utf8');
    
    // Extract SQL queries that reference 'groups' table
    const sqlPatterns = [
      // Template literals with backticks
      /`[^`]*\\`groups\\`[^`]*`/g,
      // Single-quoted strings with backticks
      /'[^']*\\`groups\\`[^']*'/g,
      // Check for unescaped backticks (should not exist)
      /`[^`]*`groups`[^`]*`/g,
      /'[^']*`groups`[^']*'/g
    ];
    
    let foundQueries = 0;
    let properlyEscaped = 0;
    let improperlEscaped = 0;
    
    console.log('📋 SQL Query Analysis:');
    console.log('='.repeat(50));
    
    // Check for properly escaped queries
    const properTemplates = fileContent.match(sqlPatterns[0]) || [];
    const properStrings = fileContent.match(sqlPatterns[1]) || [];
    
    properTemplates.forEach((query, index) => {
      console.log(`✅ Template Literal ${index + 1}: ${query.substring(0, 80)}...`);
      properlyEscaped++;
      foundQueries++;
    });
    
    properStrings.forEach((query, index) => {
      console.log(`✅ String Literal ${index + 1}: ${query.substring(0, 80)}...`);
      properlyEscaped++;
      foundQueries++;
    });
    
    // Check for improperly escaped queries (should be zero)
    const improperTemplates = fileContent.match(sqlPatterns[2]) || [];
    const improperStrings = fileContent.match(sqlPatterns[3]) || [];
    
    improperTemplates.forEach((query, index) => {
      console.log(`❌ Unescaped Template ${index + 1}: ${query.substring(0, 80)}...`);
      improperlEscaped++;
      foundQueries++;
    });
    
    improperStrings.forEach((query, index) => {
      console.log(`❌ Unescaped String ${index + 1}: ${query.substring(0, 80)}...`);
      improperlEscaped++;
      foundQueries++;
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`Total queries found: ${foundQueries}`);
    console.log(`Properly escaped: ${properlyEscaped}`);
    console.log(`Improperly escaped: ${improperlEscaped}`);
    
    if (improperlEscaped === 0 && foundQueries > 0) {
      console.log('\n🎉 SUCCESS: All SQL queries are properly escaped!');
      console.log('✅ The groups.ts file should work correctly on the VPS.');
      return true;
    } else if (foundQueries === 0) {
      console.log('\n⚠️  WARNING: No SQL queries with groups table found.');
      return false;
    } else {
      console.log('\n❌ FAILURE: Some SQL queries are not properly escaped.');
      console.log('🔧 Please fix the unescaped queries before deployment.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing SQL syntax:', error.message);
    return false;
  }
}

// Additional test: Check for common SQL injection patterns
function checkForSQLInjectionVulnerabilities(fileContent) {
  console.log('\n🔒 Checking for SQL injection vulnerabilities...');
  
  const vulnerablePatterns = [
    // Direct string concatenation in SQL
    /\+\s*req\.(body|params|query)/g,
    // Template literals with direct user input
    /\$\{req\.(body|params|query)/g
  ];
  
  let vulnerabilities = 0;
  
  vulnerablePatterns.forEach((pattern, index) => {
    const matches = fileContent.match(pattern) || [];
    matches.forEach(match => {
      console.log(`⚠️  Potential vulnerability: ${match}`);
      vulnerabilities++;
    });
  });
  
  if (vulnerabilities === 0) {
    console.log('✅ No obvious SQL injection vulnerabilities found.');
  } else {
    console.log(`❌ Found ${vulnerabilities} potential SQL injection vulnerabilities.`);
  }
  
  return vulnerabilities === 0;
}

// Run the tests
async function runTests() {
  console.log('🚀 Starting SQL Syntax Tests\n');
  
  const syntaxTest = await testSQLSyntax();
  
  // Read file again for injection test
  const groupsFilePath = path.join(__dirname, 'server', 'routes', 'groups.ts');
  const fileContent = fs.readFileSync(groupsFilePath, 'utf8');
  const injectionTest = checkForSQLInjectionVulnerabilities(fileContent);
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Final Results:');
  console.log(`SQL Syntax Test: ${syntaxTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`SQL Injection Test: ${injectionTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (syntaxTest && injectionTest) {
    console.log('\n🎉 ALL TESTS PASSED! Ready for deployment.');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED! Please fix issues before deployment.');
    process.exit(1);
  }
}

runTests().catch(console.error);