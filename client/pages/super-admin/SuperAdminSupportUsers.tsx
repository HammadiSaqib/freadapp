import React from 'react';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import SupportUsers from '../../components/super-admin/SupportUsers';

const SuperAdminSupportUsers: React.FC = () => {
  return (
    <SuperAdminLayout>
      <SupportUsers />
    </SuperAdminLayout>
  );
};

export default SuperAdminSupportUsers;