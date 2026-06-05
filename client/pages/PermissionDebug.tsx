import React, { useEffect, useState } from 'react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { authApi, billingApi } from '@/lib/api';

const PermissionDebug: React.FC = () => {
  const { hasPermission, allowedPages, isLoading, error, refetch } = usePagePermissions();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const profileResponse = await authApi.getProfile();
        setUserInfo(profileResponse.data);
        
        if (profileResponse.data?.role === 'admin') {
          const subscriptionResponse = await billingApi.getSubscription();
          setSubscriptionInfo(subscriptionResponse.data);
        }
      } catch (err) {
        console.error('Error fetching debug info:', err);
      }
    };

    fetchDebugInfo();
  }, []);

  const testPages = [
    'dashboard', 'clients', 'reports', 'ai-coach', 'school', 
    'analytics', 'affiliate', 'compliance', 'automation', 
    'support', 'subscription', 'settings'
  ];

  // Add real-time permission checking
  useEffect(() => {
    console.log('🔍 PermissionDebug - Current permissions state:');
    console.log('   - isLoading:', isLoading);
    console.log('   - allowedPages:', allowedPages);
    console.log('   - error:', error);
    
    testPages.forEach(page => {
      const hasAccess = hasPermission(page);
      console.log(`   - hasPermission("${page}"):`, hasAccess);
    });
  }, [allowedPages, isLoading, error]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>🔍 Permission Debug Page</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>👤 User Information</h2>
        <pre>{JSON.stringify(userInfo, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>💳 Subscription Information</h2>
        <pre>{JSON.stringify(subscriptionInfo, null, 2)}</pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>🔑 Permission Hook State</h2>
        <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>Error:</strong> {error || 'None'}</p>
        <p><strong>Allowed Pages:</strong> [{allowedPages.join(', ')}]</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>🧪 Page Permission Tests</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {testPages.map(page => {
            const hasAccess = hasPermission(page);
            return (
              <div 
                key={page}
                style={{ 
                  padding: '10px', 
                  backgroundColor: hasAccess ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${hasAccess ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '4px',
                  color: hasAccess ? '#155724' : '#721c24'
                }}
              >
                <strong>{page}</strong><br />
                {hasAccess ? '✅ Enabled' : '❌ Disabled'}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>🔑 Debug User Credentials</h2>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <p><strong>📧 Email:</strong> <code>xisav87409@filipx.com</code></p>
          <p><strong>🔒 Password:</strong> <code>12345678</code></p>
          <p><strong>👤 Role:</strong> admin (no subscription)</p>
          <p style={{ fontSize: '12px', color: '#856404' }}>
            ⚠️ If you're not logged in as this user, please <a href="/login" style={{ color: '#007bff' }}>login here</a> with these credentials.
          </p>
        </div>
      </div>

      <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h2>📝 Console Logs</h2>
        <p>Check the browser console (F12) for detailed permission logs from usePagePermissions hook.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => {
              console.log('🔍 Current permission state:');
              console.log('User:', userInfo);
              console.log('Subscription:', subscriptionInfo);
              console.log('Allowed pages:', allowedPages);
              console.log('Is loading:', isLoading);
              console.log('Error:', error);
            }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Log Current State to Console
          </button>
          <button 
            onClick={() => {
              console.log('🔄 Refreshing permissions...');
              refetch();
            }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDebug;