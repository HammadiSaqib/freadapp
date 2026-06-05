import React from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import CreditReportUpload from '../../components/super-admin/CreditReportUpload';

const SuperAdminCreditReportUpload: React.FC = () => {
  return (
    <SuperAdminLayout title="Credit Report Upload" description="Select admin, client, platform and paste JSON to save">
      <div className="p-4">
        <CreditReportUpload />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCreditReportUpload;