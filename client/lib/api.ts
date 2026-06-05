import axios from 'axios';
import {
  clearStoredAuth,
  getStoredAuthValue,
  setStoredAuthValue,
  writeStoredAuthSnapshot,
} from './authStorage';

export function resolveApiBaseUrl() {
  const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const isTrustedScoreMachineSubdomain =
      hostname.endsWith('.thescoremachine.com') &&
      hostname !== 'thescoremachine.com' &&
      hostname !== 'www.thescoremachine.com';
    const isTrustedLocalAlias = hostname.endsWith('.localhost');

    if (isTrustedScoreMachineSubdomain || isTrustedLocalAlias) {
      return window.location.origin;
    }

    return configuredApiUrl || window.location.origin;
  }

  return configuredApiUrl || 'http://localhost:3001';
}

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const apiDebug = import.meta.env.DEV && import.meta.env.VITE_API_DEBUG === 'true';
const SKIP_REFRESH_TOKEN_PERSIST_HEADER = 'x-skip-refresh-token-persist';

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getStoredAuthValue('auth_token');
  if (apiDebug) {
    console.log('🔗 API Interceptor: Request to', config.url);
    console.log('🔗 API Interceptor: Token found:', !!token);
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (apiDebug) console.log('✅ API Interceptor: Authorization header set');
  } else {
    if (apiDebug) console.log('⚠️ API Interceptor: No token found, request will be unauthenticated');
  }
  return config;
});

// Handle token expiration globally
api.interceptors.response.use(
  (response) => {
    try {
      const data: any = response?.data;
      const rt = data?.refresh_token;
      const shouldSkipPersist = response?.config?.headers?.[SKIP_REFRESH_TOKEN_PERSIST_HEADER] === '1';
      if (rt && !shouldSkipPersist) {
        setStoredAuthValue('refresh_token', rt);
      }
    } catch {}
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const errTag = error?.response?.data?.error;
    const originalConfig = error?.config || {};
    if (status === 401 && code === 'TOKEN_EXPIRED' && !originalConfig.__isRetry) {
      const refreshToken = getStoredAuthValue('refresh_token');
      if (refreshToken) {
        return api
          .post('/api/auth/refresh', {}, { headers: { 'x-refresh-token': refreshToken } })
          .then((resp) => {
            const newToken = resp?.data?.token;
            if (newToken) {
              writeStoredAuthSnapshot({
                auth_token: newToken,
                token: newToken,
                refresh_token: refreshToken,
              });
              originalConfig.__isRetry = true;
              originalConfig.headers = originalConfig.headers || {};
              originalConfig.headers.Authorization = `Bearer ${newToken}`;
              return api.request(originalConfig);
            }
            return Promise.reject(error);
          })
          .catch(() => {
            clearStoredAuth();
            const current = typeof window !== 'undefined' ? window.location.pathname : '/';
            const loginPath = '/login';
            if (typeof window !== 'undefined') {
              const redirect = current && current !== loginPath ? `?redirect=${encodeURIComponent(current)}` : '';
              window.location.href = `${loginPath}${redirect}`;
            }
            return Promise.reject(error);
          });
      } else {
        clearStoredAuth();
        const current = typeof window !== 'undefined' ? window.location.pathname : '/';
        const loginPath = '/login';
        if (typeof window !== 'undefined') {
          const redirect = current && current !== loginPath ? `?redirect=${encodeURIComponent(current)}` : '';
          window.location.href = `${loginPath}${redirect}`;
        }
      }
    }
    if (status === 403 && (errTag === 'contract_signature_required' || errTag === 'contract_signature_required_grace_exceeded')) {
      try {
        if (typeof window !== 'undefined') {
          const ev = new CustomEvent('admin-contract-required', { detail: { source: error?.config?.url } });
          window.dispatchEvent(ev);
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

// Utility function to get auth token
export const getAuthToken = (): string | null => {
  return getStoredAuthValue('auth_token');
};

// Generic API request function
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server returned non-JSON response');
  }
  
  return response.json();
};

// Auth API
export const authApi = {
  getGoogleConfig: () => api.get('/api/auth/google/config'),

  googleLogin: (payload: { credential: string; referral_affiliate_id?: string }) =>
    api.post('/api/auth/google', payload),

  login: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/login', credentials),
  
  fundingManagerLogin: (email: string, password: string) =>
    api.post('/api/auth/funding-manager/login', { email, password }),
  
  superAdminLogin: (email: string, password: string) =>
    api.post('/api/auth/super-admin/login', { email, password }),

  affiliateLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/affiliate/login', credentials),

  supportLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/support/login', credentials),

  printingTeamLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/printing-team/login', credentials),

  clientLogin: (email: string, password: string) =>
    api.post('/api/auth/member/login', { email, password }),
  
  register: (userData: { 
    email: string; 
    password: string; 
    first_name: string; 
    last_name: string; 
    phone: string;
    company_name?: string;
    referral_affiliate_id?: string;
  }) =>
    api.post('/api/auth/register', userData),
  
  verifyEmailAndRegister: (data: { email: string; code: string }) =>
    api.post('/api/auth/verify-email', data),
  
  verifyEmail: (data: { email: string; code: string }) =>
    api.post('/api/auth/verify-user-email', data),
  
  changeEmail: (data: { oldEmail: string; newEmail: string }) =>
    api.post('/api/auth/change-email', data),
  
  resendVerificationCode: (data: { email: string }) =>
    api.post('/api/auth/resend-verification', data),
  
  getProfile: () => api.get('/api/auth/profile'),
  getAffiliateStatus: () => api.get('/api/auth/affiliate/status'),
  getReferralPartnerLink: () => api.get('/api/auth/referral/partner-link'),
  getReferralCreditRepairLink: () => api.get('/api/auth/referral/credit-repair-link'),
  
  updateProfile: (profileData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    // Custom credit repair URL override
    credit_repair_url?: string;
    onboarding_slug?: string;
    intake_redirect_url?: string;
    intake_logo_url?: string;
    intake_primary_color?: string;
    intake_company_name?: string;
    intake_website_url?: string;
    intake_email?: string;
    intake_phone_number?: string;
    // NMI gateway fields
    nmi_merchant_id?: string;
    nmi_public_key?: string;
    nmi_api_key?: string;
    nmi_username?: string;
    nmi_password?: string;
    nmi_test_mode?: boolean;
    nmi_gateway_logo?: string;
    funding_override_enabled?: boolean;
    funding_override_signature_text?: string;
  }) =>
    api.put('/api/auth/profile', profileData),
  
  updatePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) =>
    api.put('/api/auth/profile', {
      current_password: passwordData.currentPassword,
      new_password: passwordData.newPassword
    }),
  
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/api/profile/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteAvatar: () => api.delete('/api/profile/delete-avatar'),

  uploadGatewayLogo: (file: File) => {
    const formData = new FormData();
    formData.append('gateway_logo', file);
    return api.post('/api/profile/upload-gateway-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadIntakeLogo: (file: File) => {
    const formData = new FormData();
    formData.append('intake_logo', file);
    return api.post('/api/profile/upload-intake-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadAffiliateLogo: (file: File) => {
    const formData = new FormData();
    formData.append('affiliate_logo', file);
    return api.post('/api/profile/upload-affiliate-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  verifyToken: () => api.get('/api/auth/verify'),
  
  logout: () => api.post('/api/auth/logout'),
};

export const integrationsApi = {
  getGhlIntegration: () => api.get('/api/integrations/ghl'),
  saveGhlIntegration: (data: { access_token: string; location_id?: string | null }) =>
    api.post('/api/integrations/ghl', data),
  disableGhlIntegration: () => api.post('/api/integrations/ghl/disable'),
  regenerateGhlWebhook: () => api.post('/api/integrations/ghl/regenerate-webhook'),
  getGhlActivity: (limit?: number) => api.get('/api/integrations/ghl/activity', { params: { limit } }),
};

// Clients API
export const clientsApi = {
  getClients: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/api/clients', { params }),
  
  getClient: (id: string) => api.get(`/api/clients/${id}`),
  
  createClient: (clientData: any) => api.post('/api/clients', clientData),
  
  updateClient: (id: string, clientData: any) =>
    api.put(`/api/clients/${id}`, clientData),
  
  deleteClient: (id: string) => api.delete(`/api/clients/${id}`),

  // Debt Payoff Plans
  getDebtPayoffPlans: (clientId: number) => api.get(`/api/debt-payoff/${clientId}`),
  saveDebtPayoffPlan: (plan: any) => api.post('/api/debt-payoff', plan),
  deleteDebtPayoffPlan: (id: number) => api.delete(`/api/debt-payoff/${id}`),
  getClientIntakeToken: () => api.post('/api/clients/intake-token'),
  getClientIntakeConfig: (params: { token?: string; slug?: string }) => api.get('/api/clients/intake-config', { params }),
  submitClientIntake: (data: { token?: string; slug?: string; platform: string; email: string; password: string; ssnLast4?: string }) =>
    api.post('/api/clients/intake', data),

  // Equifax Settlement
  getEquifaxSettlementSnapshot: (id: string) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement`),

  startEquifaxSettlementLiveBrowser: (id: string) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement/live`),

  getEquifaxSettlementLiveBrowser: (id: string) =>
    api.get(`/api/clients/${id}/equifax-breach-settlement/live`),

  getEquifaxSettlementLivePreview: (id: string) =>
    api.get(`/api/clients/${id}/equifax-breach-settlement/live/preview`),

  getEquifaxSettlementSavedScreenshot: (id: string) =>
    api.get(`/api/clients/${id}/equifax-breach-settlement/saved-screenshot`),

  saveEquifaxSettlementScreenshot: (id: string) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement/saved-screenshot`),

  clickEquifaxSettlementLivePreview: (id: string, payload: { xRatio: number; yRatio: number }) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement/live/preview/click`, payload),

  scrollEquifaxSettlementLivePreview: (id: string, payload: { deltaY: number }) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement/live/preview/scroll`, payload),

  focusEquifaxSettlementLiveBrowser: (id: string) =>
    api.post(`/api/clients/${id}/equifax-breach-settlement/live/focus`),

  closeEquifaxSettlementLiveBrowser: (id: string) =>
    api.delete(`/api/clients/${id}/equifax-breach-settlement/live`),
};

// Disputes API
export const disputesApi = {
  getDisputes: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/disputes', { params }),
  
  getDispute: (id: string) => api.get(`/api/disputes/${id}`),
  
  createDispute: (disputeData: any) => api.post('/api/disputes', disputeData),
  
  updateDispute: (id: string, disputeData: any) =>
    api.put(`/api/disputes/${id}`, disputeData),
  
  deleteDispute: (id: string) => api.delete(`/api/disputes/${id}`),

  generateLetter: (disputeId: number, payload: any) =>
    api.post(`/api/disputes/${disputeId}/letter`, payload),
};

// Credit Repair API
export const creditRepairApi = {
  generateLetters: (payload: any) =>
    api.post('/api/credit-repair/generate-letters', payload),
  
  getGeneratedLetters: (clientId: string | number) =>
    api.get(`/api/credit-repair/generated-letters?clientId=${clientId}`),
};

// Client Documents API
export const clientDocumentsApi = {
  getDocuments: (clientId: string | number) =>
    api.get(`/api/client-documents/${clientId}`),
  
  uploadDocument: (clientId: string | number, type: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post(`/api/client-documents/${clientId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteDocument: (clientId: string | number, type: string) =>
    api.delete(`/api/client-documents/${clientId}/document/${type}`),

  uploadAdditionalDocument: (clientId: string | number, type: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post(`/api/client-documents/${clientId}/additional/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Additional documents (multi-doc support for "Other Documents")
  uploadMultipleAdditionalDocuments: (clientId: string | number, type: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('type', type);
    return api.post(`/api/client-documents/${clientId}/additional/upload-multiple`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getAdditionalDocuments: (clientId: string | number) =>
    api.get(`/api/client-documents/${clientId}/additional`),

  deleteAdditionalDocument: (clientId: string | number, docId: number) =>
    api.delete(`/api/client-documents/${clientId}/additional/${docId}`),
};

// Contracts API
export const contractsApi = {
  // Templates
  getTemplates: () => api.get('/api/contracts/templates'),
  createTemplate: (data: { name: string; description?: string; content_html?: string; content_text?: string; status?: 'draft' | 'active' | 'archived' }) =>
    api.post('/api/contracts/templates', data),
  updateTemplate: (id: number, data: Partial<{ name: string; description?: string; content_html?: string; content_text?: string; status?: 'draft' | 'active' | 'archived' }>) =>
    api.put(`/api/contracts/templates/${id}`, data),
  deleteTemplate: (id: number) => api.delete(`/api/contracts/templates/${id}`),
  getTsmEliteTemplates: () => api.get('/api/contracts/tsm-elite/templates'),
  createTsmEliteTemplate: (data: { name: string; description?: string; content_html?: string; content_text?: string; status?: 'draft' | 'active' }) =>
    api.post('/api/contracts/tsm-elite/templates', data),
  updateTsmEliteTemplate: (id: number, data: Partial<{ name: string; description?: string; content_html?: string; content_text?: string; status?: 'draft' | 'active' }>) =>
    api.put(`/api/contracts/tsm-elite/templates/${id}`, data),
  deleteTsmEliteTemplate: (id: number) => api.delete(`/api/contracts/tsm-elite/templates/${id}`),
  getLatestTsmEliteAgreement: () => api.get('/api/contracts-admin/tsm-elite/latest'),
  signLatestTsmEliteAgreement: (data: { signature_image_url: string }) => api.post('/api/contracts-admin/tsm-elite/latest/sign', data),

  // Contracts
  getContracts: (params?: { clientId?: number }) => api.get('/api/contracts', { params }),
  getMyContracts: () => api.get('/api/contracts/my'),
  getContract: (id: number) => api.get(`/api/contracts/${id}`),
  createContract: (data: { client_id: number; admin_id: number; template_id?: number; title?: string; due_at?: string; status?: 'draft' | 'pending_signature'; metadata?: any }) =>
    api.post('/api/contracts', data),
  updateContract: (id: number, data: Partial<{ title?: string; due_at?: string; status?: 'draft' | 'pending_signature' | 'signed' | 'void' | 'expired'; void_reason?: string; metadata?: any }>) =>
    api.put(`/api/contracts/${id}`, data),
  sendContract: (id: number) => api.post(`/api/contracts/${id}/send`),
  voidContract: (id: number, void_reason?: string) => api.post(`/api/contracts/${id}/void`, { void_reason }),
  signContract: (id: number, data: { signature_text?: string; signature_image_url?: string }) =>
    api.post(`/api/contracts/${id}/sign`, data),
  getSignatures: (id: number) => api.get(`/api/contracts/${id}/signatures`),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  
  getDashboardAnalytics: () => api.get('/api/analytics/dashboard'),
  
  getRevenue: (params?: { period?: string }) =>
    api.get('/api/analytics/revenue', { params }),
  
  getPerformance: () => api.get('/api/analytics/performance'),
  
  getClients: () => api.get('/api/analytics/clients'),
  
  getRecentActivities: (limit = 10) => api.get(`/api/analytics/activities?limit=${limit}`),

  getGa4Realtime: () => api.get('/api/analytics/ga4/realtime'),

  getEliteDashboard: () => api.get('/api/analytics/dashboard-elite'),
};

// Billing API
export const billingApi = {
  getHistory: () => api.get('/api/billing/history'),
  getStripeHistory: () => api.get('/api/billing/stripe-history'),
  
  getSubscription: () => api.get('/api/billing/subscription'),
  
  getStripeConfig: () => api.get('/api/billing/stripe-config'),
  
  // Create a Stripe Checkout Session for subscription
  createSubscriptionCheckout: (data: {
    planId: string | number;
    billingCycle?: 'monthly' | 'yearly';
    affiliateId?: string | number;
  }) => api.post('/api/billing/create-subscription-checkout', data),
  
  createPaymentIntent: (data: {
    amount: number;
    currency?: string;
    plan_id?: string | number;
    billing_cycle?: 'monthly' | 'yearly';
    planName?: string;
    planType?: string;
    course_id?: string | number;
    affiliateId?: string | number;
  }) =>
    api.post('/api/billing/create-payment-intent', data),
  
  confirmPayment: (paymentIntentId: string) =>
    api.post('/api/billing/confirm-payment', { paymentIntentId }),

  finalizeCheckoutSession: (sessionId: string) =>
    api.post('/api/billing/finalize-checkout-session', { sessionId }),
  
  cancelSubscription: (data?: { reasonCode?: string; reasonText?: string }) =>
    api.post('/api/billing/cancel-subscription', data),
};

// Credit Report Scraper API
export const creditReportScraperApi = {
  getPlatforms: () => api.get('/api/credit-reports/platforms'),
  
  scrapeReport: (data: {
    platform: string;
    credentials: { username: string; password: string };
    clientId?: string;
    options?: {
      saveHtml?: boolean;
      takeScreenshots?: boolean;
      outputDir?: string;
      ssnLast4?: string;
    };
  }) => api.post('/api/credit-reports/scrape', data),
  
  fetchReport: (platform: string, username: string, password: string, clientId?: string, ssnLast4?: string) => 
    api.get('/api/credit-reports/fetch', { 
      params: { platform, username, password, clientId, ssnLast4 } 
    }),
  
  getReportHistory: (clientId?: number) => {
    const endpoint = clientId 
      ? `/api/credit-reports/history?clientId=${clientId}`
      : '/api/credit-reports/history';
    return api.get(endpoint);
  },
  
  getReportById: (id: string) => api.get(`/api/credit-reports/${id}`),
  
  getClientReport: (clientId: string) => api.get(`/api/credit-reports/client/${clientId}`),
  
  // New endpoint for funding managers to get credit reports for users with funding requests
  getFundingManagerReport: (userId: string) => api.get(`/api/credit-reports/funding-manager/${userId}`),
  
  getJsonFile: (filename: string) => api.get(`/api/credit-reports/json-file?filename=${filename}`),
};

// Scraper Logs API
export const scraperLogsApi = {
  startServer: (data: { port?: number }) => apiRequest('/api/scraper/start-server', { method: 'POST', body: JSON.stringify(data) }),
  stopServer: () => apiRequest('/api/scraper/stop-server', { method: 'POST' }),
  runScraper: (data: { username: string; password: string; clientId?: string }) => apiRequest('/api/scraper/run', { method: 'POST', body: JSON.stringify(data) }),
  getServerStatus: () => apiRequest('/api/scraper/status'),
  getLogs: () => apiRequest('/api/scraper/logs')
};

// War Machine API
export const warMachineApi = {
  runSmPiSuperEngine: (payload: any) =>
    api.post('/api/war-machine/run', {
      command: 'WAR_MACHINE.RUN_SM_PI_SUPER_ENGINE',
      payload,
    }),
  runInquiriesReview: (payload: any) =>
    api.post('/api/war-machine/run', {
      command: 'WAR_MACHINE.RUN_INQUIRIES_REVIEW',
      payload,
    }),
  runAccountsEval: (payload: any) =>
    api.post('/api/war-machine/accounts/eval', payload),
  runPublicRecordsEval: (payload: any) =>
    api.post('/api/war-machine/public-records/eval', payload),
};

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  duration?: string;
  type: 'webinar' | 'workshop' | 'office_hours' | 'exam' | 'meetup' | 'deadline' | 'meeting' | 'physical_event' | 'report_pull' | 'other';
  instructor?: string;
  location?: string;
  is_virtual?: boolean;
  is_physical?: boolean;
  visible_to_admins?: boolean;
  max_attendees?: number;
  meeting_link?: string;
  created_at: string;
  updated_at: string;
}

export const calendarApi = {
  getEvents: (params?: { page?: number; limit?: number; search?: string; type?: string; is_virtual?: boolean; date_from?: string; date_to?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return apiRequest(`/api/calendar/events${queryString ? `?${queryString}` : ''}`);
  },
  getEvent: (id: number) => apiRequest(`/api/calendar/events/${id}`),
  createEvent: (data: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) => 
    apiRequest('/api/calendar/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: number, data: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>>) => 
    apiRequest(`/api/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: number) => apiRequest(`/api/calendar/events/${id}`, { method: 'DELETE' }),
  registerForEvent: (eventId: number) => apiRequest(`/api/calendar/events/${eventId}/register`, { method: 'POST' }),
  unregisterFromEvent: (eventId: number) => apiRequest(`/api/calendar/events/${eventId}/register`, { method: 'DELETE' }),
  getMyEvents: () => apiRequest('/api/calendar/my-events')
};

export interface Course {
  id: number;
  title: string;
  description?: string;
  instructor: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
  featured: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  chapter_count?: number;
}

export const coursesApi = {
  getCourses: (params?: { page?: number; limit?: number; search?: string; difficulty?: string; featured?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const queryString = queryParams.toString();
    return apiRequest(`/api/courses${queryString ? `?${queryString}` : ''}`);
  },
  getCourse: (id: number) => apiRequest(`/api/courses/${id}`),
  createCourse: (data: Omit<Course, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'chapter_count'> & { chapters?: Array<{ title: string; content?: string; video_url?: string; duration: string }> }) => 
    apiRequest('/api/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: number, data: Partial<Omit<Course, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'chapter_count'>>) => 
    apiRequest(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id: number) => apiRequest(`/api/courses/${id}`, { method: 'DELETE' }),
  enrollInCourse: (courseId: number) => apiRequest(`/api/courses/${courseId}/enroll`, { method: 'POST' }),
  getEnrolledCourses: () => apiRequest('/api/courses/enrolled'),
  checkEnrollment: (courseId: number) => apiRequest(`/api/courses/${courseId}/enrollment`)
};

// Export the axios instance as 'api' for backward compatibility
export { api };

// Set auth token function
export const setAuthToken = (token: string) => {
  console.log('🔧 setAuthToken: Called with token:', token?.substring(0, 50) + '...');
  console.log('🔧 setAuthToken: localStorage before:', getStoredAuthValue('auth_token')?.substring(0, 50) + '...');
  
  try {
    writeStoredAuthSnapshot({ auth_token: token, token });
    console.log('✅ setAuthToken: Token stored successfully');
    
    // Verify storage
    const storedToken = getStoredAuthValue('auth_token');
    console.log('🔍 setAuthToken: Verification - token stored:', !!storedToken);
    console.log('🔍 setAuthToken: Verification - tokens match:', storedToken === token);
    console.log('🔍 setAuthToken: Verification - stored token preview:', storedToken?.substring(0, 50) + '...');
  } catch (error) {
    console.error('💥 setAuthToken: Error storing token:', error);
  }
};

// User interface
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  address?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

// Pricing API
export const pricingApi = {
  getPlans: () => api.get('/api/pricing/plans'),
  getPlan: (id: string) => api.get(`/api/pricing/plans/${id}`),
  createSubscription: (data: { planId: string; paymentMethodId: string }) =>
    api.post('/api/pricing/subscribe', data),
};

export const shopApi = {
  getProducts: () => api.get('/api/shop/products'),
  createCheckout: (data: { product_id: number; purchaser_name: string; email: string; cookie_id: string }) =>
    api.post('/api/shop/checkout', data),
  finalize: (session_id: string) => api.post('/api/shop/finalize', { session_id }),
  requestCode: (data: { product_id: number; email: string }) =>
    api.post('/api/shop/request-code', data),
  verifyCode: (data: { product_id: number; email: string; code: string; cookie_id: string }) =>
    api.post('/api/shop/verify-code', data),
  successRequestCode: (data: { session_id: string; email: string }) =>
    api.post('/api/shop/success-request-code', data),
  successVerifyCode: (data: { session_id: string; email: string; code: string; cookie_id: string }) =>
    api.post('/api/shop/success-verify-code', data),
};

// Super Admin API
export const superAdminApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string; account_type?: string; referral_source?: string; created_from?: string; created_to?: string }) =>
    api.get('/api/super-admin/users', { params }),
  getUser: (id: string) => api.get(`/api/super-admin/users/${id}`),
  getDefaultContractTemplate: () => api.get('/api/super-admin/contract-templates/default'),
  updateDefaultContractTemplate: (payload: { name?: string; description?: string; content?: string }) => api.put('/api/super-admin/contract-templates/default', payload),
  updateUser: (id: string, data: any) => api.put(`/api/super-admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/super-admin/users/${id}`),
  getPlans: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean | string }) =>
    api.get('/api/super-admin/plans', { params }),
  createPlan: (data: any) => api.post('/api/super-admin/plans', data),
  updatePlan: (id: string | number, data: any) => api.put(`/api/super-admin/plans/${id}`, data),
  deletePlan: (id: string | number) => api.delete(`/api/super-admin/plans/${id}`),
  getInvitations: (params?: { page?: number; limit?: number }) =>
    api.get('/api/super-admin/invitations', { params }),
  sendInvitation: (data: { email: string; role: string }) =>
    api.post('/api/super-admin/invitations/send', data),
  sendBulkInvitations: (invitations: Array<{ email: string; name?: string; type: string }>) =>
    api.post('/api/super-admin/invitations/bulk', { invitations }),
  getAdminProfiles: (params?: { page?: number; limit?: number; search?: string; is_active?: string; access_level?: string }) =>
    api.get('/api/super-admin/admins', { params }),
  getAdminProfile: (id: string | number) => api.get(`/api/super-admin/admins/${id}`),
  getAdminAgreements: (id: string | number) => api.get(`/api/super-admin/admins/${id}/agreements`),
  getAdminTsmEliteAgreements: (id: string | number) => api.get(`/api/super-admin/admins/${id}/tsm-elite-agreements`),
  createAdminProfile: (data: any) => api.post('/api/super-admin/admins', data),
  updateAdminProfile: (id: string | number, data: any) => api.put(`/api/super-admin/admins/${id}`, data),
  deleteAdminProfile: (id: string | number) => api.delete(`/api/super-admin/admins/${id}`),
  getUserSubscriptions: (params?: { page?: number; limit?: number }) =>
    api.get('/api/super-admin/user-subscriptions', { params }),
  getBillingTransactions: (params?: { page?: number; limit?: number; user_id?: string | number; status?: string; plan_type?: string; search?: string }) =>
    api.get('/api/super-admin/billing-transactions', { params }),
  importAdminsCSV: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/super-admin/admins/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  importClientsCSV: (file: File, adminId: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('admin_id', String(adminId));
    return api.post('/api/super-admin/clients/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getClients: (params?: { page?: number; limit?: number; search?: string; status?: string; admin?: string; user_id?: string | number }) =>
    api.get('/api/super-admin/clients', { params }),
  getClientStatistics: () => api.get('/api/super-admin/client-statistics'),
  getSalesChatAnalytics: () => api.get('/api/super-admin/analytics/sales-chat'),
  getSalesChatAnalyticsRange: (params?: { from?: string; to?: string }) =>
    api.get('/api/super-admin/analytics/sales-chat', { params }),
  getReportPullingAnalytics: () => api.get('/api/super-admin/analytics/report-pulling'),
  getReportPullingAnalyticsRange: (params?: { from?: string; to?: string }) =>
    api.get('/api/super-admin/analytics/report-pulling', { params }),
  getErrorAnalysisRange: (params?: { from?: string; to?: string }) =>
    api.get('/api/super-admin/analytics/error-analysis', { params }),
  getRecentAlerts: () => api.get('/api/super-admin/analytics/recent-alerts'),
  getStripeRevenue: (params?: { from?: string; to?: string; group_by?: 'day' | 'month' }) =>
    api.get('/api/super-admin/analytics/stripe-revenue', { params }),
  getStripePayments: (params?: { from?: string; to?: string }) =>
    api.get('/api/super-admin/analytics/stripe-payments', { params }),
  loginAsAdmin: (adminId: string | number) =>
    api.post('/api/auth/login-as-admin', { adminId }, {
      headers: {
        [SKIP_REFRESH_TOKEN_PERSIST_HEADER]: '1',
      },
    }),
  loginAsAffiliate: (affiliateId: number) =>
    api.post('/api/auth/login-as-affiliate', { affiliateId }, {
      headers: {
        [SKIP_REFRESH_TOKEN_PERSIST_HEADER]: '1',
      },
    }),
  // Support Users Management
  getSupportUsers: (params?: { page?: number; limit?: number; search?: string; is_active?: string }) =>
    api.get('/api/super-admin/support-users', { params }),
  createSupportUser: (data: { first_name: string; last_name: string; email: string; password: string; department?: string; title?: string }) =>
    api.post('/api/super-admin/support-users', data),
  updateSupportUser: (id: number, data: { first_name?: string; last_name?: string; email?: string; department?: string; title?: string }) =>
    api.put(`/api/super-admin/support-users/${id}`, data),
  deleteSupportUser: (id: number) => api.delete(`/api/super-admin/support-users/${id}`),
  updateSupportUserPassword: (id: number, data: { password: string }) =>
    api.put(`/api/super-admin/support-users/${id}/password`, data),
  // Alias to match component usage
  changeSupportUserPassword: (id: number, password: string) =>
    api.put(`/api/super-admin/support-users/${id}/password`, { password }),
  loginAsSupportUser: (id: number) =>
    api.post(`/api/super-admin/support-users/${id}/login`, undefined, {
      headers: {
        [SKIP_REFRESH_TOKEN_PERSIST_HEADER]: '1',
      },
    }),
  // Subscription Management
  getSubscriptions: (params?: { page?: number; limit?: number; search?: string; status?: string; admin?: string }) =>
    api.get('/api/super-admin/subscriptions', { params }),
  getSubscriptionAnalytics: () => api.get('/api/super-admin/analytics/subscriptions'),
  getUpcomingRenewals: (params?: { page?: number; limit?: number; days?: number }) =>
    api.get('/api/super-admin/subscriptions/upcoming-renewals', { params }),
  getRecentCancellations: (params?: { page?: number; limit?: number; days?: number; search?: string }) =>
    api.get('/api/super-admin/subscriptions/recent-cancellations', { params }),
  updateSubscription: (id: number, data: any) => api.put(`/api/super-admin/subscriptions/${id}`, data),
  cancelSubscription: (id: number) => api.post(`/api/super-admin/subscriptions/${id}/cancel`),
  renewSubscription: (id: number, expires_at: string) => api.post(`/api/super-admin/subscriptions/${id}/renew`, { expires_at }),
  getUserActivity: (userId: number | string, params?: { page?: number; limit?: number; activity_type?: string; resource_type?: string; date_from?: string; date_to?: string }) =>
    api.get(`/api/super-admin/users/${userId}/activity`, { params }),
  
  // Affiliate Management endpoints
  getAffiliates: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/api/affiliate-management', { params }),
  getAffiliate: (id: string) => api.get(`/api/affiliate-management/${id}`),
  createAffiliate: (data: any) => api.post('/api/affiliate-management', data),
  updateAffiliate: (id: string, data: any) => api.put(`/api/affiliate-management/${id}`, data),
  deleteAffiliate: (id: string) => api.delete(`/api/affiliate-management/${id}`),
  getCommissionHistory: (params?: { page?: number; limit?: number; affiliate_id?: string; affiliateId?: string }) => {
    const mapped: any = { ...params };
    if (params?.affiliate_id && !params?.affiliateId) {
      mapped.affiliateId = params.affiliate_id;
      delete mapped.affiliate_id;
    }
    return api.get('/api/commissions/history', { params: mapped });
  },
  
  // Stripe Configuration Management
  getStripeConfig: () => api.get('/api/super-admin/stripe-config'),
  updateStripeConfig: (data: any) => api.post('/api/super-admin/stripe-config', data),
  // Alias for create flow used by some components
  createStripeConfig: (data: any) => api.post('/api/super-admin/stripe-config', data),
  updateStripeConfigSetting: (data: any) => api.put('/api/super-admin/stripe/config', data),
  getAffiliateCommissionSettings: () => api.get('/api/super-admin/affiliate-commission-settings'),
  updateAffiliateCommissionSettings: (data: { level2_rate_free: number; level2_rate_paid: number }) =>
    api.post('/api/super-admin/affiliate-commission-settings', data),
  getOpenAiConfiguration: () => api.get('/api/super-admin/open-ai-configuration'),
  updateOpenAiConfiguration: (data: { template: string }) =>
    api.post('/api/super-admin/open-ai-configuration', data),
  getBusinessDirectories: () => api.get('/api/super-admin/business-directories'),
  createBusinessDirectory: (data: FormData) =>
    api.post('/api/super-admin/business-directories', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateBusinessDirectory: (id: string | number, data: FormData) =>
    api.put(`/api/super-admin/business-directories/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteBusinessDirectory: (id: string | number) =>
    api.delete(`/api/super-admin/business-directories/${id}`),
  importAffiliateCSV: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/super-admin/affiliates/import-csv', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadCreditReport: (data: { admin_id: number; client_id: number; platform: string; report_json: any; experian_score?: number; equifax_score?: number; transunion_score?: number; credit_score?: number; report_date?: string; notes?: string }) =>
    api.post('/api/super-admin/credit-reports/upload', data),
  getShopProducts: () => api.get('/api/super-admin/shop/products'),
  uploadShopFiles: (form: FormData) =>
    api.post('/api/super-admin/shop/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  fetchShopUrlMeta: (url: string) => api.get('/api/super-admin/shop/url-meta', { params: { url } }),
  createShopProduct: (data: { name: string; description?: string; price: number; thumbnail_url?: string | null; stripe_billing_link?: string | null; files?: Array<{ url: string; type: 'image' | 'video' | 'pdf' | 'zip' | 'other'; source: 'upload' | 'link' }> }) =>
    api.post('/api/super-admin/shop/products', data),
  updateShopProduct: (id: number, data: { name?: string; description?: string; price?: number; thumbnail_url?: string | null; stripe_billing_link?: string | null; files?: Array<{ url: string; type: 'image' | 'video' | 'pdf' | 'zip' | 'other'; source: 'upload' | 'link' }> }) =>
    api.put(`/api/super-admin/shop/products/${id}`, data),
  deleteShopProduct: (id: number) => api.delete(`/api/super-admin/shop/products/${id}`),
  getTasks: () => api.get('/api/super-admin/tasks'),
  createTask: (data: { title: string; description: string; status?: string; priority?: string; rejection_reason?: string | null; attachments?: File[]; screenshot?: File | null }) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('description', data.description);
    if (data.status) form.append('status', data.status);
    if (data.priority) form.append('priority', data.priority);
    if (typeof data.rejection_reason !== 'undefined') {
      form.append('rejection_reason', data.rejection_reason || '');
    }
    const attachments = data.attachments && data.attachments.length > 0
      ? data.attachments
      : data.screenshot
        ? [data.screenshot]
        : [];
    attachments.forEach((file) => form.append('attachments', file));
    return api.post('/api/super-admin/tasks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateTask: (id: number, data: { title?: string; description?: string; status?: string; priority?: string; rejection_reason?: string | null; attachments?: File[]; screenshot?: File | null }) => {
    const attachments = data.attachments && data.attachments.length > 0
      ? data.attachments
      : data.screenshot
        ? [data.screenshot]
        : [];
    if (attachments.length > 0) {
      const form = new FormData();
      if (data.title !== undefined) form.append('title', data.title);
      if (data.description !== undefined) form.append('description', data.description);
      if (data.status !== undefined) form.append('status', data.status);
      if (data.priority !== undefined) form.append('priority', data.priority);
      if (typeof data.rejection_reason !== 'undefined') {
        form.append('rejection_reason', data.rejection_reason || '');
      }
      attachments.forEach((file) => form.append('attachments', file));
      return api.put(`/api/super-admin/tasks/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put(`/api/super-admin/tasks/${id}`, data);
  },
  deleteTask: (id: number) => api.delete(`/api/super-admin/tasks/${id}`),
  // Affiliate Trial Plans
  getAffiliateTrialPlans: () => api.get('/api/super-admin/affiliate-trial-plans'),
  getAffiliatesForTrialPlans: () => api.get('/api/super-admin/affiliate-trial-plans/affiliates'),
  createAffiliateTrialPlan: (data: { affiliate_id: number; duration_months: number; status: string; start_date?: string | null; end_date?: string | null }) =>
    api.post('/api/super-admin/affiliate-trial-plans', data),
  updateAffiliateTrialPlan: (id: number, data: { affiliate_id: number; duration_months: number; status: string; start_date?: string | null; end_date?: string | null }) =>
    api.put(`/api/super-admin/affiliate-trial-plans/${id}`, data),
  deleteAffiliateTrialPlan: (id: number) => api.delete(`/api/super-admin/affiliate-trial-plans/${id}`),
};

// Affiliate API module
export const affiliateApi = {
  // Dashboard endpoints
  getStats: () => api.get('/api/affiliate/dashboard/stats'),
  getRecentReferrals: (limit: number = 10) => api.get(`/api/affiliate/dashboard/recent-referrals?limit=${limit}`),
  getPerformance: () => api.get('/api/affiliate/dashboard/performance'),
  getTeamPerformance: () => api.get('/api/affiliate/dashboard/team-performance'),
  getLeaderboard: () => api.get('/api/affiliate/dashboard/leaderboard'),
  getCommissions: (params?: { limit?: number; type?: string; from?: string; to?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    return api.get(`/api/affiliate/dashboard/commissions?${queryParams}`);
  },
  getAnalytics: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/stats?${queryParams}`);
  },
  generateLink: (data: { campaign: string; customCode?: string; linkType?: 'product' | 'affiliate_only' }) => 
    api.post('/api/affiliate/dashboard/generate-link', data),

  // Referrals endpoints
  getReferrals: async (params?: { page?: number; limit?: number; fetchAll?: boolean }) => {
    if (params?.page || params?.limit || params?.fetchAll === false) {
      return api.get('/api/affiliate/referrals', { params });
    }

    const limit = 100;
    const maxPages = 1000;
    const allRows: any[] = [];
    let firstResponse: any = null;

    for (let page = 1; page <= maxPages; page += 1) {
      const response = await api.get('/api/affiliate/referrals', {
        params: { page, limit },
      });

      if (!firstResponse) {
        firstResponse = response;
      }

      const batch = Array.isArray(response.data?.data) ? response.data.data : [];
      allRows.push(...batch);

      if (batch.length < limit) {
        break;
      }
    }

    if (!firstResponse) {
      return api.get('/api/affiliate/referrals', { params: { page: 1, limit } });
    }

    const dedupedRows = Array.from(
      new Map(allRows.map((row: any) => [String(row?.id ?? ''), row])).values()
    ).filter((row: any) => String(row?.id ?? '') !== '');

    return {
      ...firstResponse,
      data: {
        ...firstResponse.data,
        data: dedupedRows,
      },
    };
  },
  getReferralPurchases: () => api.get('/api/affiliate/referrals/purchases'),
  getChildReferrals: () => api.get('/api/affiliate/referrals/child'),
  getReferralStats: () => api.get('/api/affiliate/referrals/stats'),
  sendFollowUp: (referralId: string) => api.post(`/api/affiliate/referrals/${referralId}/follow-up`),

  // Tiers endpoint
  getTiers: () => api.get('/api/affiliate/tiers'),

  // Earnings endpoints
  getEarningsStats: () => api.get('/api/affiliate/earnings/stats'),
  getEarningsBreakdown: () => api.get('/api/affiliate/earnings/breakdown'),
  getPaymentHistory: () => api.get('/api/affiliate/earnings/payments'),
  getMonthlyEarnings: () => api.get('/api/affiliate/earnings/monthly'),

  // Profile endpoint
  getProfile: () => api.get('/api/auth/profile'),

  // Analytics endpoints
  getTrafficSources: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/traffic-sources?${queryParams}`);
  },
  getGeographicData: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/geographic?${queryParams}`);
  },
  getDeviceData: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/devices?${queryParams}`);
  },
  getTimeSeriesData: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/time-series?${queryParams}`);
  },
  getTopLinks: (params?: { range?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.range) queryParams.append('range', params.range);
    return api.get(`/api/affiliate/analytics/top-links?${queryParams}`);
  },

  // Settings endpoints
  getSettings: () => api.get('/api/affiliate/settings'),
  updateProfile: (data: any) => api.put('/api/affiliate/settings/profile', data),
  updateNotifications: (data: any) => api.put('/api/affiliate/settings/notifications', data),
  updatePayment: (data: any) => api.put('/api/affiliate/settings/payment', data),
  updatePassword: (data: any) => api.put('/api/affiliate/settings/password', data),
  checkSlugAvailability: (slug: string) => api.post('/api/affiliate/check-slug', { slug }),
  updateReferralSlug: (slug: string) => api.put('/api/affiliate/settings/referral-slug', { slug }),

  // Marketing endpoints
  getMarketingMaterials: () => api.get('/api/affiliate/marketing-materials'),
  getMarketingStats: () => api.get('/api/affiliate/marketing-stats'),
  trackMaterialDownload: (materialId: string) => 
    api.post('/api/affiliate/marketing-materials/download', { materialId }),
};

// Support API - uses authenticated axios instance
export const supportApi = {
  // Settings Management
  getSettings: () => api.get('/api/support/settings/all'),
  updateSettings: (data: any) => api.put('/api/support/settings', data),
  
  // Team Management
  getTeamMembers: () => api.get('/api/support/team-members'),
  updateTeamMember: (id: string, data: any) => api.put(`/api/support/settings/team-members/${id}`, data),
  deleteTeamMember: (id: string) => api.delete(`/api/support/settings/team-members/${id}`),
  
  // Notifications
  saveNotificationSettings: (data: any) => api.post('/api/support/settings/notifications', data),
  
  // Working Hours
  saveWorkingHours: (data: any) => api.post('/api/support/settings/working-hours', data),
  
  // General Settings
  saveGeneralSettings: (data: any) => api.post('/api/support/settings/general', data),
  
  // Profile Management
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
  getTasks: () => api.get('/api/support/dashboard/tasks'),
  createTask: (data: { title: string; description: string; status?: string; priority?: string; rejection_reason?: string | null; attachments?: File[]; screenshot?: File | null }) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('description', data.description);
    if (data.status) form.append('status', data.status);
    if (data.priority) form.append('priority', data.priority);
    if (typeof data.rejection_reason !== 'undefined') {
      form.append('rejection_reason', data.rejection_reason || '');
    }
    const attachments = data.attachments && data.attachments.length > 0
      ? data.attachments
      : data.screenshot
        ? [data.screenshot]
        : [];
    attachments.forEach((file) => form.append('attachments', file));
    return api.post('/api/support/dashboard/tasks', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateTask: (id: number, data: { title?: string; description?: string; status?: string; priority?: string; rejection_reason?: string | null; attachments?: File[]; screenshot?: File | null }) => {
    const attachments = data.attachments && data.attachments.length > 0
      ? data.attachments
      : data.screenshot
        ? [data.screenshot]
        : [];
    if (attachments.length > 0) {
      const form = new FormData();
      if (data.title !== undefined) form.append('title', data.title);
      if (data.description !== undefined) form.append('description', data.description);
      if (data.status !== undefined) form.append('status', data.status);
      if (data.priority !== undefined) form.append('priority', data.priority);
      if (typeof data.rejection_reason !== 'undefined') {
        form.append('rejection_reason', data.rejection_reason || '');
      }
      attachments.forEach((file) => form.append('attachments', file));
      return api.put(`/api/support/dashboard/tasks/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put(`/api/support/dashboard/tasks/${id}`, data);
  },
  deleteTask: (id: number) => api.delete(`/api/support/dashboard/tasks/${id}`),
};

// Admin Notification API
export const adminNotificationApi = {
  // Get admin notifications
  getNotifications: (params?: { limit?: number; offset?: number; unread_only?: boolean }) =>
    api.get('/api/admin/notifications', { params }),
  
  // Mark notification as read
  markAsRead: (notificationId: string) =>
    api.put(`/api/admin/notifications/${notificationId}/read`),
  
  // Mark all notifications as read
  markAllAsRead: () =>
    api.put('/api/admin/notifications/read-all'),
  
  // Create notification (internal use)
  createNotification: (data: {
    recipient_id: number;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'system';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    action_url?: string;
    action_text?: string;
    expires_at?: string;
  }) => api.post('/api/admin/notifications', data),
};

// School Management API
export const schoolManagementApi = {
  // Course Management
  getCourses: (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) =>
    api.get('/api/school-management/courses', { params }),
  getCourse: (id: string) => api.get(`/api/school-management/courses/${id}`),
  createCourse: (data: any) => api.post('/api/school-management/courses', data),
  updateCourse: (id: string, data: any) => api.put(`/api/school-management/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`/api/school-management/courses/${id}`),
  
  // Course Categories
  getCategories: () => api.get('/api/school-management/categories'),
  createCategory: (data: { name: string; description?: string }) => 
    api.post('/api/school-management/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string }) => 
    api.put(`/api/school-management/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/api/school-management/categories/${id}`),
  
  // Course Videos
  getVideos: () => api.get('/api/school-management/videos'),
  getCourseVideos: (courseId: string) => api.get(`/api/school-management/courses/${courseId}/videos`),
  createCourseVideo: (courseId: string, data: any) =>
    api.post(`/api/school-management/courses/${courseId}/videos`, data),
  uploadVideo: (formData: FormData) => 
    api.post('/api/school-management/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateVideo: (videoId: string, data: any) => 
    api.put(`/api/school-management/videos/${videoId}`, data),
  deleteVideo: (videoId: string) => 
    api.delete(`/api/school-management/videos/${videoId}`),
  
  // Course Materials/Documents
  getMaterials: () => api.get('/api/school-management/materials'),
  getCourseMaterials: (courseId: string) => api.get(`/api/school-management/courses/${courseId}/materials`),
  uploadMaterial: (courseId: string, data: FormData) => {
    console.log('🔍 DEBUG API: uploadMaterial called with:', { courseId, data });
    console.log('🔍 DEBUG API: URL will be:', `/api/school-management/courses/${courseId}/materials`);
    
    // Log FormData contents
    console.log('📋 DEBUG API: FormData contents:');
    for (let [key, value] of data.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    return api.post(`/api/school-management/courses/${courseId}/materials`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateMaterial: (materialId: string, data: any) => 
    api.put(`/api/school-management/materials/${materialId}`, data),
  deleteMaterial: (materialId: string) => 
    api.delete(`/api/school-management/materials/${materialId}`),
  
  // Course Quizzes
  getCourseQuizzes: (courseId: string) => api.get(`/api/school-management/courses/${courseId}/quizzes`),
  createQuiz: (courseId: string, data: any) => 
    api.post(`/api/school-management/courses/${courseId}/quizzes`, data),
  updateQuiz: (courseId: string, quizId: string, data: any) => 
    api.put(`/api/school-management/courses/${courseId}/quizzes/${quizId}`, data),
  deleteQuiz: (courseId: string, quizId: string) => 
    api.delete(`/api/school-management/courses/${courseId}/quizzes/${quizId}`),
  
  // Quiz Questions
  getQuizQuestions: (quizId: string) => api.get(`/api/school-management/quizzes/${quizId}/questions`),
  createQuizQuestion: (quizId: string, data: any) => 
    api.post(`/api/school-management/quizzes/${quizId}/questions`, data),
  updateQuizQuestion: (quizId: string, questionId: string, data: any) => 
    api.put(`/api/school-management/quizzes/${quizId}/questions/${questionId}`, data),
  deleteQuizQuestion: (quizId: string, questionId: string) => 
    api.delete(`/api/school-management/quizzes/${quizId}/questions/${questionId}`),
  
  // Analytics and Statistics
  getSchoolStatistics: () => api.get('/api/school-management/statistics'),
  getCourseStats: () => api.get('/api/school-management/statistics'),
  getCourseAnalytics: (courseId: string) => api.get(`/api/school-management/courses/${courseId}/analytics`),
  getLeaderboard: () => api.get('/api/school-management/leaderboard'),
  getBusinessDirectories: () => api.get('/api/school-management/business-directories'),
  
  // File Upload (Generic)
  uploadFile: (data: FormData) => 
    api.post('/api/school-management/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Employees API
export const employeesApi = {
  getEmployees: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/employees', { params }),
  getEmployee: (id: string | number) => api.get(`/api/employees/${id}`),
  createEmployee: (data: {
    email: string;
    firstName: string;
    lastName: string;
    role?: 'employee' | 'user' | 'funding_manager';
    status?: 'active' | 'inactive';
    password?: string;
  }) => api.post('/api/employees', data),
  updateEmployee: (id: string | number, data: {
    firstName?: string;
    lastName?: string;
    role?: 'employee' | 'user' | 'funding_manager';
    status?: 'active' | 'inactive';
  }) => api.put(`/api/employees/${id}`, data),
  deactivateEmployee: (id: string | number) => api.delete(`/api/employees/${id}`),
  toggleEmployeeStatus: (id: string | number) => api.post(`/api/employees/${id}/toggle-status`),
};

export const featureRequestsApi = {
  getRequests: (params?: { page?: number; limit?: number }) =>
    api.get('/api/feature-requests', { params }),
  createRequest: (data: FormData) =>
    api.post('/api/feature-requests', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggleVote: (requestId: number) =>
    api.post(`/api/feature-requests/${requestId}/vote`),
  getComments: (requestId: number) =>
    api.get(`/api/feature-requests/${requestId}/comments`),
  addComment: (requestId: number, content: string) =>
    api.post(`/api/feature-requests/${requestId}/comments`, { content }),
  approveRequest: (requestId: number) =>
    api.post(`/api/feature-requests/${requestId}/approve`),
};

export default api;
