// Test script to simulate frontend data processing
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testChartDataProcessing() {
  try {
    console.log('Testing chart data processing...\n');

    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/super-admin/login`, {
      email: 'demo@creditrepairpro.com',
      password: '12345678'
    });

    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Get sales chat data
    const salesChatResponse = await axios.get(`${BASE_URL}/api/super-admin/analytics/sales-chat`, { headers });
    console.log('=== SALES CHAT DATA PROCESSING ===');
    console.log('Raw API Response:', JSON.stringify(salesChatResponse.data, null, 2));
    
    // Simulate frontend processing
    const salesChatData = salesChatResponse?.data?.data || null;
    console.log('Processed salesChatData:', salesChatData);
    
    // Check if data structure matches what SalesChatChart expects
    if (salesChatData) {
      console.log('Sales Chat Data Structure Check:');
      console.log('- Has chatStats:', !!salesChatData.chatStats);
      console.log('- Has topAgents:', !!salesChatData.topAgents);
      console.log('- Has conversionStats:', !!salesChatData.conversionStats);
      
      if (salesChatData.chatStats) {
        console.log('- chatStats length:', salesChatData.chatStats.length);
        console.log('- chatStats sample:', salesChatData.chatStats[0]);
      }
      
      if (salesChatData.topAgents) {
        console.log('- topAgents length:', salesChatData.topAgents.length);
        console.log('- topAgents sample:', salesChatData.topAgents[0]);
      }
      
      if (salesChatData.conversionStats) {
        console.log('- conversionStats:', salesChatData.conversionStats);
      }
    }

    console.log('\n=== REPORT PULLING DATA PROCESSING ===');
    
    // Get report pulling data
    const reportPullingResponse = await axios.get(`${BASE_URL}/api/super-admin/analytics/report-pulling`, { headers });
    console.log('Raw API Response:', JSON.stringify(reportPullingResponse.data, null, 2));
    
    // Simulate frontend processing
    const reportPullingData = reportPullingResponse?.data?.data || null;
    console.log('Processed reportPullingData:', reportPullingData);
    
    // Check if data structure matches what ReportPullingChart expects
    if (reportPullingData) {
      console.log('Report Pulling Data Structure Check:');
      console.log('- Has reportStats:', !!reportPullingData.reportStats);
      console.log('- Has bureauStats:', !!reportPullingData.bureauStats);
      console.log('- Has userActivity:', !!reportPullingData.userActivity);
      console.log('- Has errorAnalysis:', !!reportPullingData.errorAnalysis);
      
      if (reportPullingData.reportStats) {
        console.log('- reportStats length:', reportPullingData.reportStats.length);
        console.log('- reportStats sample:', reportPullingData.reportStats[0]);
      }
      
      if (reportPullingData.bureauStats) {
        console.log('- bureauStats length:', reportPullingData.bureauStats.length);
        console.log('- bureauStats sample:', reportPullingData.bureauStats[0]);
      }
      
      if (reportPullingData.userActivity) {
        console.log('- userActivity length:', reportPullingData.userActivity.length);
        console.log('- userActivity sample:', reportPullingData.userActivity[0]);
      }
      
      if (reportPullingData.errorAnalysis) {
        console.log('- errorAnalysis length:', reportPullingData.errorAnalysis.length);
        console.log('- errorAnalysis sample:', reportPullingData.errorAnalysis[0]);
      }
    }

  } catch (error) {
    console.error('Error during testing:', error.message);
    console.error('Full error:', error);
  }
}

testChartDataProcessing();