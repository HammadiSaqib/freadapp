import React, { useState } from 'react';
import CreditReportScraper from '../../components/CreditReportScraper';
import DashboardLayout from '../../components/DashboardLayout';

const CreditReportScraperPage = () => {
  const [showAddClient, setShowAddClient] = useState(false);
  
  return (
    <DashboardLayout 
      title="Credit Report Scraper" 
      description="Scrape credit reports from supported platforms"
      onAddClient={() => setShowAddClient(true)}
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <CreditReportScraper />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreditReportScraperPage;