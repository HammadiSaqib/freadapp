import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { creditReportScraperApi, clientsApi } from '../lib/api';
import { runWithReportPullFeedback, showReportPullError } from '../lib/reportPullFeedback';

// Form validation schema
const scraperFormSchema = z.object({
  platform: z.string().min(1, { message: 'Platform is required' }),
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  clientId: z.string().optional(),
  ssnLast4: z.string().optional(),
});

type ScraperFormValues = z.infer<typeof scraperFormSchema>;

const CreditReportScraper: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [platforms, setPlatforms] = useState<string[]>(['myfreescorenow']);
  const [clients, setClients] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<ScraperFormValues>({
    resolver: zodResolver(scraperFormSchema),
    defaultValues: {
      platform: 'myfreescorenow',
    },
  });

  // Fetch available platforms and clients on component mount
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const response = await creditReportScraperApi.getPlatforms();
        if (response.data && response.data.platforms) {
          setPlatforms(response.data.platforms);
        }
      } catch (err) {
        console.error('Failed to fetch platforms:', err);
      }
    };

    const fetchClients = async () => {
      try {
        const response = await clientsApi.getClients();
        if (response.data && response.data.clients) {
          setClients(response.data.clients);
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      }
    };

    fetchPlatforms();
    fetchClients();
  }, []);

  const onSubmit = async (data: ScraperFormValues) => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const requiresSsn = ['identityiq', 'myscoreiq'].includes(String(data.platform).toLowerCase());
      const response = await runWithReportPullFeedback(() =>
        creditReportScraperApi.scrapeReport({
          platform: data.platform,
          credentials: {
            username: data.username,
            password: data.password,
          },
          options: {
            saveHtml: false,
            takeScreenshots: false,
            ...(requiresSsn && data.ssnLast4 ? { ssnLast4: data.ssnLast4 } : {}),
          },
          clientId: data.clientId,
        }),
      );

      if (response.data) {
        setReportData(response.data);
        reset();
      } else {
        showReportPullError();
        setError(response.error || 'Failed to scrape credit report');
      }
    } catch (err: any) {
      setError(
        err.message ||
        'An error occurred while scraping the credit report'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchReport = async () => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const formValues = getValues();
      const requiresSsn = ['identityiq', 'myscoreiq'].includes(String(formValues.platform).toLowerCase());
      const response = await runWithReportPullFeedback(() =>
        creditReportScraperApi.fetchReport(
          formValues.platform,
          formValues.username,
          formValues.password,
          formValues.clientId,
          requiresSsn ? formValues.ssnLast4 : undefined
        ),
      );

      if (response.data) {
        setReportData(response.data);
        reset();
      } else {
        showReportPullError();
        setError(response.error || 'Failed to fetch credit report');
      }
    } catch (err: any) {
      setError(
        err.message ||
        'An error occurred while fetching the credit report'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Credit Report Scraper</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="clientId">
            Client
          </label>
          <select
            id="clientId"
            className="w-full p-2 border rounded-md"
            {...register('clientId')}
          >
            <option value="">-- Select a client (optional) --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.first_name} {client.last_name} {client.email ? `(${client.email})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="platform">
            Platform
          </label>
          <select
            id="platform"
            className="w-full p-2 border rounded-md"
            {...register('platform')}
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform === 'myfreescorenow' ? 'My Free Score Now' : platform}
              </option>
            ))}
          </select>
          {errors.platform && (
            <p className="text-red-500 text-sm mt-1">{errors.platform.message}</p>
          )}
        </div>

        {['identityiq', 'myscoreiq'].includes(String(getValues().platform).toLowerCase()) && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="ssnLast4">
              SSN Last 4 (IdentityIQ/MyScoreIQ)
            </label>
            <input
              id="ssnLast4"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              className="w-full p-2 border rounded-md"
              placeholder="1234"
              {...register('ssnLast4')}
            />
            {errors.ssnLast4 && (
              <p className="text-red-500 text-sm mt-1">{errors.ssnLast4.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="Enter your platform username"
            {...register('username')}
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full p-2 border rounded-md"
            placeholder="Enter your platform password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="pt-2 flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Scrape Credit Report'}
          </button>
          
          <button
            type="button"
            onClick={handleFetchReport}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Fetch Report'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {reportData && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">
            Credit Report Results
            {reportData.client_id && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                for client: {reportData.client_name || `Client #${reportData.client_id}`}
              </span>
            )}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-700 mb-2">Equifax</h4>
              <p className="text-2xl font-bold">{reportData?.scores?.equifax || <span className="text-gray-500">N/A</span>}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-700 mb-2">TransUnion</h4>
              <p className="text-2xl font-bold">{reportData?.scores?.transunion || <span className="text-gray-500">N/A</span>}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-700 mb-2">Experian</h4>
              <p className="text-2xl font-bold">{reportData?.scores?.experian || <span className="text-gray-500">N/A</span>}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold mb-2">Account Summary</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Bureau</th>
                    <th className="py-2 px-4 border-b">Total Accounts</th>
                    <th className="py-2 px-4 border-b">Open Accounts</th>
                    <th className="py-2 px-4 border-b">Closed Accounts</th>
                    <th className="py-2 px-4 border-b">Balances</th>
                  </tr>
                </thead>
                <tbody>
                  {['transunion', 'experian', 'equifax'].map((bureau) => (
                    <tr key={bureau}>
                      <td className="py-2 px-4 border-b capitalize">{bureau}</td>
                      <td className="py-2 px-4 border-b">{reportData?.summary?.[bureau]?.totalAccounts || <span className="text-gray-500">N/A</span>}</td>
                      <td className="py-2 px-4 border-b">{reportData?.summary?.[bureau]?.openAccounts || <span className="text-gray-500">N/A</span>}</td>
                      <td className="py-2 px-4 border-b">{reportData?.summary?.[bureau]?.closedAccounts || <span className="text-gray-500">N/A</span>}</td>
                      <td className="py-2 px-4 border-b">{reportData?.summary?.[bureau]?.balances || <span className="text-gray-500">N/A</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {reportData?.accounts && reportData.accounts.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Accounts ({reportData?.accounts?.length})</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Creditor</th>
                      <th className="py-2 px-4 border-b">Bureau</th>
                      <th className="py-2 px-4 border-b">Account #</th>
                      <th className="py-2 px-4 border-b">Balance</th>
                      <th className="py-2 px-4 border-b">Credit Limit</th>
                      <th className="py-2 px-4 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.accounts?.map((account: any, index: number) => (
                      <tr key={`${account.creditor}-${account.bureau}-${index}`}>
                        <td className="py-2 px-4 border-b">{account.creditor}</td>
                        <td className="py-2 px-4 border-b capitalize">{account.bureau}</td>
                        <td className="py-2 px-4 border-b">{account.accountNumber || <span className="text-gray-500">N/A</span>}</td>
                        <td className="py-2 px-4 border-b">{account.balance || <span className="text-gray-500">N/A</span>}</td>
                        <td className="py-2 px-4 border-b">{account.creditLimit || <span className="text-gray-500">N/A</span>}</td>
                        <td className="py-2 px-4 border-b">{account.status || <span className="text-gray-500">N/A</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData?.inquiries && reportData.inquiries.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Inquiries ({reportData?.inquiries?.length})</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Creditor</th>
                      <th className="py-2 px-4 border-b">Date</th>
                      <th className="py-2 px-4 border-b">Bureau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.inquiries?.map((inquiry: any, index: number) => (
                      <tr key={`${inquiry.creditor}-${index}`}>
                        <td className="py-2 px-4 border-b">{inquiry.creditor}</td>
                        <td className="py-2 px-4 border-b">{inquiry.date || <span className="text-gray-500">N/A</span>}</td>
                        <td className="py-2 px-4 border-b capitalize">{inquiry.bureau || <span className="text-gray-500">N/A</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditReportScraper;
