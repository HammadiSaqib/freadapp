import React from 'react';
import ScraperLogs from '../../components/ScraperLogs';
import DashboardLayout from '../../components/DashboardLayout';

const ScraperLogsPage = () => {
  return (
    <DashboardLayout title="Scraper Logs" description="View and manage credit report scraper logs">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Credit Report Scraper Logs</h1>
          <p className="mb-6 text-gray-600">
            This page allows you to run the credit report scraper and view detailed logs of the scraping process.
            You can start a test server, run the scraper with specific credentials, and monitor the results in real-time.
          </p>
          <ScraperLogs />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ScraperLogsPage;