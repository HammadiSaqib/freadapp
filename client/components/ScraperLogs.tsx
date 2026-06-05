import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { scraperLogsApi, clientsApi } from '@/lib/api';

// Helper functions for credit report display
const getScoreRating = (score: string | number | undefined): string => {
  if (!score) return 'No Score';
  const numScore = typeof score === 'string' ? parseInt(score, 10) : score;
  if (isNaN(numScore)) return 'No Score';
  if (numScore >= 800) return 'Exceptional';
  if (numScore >= 740) return 'Very Good';
  if (numScore >= 670) return 'Good';
  if (numScore >= 580) return 'Fair';
  return 'Poor';
};

const getAccountTypeColor = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Credit Card': '#3b82f6',  // blue
    'Mortgage': '#10b981',     // green
    'Auto Loan': '#f59e0b',    // amber
    'Student Loan': '#8b5cf6', // violet
    'Personal Loan': '#ec4899', // pink
    'Retail': '#6366f1',       // indigo
  };
  
  return typeMap[type] || '#6b7280'; // gray default
};

const getBureauBadgeColor = (bureau: string): string => {
  switch (bureau.toLowerCase()) {
    case 'equifax':
      return 'bg-blue-100 text-blue-800';
    case 'transunion':
      return 'bg-green-100 text-green-800';
    case 'experian':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getInquiryImpact = (count: number): string => {
  if (count <= 2) return 'Low Impact';
  if (count <= 5) return 'Medium Impact';
  return 'High Impact';
};

const getRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
    
    if (diffMonths === 0) return 'This month';
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 24) return `${diffMonths} months ago`;
    return 'Over 2 years ago';
  } catch (e) {
    return '';
  }
};

// Form validation schema
const scraperLogsFormSchema = z.object({
  username: z.string().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
  clientId: z.string().optional(),
});

type ScraperLogsFormValues = z.infer<typeof scraperLogsFormSchema>;

// Credit report data interfaces
// No need for LogEntry interface as we're removing logs section

interface ScraperResult {
  scores?: {
    equifax?: string | number;
    transunion?: string | number;
    experian?: string | number;
  };
  summary?: any;
  accounts?: {
    types?: Record<string, number>;
    status?: Record<string, number>;
  };
  inquiries?: Array<{
    date: string;
    company: string;
    bureau: string;
    type?: string;
  }>;
  negativeItems?: Array<{
    creditor?: string;
    accountNumber?: string;
    status?: string;
    details?: string;
    dateReported?: string;
    amount?: number | string;
    recommendedAction?: string;
  }>;
}

// Renamed component in comments but keeping the export name the same for compatibility
// This component now focuses on displaying credit reports rather than logs
const ScraperLogs: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [scraperResult, setScraperResult] = useState<ScraperResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ScraperLogsFormValues>({
    resolver: zodResolver(scraperLogsFormSchema),
    defaultValues: {
      username: 'Kristabadi2021@gmail.com',
      password: 'Badi2021!!',
    },
  });

  // Fetch clients and check server status on component mount
  useEffect(() => {
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

    const checkServerStatus = async () => {
      try {
        const response = await scraperLogsApi.getServerStatus();
        if (response.data?.running) {
          setIsServerRunning(true);
          setServerUrl(response.data.url || 'http://localhost:3002');
          // Check if there's any existing report data
          fetchReportData();
        }
      } catch (err) {
        console.error('Error checking server status:', err);
      }
    };

    fetchClients();
    checkServerStatus();
  }, []);

  const fetchReportData = async () => {
    try {
      const response = await scraperLogsApi.getLogs();
      if (response.data?.result) {
        const parsedResult = safelyParseScraperResult(response.data.result);
        setScraperResult(parsedResult);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    }
  };

  const startServer = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await scraperLogsApi.startServer({ port: 3002 });
      
      if (response.data?.success) {
        setIsServerRunning(true);
        setServerUrl(response.data.url || 'http://localhost:3002');
      } else {
        setError(response.error || 'Failed to start test server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while starting the test server');
    } finally {
      setIsLoading(false);
    }
  };

  const stopServer = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await scraperLogsApi.stopServer();
      
      if (response.data?.success) {
        setIsServerRunning(false);
        setServerUrl(null);
      } else {
        setError(response.error || 'Failed to stop test server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while stopping the test server');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ScraperLogsFormValues) => {
    setIsLoading(true);
    setError(null);
    setScraperResult(null);
    
    try {
      if (!isServerRunning) {
        // Attempt to start the server automatically
        const serverResponse = await scraperLogsApi.startServer({ port: 3002 });
        
        if (serverResponse.data?.success) {
          setIsServerRunning(true);
          setServerUrl(serverResponse.data.url || 'http://localhost:3002');
        } else {
          setError(serverResponse.error || 'Failed to start test server');
          setIsLoading(false);
          return;
        }
      }
      
      const response = await scraperLogsApi.runScraper({
         email: data.username,
         password: data.password,
         clientId: data.clientId ? data.clientId : "",
       });
      
      if (response.data?.success) {
        // Set result data
        if (response.data.result) {
          const parsedResult = safelyParseScraperResult(response.data.result);
          setScraperResult(parsedResult);
        }
      } else {
        setError(response.error || 'Failed to run scraper');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while running the scraper');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to safely parse JSON data with enhanced error handling
  const safelyParseScraperResult = (result: any): ScraperResult => {
    if (!result) return {};
    
    try {
      // If result is already an object, use it directly
      let data;
      
      if (typeof result === 'string') {
        try {
          data = JSON.parse(result);
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          
          // Attempt to fix common JSON issues
          try {
            // 1. Try to find where valid JSON might end by looking for the last closing brace
            const possibleValidJson = result.substring(0, result.lastIndexOf('}') + 1);
            try {
              data = JSON.parse(possibleValidJson);
              console.log('Recovered partial JSON data using last closing brace');
            } catch (recoveryError) {
              // 2. Try to extract JSON using regex pattern matching
              const jsonRegex = /\{[\s\S]*?"scores"[\s\S]*?\}/g;
              const jsonMatch = result.match(jsonRegex);
              
              if (jsonMatch && jsonMatch[0]) {
                try {
                  data = JSON.parse(jsonMatch[0]);
                  console.log('Recovered JSON data using regex pattern');
                } catch (regexError) {
                  // 3. Try a stricter regex pattern
                  const stricterJsonRegex = /\{[\s\S]*?"scores"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g;
                  const stricterMatch = result.match(stricterJsonRegex);
                  
                  if (stricterMatch && stricterMatch[0]) {
                    try {
                      data = JSON.parse(stricterMatch[0]);
                      console.log('Recovered JSON data using stricter regex pattern');
                    } catch (stricterRegexError) {
                      // 4. Try to clean the string by removing non-JSON characters
                      const cleanedJson = result.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                      try {
                        data = JSON.parse(cleanedJson);
                        console.log('Recovered JSON data by cleaning control characters');
                      } catch (cleanError) {
                        // 5. Try one more approach - sanitize JSON
                        const sanitizedJson = jsonMatch[0].replace(/[^\x20-\x7E]/g, '')
                          .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Ensure property names are quoted
                          .replace(/:\s*'([^']*)'/g, ':"$1"'); // Replace single quotes with double quotes
                        
                        try {
                          data = JSON.parse(sanitizedJson);
                          console.log('Recovered JSON data using sanitization');
                        } catch (sanitizeError) {
                          console.error('Failed to recover JSON data after multiple attempts:', sanitizeError);
                          setError('Error parsing credit report data. Please try again.');
                          return {};
                        }
                      }
                    }
                  } else {
                    // 4. Try to clean the string by removing non-JSON characters
                    const cleanedJson = result.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                    try {
                      data = JSON.parse(cleanedJson);
                      console.log('Recovered JSON data by cleaning control characters');
                    } catch (cleanError) {
                      console.error('Failed to recover JSON data after multiple attempts:', cleanError);
                      setError('Error parsing credit report data. Please try again.');
                      return {};
                    }
                  }
                }
              } else {
                console.error('Failed to recover JSON data: No valid JSON pattern found');
                setError('Error parsing credit report data. Please try again.');
                return {};
              }
            }
          } catch (finalError) {
            console.error('All JSON recovery attempts failed:', finalError);
            setError('Error parsing credit report data. Please try again.');
            return {};
          }
        }
      } else {
        data = result;
      }
      
      // Validate expected structure with safe fallbacks
      return {
        scores: data?.scores || {},
        summary: data?.summary || {},
        accounts: data?.accounts || {},
        inquiries: Array.isArray(data?.inquiries) ? data.inquiries : [],
        negativeItems: Array.isArray(data?.negativeItems) ? data.negativeItems : []
      };
    } catch (err) {
      console.error('Error processing scraper result:', err);
      setError('Error processing credit report data. Please try again.');
      return {};
    }
  };

  // No longer need log management functions

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Scraper Test Server</h2>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={startServer}
            disabled={isLoading || isServerRunning}
            className={`px-4 py-2 rounded-md ${isServerRunning ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {isLoading && !isServerRunning ? 'Starting...' : 'Start Test Server'}
          </button>
          <button
            onClick={stopServer}
            disabled={isLoading || !isServerRunning}
            className={`px-4 py-2 rounded-md ${!isServerRunning ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isLoading && isServerRunning ? 'Stopping...' : 'Stop Test Server'}
          </button>
        </div>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isServerRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">{isServerRunning ? 'Server Status: Running' : 'Server Status: Stopped'}</span>
          {isServerRunning && serverUrl && (
                <span className="ml-2 text-sm text-gray-500">(Internal endpoint: {serverUrl})</span>
            )}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Generate Credit Report</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register('username')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              id="clientId"
              {...register('clientId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a client (optional)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Running...' : 'Generate Credit Report'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Logs section removed */}
      
      {/* Credit report section */}
      {scraperResult ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-blue-800">Credit Report</h2>
            <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              Report Date: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {scraperResult.scores && (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium">Credit Scores</h3>
                <div className="ml-2 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">
                  Last Updated: {new Date().toLocaleDateString()}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg shadow-sm border border-blue-200 transition-all hover:shadow-md">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm text-blue-700 font-semibold">Equifax</div>
                    <div className="w-6 h-6">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af" className="w-6 h-6">
                        <path d="M11.7 2.805a.75.75 0 01.6 0A60.65 60.65 0 0122.83 8.72a.75.75 0 01-.231 1.337 49.949 49.949 0 00-9.902 3.912l-.003.002-.34.18a.75.75 0 01-.707 0A50.009 50.009 0 007.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 014.653-2.52.75.75 0 00-.65-1.352 56.129 56.129 0 00-4.78 2.589 1.858 1.858 0 00-.859 1.228 49.803 49.803 0 00-4.634-1.527.75.75 0 01-.231-1.337A60.653 60.653 0 0111.7 2.805z" />
                        <path d="M13.06 15.473a48.45 48.45 0 017.666-3.282c.134 1.414.22 2.843.255 4.285a.75.75 0 01-.46.71 47.878 47.878 0 00-8.105 4.342.75.75 0 01-.832 0 47.877 47.877 0 00-8.104-4.342.75.75 0 01-.461-.71c.035-1.442.121-2.87.255-4.286A48.4 48.4 0 016 13.18v1.27a1.5 1.5 0 00-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.661a6.729 6.729 0 00.551-1.608 1.5 1.5 0 00.14-2.67v-.645a48.549 48.549 0 013.44 1.668 2.25 2.25 0 002.12 0z" />
                        <path d="M4.462 19.462c.42-.419.753-.89 1-1.394.453.213.902.434 1.347.661a6.743 6.743 0 01-1.286 1.794.75.75 0 11-1.06-1.06z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-blue-800">{scraperResult.scores.equifax || 'N/A'}</div>
                  <div className="text-xs text-blue-600 mb-2">{getScoreRating(scraperResult.scores.equifax)}</div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full" 
                      style={{ width: `${scraperResult.scores.equifax ? (Number(scraperResult.scores.equifax) / 850) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>300</span>
                    <span>850</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg shadow-sm border border-green-200 transition-all hover:shadow-md">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm text-green-700 font-semibold">TransUnion</div>
                    <div className="w-6 h-6">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#15803d" className="w-6 h-6">
                        <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-green-800">{scraperResult.scores.transunion || 'N/A'}</div>
                  <div className="text-xs text-green-600 mb-2">{getScoreRating(scraperResult.scores.transunion)}</div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-700 rounded-full" 
                      style={{ width: `${scraperResult.scores.transunion ? (Number(scraperResult.scores.transunion) / 850) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>300</span>
                    <span>850</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg shadow-sm border border-purple-200 transition-all hover:shadow-md">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm text-purple-700 font-semibold">Experian</div>
                    <div className="w-6 h-6">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#7e22ce" className="w-6 h-6">
                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm2.25-3a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0V9.75A.75.75 0 0113.5 9zm3.75-1.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-purple-800">{scraperResult.scores.experian || 'N/A'}</div>
                  <div className="text-xs text-purple-600 mb-2">{getScoreRating(scraperResult.scores.experian)}</div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full" 
                      style={{ width: `${scraperResult.scores.experian ? (Number(scraperResult.scores.experian) / 850) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>300</span>
                    <span>850</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {scraperResult.accounts && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Account Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Account Types</h4>
                  <div className="space-y-2">
                    {Object.entries(scraperResult.accounts.types || {}).map(([type, count], index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{type}</span>
                        <span className="font-semibold bg-gray-100 px-2 py-1 rounded-md">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Account Status</h4>
                  <div className="space-y-2">
                    {Object.entries(scraperResult.accounts.status || {}).map(([status, count], index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{status}</span>
                        <span className={`font-semibold px-2 py-1 rounded-md ${status.toLowerCase().includes('good') ? 'bg-green-100 text-green-800' : status.toLowerCase().includes('late') ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {scraperResult.inquiries && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium">Recent Inquiries</h3>
                  <div className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-medium">
                    {scraperResult.inquiries.length} in last 24 months
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Impact:</span> {getInquiryImpact(scraperResult.inquiries.length)}
                </div>
              </div>
              <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bureau</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scraperResult.inquiries.slice(0, 5).map((inquiry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{inquiry.date}</div>
                          <div className="text-xs text-gray-500">{getRelativeTime(inquiry.date)}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{inquiry.company}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBureauBadgeColor(inquiry.bureau)}`}>
                            {inquiry.bureau}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {inquiry.type || 'Credit Check'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scraperResult.inquiries.length > 5 && (
                  <div className="bg-gray-50 px-4 py-3 text-sm text-center text-gray-500 border-t border-gray-200">
                    + {scraperResult.inquiries.length - 5} more inquiries not shown
                  </div>
                )}
              </div>
            </div>
          )}
          
          {scraperResult.negativeItems && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-red-600">Negative Items</h3>
                  <div className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-medium">
                    {scraperResult.negativeItems.length} items found
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Impact:</span> {scraperResult.negativeItems.length > 0 ? 'High' : 'None'}
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                {scraperResult.negativeItems.length > 0 ? (
                  <div className="space-y-3">
                    {scraperResult.negativeItems.map((item, index) => (
                      <div key={index} className="p-4 bg-white rounded-md shadow-sm border border-red-100 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900">{item.creditor || 'Unknown Creditor'}</span>
                            {item.accountNumber && (
                              <span className="ml-2 text-xs text-gray-500">Account #: {item.accountNumber.slice(-4).padStart(item.accountNumber.length, '*')}</span>
                            )}
                          </div>
                          <span className="text-red-600 font-medium px-2 py-1 bg-red-50 rounded-md text-sm">{item.status || 'Negative'}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">{item.details || 'No details available'}</div>
                        {item.dateReported && (
                          <div className="mt-2 text-xs text-gray-500">Reported: {item.dateReported}</div>
                        )}
                        {item.amount && (
                          <div className="mt-1 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Amount:</span>
                            <span className="text-sm font-bold text-red-600">${item.amount}</span>
                          </div>
                        )}
                        {item.recommendedAction && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                            <span className="font-medium">Recommended Action:</span> {item.recommendedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-600 font-medium text-lg">No negative items found! 🎉</p>
                    <p className="text-gray-500 mt-1">Your credit report is in good standing.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Raw Data</h3>
            <button 
              onClick={() => document.getElementById('raw-data-section')?.classList.toggle('hidden')} 
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Toggle Raw JSON
            </button>
          </div>
          <div id="raw-data-section" className="hidden bg-gray-50 p-4 rounded-md overflow-auto max-h-[300px] border border-gray-200 shadow-inner">
            <pre className="text-xs font-mono">{JSON.stringify(scraperResult, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <div className="py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Credit Report Available</h3>
            <p className="text-gray-500 mb-6">Generate a credit report using the form above to view detailed credit information.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScraperLogs;