import React from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import ClientCSVImport from '../../components/super-admin/ClientCSVImport';

const SuperAdminClientImport: React.FC = () => {
  return (
    <SuperAdminLayout title="Client CSV Import" description="Select an admin and import clients from CSV">
      <div className="p-4">
        <ClientCSVImport />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminClientImport;