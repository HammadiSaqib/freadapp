const jwt = require("jsonwebtoken");

async function testSpecificUserBilling() {
  try {
    // Create a JWT token for the specific user yotab14930@dwakm.com
    // We need to find their user ID first
    const mysql = require("mysql2/promise");
    
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root", 
      password: "",
      database: "creditrepair_db"
    });
    
    console.log("Looking up user yotab14930@dwakm.com...");
    
    // Check users table first
    const [userRows] = await connection.execute(
      "SELECT id, email, role FROM users WHERE email = ?",
      ["yotab14930@dwakm.com"]
    );
    
    let userId = null;
    let userRole = null;
    
    if (userRows.length > 0) {
      userId = userRows[0].id;
      userRole = userRows[0].role;
      console.log(`Found user in users table: ID=${userId}, Role=${userRole}`);
    } else {
      // Check affiliates table
      const [affiliateRows] = await connection.execute(
        "SELECT id, email FROM affiliates WHERE email = ?",
        ["yotab14930@dwakm.com"]
      );
      
      if (affiliateRows.length > 0) {
        userId = affiliateRows[0].id;
        userRole = "affiliate";
        console.log(`Found user in affiliates table: ID=${userId}, Role=${userRole}`);
      } else {
        console.log("User not found in either users or affiliates table");
        await connection.end();
        return;
      }
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: userId, email: "yotab14930@dwakm.com", role: userRole },
      "your-super-secret-jwt-key-for-development",
      { expiresIn: "1h" }
    );
    
    console.log(`Generated token for user ${userId} (${userRole})`);
    
    // Test billing endpoints
    console.log("\nTesting billing history endpoint...");
    const historyResponse = await fetch("http://localhost:3001/api/billing/history", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("History Status:", historyResponse.status);
    const historyText = await historyResponse.text();
    console.log("History Response (raw text):", historyText);
    
    try {
      const historyData = JSON.parse(historyText);
      console.log("History Response (parsed):", JSON.stringify(historyData, null, 2));
    } catch (parseError) {
      console.log("Failed to parse history response as JSON:", parseError.message);
    }
    
    console.log("\nTesting subscription endpoint...");
    const subscriptionResponse = await fetch("http://localhost:3001/api/billing/subscription", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("Subscription Status:", subscriptionResponse.status);
    const subscriptionText = await subscriptionResponse.text();
    console.log("Subscription Response (raw text):", subscriptionText);
    
    try {
      const subscriptionData = JSON.parse(subscriptionText);
      console.log("Subscription Response (parsed):", JSON.stringify(subscriptionData, null, 2));
    } catch (parseError) {
      console.log("Failed to parse subscription response as JSON:", parseError.message);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSpecificUserBilling();