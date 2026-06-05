import React from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import AdminCSVImport from '../../components/super-admin/AdminCSVImport';

const SuperAdminAdminImport: React.FC = () => {
  return (
    <SuperAdminLayout title="Admin CSV Import" description="Import administrators from CSV and create related records">
      <div className="p-4">
        <AdminCSVImport />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminAdminImport;