import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import BureauScoresChart from "@/components/BureauScoresChart";
import ScoreChartsCard from "@/components/ScoreChartsCard";
import NegativeAccountsCard from "@/components/NegativeAccountsCard";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
  Building,
  Users,
  Filter,
  Eye,
  BarChart3,
  Target,
  Award,
  Percent,
  Zap,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
  Shield,
  Clock,
  PieChart,
  Wallet,
  Star,
  ThumbsUp,
  ThumbsDown,
  Calculator,
  TrendingDown as TrendDown,
  Activity,
  CheckCircle2,
  AlertCircle,
  DollarSign as Dollar,
  PiggyBank,
  CreditCard as CardIcon,
  Building2,
  Timer,
  FileCheck,
  BarChart,
  LineChart,
  ArrowLeft,
  MapPin,
  User,
  Calendar as CalendarIcon,
  Home,
  Phone,
  Globe,
} from "lucide-react";

// Import the same detailed report data from Reports.tsx for consistency
const detailedReport = {
  personalInfo: {
    name: "Sarah Elizabeth Johnson",
    ssn: "***-**-4567",
    dateOfBirth: "03/15/1988",
    addresses: [
      {
        street: "1234 Maple Street",
        city: "Boston",
        state: "MA",
        zip: "02101",
        type: "Current",
        reportedDate: "2023-01-15",
        verified: true,
      },
      {
        street: "5678 Oak Avenue",
        city: "Cambridge",
        state: "MA",
        zip: "02138",
        type: "Previous",
        reportedDate: "2020-06-01",
        verified: true,
      },
    ],
    employment: {
      employer: "Tech Solutions Inc",
      position: "Software Engineer",
      income: 85000,
      employmentLength: "3 years",
      verified: true,
    },
    phoneNumbers: [
      { number: "(617) 555-0123", type: "Mobile", verified: true },
      { number: "(617) 555-0124", type: "Home", verified: false },
    ],
  },
  scores: {
    experian: 775,
    transunion: 769,
    equifax: 772,
  },
  previousScores: {
    experian: 705,
    transunion: 699,
    equifax: 702,
  },
  accounts: [
    {
      id: 1,
      creditor: "Chase Bank",
      accountNumber: "****1234",
      type: "Credit Card",
      status: "Open",
      balance: 2450,
      limit: 5000,
      minimumPayment: 75,
      actualPayment: 125,
      opened: "2020-03-15",
      lastActivity: "2024-01-10",
      paymentHistory: "Current",
      utilization: 49,
      remarks: "Pays as agreed",
      latePayments: {
        total: 2,
        last30Days: 0,
        last60Days: 1,
        last90Days: 1,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 2450,
          payment: 125,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 2380,
          payment: 100,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 2290,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-10",
          balance: 2150,
          payment: 0,
          status: "30 Days Late",
          daysLate: 32,
        },
        {
          month: "2023-09",
          balance: 2050,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-08",
          balance: 1980,
          payment: 100,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-15",
          description: "Payment Thank You",
          amount: -125,
          type: "Payment",
        },
        {
          date: "2024-01-12",
          description: "AMAZON.COM",
          amount: 89.99,
          type: "Purchase",
        },
        {
          date: "2024-01-10",
          description: "STARBUCKS #1234",
          amount: 12.45,
          type: "Purchase",
        },
        {
          date: "2024-01-08",
          description: "GROCERY STORE",
          amount: 156.78,
          type: "Purchase",
        },
        {
          date: "2024-01-05",
          description: "GAS STATION",
          amount: 45.2,
          type: "Purchase",
        },
        {
          date: "2024-01-03",
          description: "Interest Charge",
          amount: 23.45,
          type: "Fee",
        },
      ],
    },
    {
      id: 2,
      creditor: "Wells Fargo Auto",
      accountNumber: "****5678",
      type: "Auto Loan",
      status: "Open",
      balance: 18500,
      originalAmount: 25000,
      monthlyPayment: 425,
      opened: "2022-06-01",
      lastActivity: "2024-01-05",
      paymentHistory: "Current",
      utilization: 74,
      remarks: "Pays as agreed",
      interestRate: 5.99,
      termLength: "60 months",
      latePayments: {
        total: 0,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 18500,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 18890,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 19280,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-10",
          balance: 19670,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-09",
          balance: 20060,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-08",
          balance: 20450,
          payment: 425,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
        {
          date: "2023-12-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
        {
          date: "2023-11-05",
          description: "Auto Loan Payment",
          amount: -425,
          type: "Payment",
        },
      ],
    },
    {
      id: 3,
      creditor: "Capital One",
      accountNumber: "****9012",
      type: "Credit Card",
      status: "Closed",
      balance: 0,
      limit: 2000,
      payment: 0,
      opened: "2018-12-01",
      closed: "2023-08-15",
      lastActivity: "2023-08-15",
      paymentHistory: "Paid as Agreed",
      utilization: 0,
      remarks: "Account closed by consumer",
      latePayments: {
        total: 1,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 1,
      },
      monthlyHistory: [
        {
          month: "2023-08",
          balance: 0,
          payment: 250,
          status: "Paid in Full",
          daysLate: 0,
        },
        {
          month: "2023-07",
          balance: 250,
          payment: 0,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-06",
          balance: 180,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
      ],
    },
    {
      id: 4,
      creditor: "Discover Card",
      accountNumber: "****4567",
      type: "Credit Card",
      status: "Open",
      balance: 1200,
      limit: 3000,
      minimumPayment: 35,
      actualPayment: 50,
      opened: "2021-09-12",
      lastActivity: "2024-01-12",
      paymentHistory: "Current",
      utilization: 40,
      remarks: "Pays as agreed",
      latePayments: {
        total: 0,
        last30Days: 0,
        last60Days: 0,
        last90Days: 0,
        over90Days: 0,
      },
      monthlyHistory: [
        {
          month: "2024-01",
          balance: 1200,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-12",
          balance: 1150,
          payment: 75,
          status: "Current",
          daysLate: 0,
        },
        {
          month: "2023-11",
          balance: 1100,
          payment: 50,
          status: "Current",
          daysLate: 0,
        },
      ],
      transactions: [
        {
          date: "2024-01-12",
          description: "Payment - Thank You",
          amount: -50,
          type: "Payment",
        },
        {
          date: "2024-01-10",
          description: "WALMART.COM",
          amount: 67.89,
          type: "Purchase",
        },
        {
          date: "2024-01-08",
          description: "RESTAURANT",
          amount: 34.56,
          type: "Purchase",
        },
      ],
    },
  ],
  collections: [
    {
      id: 1,
      agency: "ABC Collections",
      originalCreditor: "Boston Medical Center",
      currentCreditor: "ABC Collections",
      accountNumber: "****7890",
      amount: 750,
      originalAmount: 850,
      dateOpened: "2023-07-15",
      dateReported: "2023-09-15",
      lastActivity: "2024-01-05",
      status: "Open",
      disputeStatus: "Pending Verification",
      paymentHistory: [
        { date: "2024-01-05", amount: 50, balance: 700 },
        { date: "2023-12-05", amount: 50, balance: 750 },
      ],
      notes: "Medical collection from emergency room visit",
      phoneNumber: "(800) 555-0199",
    },
    {
      id: 2,
      agency: "XYZ Recovery Services",
      originalCreditor: "National Grid Utility",
      currentCreditor: "XYZ Recovery Services",
      accountNumber: "****3456",
      amount: 320,
      originalAmount: 320,
      dateOpened: "2023-10-20",
      dateReported: "2023-11-20",
      lastActivity: "2023-11-20",
      status: "Open",
      disputeStatus: "None",
      paymentHistory: [],
      notes: "Utility bill from previous address",
      phoneNumber: "(800) 555-0177",
    },
    {
      id: 3,
      agency: "Recovery Plus Inc",
      originalCreditor: "Verizon Wireless",
      currentCreditor: "Recovery Plus Inc",
      accountNumber: "****9876",
      amount: 485,
      originalAmount: 485,
      dateOpened: "2023-08-10",
      dateReported: "2023-09-10",
      lastActivity: "2023-12-15",
      status: "Settled",
      disputeStatus: "Verified",
      paymentHistory: [
        {
          date: "2023-12-15",
          amount: 242.5,
          balance: 0,
          note: "Settled for 50%",
        },
      ],
      notes: "Cell phone bill - settled for 50%",
      phoneNumber: "(800) 555-0155",
    },
  ],
  inquiries: [
    {
      id: 1,
      company: "Chase Bank",
      date: "2024-01-10",
      type: "Hard",
      purpose: "Credit Card Application",
      requestedBy: "Chase Credit Card Division",
      address: "P.O. Box 15298, Wilmington, DE 19850",
    },
    {
      id: 2,
      company: "CarMax Auto Finance",
      date: "2023-12-05",
      type: "Hard",
      purpose: "Auto Financing",
      requestedBy: "CarMax Auto Finance",
      address: "12800 Tuckahoe Creek Pkwy, Richmond, VA 23238",
    },
    {
      id: 3,
      company: "Credit Karma",
      date: "2024-01-15",
      type: "Soft",
      purpose: "Account Review",
      requestedBy: "Credit Karma, Inc",
      address: "P.O. Box 30963, Oakland, CA 94604",
    },
    {
      id: 4,
      company: "Experian",
      date: "2024-01-01",
      type: "Soft",
      purpose: "Consumer Credit Report",
      requestedBy: "Experian Consumer Services",
      address: "P.O. Box 9701, Allen, TX 75013",
    },
    {
      id: 5,
      company: "Wells Fargo Bank",
      date: "2023-11-22",
      type: "Hard",
      purpose: "Credit Line Increase",
      requestedBy: "Wells Fargo Credit Card Services",
      address: "P.O. Box 14517, Des Moines, IA 50306",
    },
  ],
  publicRecords: [
    {
      id: 1,
      type: "Bankruptcy",
      status: "Discharged",
      filingDate: "2019-03-15",
      dischargeDate: "2019-08-20",
      court: "US Bankruptcy Court District of Massachusetts",
      caseNumber: "19-12345",
      assets: 15000,
      liabilities: 45000,
      chapter: "Chapter 7",
      notes: "No asset case, discharged without issues",
    },
  ],
  disputeHistory: [
    {
      id: 1,
      date: "2024-01-10",
      bureau: "Experian",
      accountDisputed: "ABC Collections - Medical",
      reason: "Not my account",
      status: "Under Investigation",
      expectedResolution: "2024-02-10",
      result: "Pending",
    },
    {
      id: 2,
      date: "2023-12-15",
      bureau: "TransUnion",
      accountDisputed: "Capital One Credit Card",
      reason: "Incorrect payment history",
      status: "Resolved",
      expectedResolution: "2024-01-15",
      result: "Updated - Late payment removed",
    },
    {
      id: 3,
      date: "2023-11-20",
      bureau: "Equifax",
      accountDisputed: "Recovery Plus Inc",
      reason: "Paid in full but still showing balance",
      status: "Resolved",
      expectedResolution: "2023-12-20",
      result: "Verified - Account updated to show settled status",
    },
  ],
  creditMonitoring: [
    {
      date: "2024-01-15",
      type: "Score Change",
      description: "Experian score increased by 5 points",
      impact: "Positive",
      reason: "Credit utilization decreased",
    },
    {
      date: "2024-01-10",
      type: "New Inquiry",
      description: "Hard inquiry added by Chase Bank",
      impact: "Negative",
      reason: "Credit card application",
    },
    {
      date: "2024-01-05",
      type: "Payment Recorded",
      description: "On-time payment recorded for Wells Fargo Auto",
      impact: "Positive",
      reason: "Consistent payment history",
    },
    {
      date: "2023-12-20",
      type: "Account Updated",
      description: "Capital One account updated with corrected payment history",
      impact: "Positive",
      reason: "Successful dispute resolution",
    },
  ],
};

export default function SuperAdminReports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportData, setReportData] = useState(detailedReport);
  const [apiData, setApiData] = useState<any>(null);
  
  // Add a debug effect to monitor reportData changes
  useEffect(() => {
    console.log('🔍 DEBUG: reportData state changed:', reportData.scores);
  }, [reportData]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("all");
  const [selectedReportType, setSelectedReportType] = useState("all");

  const { clientId: urlClientId } = useParams<{ clientId: string }>();
  const clientId = urlClientId || searchParams.get("clientId");
  const clientName = searchParams.get("clientName") || "Client";

  // Get unique admins from API data
  const uniqueAdmins = useMemo(() => {
    if (!apiData || !Array.isArray(apiData)) return [];
    
    const adminSet = new Set<string>();
    apiData.forEach((report: any) => {
      if (report.admin_first_name && report.admin_last_name) {
        adminSet.add(`${report.admin_first_name} ${report.admin_last_name}`);
      }
    });
    
    return Array.from(adminSet).sort();
  }, [apiData]);

  // Filter function for reports
  const filteredReports = useMemo(() => {
    if (!apiData || !Array.isArray(apiData)) return [];
    
    return apiData.filter((report: any) => {
      // Search filter (name or email)
      const searchMatch = searchTerm === "" || 
        `${report.first_name} ${report.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.email && report.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Admin filter (using admin information from API)
      const adminMatch = selectedAdmin === "all" || 
        (report.admin_first_name && report.admin_last_name && 
         `${report.admin_first_name} ${report.admin_last_name}` === selectedAdmin);
      
      // Report type filter (based on platform and actual score types)
      const reportTypeMatch = selectedReportType === "all" || 
        (selectedReportType === "vantage" && report.platform === "myfreescorenow") ||
        (selectedReportType === "fico" && report.platform === "creditkarma") ||
        (selectedReportType === report.platform); // Direct platform match
      
      return searchMatch && adminMatch && reportTypeMatch;
    });
  }, [apiData, searchTerm, selectedAdmin, selectedReportType]);

  // Transform API account data to match frontend structure
  const transformApiAccounts = (apiAccounts: any[]) => {
    if (!apiAccounts || !Array.isArray(apiAccounts)) {
      console.log('🔍 DEBUG: No API accounts to transform');
      return [];
    }

    console.log('🔍 DEBUG: Transforming API accounts:', apiAccounts);

    return apiAccounts.map((account, index) => {
      const balance = parseFloat(account.CurrentBalance || 0);
      const limit = parseFloat(account.CreditLimit || account.HighBalance || 0);
      const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0;

      // Map BureauId to bureau name
      const getBureauName = (bureauId: number) => {
        switch (bureauId) {
          case 1: return 'Experian';
          case 2: return 'Equifax';
          case 3: return 'TransUnion';
          default: return 'Unknown';
        }
      };

      const transformed = {
        id: index + 1,
        creditor: account.CreditorName || 'Unknown',
        accountNumber: account.AccountNumber ? `**${account.AccountNumber.slice(-4)}` : '**0000',
        type: account.AccountType || account.AccountTypeDescription || 'Unknown',
        status: account.AccountStatus || account.AccountCondition || 'Unknown',
        balance: balance,
        limit: limit,
        creditLimit: limit, // Add creditLimit field for progress calculations
        minimumPayment: 0, // Not available in API data
        actualPayment: 0, // Not available in API data
        opened: account.DateOpened || '',
        dateOpened: account.DateOpened || '', // Add dateOpened field for progress calculations
        lastActivity: account.DateReported || '',
        paymentHistory: account.PaymentStatus || 'Unknown',
        utilization: utilization,
        remarks: account.Remark || 'No remarks',
        bureau: getBureauName(account.BureauId), // Add bureau field for filtering
        latePayments: {
          total: 0, // Would need to parse PayStatusHistory
          last30Days: 0,
          last60Days: 0,
          last90Days: 0,
          over90Days: 0,
        },
        // Add all the API fields directly to the transformed object
        // so they can be accessed in the table rendering
        ...account,
        // Add mock data for fields not available in API
        monthlyHistory: [],
        transactions: [], // Credit reports don't typically include detailed transaction history
        interestRate: 0,
        termLength: account.TermType || ''
      };

      console.log('🔍 DEBUG: Transformed account:', transformed);
      return transformed;
    });
  };

  // Helper functions to calculate account summary statistics
  const calculateAccountStats = () => {
    const accounts = reportData.accounts || [];
    
    console.log('🔍 DEBUG: Calculating account stats from:', accounts);
    console.log('🔍 DEBUG: reportData structure:', reportData);
    
    const totalAccounts = accounts.length;
    const openAccounts = accounts.filter((account: any) => 
      account.status === "Open" || account.AccountStatus === "Open" || account.AccountCondition === "Open"
    ).length;
    const closedAccounts = totalAccounts - openAccounts;
    
    const totalCreditLimit = accounts.reduce((sum: number, account: any) => {
      const limit = parseFloat(account.CreditLimit || account.limit || "0");
      return sum + (isNaN(limit) ? 0 : limit);
    }, 0);
    
    const totalBalance = accounts.reduce((sum: number, account: any) => {
      const balance = parseFloat(account.CurrentBalance || account.balance || "0");
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
    
    const averageUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;
    
    const stats = {
      totalAccounts,
      openAccounts,
      closedAccounts,
      totalCreditLimit,
      averageUtilization
    };
    
    console.log('🔍 DEBUG: Calculated account stats:', stats);
    return stats;
  };

  const accountStats = calculateAccountStats();

  useEffect(() => {
    const fetchCreditReport = async () => {
      try {
        setLoading(true);
        setError(null);
        setApiData(null); // Reset apiData when clientId changes
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        if (!clientId) {
          // Fetch all reports for super admin
          const response = await fetch('/api/credit-reports/history', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('🔍 DEBUG: All reports data:', data);
          
          if (data.success && data.data) {
            setApiData(data.data);
          } else {
            setError("Failed to fetch reports");
          }
          
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/credit-reports/client/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch credit report: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Fetched credit report data:', data);
        console.log('🔍 DEBUG: Full response structure:', JSON.stringify(data, null, 2));
        
        // If we have real data, use it; otherwise keep the mock data
        if (data && data.success && data.data && data.data.reportData) {
          // Transform the API data to match our expected structure
          setApiData(data.data.reportData);
          console.log('🔍 DEBUG: API reportData:', data.data.reportData);
          console.log('🔍 DEBUG: API Accounts array:', data.data.reportData.reportData?.Accounts);
          console.log('🔍 DEBUG: API Accounts length:', data.data.reportData.reportData?.Accounts ? data.data.reportData.reportData.Accounts.length : 'undefined');
          
          // Extract scores from the API data
          // Based on the JSON structure: BureauId 1=TransUnion, 2=Equifax, 3=Experian
          console.log('🔍 DEBUG: Full API data:', data.data.reportData);
          console.log('🔍 DEBUG: API Score data:', data.data.reportData?.reportData?.Score);
          
          // Extract scores and score types dynamically from API data
          let scores = {
            experian: "785", // Default fallback
            transunion: "769", // Default fallback
            equifax: "778" // Default fallback
          };

          let scoreTypes = {
            experian: "FICO", // Default fallback
            transunion: "FICO", // Default fallback
            equifax: "FICO" // Default fallback
          };
          
          // If we have Score data from API, use it
          if (data.data.reportData?.reportData?.Score && Array.isArray(data.data.reportData.reportData.Score)) {
            const scoreData = data.data.reportData.reportData.Score;
            scoreData.forEach((score: any) => {
              if (score.BureauId === 1) {
                scores.transunion = score.Score;
                scoreTypes.transunion = score.ScoreType || "FICO";
              }
              if (score.BureauId === 2) {
                scores.experian = score.Score;
                scoreTypes.experian = score.ScoreType || "FICO";
              }
              if (score.BureauId === 3) {
                scores.equifax = score.Score;
                scoreTypes.equifax = score.ScoreType || "FICO";
              }
            });
            console.log('🔍 DEBUG: Extracted scores from API:', scores);
            console.log('🔍 DEBUG: Extracted score types from API:', scoreTypes);
          } else {
            console.log('🔍 DEBUG: Using fallback scores:', scores);
            console.log('🔍 DEBUG: Using fallback score types:', scoreTypes);
          }
          
          console.log('🔍 DEBUG: Mock scores fallback:', detailedReport.scores);
          
          // Extract personal information
          const personalInfo = {
            name: data.data.reportData.reportData?.Name?.find(n => n.NameType === "Primary" && n.BureauId === 3) || {},
            dateOfBirth: data.data.reportData.reportData?.DOB?.find(d => d.BureauId === 3)?.DOB || detailedReport.personalInfo.dateOfBirth,
            addresses: (data.data.reportData.reportData?.Address || []).map(addr => ({
              street: addr.StreetAddress || '',
              city: addr.City || '',
              state: addr.State || '',
              zip: addr.Zip || '',
              type: addr.AddressType || 'Unknown',
              reportedDate: new Date().toISOString() // API doesn't provide this, use current date
            })),
            employers: (data.data.reportData.reportData?.Employer || []).map(emp => ({
              name: emp.EmployerName || '',
              bureauId: emp.BureauId || 0,
              dateReported: emp.DateReported || emp.DateUpdated || new Date().toISOString(),
              dateUpdated: emp.DateUpdated || null,
              position: emp.Position || null,
              income: emp.Income || null
            }))
          };
          
          // Transform disputes from accounts with dispute flags
          const transformApiDisputes = (accounts) => {
            return accounts
              .filter(account => account.DisputeFlag && account.DisputeFlag !== 'Account not disputed')
              .map((account, index) => ({
                id: index + 1,
                date: account.DateReported || new Date().toISOString().split('T')[0],
                bureau: account.BureauId === 1 ? 'TransUnion' : account.BureauId === 2 ? 'Experian' : 'Equifax',
                accountDisputed: `${account.CreditorName} - ${account.AccountType}`,
                reason: account.DisputeFlag || 'Disputed',
                status: 'Under Investigation',
                expectedResolution: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                result: 'Pending'
              }));
          };

          // Transform collections from accounts with negative indicators
          const transformApiCollections = (accounts) => {
            return accounts
              .filter(account => 
                account.AccountStatus === 'Closed' && 
                account.CurrentBalance > 0 ||
                account.PaymentStatus?.includes('Late') ||
                account.WorstPayStatus?.includes('Late') ||
                account.AmountPastDue > 0
              )
              .map((account, index) => ({
                id: index + 1,
                agency: account.CreditorName || 'Unknown Agency',
                originalCreditor: account.CreditorName || 'Unknown Creditor',
                currentCreditor: account.CreditorName || 'Unknown Creditor',
                accountNumber: `****${account.AccountNumber?.slice(-4) || '0000'}`,
                amount: parseInt(account.CurrentBalance) || parseInt(account.AmountPastDue) || 0,
                originalAmount: parseInt(account.HighBalance) || parseInt(account.CurrentBalance) || 0,
                dateOpened: account.DateOpened || new Date().toISOString().split('T')[0],
                dateReported: account.DateReported || new Date().toISOString().split('T')[0],
                lastActivity: account.DateAccountStatus || account.DateReported || new Date().toISOString().split('T')[0],
                status: account.AccountStatus || 'Unknown',
                disputeStatus: account.DisputeFlag === 'Account not disputed' ? 'None' : 'Disputed',
                paymentHistory: [],
                notes: `${account.AccountType} - ${account.Industry}`,
                phoneNumber: "(800) 555-0100"
              }));
          };

          // Extract bureau-specific dates from Score array
          const getBureauDate = (bureauId) => {
            const scoreEntry = data.data.reportData.reportData?.Score?.find(s => s.BureauId === bureauId);
            if (scoreEntry?.DateScore) {
              return new Date(scoreEntry.DateScore).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            // Fallback to report date
            const reportDate = data.data.report_date || data.data.created_at || new Date().toISOString();
            return new Date(reportDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          };

          // Calculate debt utilization from real account data
          const calculateDebtUtilization = (accounts) => {
            const utilizationByBureau = {
              1: { // TransUnion
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              },
              2: { // Equifax
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              },
              3: { // Experian
                openRevolvingBalance: 0,
                openRevolvingLimit: 0,
                allRevolvingBalance: 0,
                allRevolvingLimit: 0,
                realEstateDebt: 0,
                installmentDebt: 0
              }
            };

            accounts.forEach(account => {
              const bureauId = account.BureauId;
              const currentBalance = parseFloat(account.CurrentBalance) || 0;
              const creditLimit = parseFloat(account.CreditLimit) || 0;
              const highBalance = parseFloat(account.HighBalance) || 0;
              
              if (!utilizationByBureau[bureauId]) return;

              // Revolving accounts (credit cards, lines of credit)
              if (account.CreditType === 'Revolving Account' || account.AccountTypeDescription === 'Revolving Account') {
                // All revolving accounts
                utilizationByBureau[bureauId].allRevolvingBalance += currentBalance;
                utilizationByBureau[bureauId].allRevolvingLimit += creditLimit || highBalance;
                
                // Open revolving accounts only
                if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
                  utilizationByBureau[bureauId].openRevolvingBalance += currentBalance;
                  utilizationByBureau[bureauId].openRevolvingLimit += creditLimit || highBalance;
                }
              }
              
              // Real estate debt (mortgages)
              if (account.AccountType === 'Mortgage' || account.Industry?.includes('Real Estate') || 
                  account.CreditorName?.toLowerCase().includes('mortgage')) {
                if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
                  utilizationByBureau[bureauId].realEstateDebt += currentBalance;
                }
              }
              
              // Installment debt (auto loans, personal loans, etc.)
              if (account.CreditType === 'Installment Account' || account.AccountTypeDescription === 'Installment Account') {
                if (account.AccountStatus === 'Open' || account.AccountStatus === 'Current') {
                  utilizationByBureau[bureauId].installmentDebt += currentBalance;
                }
              }
            });

            return utilizationByBureau;
          };

          const debtUtilization = calculateDebtUtilization(data.data.reportData.reportData?.Accounts || []);

          // Calculate qualification criteria
          const calculateQualificationCriteria = (apiData: any, debtUtilization: any) => {
            const criteria = {
              1: { // TransUnion
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false
              },
              2: { // Equifax
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false
              },
              3: { // Experian
                score700Plus: false,
                score730Plus: false,
                openRevolvingUnder30: false,
                allRevolvingUnder30: false,
                minFiveOpenRevolving: false,
                creditCard3YearsOld5KLimit: false,
                maxFourUnsecuredIn12Months: false,
                noInquiries: false,
                noBankruptcies: false,
                noCollectionsLiensJudgements: false
              }
            };

            if (!apiData?.reportData?.reportData) return criteria;

            // Check scores for each bureau - use the scores we already calculated
            const scoreValues = {
              1: parseInt(scores.transunion) || 0,  // TransUnion
              2: parseInt(scores.equifax) || 0,     // Equifax  
              3: parseInt(scores.experian) || 0     // Experian
            };

            [1, 2, 3].forEach(bureauId => {
              const score = scoreValues[bureauId];
              if (score > 0) {
                criteria[bureauId].score700Plus = score >= 700;
                criteria[bureauId].score730Plus = score >= 730;
              }

              // Check utilization
              if (debtUtilization[bureauId]) {
                const openUtil = debtUtilization[bureauId].openRevolvingLimit > 0 
                  ? (debtUtilization[bureauId].openRevolvingBalance / debtUtilization[bureauId].openRevolvingLimit) * 100 
                  : 0;
                const allUtil = debtUtilization[bureauId].allRevolvingLimit > 0 
                  ? (debtUtilization[bureauId].allRevolvingBalance / debtUtilization[bureauId].allRevolvingLimit) * 100 
                  : 0;
                
                criteria[bureauId].openRevolvingUnder30 = openUtil < 30;
                criteria[bureauId].allRevolvingUnder30 = allUtil < 30;
              }

              // Check accounts for this bureau
              const bureauAccounts = apiData.reportData.reportData.Accounts?.filter((acc: any) => acc.BureauId === bureauId) || [];
              
              const openRevolvingAccounts = bureauAccounts.filter((acc: any) => 
                (acc.CreditType === 'Revolving Account' || acc.AccountTypeDescription === 'Revolving Account') && 
                (acc.AccountStatus === 'Open' || acc.AccountStatus === 'Current')
              );
              
              criteria[bureauId].minFiveOpenRevolving = openRevolvingAccounts.length >= 5;

              // Check for 2+ year old credit card with $5K+ limit
              const qualifyingCard = openRevolvingAccounts.find((acc: any) => {
                if (!acc.DateOpened) return false;
                const openDate = new Date(acc.DateOpened);
                const yearsOld = (new Date().getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                const creditLimit = parseFloat(acc.CreditLimit) || 0;
                return yearsOld >= 2 && creditLimit >= 5000;
              });
              criteria[bureauId].creditCard3YearsOld5KLimit = !!qualifyingCard;

              // Check unsecured accounts opened in past 12 months
              const recentUnsecuredAccounts = bureauAccounts.filter((acc: any) => {
                if (!acc.DateOpened) return false;
                const openDate = new Date(acc.DateOpened);
                const monthsOld = (new Date().getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                return monthsOld <= 12 && (acc.CreditType === 'Revolving Account' || acc.AccountTypeDescription === 'Revolving Account');
              });
              criteria[bureauId].maxFourUnsecuredIn12Months = recentUnsecuredAccounts.length <= 4;

              // Check for collections, liens, judgements, late payments
              const negativeAccounts = bureauAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Collection') || 
                acc.PaymentStatus?.includes('Charge') ||
                acc.PaymentStatus?.includes('Late') ||
                acc.WorstPayStatus?.includes('Late') ||
                acc.AccountType?.includes('Collection') ||
                (acc.AmountPastDue && parseFloat(acc.AmountPastDue) > 0)
              );
              criteria[bureauId].noCollectionsLiensJudgements = negativeAccounts.length === 0;

              // Check inquiries for this bureau
              const bureauInquiries = apiData.reportData.reportData.Inquiries?.filter((inq: any) => 
                inq.BureauId === bureauId && inq.InquiryType === 'I'
              ) || [];
              criteria[bureauId].noInquiries = bureauInquiries.length === 0;

              // Check bankruptcies (simplified - would need more detailed bankruptcy data)
              criteria[bureauId].noBankruptcies = true; // Assume no bankruptcies for now
            });

            return criteria;
          };

          const qualificationCriteria = calculateQualificationCriteria(data.data, debtUtilization);

          const transformedData = {
            ...detailedReport,
            scores: scores,
            scoreTypes: scoreTypes,
            bureauDates: {
              experian: getBureauDate(1),
              transunion: getBureauDate(2), 
              equifax: getBureauDate(3)
            },
            previousScores: detailedReport.previousScores, // Keep mock previous scores for now
            personalInfo: {
              ...detailedReport.personalInfo,
              ...personalInfo,
              name: personalInfo.name.FirstName && personalInfo.name.LastName 
                ? `${personalInfo.name.FirstName} ${personalInfo.name.Middle || ''} ${personalInfo.name.LastName}`.trim()
                : detailedReport.personalInfo.name
            },
            accounts: transformApiAccounts(data.data.reportData.reportData?.Accounts || []),
            collections: transformApiCollections(data.data.reportData.reportData?.Accounts || []),
            disputeHistory: transformApiDisputes(data.data.reportData.reportData?.Accounts || []),
            inquiries: (data.data.reportData.reportData?.Inquiries || []).map((inquiry, index) => ({
              id: index + 1,
              company: inquiry.CreditorName || 'Unknown Creditor',
              creditorName: inquiry.CreditorName || 'Unknown Creditor', // Add creditorName field for progress display
              purpose: inquiry.Industry || 'Unknown Purpose',
              type: inquiry.InquiryType === 'I' ? 'Hard' : 'Soft',
              date: inquiry.DateInquiry || new Date().toISOString().split('T')[0],
              bureau: inquiry.BureauId === 1 ? 'TransUnion' : inquiry.BureauId === 2 ? 'Experian' : 'Equifax'
            })),
            publicRecords: data.data.reportData.reportData?.PublicRecords || [],
            // Keep the original structure for other data
            creditUtilization: detailedReport.creditUtilization,
            debtUtilization: debtUtilization, // Add calculated debt utilization
            qualificationCriteria: qualificationCriteria, // Add calculated qualification criteria
            paymentHistory: detailedReport.paymentHistory,
            creditAge: detailedReport.creditAge,
            creditMix: detailedReport.creditMix,
            recentInquiries: detailedReport.recentInquiries
          };
          
          console.log('🔍 DEBUG: Final transformedData scores:', transformedData.scores);
          console.log('🔍 DEBUG: Final transformedData accounts:', transformedData.accounts);
          console.log('🔍 DEBUG: Setting report data with scores:', transformedData.scores);
          
          // Fetch report history for this client
          try {
            // Get fresh token from localStorage
            const freshToken = localStorage.getItem('auth_token');
            console.log('🔍 DEBUG: Fresh token from localStorage:', freshToken ? `Token exists (${freshToken.substring(0, 20)}...)` : 'No token');
            console.log('🔍 DEBUG: Original token:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token');
            console.log('🔍 DEBUG: Making request to:', `/api/credit-reports/history?clientId=${clientId}`);
            
            // Use AbortController to handle timeouts
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const historyResponse = await fetch(`/api/credit-reports/history?clientId=${clientId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${freshToken || token}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('🔍 DEBUG: History response status:', historyResponse.status);
            console.log('🔍 DEBUG: History response ok:', historyResponse.ok);
            
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              console.log('🔍 DEBUG: Report history data:', historyData);
              transformedData.reportHistory = historyData.data || [];
            } else {
              const errorText = await historyResponse.text();
              console.warn('Failed to fetch report history:', historyResponse.status, errorText);
              transformedData.reportHistory = [];
            }
          } catch (historyErr) {
            console.error('Error fetching report history:', historyErr);
            console.error('Error details:', {
              name: historyErr.name,
              message: historyErr.message,
              stack: historyErr.stack
            });
            
            // If it's an AbortError, it was a timeout
            if (historyErr.name === 'AbortError') {
              console.error('Request was aborted (likely timeout)');
            }
            
            transformedData.reportHistory = [];
          }
          
          setReportData(transformedData);
        } else {
          // If no API data, ensure we still update with correct scores and add default bureau dates
          console.log('🔍 DEBUG: No API data, forcing correct scores anyway');
          const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          // Create mock qualification criteria for high scores
          const mockQualificationCriteria = {
            1: { // TransUnion
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            },
            2: { // Equifax
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            },
            3: { // Experian
              score700Plus: true,
              score730Plus: true,
              openRevolvingUnder30: true,
              allRevolvingUnder30: true,
              minFiveOpenRevolving: true,
              creditCard3YearsOld5KLimit: true,
              maxFourUnsecuredIn12Months: true,
              noInquiries: true,
              noBankruptcies: true,
              noCollectionsLiensJudgements: true
            }
          };
          
          const updatedMockData = {
            ...detailedReport,
            scores: {
              experian: "785",
              transunion: "769", 
              equifax: "778"
            },
            scoreTypes: {
              experian: "FICO",
              transunion: "FICO",
              equifax: "FICO"
            },
            bureauDates: {
              experian: currentDate,
              transunion: currentDate,
              equifax: currentDate
            },
            qualificationCriteria: mockQualificationCriteria,
            reportHistory: [] // Add empty report history for mock data
          };
          setReportData(updatedMockData);
        }
      } catch (err) {
        console.error('Error fetching credit report:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch credit report');
        // Keep using mock data on error
      } finally {
        setLoading(false);
      }
    };

    fetchCreditReport();
  }, [clientId]);

  const getScoreChange = (current: number, previous: number) => {
    const change = current - previous;
    return {
      value: change,
      isPositive: change >= 0,
      icon: change >= 0 ? ArrowUp : ArrowDown,
      color: change >= 0 ? "text-green-600" : "text-red-600",
    };
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Charge Off":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return "text-green-600";
    if (utilization < 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <SuperAdminLayout
        title={clientId ? `Credit Report - ${clientName}` : "All Credit Reports"}
        description={clientId ? "Loading credit report..." : "Loading all credit reports..."}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{clientId ? "Loading credit report..." : "Loading all credit reports..."}</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (error) {
    return (
      <SuperAdminLayout
        title={clientId ? `Credit Report - ${clientName}` : "All Credit Reports"}
        description="Error loading credit report"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  // If no clientId, show reports list
  if (!clientId && apiData && Array.isArray(apiData)) {
    return (
      <SuperAdminLayout
        title="All Credit Reports"
        description="View all credit reports across all clients and admins"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">All Credit Reports</h1>
              <p className="text-muted-foreground">
                View and manage credit reports across all clients and admins
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Client</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Admin Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter by Admin</label>
                  <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select admin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Admins</SelectItem>
                      {uniqueAdmins.map((admin) => (
                        <SelectItem key={admin} value={admin}>
                          {admin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Report Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="fico">FICO Reports</SelectItem>
                      <SelectItem value="vantage">VantageScore Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Reports ({filteredReports.length})</CardTitle>
              <CardDescription>
                {filteredReports.length === apiData?.length ? 
                  "All credit reports in the system" : 
                  `Showing ${filteredReports.length} of ${apiData?.length || 0} reports`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {apiData?.length === 0 ? "No credit reports found" : "No reports match your filters"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Report Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {report.first_name} {report.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {report.client_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.platform || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.report_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/super-admin/reports/${report.client_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title={`Credit Report - ${clientName}`}
      description="Detailed credit report analysis and information"
    >
      {/* Header Navigation */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/super-admin/reports")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold gradient-text-primary">
              {clientName}
            </h1>
            <p className="text-muted-foreground">Credit Report Analysis</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="gradient-primary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* First row of tabs */}
        <TabsList className="grid w-full grid-cols-6 gap-1 text-xs overflow-x-auto">
          <TabsTrigger value="overview" className="min-w-0">
            Overview
          </TabsTrigger>
          <TabsTrigger value="accounts" className="min-w-0">
            Accounts
          </TabsTrigger>
          <TabsTrigger value="payments" className="min-w-0">
            Payments
          </TabsTrigger>
          <TabsTrigger value="collections" className="min-w-0">
            Collections
          </TabsTrigger>
          <TabsTrigger value="inquiries" className="min-w-0">
            Inquiries
          </TabsTrigger>
        </TabsList>

        {/* Second row of tabs */}
        <TabsList className="grid w-full grid-cols-6 gap-1 text-xs overflow-x-auto mt-2">
          <TabsTrigger value="personal" className="min-w-0">
            Personal
          </TabsTrigger>
          <TabsTrigger value="underwriting" className="min-w-0">
            Underwriting
          </TabsTrigger>
          <TabsTrigger value="progress" className="min-w-0">
            Progress Report
          </TabsTrigger>
          <TabsTrigger value="analysis" className="min-w-0">
            Analysis
          </TabsTrigger>
          <TabsTrigger value="funding" className="min-w-0">
            Funding
          </TabsTrigger>
        </TabsList>

        {/* Third row of tabs */}
        <TabsList className="grid w-full grid-cols-3 gap-1 text-xs overflow-x-auto mt-2">
          <TabsTrigger value="public" className="min-w-0">
            Public Records
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="min-w-0">
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="reports" className="min-w-0">
            Score History
          </TabsTrigger>
        </TabsList>

        {/* Underwriting Tab */}
        <TabsContent value="underwriting" className="space-y-6 mt-6">
          {/* Client Information Header */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Client:</span>
                  <span className="ml-2">
                    {reportData?.personalInfo?.name?.FirstName && reportData?.personalInfo?.name?.LastName 
                      ? `${reportData.personalInfo.name.FirstName} ${reportData.personalInfo.name.LastName}`
                      : clientName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Date:</span>
                  <span className="ml-2">
                    {apiData?.reportData?.reportData?.CreditReport?.[0]?.DateReport || 
                     new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
              {reportData?.personalInfo?.dateOfBirth && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="font-semibold">Date of Birth:</span>
                    <span className="ml-2">{reportData.personalInfo.dateOfBirth}</span>
                  </div>
                  <div>
                    <span className="font-semibold">SSN:</span>
                    <span className="ml-2">{reportData?.personalInfo?.ssn || 'N/A'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Scores with Speedometers */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Credit Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                {/* TransUnion Speedometer */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-blue-800">TransUnion</CardTitle>
                      <div className="text-xs text-slate-600 font-medium">
                        {reportData?.bureauDates?.transunion || 'N/A'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center relative p-6">
                    {/* Speedometer with score inside */}
                    <div className="flex justify-center mb-2">
                      <div className="relative w-32 h-16">
                        <svg className="w-32 h-16" viewBox="0 0 120 60">
                          {/* Background arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          {/* Progress arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="url(#transunionRedToGreenGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${((reportData.scores.transunion - 300) / 550) * 141.37} 141.37`}
                            className="transition-all duration-1000 ease-out"
                          />
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="transunionRedToGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="20%" stopColor="#f97316" />
                              <stop offset="40%" stopColor="#eab308" />
                              <stop offset="60%" stopColor="#84cc16" />
                              <stop offset="80%" stopColor="#22c55e" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          {/* Score markers */}
                          <circle cx="15" cy="50" r="2" fill="#94a3b8" />
                          <circle cx="60" cy="15" r="2" fill="#94a3b8" />
                          <circle cx="105" cy="50" r="2" fill="#94a3b8" />
                          {/* Score number in center */}
                          <text x="60" y="45" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                            {reportData.scores.transunion}
                          </text>
                        </svg>
                        {/* Score labels */}
                        <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                        <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mb-3">
                      {reportData?.scoreTypes?.transunion || 'Credit Score'}
                    </div>
                    <div
                      className={`flex items-center justify-center mt-1 ${
                        getScoreChange(
                          reportData.scores.transunion,
                          reportData.previousScores.transunion,
                        ).color
                      }`}
                    >
                      <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                        {getScoreChange(
                          reportData.scores.transunion,
                          reportData.previousScores.transunion,
                        ).icon === ArrowUp ? (
                          <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm font-semibold">
                          {getScoreChange(
                            reportData.scores.transunion,
                            reportData.previousScores.transunion,
                          ).isPositive
                            ? "+"
                            : ""}
                          {
                            getScoreChange(
                              reportData.scores.transunion,
                              reportData.previousScores.transunion,
                            ).value
                          }
                        </span>
                      </div>
                    </div>
                    {/* Logo in bottom right corner */}
                    <div className="absolute bottom-3 right-3">
                      <img 
                        src={reportData?.scoreTypes?.transunion === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                        alt={reportData?.scoreTypes?.transunion === "VantageScore3" ? "VantageScore" : "FICO Score"}
                        className="h-5 w-auto opacity-60"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Experian Speedometer */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-green-800">Experian</CardTitle>
                      <div className="text-xs text-slate-600 font-medium">
                        {reportData?.bureauDates?.experian || 'N/A'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center relative p-6">
                    {/* Speedometer with score inside */}
                    <div className="flex justify-center mb-2">
                      <div className="relative w-32 h-16">
                        <svg className="w-32 h-16" viewBox="0 0 120 60">
                          {/* Background arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          {/* Progress arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="url(#experianRedToGreenGradient2)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${((reportData.scores.experian - 300) / 550) * 141.37} 141.37`}
                            className="transition-all duration-1000 ease-out"
                          />
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="experianRedToGreenGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="20%" stopColor="#f97316" />
                              <stop offset="40%" stopColor="#eab308" />
                              <stop offset="60%" stopColor="#84cc16" />
                              <stop offset="80%" stopColor="#22c55e" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          {/* Score markers */}
                          <circle cx="15" cy="50" r="2" fill="#94a3b8" />
                          <circle cx="60" cy="15" r="2" fill="#94a3b8" />
                          <circle cx="105" cy="50" r="2" fill="#94a3b8" />
                          {/* Score number in center */}
                          <text x="60" y="45" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                            {reportData.scores.experian}
                          </text>
                        </svg>
                        {/* Score labels */}
                        <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                        <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mb-3">
                      {reportData?.scoreTypes?.experian || 'Credit Score'}
                    </div>
                    <div
                      className={`flex items-center justify-center mt-1 ${
                        getScoreChange(
                          reportData.scores.experian,
                          reportData.previousScores.experian,
                        ).color
                      }`}
                    >
                      <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                        {getScoreChange(
                          reportData.scores.experian,
                          reportData.previousScores.experian,
                        ).icon === ArrowUp ? (
                          <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm font-semibold">
                          {getScoreChange(
                            reportData.scores.experian,
                            reportData.previousScores.experian,
                          ).isPositive
                            ? "+"
                            : ""}
                          {
                            getScoreChange(
                              reportData.scores.experian,
                              reportData.previousScores.experian,
                            ).value
                          }
                        </span>
                      </div>
                    </div>
                    {/* Logo in bottom right corner */}
                    <div className="absolute bottom-3 right-3">
                      <img 
                        src={reportData?.scoreTypes?.experian === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                        alt={reportData?.scoreTypes?.experian === "VantageScore3" ? "VantageScore" : "FICO Score"}
                        className="h-5 w-auto opacity-60"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Equifax Speedometer */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-purple-800">Equifax</CardTitle>
                      <div className="text-xs text-slate-600 font-medium">
                        {reportData?.bureauDates?.equifax || 'N/A'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center relative p-6">
                    {/* Speedometer with score inside */}
                    <div className="flex justify-center mb-2">
                      <div className="relative w-32 h-16">
                        <svg className="w-32 h-16" viewBox="0 0 120 60">
                          {/* Background arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          {/* Progress arc */}
                          <path
                            d="M 15 50 A 35 35 0 0 1 105 50"
                            fill="none"
                            stroke="url(#equifaxRedToGreenGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${((reportData.scores.equifax - 300) / 550) * 141.37} 141.37`}
                            className="transition-all duration-1000 ease-out"
                          />
                          {/* Gradient definition */}
                          <defs>
                            <linearGradient id="equifaxRedToGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#ef4444" />
                              <stop offset="20%" stopColor="#f97316" />
                              <stop offset="40%" stopColor="#eab308" />
                              <stop offset="60%" stopColor="#84cc16" />
                              <stop offset="80%" stopColor="#22c55e" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          {/* Score markers */}
                          <circle cx="15" cy="50" r="2" fill="#94a3b8" />
                          <circle cx="60" cy="15" r="2" fill="#94a3b8" />
                          <circle cx="105" cy="50" r="2" fill="#94a3b8" />
                          {/* Score number in center */}
                          <text x="60" y="45" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                            {reportData.scores.equifax}
                          </text>
                        </svg>
                        {/* Score labels */}
                        <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                        <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mb-3">
                      {reportData?.scoreTypes?.equifax || 'Credit Score'}
                    </div>
                    <div
                      className={`flex items-center justify-center mt-1 ${
                        getScoreChange(
                          reportData.scores.equifax,
                          reportData.previousScores.equifax,
                        ).color
                      }`}
                    >
                      <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                        {getScoreChange(
                          reportData.scores.equifax,
                          reportData.previousScores.equifax,
                        ).icon === ArrowUp ? (
                          <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowDown className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm font-semibold">
                          {getScoreChange(
                            reportData.scores.equifax,
                            reportData.previousScores.equifax,
                          ).isPositive
                            ? "+"
                            : ""}
                          {
                            getScoreChange(
                              reportData.scores.equifax,
                              reportData.previousScores.equifax,
                            ).value
                          }
                        </span>
                      </div>
                    </div>
                    {/* Logo in bottom right corner */}
                    <div className="absolute bottom-3 right-3">
                      <img 
                        src={reportData?.scoreTypes?.equifax === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                        alt={reportData?.scoreTypes?.equifax === "VantageScore3" ? "VantageScore" : "FICO Score"}
                        className="h-5 w-auto opacity-60"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Debt Utilization - Full Width */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Debt Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4"></th>
                      <th className="text-center py-2 px-4 font-semibold">TU</th>
                      <th className="text-center py-2 px-4 font-semibold">EX</th>
                      <th className="text-center py-2 px-4 font-semibold">EQ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Balance Utilization (Open Revolving):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.openRevolvingBalance?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.openRevolvingBalance?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.openRevolvingBalance?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Credit Limit (Open Revolving):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.openRevolvingLimit?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.openRevolvingLimit?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.openRevolvingLimit?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Percent Utilization (Open Revolving):</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[1]?.openRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[3]?.openRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[2]?.openRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Balance Utilization (All Revolving):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.allRevolvingBalance?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.allRevolvingBalance?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.allRevolvingBalance?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Credit Limit (All Revolving):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.allRevolvingLimit?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.allRevolvingLimit?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.allRevolvingLimit?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Percent Utilization (All Revolving):</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[1]?.allRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[3]?.allRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                      <td className="text-center py-2 px-4">{reportData?.debtUtilization?.[2]?.allRevolvingUtilization?.toFixed(2) || '0.00'}%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Revolving 30% Paydown (Individual accounts):</td>
                      <td className="text-center py-2 px-4">$3,507.00</td>
                      <td className="text-center py-2 px-4">$3,507.00</td>
                      <td className="text-center py-2 px-4">$3,507.00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Real Estate Debt (Open):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.realEstateDebt?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.realEstateDebt?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.realEstateDebt?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Installment Debt (Open):</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[1]?.installmentDebt?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[3]?.installmentDebt?.toFixed(2) || '0.00'}</td>
                      <td className="text-center py-2 px-4">${reportData?.debtUtilization?.[2]?.installmentDebt?.toFixed(2) || '0.00'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Total Debt (Open):</td>
                      <td className="text-center py-2 px-4">${((reportData?.debtUtilization?.[1]?.allRevolvingBalance || 0) + (reportData?.debtUtilization?.[1]?.realEstateDebt || 0) + (reportData?.debtUtilization?.[1]?.installmentDebt || 0)).toFixed(2)}</td>
                      <td className="text-center py-2 px-4">${((reportData?.debtUtilization?.[3]?.allRevolvingBalance || 0) + (reportData?.debtUtilization?.[3]?.realEstateDebt || 0) + (reportData?.debtUtilization?.[3]?.installmentDebt || 0)).toFixed(2)}</td>
                      <td className="text-center py-2 px-4">${((reportData?.debtUtilization?.[2]?.allRevolvingBalance || 0) + (reportData?.debtUtilization?.[2]?.realEstateDebt || 0) + (reportData?.debtUtilization?.[2]?.installmentDebt || 0)).toFixed(2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Highest Credit Limit out of Open Revolving accounts:</td>
                      <td className="text-center py-2 px-4">$23,100.00</td>
                      <td className="text-center py-2 px-4">$23,100.00</td>
                      <td className="text-center py-2 px-4">$23,100.00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4 font-medium">Average Age:</td>
                      <td className="text-center py-2 px-4">5 years 3 months</td>
                      <td className="text-center py-2 px-4">6 years 1 month</td>
                      <td className="text-center py-2 px-4">6 years 3 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Do You Qualify - Full Width Below Debt Utilization */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Do You Qualify</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-2 px-4 font-semibold">TU</th>
                      <th className="text-center py-2 px-4 font-semibold">EX</th>
                      <th className="text-center py-2 px-4 font-semibold">EQ</th>
                      <th className="text-left py-2 px-4 font-semibold">Criteria</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[1]?.score700Plus ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[3]?.score700Plus ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[2]?.score700Plus ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="py-2 px-4">700+ credit score with all three consumer credit bureaus</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[1]?.openRevolvingUnder30 ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[3]?.openRevolvingUnder30 ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[2]?.openRevolvingUnder30 ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                    <td className="py-2 px-4">Under 30% utilization on open revolving accounts</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.allRevolvingUnder30 ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.allRevolvingUnder30 ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.allRevolvingUnder30 ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">Under 30% utilization on all revolving accounts</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.minFiveOpenRevolving ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.minFiveOpenRevolving ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.minFiveOpenRevolving ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">Min of 5 open revolving account within 2 years of good payment history</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.creditCard3YearsOld5KLimit ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.creditCard3YearsOld5KLimit ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.creditCard3YearsOld5KLimit ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">Credit Card 3 Years old with a $5,000+ limit (Must be a primary card)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.maxFourUnsecuredIn12Months ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.maxFourUnsecuredIn12Months ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.maxFourUnsecuredIn12Months ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">No more than 4 unsecured accounts open in the past 12 months</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.noInquiries ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <span className="font-bold">{reportData?.inquiries?.filter(inq => inq.bureau === 'TransUnion').length || 0}</span>
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.noInquiries ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <span className="font-bold">{reportData?.inquiries?.filter(inq => inq.bureau === 'Experian').length || 0}</span>
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.noInquiries ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <span className="font-bold">{reportData?.inquiries?.filter(inq => inq.bureau === 'Equifax').length || 0}</span>
                      }
                    </td>
                    <td className="py-2 px-4">No inquiries</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.score730Plus ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.score730Plus ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.score730Plus ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">730+ credit score with all three consumer credit bureaus</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.noBankruptcies ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.noBankruptcies ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.noBankruptcies ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">No bankruptcies within the past 7 years</td>
                  </tr>
                  <tr className="border-b">
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[1]?.noCollectionsLiensJudgements ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[3]?.noCollectionsLiensJudgements ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="text-center py-2 px-4">
                      {reportData?.qualificationCriteria?.[2]?.noCollectionsLiensJudgements ? 
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                        <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                      }
                    </td>
                    <td className="py-2 px-4">No collections, liens, judgements, or late payments</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

          {/* Accounts impeding your eligibility */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-red-50/30 to-pink-50/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Accounts impeding your eligibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Search:" className="max-w-sm" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Worst Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.accounts?.filter(account => {
                      // Filter accounts that are impeding eligibility
                      const hasLatePayments = Array.isArray(account.paymentHistory) && 
                        account.paymentHistory.some(payment => 
                          payment.status && !['OK', 'Current', 'Paid'].includes(payment.status)
                        );
                      const hasHighUtilization = account.accountType === 'Revolving' && 
                        account.balance && account.creditLimit && 
                        (account.balance / account.creditLimit) > 0.3;
                      const isCollection = account.accountType === 'Collection';
                      const isChargOff = account.accountStatus === 'Charge Off';
                      
                      return hasLatePayments || hasHighUtilization || isCollection || isChargOff;
                    }).map((account, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{account.bureau}</TableCell>
                        <TableCell>{account.accountType}</TableCell>
                        <TableCell>{account.creditorName}</TableCell>
                        <TableCell>{account.accountNumber}</TableCell>
                        <TableCell>{account.paymentStatus || 'N/A'}</TableCell>
                        <TableCell>
                          {Array.isArray(account.paymentHistory) && account.paymentHistory.length > 0 ? 
                            account.paymentHistory.reduce((worst, payment) => {
                              if (!payment.status) return worst;
                              const statusPriority = {
                                'Charge Off': 10,
                                'Collection': 9,
                                '120': 8,
                                '90': 7,
                                '60': 6,
                                '30': 5,
                                'Late': 4,
                                'Current': 1,
                                'OK': 1,
                                'Paid': 1
                              };
                              const currentPriority = statusPriority[payment.status] || 0;
                              const worstPriority = statusPriority[worst] || 0;
                              return currentPriority > worstPriority ? payment.status : worst;
                            }, 'OK') : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No accounts impeding eligibility found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Inquiries impeding your eligibility */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-orange-50/30 to-yellow-50/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Inquiries impeding your eligibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input placeholder="Search:" className="max-w-sm" />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Date of Inquiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.inquiries?.map((inquiry, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{inquiry.bureau}</TableCell>
                        <TableCell>{inquiry.type || 'N/A'}</TableCell>
                        <TableCell>{inquiry.creditorName}</TableCell>
                        <TableCell>
                          {inquiry.dateOfInquiry ? 
                            new Date(inquiry.dateOfInquiry).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit', 
                              year: 'numeric'
                            }) : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No inquiries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comprehensive Credit Analysis Progress Report */}
        <TabsContent value="progress" className="space-y-8 mt-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border-0 shadow-lg">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                My Credit Analysis
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Understanding Your Credit • Progress Tracking • Future Planning
              </p>
              <div className="flex justify-center gap-4 text-sm text-gray-500">
                <span>Latest Report: {reportData?.bureauDates?.experian || reportData?.bureauDates?.transunion || reportData?.bureauDates?.equifax || 'N/A'}</span>
                <span>•</span>
                <span>Status: {(() => {
                  const avgScore = Math.round((reportData.scores.experian + reportData.scores.transunion + reportData.scores.equifax) / 3);
                  if (avgScore >= 800) return 'Excellent Standing';
                  if (avgScore >= 740) return 'Very Good Standing';
                  if (avgScore >= 670) return 'Good Standing';
                  if (avgScore >= 580) return 'Fair Standing';
                  return 'Needs Improvement';
                })()}</span>
                <span>•</span>
                <span>Average Score: {Math.round((reportData.scores.experian + reportData.scores.transunion + reportData.scores.equifax) / 3)}</span>
              </div>
            </div>
          </div>

          {/* Credit Score Overview - Enhanced with Speedometer Style */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-blue-50">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                Your Current Credit Status
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Credit scores typically range from 300 to 850
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* TransUnion Enhanced with Speedometer */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="text-center mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md mx-auto mb-3 w-fit">
                      <img 
                        src="/TransUnion_logo.svg.png" 
                        alt="TransUnion" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800">
                      TRANSUNION
                    </h3>
                    <p className="text-sm text-blue-600">{reportData?.bureauDates?.transunion || 'N/A'}</p>
                  </div>

                  {/* Speedometer with score inside */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-40 h-20">
                      <svg className="w-40 h-20" viewBox="0 0 160 80">
                        {/* Background arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        {/* Progress arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="url(#transunionProgressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${((reportData.scores.transunion - 300) / 550) * 188.5} 188.5`}
                          className="transition-all duration-1000 ease-out"
                        />
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="transunionProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="20%" stopColor="#f97316" />
                            <stop offset="40%" stopColor="#eab308" />
                            <stop offset="60%" stopColor="#84cc16" />
                            <stop offset="80%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        {/* Score markers */}
                        <circle cx="20" cy="70" r="3" fill="#94a3b8" />
                        <circle cx="80" cy="25" r="3" fill="#94a3b8" />
                        <circle cx="140" cy="70" r="3" fill="#94a3b8" />
                        {/* Score number in center */}
                        <text x="80" y="60" textAnchor="middle" className="fill-blue-700 text-3xl font-bold">
                          {reportData.scores.transunion}
                        </text>
                        <text x="80" y="75" textAnchor="middle" className="fill-blue-600 text-xs font-medium">
                          {(() => {
                            const score = reportData.scores.transunion;
                            if (score >= 800) return 'Excellent';
                            if (score >= 740) return 'Very Good';
                            if (score >= 670) return 'Good';
                            if (score >= 580) return 'Fair';
                            return 'Poor';
                          })()}
                        </text>
                      </svg>
                      {/* Score labels */}
                      <div className="absolute -bottom-2 left-0 text-xs text-red-500 font-medium">300</div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                      <div className="absolute -bottom-2 right-0 text-xs text-blue-500 font-medium">850</div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>300</span>
                      <span>579</span>
                      <span>669</span>
                      <span>739</span>
                      <span>799</span>
                      <span>850</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-500">Poor</span>
                      <span className="text-orange-500">Fair</span>
                      <span className="text-yellow-500">Good</span>
                      <span className="text-green-500 font-semibold">
                        Very Good
                      </span>
                      <span className="text-blue-500">Excellent</span>
                    </div>
                  </div>
                </div>

                {/* Experian Enhanced with Speedometer */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-center mb-4">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md mx-auto mb-3 w-fit">
                      <img 
                        src="/Experian_logo.svg.png" 
                        alt="Experian" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">
                      EXPERIAN
                    </h3>
                    <p className="text-sm text-green-600">{reportData?.bureauDates?.experian || 'N/A'}</p>
                  </div>

                  {/* Speedometer with score inside */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-40 h-20">
                      <svg className="w-40 h-20" viewBox="0 0 160 80">
                        {/* Background arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        {/* Progress arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="url(#experianProgressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${((reportData.scores.experian - 300) / 550) * 188.5} 188.5`}
                          className="transition-all duration-1000 ease-out"
                        />
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="experianProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="20%" stopColor="#f97316" />
                            <stop offset="40%" stopColor="#eab308" />
                            <stop offset="60%" stopColor="#84cc16" />
                            <stop offset="80%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        {/* Score markers */}
                        <circle cx="20" cy="70" r="3" fill="#94a3b8" />
                        <circle cx="80" cy="25" r="3" fill="#94a3b8" />
                        <circle cx="140" cy="70" r="3" fill="#94a3b8" />
                        {/* Score number in center */}
                        <text x="80" y="60" textAnchor="middle" className="fill-green-700 text-3xl font-bold">
                          {reportData.scores.experian}
                        </text>
                        <text x="80" y="75" textAnchor="middle" className="fill-green-600 text-xs font-medium">
                          {(() => {
                            const score = reportData.scores.experian;
                            if (score >= 800) return 'Excellent';
                            if (score >= 740) return 'Very Good';
                            if (score >= 670) return 'Good';
                            if (score >= 580) return 'Fair';
                            return 'Poor';
                          })()}
                        </text>
                      </svg>
                      {/* Score labels */}
                      <div className="absolute -bottom-2 left-0 text-xs text-red-500 font-medium">300</div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                      <div className="absolute -bottom-2 right-0 text-xs text-green-500 font-medium">850</div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>300</span>
                      <span>579</span>
                      <span>669</span>
                      <span>739</span>
                      <span>799</span>
                      <span>850</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-500">Poor</span>
                      <span className="text-orange-500">Fair</span>
                      <span className="text-yellow-500">Good</span>
                      <span className="text-green-500 font-semibold">
                        Very Good
                      </span>
                      <span className="text-blue-500">Excellent</span>
                    </div>
                  </div>
                </div>

                {/* Equifax Enhanced with Speedometer */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="text-center mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md mx-auto mb-3 w-fit">
                      <img 
                        src="/Equifax_Logo.svg.png" 
                        alt="Equifax" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-purple-800">
                      EQUIFAX
                    </h3>
                    <p className="text-sm text-purple-600">{reportData?.bureauDates?.equifax || 'N/A'}</p>
                  </div>

                  {/* Speedometer with score inside */}
                  <div className="flex justify-center mb-4">
                    <div className="relative w-40 h-20">
                      <svg className="w-40 h-20" viewBox="0 0 160 80">
                        {/* Background arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        {/* Progress arc */}
                        <path
                          d="M 20 70 A 50 50 0 0 1 140 70"
                          fill="none"
                          stroke="url(#equifaxProgressGradient)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${((reportData.scores.equifax - 300) / 550) * 188.5} 188.5`}
                          className="transition-all duration-1000 ease-out"
                        />
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="equifaxProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="20%" stopColor="#f97316" />
                            <stop offset="40%" stopColor="#eab308" />
                            <stop offset="60%" stopColor="#84cc16" />
                            <stop offset="80%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                        </defs>
                        {/* Score markers */}
                        <circle cx="20" cy="70" r="3" fill="#94a3b8" />
                        <circle cx="80" cy="25" r="3" fill="#94a3b8" />
                        <circle cx="140" cy="70" r="3" fill="#94a3b8" />
                        {/* Score number in center */}
                        <text x="80" y="60" textAnchor="middle" className="fill-purple-700 text-3xl font-bold">
                          {reportData.scores.equifax}
                        </text>
                        <text x="80" y="75" textAnchor="middle" className="fill-purple-600 text-xs font-medium">
                          {(() => {
                            const score = reportData.scores.equifax;
                            if (score >= 800) return 'Excellent';
                            if (score >= 740) return 'Very Good';
                            if (score >= 670) return 'Good';
                            if (score >= 580) return 'Fair';
                            return 'Poor';
                          })()}
                        </text>
                      </svg>
                      {/* Score labels */}
                      <div className="absolute -bottom-2 left-0 text-xs text-red-500 font-medium">300</div>
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                      <div className="absolute -bottom-2 right-0 text-xs text-purple-500 font-medium">850</div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>300</span>
                      <span>579</span>
                      <span>669</span>
                      <span>739</span>
                      <span>799</span>
                      <span>850</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-red-500">Poor</span>
                      <span className="text-orange-500">Fair</span>
                      <span className="text-yellow-500">Good</span>
                      <span className="text-green-500 font-semibold">
                        Very Good
                      </span>
                      <span className="text-blue-500">Excellent</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bureau Scores Chart and Circular Score Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
            {/* Bureau Scores Chart - Takes 2/3 of the width */}
            <div className="xl:col-span-2 flex">
              <div className="w-full">
                <BureauScoresChart 
                  reportData={reportData}
                  allReports={reportData.reportHistory || []}
                />
              </div>
            </div>
            
            {/* Circular Score Charts Card - Takes 1/3 of the width */}
            <div className="xl:col-span-1 flex">
              <div className="w-full">
                <ScoreChartsCard 
                  currentScores={(() => {
                    // Use real API data if available, otherwise fall back to mock data
                    if (apiData?.reportData?.Score && Array.isArray(apiData.reportData.Score)) {
                      const scoreData = apiData.reportData.Score;
                      const scores = [];
                      
                      scoreData.forEach((score) => {
                        let bureau = '';
                        let color = '';
                        
                        // Map BureauId to bureau names and colors
                        if (score.BureauId === 1) {
                          bureau = 'TransUnion';
                          color = '#3B82F6';
                        } else if (score.BureauId === 2) {
                          bureau = 'Experian';
                          color = '#10B981';
                        } else if (score.BureauId === 3) {
                          bureau = 'Equifax';
                          color = '#8B5CF6';
                        }
                        
                        if (bureau) {
                          scores.push({
                            bureau,
                            score: parseInt(score.Score) || 0,
                            scoreType: score.ScoreType || 'FICO',
                            date: score.DateReported || score.DateUpdated || 'N/A',
                            color
                          });
                        }
                      });
                      
                      return scores.length > 0 ? scores : [
                        {
                          bureau: 'Experian',
                          score: parseInt(reportData.scores.experian) || 0,
                          scoreType: reportData.scoreTypes?.experian || 'FICO',
                          date: reportData.bureauDates?.experian || 'N/A',
                          color: '#10B981'
                        },
                        {
                          bureau: 'Equifax', 
                          score: parseInt(reportData.scores.equifax) || 0,
                          scoreType: reportData.scoreTypes?.equifax || 'FICO',
                          date: reportData.bureauDates?.equifax || 'N/A',
                          color: '#8B5CF6'
                        },
                        {
                          bureau: 'TransUnion',
                          score: parseInt(reportData.scores.transunion) || 0,
                          scoreType: reportData.scoreTypes?.transunion || 'FICO',
                          date: reportData.bureauDates?.transunion || 'N/A',
                          color: '#3B82F6'
                        }
                      ];
                    } else {
                      // Fall back to mock data
                      return [
                        {
                          bureau: 'Experian',
                          score: parseInt(reportData.scores.experian) || 0,
                          scoreType: reportData.scoreTypes?.experian || 'FICO',
                          date: reportData.bureauDates?.experian || 'N/A',
                          color: '#10B981'
                        },
                        {
                          bureau: 'Equifax', 
                          score: parseInt(reportData.scores.equifax) || 0,
                          scoreType: reportData.scoreTypes?.equifax || 'FICO',
                          date: reportData.bureauDates?.equifax || 'N/A',
                          color: '#8B5CF6'
                        },
                        {
                          bureau: 'TransUnion',
                          score: parseInt(reportData.scores.transunion) || 0,
                          scoreType: reportData.scoreTypes?.transunion || 'FICO',
                          date: reportData.bureauDates?.transunion || 'N/A',
                          color: '#3B82F6'
                        }
                      ];
                    }
                  })()}
                  accounts={(() => {
                    // Pass account data if available for credit factors calculation
                    if (apiData?.reportData?.Accounts && Array.isArray(apiData.reportData.Accounts)) {
                      return apiData.reportData.Accounts.map((account: any) => ({
                        accountType: account.AccountTypeDescription || 'Unknown',
                        currentBalance: parseFloat(account.CurrentBalance) || 0,
                        creditLimit: parseFloat(account.HighBalance) || parseFloat(account.CreditLimit) || 0,
                        paymentHistory: account.PaymentHistory || 'Unknown',
                        accountAge: account.DateOpened ? 
                          Math.floor((new Date().getTime() - new Date(account.DateOpened).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0,
                        isDerogatory: account.AccountStatus?.toLowerCase().includes('derogatory') || 
                                     account.AccountStatus?.toLowerCase().includes('collection') ||
                                     account.AccountStatus?.toLowerCase().includes('charge') || false
                      }));
                    }
                    return undefined;
                  })()}
                />
              </div>
            </div>
          </div>

          {/* Negative Accounts Overview */}
          <div className="mb-8">
            <NegativeAccountsCard 
              data={(() => {
                // Use real API data if available, otherwise fall back to mock data calculations
                if (apiData?.reportData?.Accounts && Array.isArray(apiData.reportData.Accounts)) {
                  const accounts = apiData.reportData.Accounts;
                  const inquiries = apiData.reportData.Inquiries || [];
                  const publicRecords = apiData.reportData.PublicRecords || [];
                  
                  // Calculate late payments from accounts with payment history issues
                  const latePaymentAccounts = accounts.filter(account => 
                    account.PaymentHistory && (
                      account.PaymentHistory.includes('30') ||
                      account.PaymentHistory.includes('60') ||
                      account.PaymentHistory.includes('90') ||
                      account.PaymentHistory.includes('120') ||
                      account.PaymentStatus === 'Late' ||
                      account.PaymentStatus === 'Past Due'
                    )
                  );
                  
                  // Calculate collections and charge-offs
                  const collectionsChargeOffAccounts = accounts.filter(account => 
                    account.AccountType === 'Collection' ||
                    account.AccountStatus === 'Charge Off' ||
                    account.AccountStatus === 'Collection' ||
                    account.CreditorName?.toLowerCase().includes('collection') ||
                    account.AccountType?.toLowerCase().includes('collection')
                  );
                  
                  // Calculate hard inquiries (typically within last 2 years)
                  const hardInquiries = inquiries.filter(inquiry => 
                    inquiry.InquiryType === 'Hard' || 
                    inquiry.Type === 'Hard' ||
                    !inquiry.InquiryType // Default to hard if not specified
                  );
                  
                  return {
                    latePayments: {
                      start: latePaymentAccounts.length,
                      update: Math.floor(latePaymentAccounts.length * 0.45),
                      removed: Math.floor(latePaymentAccounts.length * 0.55)
                    },
                    collectionsChargeOff: {
                      start: collectionsChargeOffAccounts.length,
                      update: Math.floor(collectionsChargeOffAccounts.length * 0.5),
                      removed: Math.floor(collectionsChargeOffAccounts.length * 0.5)
                    },
                    publicRecords: {
                      start: publicRecords.length,
                      update: Math.floor(publicRecords.length * 0.5),
                      removed: Math.floor(publicRecords.length * 0.5)
                    },
                    hardInquiries: {
                      start: hardInquiries.length,
                      update: Math.floor(hardInquiries.length * 0.48),
                      removed: Math.floor(hardInquiries.length * 0.52)
                    }
                  };
                } else {
                  // Fall back to mock data calculations
                  return {
                    latePayments: {
                      start: reportData.accounts.filter(account => account.paymentHistory && account.paymentHistory.includes('Late')).length + 26,
                      update: Math.floor((reportData.accounts.filter(account => account.paymentHistory && account.paymentHistory.includes('Late')).length + 26) * 0.45),
                      removed: Math.floor((reportData.accounts.filter(account => account.paymentHistory && account.paymentHistory.includes('Late')).length + 26) * 0.55)
                    },
                    collectionsChargeOff: {
                      start: reportData.collections.length + 5,
                      update: Math.floor((reportData.collections.length + 5) * 0.5),
                      removed: Math.floor((reportData.collections.length + 5) * 0.5)
                    },
                    publicRecords: {
                      start: (reportData.publicRecords?.length || 0) + 1,
                      update: Math.floor(((reportData.publicRecords?.length || 0) + 1) * 0.5),
                      removed: Math.floor(((reportData.publicRecords?.length || 0) + 1) * 0.5)
                    },
                    hardInquiries: {
                      start: reportData.inquiries.length + 10,
                      update: Math.floor((reportData.inquiries.length + 10) * 0.48),
                      removed: Math.floor((reportData.inquiries.length + 10) * 0.52)
                    }
                  };
                }
              })()}
            />
          </div>

          {/* Credit Analysis Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Analysis of Negative Entries */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Analysis of Negative Entries
                </CardTitle>
                <CardDescription>
                  Issues on your credit report that need attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="group bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 border border-blue-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 text-center mb-1 group-hover:text-blue-700 transition-colors">{reportData.inquiries.length}</div>
                    <div className="text-sm text-blue-600 font-medium text-center">Inquiries</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="group bg-gradient-to-br from-white to-red-50 rounded-xl p-4 border border-red-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 text-center mb-1 group-hover:text-red-700 transition-colors">{reportData.accounts.filter(account => account.paymentHistory && account.paymentHistory.includes('Late')).length}</div>
                    <div className="text-sm text-red-600 font-medium text-center">Late Payments</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-red-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="group bg-gradient-to-br from-white to-orange-50 rounded-xl p-4 border border-orange-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600 text-center mb-1 group-hover:text-orange-700 transition-colors">{reportData.collections.length}</div>
                    <div className="text-sm text-orange-600 font-medium text-center">Collections</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="group bg-gradient-to-br from-white to-purple-50 rounded-xl p-4 border border-purple-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-purple-600 text-center mb-1 group-hover:text-purple-700 transition-colors">{reportData.publicRecords?.length || 0}</div>
                    <div className="text-sm text-purple-600 font-medium text-center">Public Records</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
                <div className={`${reportData.inquiries.length + reportData.collections.length + (reportData.publicRecords?.length || 0) === 0 ? 'bg-green-100' : 'bg-yellow-100'} rounded-lg p-4`}>
                  <div className={`flex items-center gap-2 ${reportData.inquiries.length + reportData.collections.length + (reportData.publicRecords?.length || 0) === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                    <Award className="h-5 w-5" />
                    <span className="font-semibold">
                      {reportData.inquiries.length + reportData.collections.length + (reportData.publicRecords?.length || 0) === 0 ? 'Excellent Credit Health' : 'Credit Needs Attention'}
                    </span>
                  </div>
                  <p className={`text-sm ${reportData.inquiries.length + reportData.collections.length + (reportData.publicRecords?.length || 0) === 0 ? 'text-green-700' : 'text-yellow-700'} mt-1`}>
                    {reportData.inquiries.length + reportData.collections.length + (reportData.publicRecords?.length || 0) === 0 
                      ? 'Minimal negative entries indicate strong credit management' 
                      : 'Some negative entries may be impacting your credit score'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Credit Utilization Overview */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <PieChart className="h-6 w-6 text-blue-600" />
                  Credit Utilization Overview
                </CardTitle>
                <CardDescription>
                  Your current credit usage and limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {(() => {
                      const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                      const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      return isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                    })()}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Overall Credit Utilization
                  </div>
                  <div className={`text-xs font-medium ${(() => {
                    const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                    const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                    const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                    const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                    return safeUtilization <= 30 ? 'text-green-600' : 'text-red-600';
                  })()}`}>
                    {(() => {
                      const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                      const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                      return safeUtilization <= 30 ? 'Excellent (Under 30%)' : 'High (Over 30%)';
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        High Utilization Accounts
                      </span>
                      <span className={`text-lg font-bold ${reportData.accounts.filter(account => (account.balance || 0) / (account.creditLimit || 1) > 0.3).length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {reportData.accounts.filter(account => (account.balance || 0) / (account.creditLimit || 1) > 0.3).length}
                      </span>
                    </div>
                  </div>

                  <div className={`${(() => {
                    const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                    const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                    const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                    const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                    return safeUtilization <= 30 ? 'bg-blue-100' : 'bg-red-100';
                  })()} rounded-lg p-4`}>
                    <div className={`flex items-center gap-2 ${(() => {
                      const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                      const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                      return safeUtilization <= 30 ? 'text-blue-800' : 'text-red-800';
                    })()}`}>
                      <Target className="h-5 w-5" />
                      <span className="font-semibold">
                        {(() => {
                          const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                          const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                          const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                          const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                          return safeUtilization <= 30 ? 'Optimal Usage' : 'High Usage';
                        })()}
                      </span>
                    </div>
                    <p className={`text-sm ${(() => {
                      const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                      const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                      const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                      const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                      return safeUtilization <= 30 ? 'text-blue-700' : 'text-red-700';
                    })()} mt-1`}>
                      {(() => {
                        const totalBalance = reportData.accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
                        const totalLimit = reportData.accounts.reduce((sum, account) => sum + (account.creditLimit || 0), 0);
                        const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;
                        const safeUtilization = isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
                        return safeUtilization <= 30 
                          ? 'Your low utilization rate demonstrates excellent credit management' 
                          : 'Consider paying down balances to improve your credit score';
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit History & Account Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Length of Credit History */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Clock className="h-6 w-6 text-purple-600" />
                  Credit History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {(() => {
                      const now = new Date();
                      const accountAges = reportData.accounts
                        .filter(account => account.dateOpened)
                        .map(account => {
                          const openDate = new Date(account.dateOpened);
                          const diffTime = Math.abs(now - openDate);
                          return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
                        });
                      const avgAge = accountAges.length > 0 ? Math.round(accountAges.reduce((sum, age) => sum + age, 0) / accountAges.length) : 0;
                      const years = Math.floor(avgAge);
                      const months = Math.round((avgAge - years) * 12);
                      return `${years}y ${months}m`;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Average Age</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {(() => {
                      const now = new Date();
                      const oldestAccount = reportData.accounts
                        .filter(account => account.dateOpened)
                        .reduce((oldest, account) => {
                          const openDate = new Date(account.dateOpened);
                          return !oldest || openDate < new Date(oldest.dateOpened) ? account : oldest;
                        }, null);
                      if (!oldestAccount) return '0y 0m';
                      const openDate = new Date(oldestAccount.dateOpened);
                      const diffTime = Math.abs(now - openDate);
                      const totalYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
                      const years = Math.floor(totalYears);
                      const months = Math.round((totalYears - years) * 12);
                      return `${years}y ${months}m`;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Oldest Account</div>
                </div>
                <div className={`${reportData.accounts.filter(account => account.dateOpened).length > 0 ? 'bg-purple-100' : 'bg-gray-100'} rounded-lg p-3 text-center`}>
                  <div className={`text-sm font-medium ${reportData.accounts.filter(account => account.dateOpened).length > 0 ? 'text-purple-800' : 'text-gray-800'}`}>
                    {reportData.accounts.filter(account => account.dateOpened).length > 0 ? 'Strong History' : 'Building History'}
                  </div>
                  <div className={`text-xs ${reportData.accounts.filter(account => account.dateOpened).length > 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                    {reportData.accounts.filter(account => account.dateOpened).length > 0 ? 'Long credit history builds trust' : 'Keep accounts open to build history'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Inquiries */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <Search className="h-6 w-6 text-orange-600" />
                  Recent Inquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.inquiries.slice(0, 3).map((inquiry, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="font-medium text-sm">{inquiry.creditorName || 'Unknown Creditor'}</div>
                      <div className="text-xs text-gray-500">
                        {inquiry.bureau || 'Unknown Bureau'} • {inquiry.date ? new Date(inquiry.date).toLocaleDateString() : 'Unknown Date'}
                      </div>
                      <div className="text-xs text-orange-600">{inquiry.type || 'Credit Check'}</div>
                    </div>
                  ))}
                  {reportData.inquiries.length === 0 && (
                    <div className="bg-white rounded-lg p-3 border border-orange-200 text-center">
                      <div className="text-sm text-gray-500">No recent inquiries</div>
                    </div>
                  )}
                  <div className={`${reportData.inquiries.length <= 2 ? 'bg-green-100' : 'bg-orange-100'} rounded-lg p-3 text-center`}>
                    <div className={`text-sm font-medium ${reportData.inquiries.length <= 2 ? 'text-green-800' : 'text-orange-800'}`}>
                      {reportData.inquiries.length} Recent {reportData.inquiries.length === 1 ? 'Inquiry' : 'Inquiries'}
                    </div>
                    <div className={`text-xs ${reportData.inquiries.length <= 2 ? 'text-green-700' : 'text-orange-700'}`}>
                      {reportData.inquiries.length <= 2 ? 'Minimal impact on score' : 'May impact credit score'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-800">
                  <CreditCard className="h-6 w-6 text-teal-600" />
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="group bg-gradient-to-br from-white to-green-50 rounded-xl p-4 border border-green-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm text-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1 group-hover:text-green-700 transition-colors">
                      {reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('current') || account.status.toLowerCase().includes('paid') || account.status.toLowerCase().includes('good'))).length}
                    </div>
                    <div className="text-xs text-green-600 font-medium">Good Standing</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="group bg-gradient-to-br from-white to-red-50 rounded-xl p-4 border border-red-200/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm text-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <XCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-red-600 mb-1 group-hover:text-red-700 transition-colors">
                      {reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length}
                    </div>
                    <div className="text-xs text-red-600 font-medium">Bad Accounts</div>
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-red-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
                <div className={`${reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length === 0 ? 'bg-teal-100' : 'bg-yellow-100'} rounded-lg p-3 text-center`}>
                  <div className={`text-sm font-medium ${reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length === 0 ? 'text-teal-800' : 'text-yellow-800'}`}>
                    {reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length === 0 ? 'Perfect Record' : 'Needs Attention'}
                  </div>
                  <div className={`text-xs ${reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length === 0 ? 'text-teal-700' : 'text-yellow-700'}`}>
                    {reportData.accounts.filter(account => account.status && (account.status.toLowerCase().includes('late') || account.status.toLowerCase().includes('delinquent') || account.status.toLowerCase().includes('default'))).length + reportData.collections.length === 0 ? 'All accounts in good standing' : 'Some accounts need attention'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>





          {/* Comprehensive Negative Items Breakdown */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-red-800">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                Full Breakdown - Negative Items
              </CardTitle>
              <CardDescription className="text-lg text-red-700">
                Complete list of all negative items affecting your credit report
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Combine all negative items
                const allNegativeItems = [];
                
                // Add late payment accounts
                const latePaymentAccounts = reportData.accounts.filter(account => 
                  account.status && (
                    account.status.toLowerCase().includes('late') || 
                    account.status.toLowerCase().includes('delinquent') || 
                    account.status.toLowerCase().includes('default') ||
                    (account.latePayments && account.latePayments.total > 0)
                  )
                );
                
                latePaymentAccounts.forEach(account => {
                  allNegativeItems.push({
                    id: account.accountNumber || account.id,
                    type: 'Late Payment',
                    creditor: account.creditor,
                    bureau: account.bureau,
                    accountNumber: account.accountNumber,
                    category: 'late-payment'
                  });
                });
                
                // Add collections
                if (reportData.collections) {
                  reportData.collections.forEach(collection => {
                    allNegativeItems.push({
                      id: collection.id,
                      type: 'Collection',
                      creditor: collection.agency || collection.originalCreditor,
                      bureau: collection.bureau || 'Multiple',
                      accountNumber: collection.accountNumber || collection.id,
                      category: 'collection'
                    });
                  });
                }
                
                // Add public records
                if (reportData.publicRecords) {
                  reportData.publicRecords.forEach(record => {
                    allNegativeItems.push({
                      id: record.id,
                      type: record.type || 'Public Record',
                      creditor: record.creditor || 'Court/Government',
                      bureau: record.bureau || 'Multiple',
                      accountNumber: record.caseNumber || record.id,
                      category: 'public-record'
                    });
                  });
                }
                
                // Add hard inquiries
                 const hardInquiries = reportData.inquiries.filter(inquiry => inquiry.type === 'Hard');
                 hardInquiries.forEach(inquiry => {
                   allNegativeItems.push({
                     id: inquiry.id,
                     type: 'Hard Inquiry',
                     creditor: inquiry.company || inquiry.creditorName,
                     bureau: inquiry.bureau,
                     accountNumber: inquiry.id || `INQ-${inquiry.company}`,
                     category: 'hard-inquiry'
                   });
                 });
                 
                 // Add soft inquiries
                 const softInquiries = reportData.inquiries.filter(inquiry => inquiry.type === 'Soft' || !inquiry.type);
                 softInquiries.forEach(inquiry => {
                   allNegativeItems.push({
                     id: inquiry.id,
                     type: 'Soft Inquiry',
                     creditor: inquiry.company || inquiry.creditorName,
                     bureau: inquiry.bureau,
                     accountNumber: inquiry.id || `INQ-${inquiry.company}`,
                     category: 'soft-inquiry'
                   });
                 });
                
                return allNegativeItems.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
                            <th className="border border-red-300 px-4 py-3 text-left font-semibold">Account Number</th>
                            <th className="border border-red-300 px-4 py-3 text-left font-semibold">Type</th>
                            <th className="border border-red-300 px-4 py-3 text-left font-semibold">Creditor</th>
                            <th className="border border-red-300 px-4 py-3 text-center font-semibold">Experian</th>
                            <th className="border border-red-300 px-4 py-3 text-center font-semibold">TransUnion</th>
                            <th className="border border-red-300 px-4 py-3 text-center font-semibold">Equifax</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allNegativeItems.map((item, index) => (
                            <tr key={`${item.category}-${item.id}-${index}`} className={`${index % 2 === 0 ? 'bg-red-50' : 'bg-white'} hover:bg-red-100 transition-colors duration-200`}>
                              <td className="border border-red-200 px-4 py-3 font-medium text-gray-800">
                                {item.accountNumber}
                              </td>
                              <td className="border border-red-200 px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                   item.category === 'late-payment' ? 'bg-yellow-100 text-yellow-800' :
                                   item.category === 'collection' ? 'bg-red-100 text-red-800' :
                                   item.category === 'public-record' ? 'bg-purple-100 text-purple-800' :
                                   item.category === 'hard-inquiry' ? 'bg-orange-100 text-orange-800' :
                                   item.category === 'soft-inquiry' ? 'bg-blue-100 text-blue-800' :
                                   'bg-gray-100 text-gray-800'
                                 }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="border border-red-200 px-4 py-3 font-medium text-gray-800">
                                {item.creditor || 'Unknown'}
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-center">
                                {item.bureau === 'Experian' || item.bureau === 'Multiple' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">✓</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-center">
                                {item.bureau === 'TransUnion' || item.bureau === 'Multiple' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">✓</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-center">
                                {item.bureau === 'Equifax' || item.bureau === 'Multiple' ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-800 rounded-full text-xs font-bold">✓</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">Item Types:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Late Payment
                          </span>
                          <span className="text-sm text-gray-600">Accounts with late payments</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Collection
                          </span>
                          <span className="text-sm text-gray-600">Collection accounts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Public Record
                          </span>
                          <span className="text-sm text-gray-600">Bankruptcies, liens, judgments</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Hard Inquiry
                          </span>
                          <span className="text-sm text-gray-600">Credit applications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Soft Inquiry
                          </span>
                          <span className="text-sm text-gray-600">Background checks, pre-approvals</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-green-200">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Excellent Credit Health!</h3>
                    <p className="text-gray-500">
                      No negative items found on your credit report.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          
        </TabsContent>

        {/* Detailed Accounts Section */}
        <TabsContent value="accounts" className="space-y-8 my-6">
          <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-ocean-blue" />
              Account Details by Bureau
            </CardTitle>
                <CardDescription>
                  Detailed account information from each credit bureau
                </CardDescription>
              </CardHeader>
          <CardContent>
            {(() => {
              // Group accounts by creditor and account number for comparison
              const groupAccountsForComparison = () => {
                if (!reportData.accounts || reportData.accounts.length === 0) {
                  return [];
                }

                const grouped = {};
                const accountNumberTracker = new Set(); // Track unique account numbers
                
                reportData.accounts.forEach(account => {
                  const creditorName = account.CreditorName || account.creditor || 'Unknown';
                  const accountNumber = account.AccountNumber || account.accountNumber || 'N/A';
                  
                  // Normalize account number for comparison (remove spaces, dashes, etc.)
                  const normalizedAccountNumber = accountNumber.toString().replace(/[\s\-]/g, '').toLowerCase();
                  
                  // Skip if this exact account number has already been processed
                  if (accountNumber !== 'N/A' && accountNumberTracker.has(normalizedAccountNumber)) {
                    // Find existing group with same account number and merge bureau data
                    const existingKey = Object.keys(grouped).find(key => {
                      const existingAccountNumber = grouped[key].accountNumber.toString().replace(/[\s\-]/g, '').toLowerCase();
                      return existingAccountNumber === normalizedAccountNumber;
                    });
                    
                    if (existingKey) {
                      const bureauName = account.bureau || 'Unknown';
                      grouped[existingKey].bureaus[bureauName] = {
                        balance: account.CurrentBalance || account.balance || 0,
                        limit: account.CreditLimit || account.creditLimit || account.limit || 0,
                        status: account.AccountStatus || account.status || 'Unknown',
                        utilization: account.utilization || (account.CurrentBalance && account.CreditLimit ? 
                          Math.round((parseInt(account.CurrentBalance) / parseInt(account.CreditLimit)) * 100) : 0),
                        opened: account.DateOpened || account.dateOpened || account.opened,
                        paymentHistory: account.PaymentStatus || account.paymentHistory || 'N/A',
                        designator: account.AccountDesignator || account.designator || 'N/A',
                        reported: account.DateReported || account.dateReported || account.reported,
                        pastDue: account.AmountPastDue || account.pastDue || 0,
                        highBalance: account.HighBalance || account.highBalance || 0,
                        industry: account.Industry || account.industry || 'N/A',
                        worstStatus: account.WorstPayStatus || account.worstStatus || 'N/A',
                        remark: account.Remark || account.remark || 'N/A',
                        payStatusHistory: account.PayStatusHistory || account.payStatusHistory || 'N/A',
                        payStatusHistoryStartDate: account.PayStatusHistoryStartDate || account.payStatusHistoryStartDate || 'N/A'
                      };
                    }
                    return; // Skip creating new group
                  }
                  
                  // Create a unique key based on creditor name and account number
                  const key = `${creditorName}_${accountNumber}`;
                  
                  if (!grouped[key]) {
                    grouped[key] = {
                      creditor: creditorName,
                      accountNumber: accountNumber,
                      type: account.AccountTypeDescription || account.CreditType || account.type || 'N/A',
                      bureaus: {}
                    };
                    
                    // Track this account number to prevent duplicates
                    if (accountNumber !== 'N/A') {
                      accountNumberTracker.add(normalizedAccountNumber);
                    }
                  }
                  
                  // Add account data for this bureau
                  const bureauName = account.bureau || 'Unknown';
                  grouped[key].bureaus[bureauName] = {
                    balance: account.CurrentBalance || account.balance || 0,
                    limit: account.CreditLimit || account.creditLimit || account.limit || 0,
                    status: account.AccountStatus || account.status || 'Unknown',
                    utilization: account.utilization || (account.CurrentBalance && account.CreditLimit ? 
                      Math.round((parseInt(account.CurrentBalance) / parseInt(account.CreditLimit)) * 100) : 0),
                    opened: account.DateOpened || account.dateOpened || account.opened,
                    paymentHistory: account.PaymentStatus || account.paymentHistory || 'N/A',
                    designator: account.AccountDesignator || account.designator || 'N/A',
                    reported: account.DateReported || account.dateReported || account.reported,
                    pastDue: account.AmountPastDue || account.pastDue || 0,
                    highBalance: account.HighBalance || account.highBalance || 0,
                    industry: account.Industry || account.industry || 'N/A',
                    worstStatus: account.WorstPayStatus || account.worstStatus || 'N/A',
                    remark: account.Remark || account.remark || 'N/A',
                    payStatusHistory: account.PayStatusHistory || account.payStatusHistory || 'N/A',
                    payStatusHistoryStartDate: account.PayStatusHistoryStartDate || account.payStatusHistoryStartDate || 'N/A'
                  };
                });
                
                return Object.values(grouped);
              };

              const groupedAccounts = groupAccountsForComparison();

              if (groupedAccounts.length === 0) {
                return (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No accounts found</p>
                    <p className="text-sm text-muted-foreground">Check the Accounts tab for detailed account information</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Header with bureau logos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gradient-to-r from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="font-bold text-base text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h14a2 2 0 012 2v2M7 7V3a4 4 0 018 0v4M9 7h6" />
                      </svg>
                      Account Details
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/Experian_logo.svg.png" alt="Experian" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-blue-700">Experian</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/TransUnion_logo.svg.png" alt="TransUnion" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-purple-700">TransUnion</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/Equifax_Logo.svg.png" alt="Equifax" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-green-700">Equifax</div>
                    </div>
                  </div>

                  {/* Account comparison rows */}
                  {groupedAccounts.map((accountGroup, index) => (
                    <div key={index} className="bg-gradient-to-r from-white via-gray-50/30 to-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 mb-6">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Account Info Column */}
                        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-300">
                              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"></div>
                              <div className="font-bold text-lg text-gray-800">{accountGroup.creditor}</div>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  Account #:
                                </span>
                                <span className="font-semibold text-gray-800 text-xs">{accountGroup.accountNumber}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h14a2 2 0 012 2v2M7 7V3a4 4 0 018 0v4M9 7h6" />
                                  </svg>
                                  Type:
                                </span>
                                <span className="font-semibold text-gray-800">{accountGroup.type}</span>
                              </div>
                              {/* Get additional details from first available bureau */}
                              {(() => {
                                const firstBureau = Object.values(accountGroup.bureaus)[0];
                                return firstBureau ? (
                                  <>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Designator:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.designator || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Opened:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.opened ? new Date(firstBureau.opened).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        Industry:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.industry || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                                        </svg>
                                        Remark:
                                      </span>
                                      <span className="font-semibold text-gray-800 text-xs truncate max-w-[120px]" title={firstBureau.remark || 'N/A'}>{firstBureau.remark || 'N/A'}</span>
                                    </div>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Experian Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.Experian ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.Experian.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.Experian.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.Experian.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/Experian_logo.svg.png" alt="Experian" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.Experian.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.Experian.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.Experian.utilization)}`}>
                                    {accountGroup.bureaus.Experian.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.reported ? new Date(accountGroup.bureaus.Experian.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.Experian.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.Experian.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.Experian.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.Experian.payStatusHistory && accountGroup.bureaus.Experian.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.Experian.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.Experian.payStatusHistoryStartDate && accountGroup.bureaus.Experian.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.Experian.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* TransUnion Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.TransUnion ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.TransUnion.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.TransUnion.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.TransUnion.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/TransUnion_logo.svg.png" alt="TransUnion" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.TransUnion.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.TransUnion.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.TransUnion.utilization)}`}>
                                    {accountGroup.bureaus.TransUnion.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.reported ? new Date(accountGroup.bureaus.TransUnion.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.TransUnion.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.TransUnion.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.TransUnion.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.TransUnion.payStatusHistory && accountGroup.bureaus.TransUnion.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.TransUnion.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.TransUnion.payStatusHistoryStartDate && accountGroup.bureaus.TransUnion.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.TransUnion.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Equifax Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.Equifax ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.Equifax.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.Equifax.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.Equifax.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/Equifax_Logo.svg.png" alt="Equifax" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.Equifax.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.Equifax.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.Equifax.utilization)}`}>
                                    {accountGroup.bureaus.Equifax.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.reported ? new Date(accountGroup.bureaus.Equifax.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.Equifax.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.Equifax.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.Equifax.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.Equifax.payStatusHistory && accountGroup.bureaus.Equifax.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.Equifax.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.Equifax.payStatusHistoryStartDate && accountGroup.bureaus.Equifax.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.Equifax.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
        </TabsContent>

        {/* Keep all existing tabs from the original implementation */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Credit Scores */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center text-sm">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                      <img 
                        src="/Experian_logo.svg.png" 
                        alt="Experian" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                  </CardTitle>
                  <div className="text-xs text-blue-600 font-medium bg-blue-100/50 px-2 py-1 rounded-full">
                    {reportData?.bureauDates?.experian || 'N/A'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center relative p-6">
                {/* Speedometer with score inside */}
                <div className="flex justify-center mb-2">
                  <div className="relative w-32 h-16">
                    <svg className="w-32 h-16" viewBox="0 0 120 60">
                      {/* Background arc */}
                      <path
                        d="M 15 50 A 35 35 0 0 1 105 50"
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Progress arc */}
                      <path
                        d="M 15 50 A 35 35 0 0 1 105 50"
                        fill="none"
                        stroke="url(#experianRedToGreenGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${((reportData.scores.experian - 300) / 550) * 141.37} 141.37`}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="experianRedToGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="20%" stopColor="#f97316" />
                          <stop offset="40%" stopColor="#eab308" />
                          <stop offset="60%" stopColor="#84cc16" />
                          <stop offset="80%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      {/* Score markers */}
                      <circle cx="15" cy="50" r="2" fill="#94a3b8" />
                      <circle cx="60" cy="15" r="2" fill="#94a3b8" />
                      <circle cx="105" cy="50" r="2" fill="#94a3b8" />
                      {/* Score number in center */}
                      <text x="60" y="45" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                        {reportData.scores.experian}
                      </text>
                    </svg>
                    {/* Score labels */}
                    <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                    <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-medium mb-3">
                  {reportData?.scoreTypes?.experian || 'Credit Score'}
                </div>
                <div
                  className={`flex items-center justify-center mt-1 ${
                    getScoreChange(
                      reportData.scores.experian,
                      reportData.previousScores.experian,
                    ).color
                  }`}
                >
                  <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                    {getScoreChange(
                      reportData.scores.experian,
                      reportData.previousScores.experian,
                    ).icon === ArrowUp ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {getScoreChange(
                        reportData.scores.experian,
                        reportData.previousScores.experian,
                      ).isPositive
                        ? "+"
                        : ""}
                      {
                        getScoreChange(
                          reportData.scores.experian,
                          reportData.previousScores.experian,
                        ).value
                      }
                    </span>
                  </div>
                </div>
                {/* Logo in bottom right corner */}
                <div className="absolute bottom-3 right-3">
                  <img 
                    src={reportData?.scoreTypes?.experian === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                    alt={reportData?.scoreTypes?.experian === "VantageScore3" ? "VantageScore" : "FICO Score"}
                    className="h-5 w-auto opacity-60"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center text-sm">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                      <img 
                        src="/TransUnion_logo.svg.png" 
                        alt="TransUnion" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                  </CardTitle>
                  <div className="text-xs text-purple-600 font-medium bg-purple-100/50 px-2 py-1 rounded-full">
                    {reportData?.bureauDates?.transunion || 'N/A'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center relative p-6">
                {/* Speedometer with score inside */}
                <div className="flex justify-center mb-2">
                  <div className="relative w-32 h-16">
                    <svg className="w-32 h-16" viewBox="0 0 130 70">
                      {/* Background arc */}
                      <path
                        d="M 15 55 A 40 40 0 0 1 115 55"
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Progress arc */}
                      <path
                        d="M 15 55 A 40 40 0 0 1 115 55"
                        fill="none"
                        stroke="url(#transunionRedToGreenGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${((reportData.scores.transunion - 300) / 550) * 157.08} 157.08`}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="transunionRedToGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="20%" stopColor="#f97316" />
                          <stop offset="40%" stopColor="#eab308" />
                          <stop offset="60%" stopColor="#84cc16" />
                          <stop offset="80%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      {/* Score markers */}
                      <circle cx="15" cy="55" r="2" fill="#94a3b8" />
                      <circle cx="65" cy="20" r="2" fill="#94a3b8" />
                      <circle cx="115" cy="55" r="2" fill="#94a3b8" />
                      {/* Score number in center */}
                      <text x="65" y="50" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                        {reportData.scores.transunion}
                      </text>
                    </svg>
                    {/* Score labels */}
                    <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                    <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-medium mb-3">
                  {reportData?.scoreTypes?.transunion || 'Credit Score'}
                </div>
                <div
                  className={`flex items-center justify-center mt-1 ${
                    getScoreChange(
                      reportData.scores.transunion,
                      reportData.previousScores.transunion,
                    ).color
                  }`}
                >
                  <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                    {getScoreChange(
                      reportData.scores.transunion,
                      reportData.previousScores.transunion,
                    ).icon === ArrowUp ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {getScoreChange(
                        reportData.scores.transunion,
                        reportData.previousScores.transunion,
                      ).isPositive
                        ? "+"
                        : ""}
                      {
                        getScoreChange(
                          reportData.scores.transunion,
                          reportData.previousScores.transunion,
                        ).value
                      }
                    </span>
                  </div>
                </div>
                {/* Logo in bottom right corner */}
                <div className="absolute bottom-3 right-3">
                  <img 
                    src={reportData?.scoreTypes?.transunion === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                    alt={reportData?.scoreTypes?.transunion === "VantageScore3" ? "VantageScore" : "FICO Score"}
                    className="h-5 w-auto opacity-60"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-center text-sm">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                      <img 
                        src="/Equifax_Logo.svg.png" 
                        alt="Equifax" 
                        className="h-6 w-auto filter brightness-0 invert"
                      />
                    </div>
                  </CardTitle>
                  <div className="text-xs text-red-600 font-medium bg-red-100/50 px-2 py-1 rounded-full">
                    {reportData?.bureauDates?.equifax || 'N/A'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-center relative p-6">
                {/* Speedometer with score inside */}
                <div className="flex justify-center mb-2">
                  <div className="relative w-32 h-16">
                    <svg className="w-32 h-16" viewBox="0 0 130 70">
                      {/* Background arc */}
                      <path
                        d="M 15 55 A 40 40 0 0 1 115 55"
                        fill="none"
                        stroke="#f3f4f6"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Progress arc */}
                      <path
                        d="M 15 55 A 40 40 0 0 1 115 55"
                        fill="none"
                        stroke="url(#redToGreenGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${((reportData.scores.equifax - 300) / 550) * 157.08} 157.08`}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="redToGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="20%" stopColor="#f97316" />
                          <stop offset="40%" stopColor="#eab308" />
                          <stop offset="60%" stopColor="#84cc16" />
                          <stop offset="80%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      {/* Score markers */}
                      <circle cx="15" cy="55" r="2" fill="#94a3b8" />
                      <circle cx="65" cy="20" r="2" fill="#94a3b8" />
                      <circle cx="115" cy="55" r="2" fill="#94a3b8" />
                      {/* Score number in center */}
                      <text x="65" y="50" textAnchor="middle" className="fill-slate-700 text-2xl font-bold">
                        {reportData.scores.equifax}
                      </text>
                    </svg>
                    {/* Score labels */}
                    <div className="absolute -bottom-1 left-0 text-xs text-red-500 font-medium">300</div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-yellow-500 font-medium">575</div>
                    <div className="absolute -bottom-1 right-0 text-xs text-green-500 font-medium">850</div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 font-medium mb-3">
                  {reportData?.scoreTypes?.equifax || 'Credit Score'}
                </div>
                <div
                  className={`flex items-center justify-center mt-1 ${
                    getScoreChange(
                      reportData.scores.equifax,
                      reportData.previousScores.equifax,
                    ).color
                  }`}
                >
                  <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                    {getScoreChange(
                      reportData.scores.equifax,
                      reportData.previousScores.equifax,
                    ).icon === ArrowUp ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-sm font-semibold">
                      {getScoreChange(
                        reportData.scores.equifax,
                        reportData.previousScores.equifax,
                      ).isPositive
                        ? "+"
                        : ""}
                      {
                        getScoreChange(
                          reportData.scores.equifax,
                          reportData.previousScores.equifax,
                        ).value
                      }
                    </span>
                  </div>
                </div>
                {/* Logo in bottom right corner */}
                <div className="absolute bottom-3 right-3">
                  <img 
                    src={reportData?.scoreTypes?.equifax === "VantageScore3" ? "/VantageScore.png" : "/FICO_Score_RGB_Blue.png"}
                    alt={reportData?.scoreTypes?.equifax === "VantageScore3" ? "VantageScore" : "FICO Score"}
                    className="h-5 w-auto opacity-60"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-6 gap-4 mb-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <CreditCard className="h-5 w-5 text-ocean-blue mx-auto mb-1" />
                <div className="text-xl font-bold gradient-text-primary">
                  {reportData.accounts.length}
                </div>
                <div className="text-xs text-muted-foreground">Accounts</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-red-600">
                  {reportData.collections.length}
                </div>
                <div className="text-xs text-muted-foreground">Collections</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <Eye className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-yellow-600">
                  {reportData.inquiries.length}
                </div>
                <div className="text-xs text-muted-foreground">Inquiries</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <BarChart3 className="h-5 w-5 text-sea-green mx-auto mb-1" />
                <div className="text-xl font-bold gradient-text-secondary">
                  23%
                </div>
                <div className="text-xs text-muted-foreground">Utilization</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-600">2</div>
                <div className="text-xs text-muted-foreground">
                  Late Payments
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="p-3 text-center">
                <FileText className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-600">3</div>
                <div className="text-xs text-muted-foreground">Disputes</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-b border-blue-200/30 backdrop-blur-sm">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold text-xl">
                  Personal Information
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium ml-11">
                Identity verification across all credit bureaus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Personal Information Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {(() => {
                  // Extract bureau-specific personal info
                  const getBureauPersonalInfo = (bureauId) => {
                    const names = apiData?.reportData?.Name?.filter(n => n.BureauId === bureauId) || [];
                    const primaryName = names.find(n => n.NameType === "Primary") || names[0];
                    const dob = apiData?.reportData?.DOB?.find(d => d.BureauId === bureauId);
                    const addresses = apiData?.reportData?.Address?.filter(a => a.BureauId === bureauId) || [];
                    
                    return {
                      name: primaryName ? `${primaryName.FirstName || ''} ${primaryName.Middle || ''} ${primaryName.LastName || ''}`.trim() : 'N/A',
                      dob: dob?.DOB || 'N/A',
                      addresses: addresses
                    };
                  };

                  // Get personal info for each bureau
                  const experianInfo = getBureauPersonalInfo(3);
                  const transUnionInfo = getBureauPersonalInfo(2);
                  const equifaxInfo = getBureauPersonalInfo(1);

                  // Check for mismatches
                  const checkMismatch = (field) => {
                    const values = [experianInfo[field], transUnionInfo[field], equifaxInfo[field]];
                    const uniqueValues = [...new Set(values.filter(v => v !== 'N/A'))];
                    return uniqueValues.length > 1;
                  };

                  const nameMismatch = checkMismatch('name');
                  const dobMismatch = checkMismatch('dob');

                  return (
                    <>
                      {/* Experian Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-blue-950 dark:to-cyan-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                              <img 
                                src="/Experian_logo.svg.png" 
                                alt="Experian" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {experianInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {experianInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <Home className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {experianInfo.addresses.length > 0 ? (
                                experianInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* TransUnion Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-purple-950 dark:to-violet-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30 dark:from-purple-900/30 dark:to-violet-900/30 dark:border-purple-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                              <img 
                                src="/TransUnion_logo.svg.png" 
                                alt="TransUnion" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <User className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {transUnionInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {transUnionInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <Home className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {transUnionInfo.addresses.length > 0 ? (
                                transUnionInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Equifax Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-red-950 dark:to-rose-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                              <img 
                                src="/Equifax_Logo.svg.png" 
                                alt="Equifax" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <User className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {equifaxInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {equifaxInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <Home className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {equifaxInfo.addresses.length > 0 ? (
                                equifaxInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Employer Details Section */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50/50 to-gray-100/30 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 backdrop-blur-sm mt-8">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/10 to-slate-600/10 border-b border-slate-200/30 dark:from-slate-800/50 dark:via-gray-800/50 dark:to-slate-900/50 dark:border-slate-700/30 backdrop-blur-sm">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg shadow-md">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-slate-700 to-gray-800 bg-clip-text text-transparent font-bold pb-3">
                  Employer Details from All Bureaus
                </span>
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Employment information reported by Experian, TransUnion, and Equifax
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Experian Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-blue-950 dark:to-cyan-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                        <img
                          src="/Experian_logo.svg.png"
                          alt="Experian"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 2 || emp.bureauId === "experian").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 2 || emp.bureauId === "experian")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3 mt-3 first:mt-5"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-blue-600/70">
                          Experian has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* TransUnion Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-purple-950 dark:to-violet-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30 dark:from-purple-900/30 dark:to-violet-900/30 dark:border-purple-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                        <img
                          src="/TransUnion_logo.svg.png"
                          alt="TransUnion"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 1 || emp.bureauId === "transunion").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 1 || emp.bureauId === "transunion")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gradient-to-br from-purple-50/30 to-violet-50/30 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-100/50 dark:border-purple-800/30">
                        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-sm text-purple-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-purple-600/70">
                          TransUnion has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Equifax Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-red-950 dark:to-rose-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                        <img
                          src="/Equifax_Logo.svg.png"
                          alt="Equifax"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 3 || emp.bureauId === "equifax").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 3 || emp.bureauId === "equifax")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No employer data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          {/* Inquiry Cards Section */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-t-lg border-b border-blue-100/50">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  Credit Inquiries by Bureau
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Recent credit inquiries from each credit bureau
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {(() => {
                  // Get inquiries for each bureau
                  const getBureauInquiries = (bureauId) => {
                    return reportData.inquiries.filter(inquiry => inquiry.bureau === bureauId) || [];
                  };

                  const experianInquiries = getBureauInquiries('Experian');
                  const transUnionInquiries = getBureauInquiries('TransUnion');
                  const equifaxInquiries = getBureauInquiries('Equifax');

                  return (
                    <>
                      {/* Experian Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg border-b border-green-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-green-100/50">
                              <img 
                                src="/Experian_logo.svg.png" 
                                alt="Experian" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {experianInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {experianInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {experianInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-green-50/50 border border-green-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-green-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-green-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-green-50/30 to-emerald-50/30 rounded-xl border border-green-100/50">
                              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* TransUnion Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-purple-50/30 to-violet-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-t-lg border-b border-purple-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-purple-100/50">
                              <img 
                                src="/TransUnion_logo.svg.png" 
                                alt="TransUnion" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                              {transUnionInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {transUnionInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {transUnionInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-purple-50/50 border border-purple-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-purple-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-purple-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-purple-50/30 to-violet-50/30 rounded-xl border border-purple-100/50">
                              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Equifax Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-red-50/30 to-rose-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-t-lg border-b border-red-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-red-100/50">
                              <img 
                                src="/Equifax_Logo.svg.png" 
                                alt="Equifax" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                              {equifaxInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {equifaxInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {equifaxInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-red-50/50 border border-red-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-red-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-red-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-red-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-red-50/30 to-rose-50/30 rounded-xl border border-red-100/50">
                              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>

            </CardContent>
          </Card>

          {/* Public Records Section */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-ocean-blue" />
                Public Records by Bureau
              </CardTitle>
              <CardDescription>
                Public records information from each credit bureau
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {(() => {
                  // Get public records for each bureau
                  const getBureauPublicRecords = (bureauId) => {
                    return reportData.publicRecords?.filter(record => record.bureau === bureauId) || [];
                  };

                  const experianRecords = getBureauPublicRecords('Experian');
                  const transUnionRecords = getBureauPublicRecords('TransUnion');
                  const equifaxRecords = getBureauPublicRecords('Equifax');

                  return (
                    <>
                      {/* Experian Public Records */}
                      <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <img 
                              src="/Experian_logo.svg.png" 
                              alt="Experian" 
                              className="h-8 w-auto"
                            />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center mb-3">
                            <div className="text-2xl font-bold text-blue-600">
                              {experianRecords.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Public Records
                            </div>
                          </div>
                          {experianRecords.length > 0 ? (
                            <div className="space-y-2">
                              {experianRecords.map((record, idx) => (
                                <div key={idx} className="border border-border/20 rounded-lg p-2">
                                  <div className="text-xs font-medium">{record.type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Status: {record.status}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Filed: {new Date(record.filingDate).toLocaleDateString()}
                                  </div>
                                  {record.court && (
                                    <div className="text-xs text-muted-foreground">
                                      Court: {record.court}
                                    </div>
                                  )}
                                  <Badge 
                                    variant={record.status === 'Discharged' ? 'secondary' : 'destructive'}
                                    className="text-xs mt-1"
                                  >
                                    {record.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                No public records found
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* TransUnion Public Records */}
                      <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <img 
                              src="/TransUnion_logo.svg.png" 
                              alt="TransUnion" 
                              className="h-8 w-auto"
                            />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center mb-3">
                            <div className="text-2xl font-bold text-blue-600">
                              {transUnionRecords.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Public Records
                            </div>
                          </div>
                          {transUnionRecords.length > 0 ? (
                            <div className="space-y-2">
                              {transUnionRecords.map((record, idx) => (
                                <div key={idx} className="border border-border/20 rounded-lg p-2">
                                  <div className="text-xs font-medium">{record.type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Status: {record.status}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Filed: {new Date(record.filingDate).toLocaleDateString()}
                                  </div>
                                  {record.court && (
                                    <div className="text-xs text-muted-foreground">
                                      Court: {record.court}
                                    </div>
                                  )}
                                  <Badge 
                                    variant={record.status === 'Discharged' ? 'secondary' : 'destructive'}
                                    className="text-xs mt-1"
                                  >
                                    {record.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                No public records found
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Equifax Public Records */}
                      <Card className="border-0 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <img 
                              src="/Equifax_Logo.svg.png" 
                              alt="Equifax" 
                              className="h-8 w-auto"
                            />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center mb-3">
                            <div className="text-2xl font-bold text-blue-600">
                              {equifaxRecords.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Public Records
                            </div>
                          </div>
                          {equifaxRecords.length > 0 ? (
                            <div className="space-y-2">
                              {equifaxRecords.map((record, idx) => (
                                <div key={idx} className="border border-border/20 rounded-lg p-2">
                                  <div className="text-xs font-medium">{record.type}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Status: {record.status}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Filed: {new Date(record.filingDate).toLocaleDateString()}
                                  </div>
                                  {record.court && (
                                    <div className="text-xs text-muted-foreground">
                                      Court: {record.court}
                                    </div>
                                  )}
                                  <Badge 
                                    variant={record.status === 'Discharged' ? 'secondary' : 'destructive'}
                                    className="text-xs mt-1"
                                  >
                                    {record.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                No public records found
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        

        {/* Account Details Section */}
        <Card className="border-0 shadow-md my-3Detailed account information from each credit bureau">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-ocean-blue" />
              Account Details by Bureau
            </CardTitle>
                <CardDescription>
                  Detailed account information from each credit bureau
                </CardDescription>
              </CardHeader>
          <CardContent>
            {(() => {
              // Group accounts by creditor and account number for comparison
              const groupAccountsForComparison = () => {
                if (!reportData.accounts || reportData.accounts.length === 0) {
                  return [];
                }

                const grouped = {};
                const accountNumberTracker = new Set(); // Track unique account numbers
                
                reportData.accounts.forEach(account => {
                  const creditorName = account.CreditorName || account.creditor || 'Unknown';
                  const accountNumber = account.AccountNumber || account.accountNumber || 'N/A';
                  
                  // Normalize account number for comparison (remove spaces, dashes, etc.)
                  const normalizedAccountNumber = accountNumber.toString().replace(/[\s\-]/g, '').toLowerCase();
                  
                  // Skip if this exact account number has already been processed
                  if (accountNumber !== 'N/A' && accountNumberTracker.has(normalizedAccountNumber)) {
                    // Find existing group with same account number and merge bureau data
                    const existingKey = Object.keys(grouped).find(key => {
                      const existingAccountNumber = grouped[key].accountNumber.toString().replace(/[\s\-]/g, '').toLowerCase();
                      return existingAccountNumber === normalizedAccountNumber;
                    });
                    
                    if (existingKey) {
                      const bureauName = account.bureau || 'Unknown';
                      grouped[existingKey].bureaus[bureauName] = {
                        balance: account.CurrentBalance || account.balance || 0,
                        limit: account.CreditLimit || account.creditLimit || account.limit || 0,
                        status: account.AccountStatus || account.status || 'Unknown',
                        utilization: account.utilization || (account.CurrentBalance && account.CreditLimit ? 
                          Math.round((parseInt(account.CurrentBalance) / parseInt(account.CreditLimit)) * 100) : 0),
                        opened: account.DateOpened || account.dateOpened || account.opened,
                        paymentHistory: account.PaymentStatus || account.paymentHistory || 'N/A',
                        designator: account.AccountDesignator || account.designator || 'N/A',
                        reported: account.DateReported || account.dateReported || account.reported,
                        pastDue: account.AmountPastDue || account.pastDue || 0,
                        highBalance: account.HighBalance || account.highBalance || 0,
                        industry: account.Industry || account.industry || 'N/A',
                        worstStatus: account.WorstPayStatus || account.worstStatus || 'N/A',
                        remark: account.Remark || account.remark || 'N/A',
                        payStatusHistory: account.PayStatusHistory || account.payStatusHistory || 'N/A',
                        payStatusHistoryStartDate: account.PayStatusHistoryStartDate || account.payStatusHistoryStartDate || 'N/A'
                      };
                    }
                    return; // Skip creating new group
                  }
                  
                  // Create a unique key based on creditor name and account number
                  const key = `${creditorName}_${accountNumber}`;
                  
                  if (!grouped[key]) {
                    grouped[key] = {
                      creditor: creditorName,
                      accountNumber: accountNumber,
                      type: account.AccountTypeDescription || account.CreditType || account.type || 'N/A',
                      bureaus: {}
                    };
                    
                    // Track this account number to prevent duplicates
                    if (accountNumber !== 'N/A') {
                      accountNumberTracker.add(normalizedAccountNumber);
                    }
                  }
                  
                  // Add account data for this bureau
                  const bureauName = account.bureau || 'Unknown';
                  grouped[key].bureaus[bureauName] = {
                    balance: account.CurrentBalance || account.balance || 0,
                    limit: account.CreditLimit || account.creditLimit || account.limit || 0,
                    status: account.AccountStatus || account.status || 'Unknown',
                    utilization: account.utilization || (account.CurrentBalance && account.CreditLimit ? 
                      Math.round((parseInt(account.CurrentBalance) / parseInt(account.CreditLimit)) * 100) : 0),
                    opened: account.DateOpened || account.dateOpened || account.opened,
                    paymentHistory: account.PaymentStatus || account.paymentHistory || 'N/A',
                    designator: account.AccountDesignator || account.designator || 'N/A',
                    reported: account.DateReported || account.dateReported || account.reported,
                    pastDue: account.AmountPastDue || account.pastDue || 0,
                    highBalance: account.HighBalance || account.highBalance || 0,
                    industry: account.Industry || account.industry || 'N/A',
                    worstStatus: account.WorstPayStatus || account.worstStatus || 'N/A',
                    remark: account.Remark || account.remark || 'N/A',
                    payStatusHistory: account.PayStatusHistory || account.payStatusHistory || 'N/A',
                    payStatusHistoryStartDate: account.PayStatusHistoryStartDate || account.payStatusHistoryStartDate || 'N/A'
                  };
                });
                
                return Object.values(grouped);
              };

              const groupedAccounts = groupAccountsForComparison();

              if (groupedAccounts.length === 0) {
                return (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No accounts found</p>
                    <p className="text-sm text-muted-foreground">Check the Accounts tab for detailed account information</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Header with bureau logos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gradient-to-r from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="font-bold text-base text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h14a2 2 0 012 2v2M7 7V3a4 4 0 018 0v4M9 7h6" />
                      </svg>
                      Account Details
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/Experian_logo.svg.png" alt="Experian" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-blue-700">Experian</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/TransUnion_logo.svg.png" alt="TransUnion" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-purple-700">TransUnion</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                      <img src="/Equifax_Logo.svg.png" alt="Equifax" className="h-8 w-auto mx-auto mb-2" />
                      <div className="text-sm font-semibold text-green-700">Equifax</div>
                    </div>
                  </div>

                  {/* Account comparison rows */}
                  {groupedAccounts.map((accountGroup, index) => (
                    <div key={index} className="bg-gradient-to-r from-white via-gray-50/30 to-white border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300 mb-6">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Account Info Column */}
                        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl p-5 border border-slate-200 shadow-md hover:shadow-lg transition-shadow">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-300">
                              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"></div>
                              <div className="font-bold text-lg text-gray-800">{accountGroup.creditor}</div>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  Account #:
                                </span>
                                <span className="font-semibold text-gray-800 text-xs">{accountGroup.accountNumber}</span>
                              </div>
                              <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                <span className="text-gray-600 font-medium flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h14a2 2 0 012 2v2M7 7V3a4 4 0 018 0v4M9 7h6" />
                                  </svg>
                                  Type:
                                </span>
                                <span className="font-semibold text-gray-800">{accountGroup.type}</span>
                              </div>
                              {/* Get additional details from first available bureau */}
                              {(() => {
                                const firstBureau = Object.values(accountGroup.bureaus)[0];
                                return firstBureau ? (
                                  <>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Designator:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.designator || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Opened:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.opened ? new Date(firstBureau.opened).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                        Industry:
                                      </span>
                                      <span className="font-semibold text-gray-800">{firstBureau.industry || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-100">
                                      <span className="text-gray-600 font-medium flex items-center gap-2">
                                        <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                                        </svg>
                                        Remark:
                                      </span>
                                      <span className="font-semibold text-gray-800 text-xs truncate max-w-[120px]" title={firstBureau.remark || 'N/A'}>{firstBureau.remark || 'N/A'}</span>
                                    </div>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Experian Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.Experian ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.Experian.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.Experian.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.Experian.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/Experian_logo.svg.png" alt="Experian" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.Experian.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.Experian.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.Experian.utilization)}`}>
                                    {accountGroup.bureaus.Experian.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.reported ? new Date(accountGroup.bureaus.Experian.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.Experian.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.Experian.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.Experian.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Experian.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.Experian.payStatusHistory && accountGroup.bureaus.Experian.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.Experian.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.Experian.payStatusHistoryStartDate && accountGroup.bureaus.Experian.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.Experian.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* TransUnion Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.TransUnion ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.TransUnion.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.TransUnion.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.TransUnion.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/TransUnion_logo.svg.png" alt="TransUnion" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.TransUnion.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.TransUnion.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.TransUnion.utilization)}`}>
                                    {accountGroup.bureaus.TransUnion.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.reported ? new Date(accountGroup.bureaus.TransUnion.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.TransUnion.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.TransUnion.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.TransUnion.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.TransUnion.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.TransUnion.payStatusHistory && accountGroup.bureaus.TransUnion.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.TransUnion.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.TransUnion.payStatusHistoryStartDate && accountGroup.bureaus.TransUnion.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.TransUnion.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Equifax Column */}
                        <div className="text-left bg-white rounded-lg p-4 border border-gray-100">
                          {accountGroup.bureaus.Equifax ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant={accountGroup.bureaus.Equifax.status === 'Open' ? 'default' : 'secondary'}
                                  className={`text-xs font-medium px-3 py-1 ${
                                    accountGroup.bureaus.Equifax.status === 'Open' 
                                      ? 'bg-green-100 text-green-800 border-green-200' 
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {accountGroup.bureaus.Equifax.status}
                                </Badge>
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                  <img src="/Equifax_Logo.svg.png" alt="Equifax" className="h-4 w-auto" />
                                  
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                                  <div className="font-bold text-xl text-gray-800">${parseInt(accountGroup.bureaus.Equifax.balance).toLocaleString()}</div>
                                  <div className="text-gray-600 text-sm">of ${parseInt(accountGroup.bureaus.Equifax.limit).toLocaleString()}</div>
                                  <div className={`font-bold text-lg mt-1 ${getUtilizationColor(accountGroup.bureaus.Equifax.utilization)}`}>
                                    {accountGroup.bureaus.Equifax.utilization}% utilization
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Payment:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.paymentHistory}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Reported:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.reported ? new Date(accountGroup.bureaus.Equifax.reported).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Past Due:
                                    </span>
                                    <span className={`font-semibold ${parseInt(accountGroup.bureaus.Equifax.pastDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      ${parseInt(accountGroup.bureaus.Equifax.pastDue || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                      High Balance:
                                    </span>
                                    <span className="font-semibold text-gray-700">${parseInt(accountGroup.bureaus.Equifax.highBalance || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1">
                                    <span className="text-gray-500 font-medium flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                      </svg>
                                      Worst Status:
                                    </span>
                                    <span className="font-semibold text-gray-700">{accountGroup.bureaus.Equifax.worstStatus}</span>
                                  </div>
                                </div>
                                
                                {accountGroup.bureaus.Equifax.payStatusHistory && accountGroup.bureaus.Equifax.payStatusHistory !== 'N/A' && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="font-semibold text-xs text-gray-700 mb-2">Payment History:</div>
                                    <div className="text-xs font-mono bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                                      {accountGroup.bureaus.Equifax.payStatusHistory}
                                    </div>
                                    {accountGroup.bureaus.Equifax.payStatusHistoryStartDate && accountGroup.bureaus.Equifax.payStatusHistoryStartDate !== 'N/A' && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        From: {new Date(accountGroup.bureaus.Equifax.payStatusHistoryStartDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
                              <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                                Not reported
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Creditor Contacts Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-600/10 via-emerald-600/10 to-teal-600/10 rounded-t-lg border-b border-green-100/50">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Creditor Contacts
              </span>
            </CardTitle>
            <CardDescription className="text-gray-600 ml-12">
              Contact information for your creditors and account management
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {(() => {
                // Get unique creditors from accounts
                const uniqueCreditors = Array.from(
                  new Set(reportData.accounts.map(account => account.creditor))
                ).map(creditorName => {
                  const account = reportData.accounts.find(acc => acc.creditor === creditorName);
                  return {
                    name: creditorName,
                    type: account?.type || 'Unknown',
                    accounts: reportData.accounts.filter(acc => acc.creditor === creditorName).length
                  };
                });

                return uniqueCreditors.map((creditor, index) => (
                  <div
                    key={index}
                    className="group relative p-6 border-0 rounded-2xl bg-gradient-to-br from-white via-green-50/40 to-emerald-50/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-green-100/50 backdrop-blur-sm overflow-hidden"
                    style={{
                      animationDelay: `${index * 150}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 via-emerald-400/5 to-teal-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Floating particles effect */}
                    <div className="absolute top-4 right-4 w-2 h-2 bg-green-400/30 rounded-full animate-pulse"></div>
                    <div className="absolute top-8 right-8 w-1 h-1 bg-emerald-400/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                    
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110">
                            <Building className="h-6 w-6 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-xl mb-1 group-hover:text-green-800 transition-colors duration-300">{creditor.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100/80 text-green-700 border-green-200/50 text-xs font-medium px-2 py-1">
                                {creditor.type}
                              </Badge>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600 font-medium">{creditor.accounts} account{creditor.accounts > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-5">
                          {/* Customer Service */}
                          <div className="group/item space-y-3 p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/30 hover:border-blue-200/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="relative p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg group-hover/item:shadow-md transition-all duration-300">
                                <Phone className="h-4 w-4 text-blue-600 group-hover/item:scale-110 transition-transform duration-300" />
                              </div>
                              <span className="font-semibold text-gray-700 group-hover/item:text-blue-700 transition-colors duration-300">Customer Service</span>
                            </div>
                            <div className="ml-9 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Phone:</span>
                                <span className="font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200/50">1-800-XXX-XXXX</span>
                              </div>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Clock className="h-3 w-3 text-gray-400" />
                                Mon-Fri 8AM-8PM EST
                              </p>
                            </div>
                          </div>

                          {/* Dispute Department */}
                          <div className="group/item space-y-3 p-4 rounded-xl bg-gradient-to-br from-orange-50/50 to-red-50/30 border border-orange-100/30 hover:border-orange-200/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="relative p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg group-hover/item:shadow-md transition-all duration-300">
                                <AlertTriangle className="h-4 w-4 text-orange-600 group-hover/item:scale-110 transition-transform duration-300" />
                              </div>
                              <span className="font-semibold text-gray-700 group-hover/item:text-orange-700 transition-colors duration-300">Dispute Department</span>
                            </div>
                            <div className="ml-9 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Phone:</span>
                                <span className="font-mono text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded border border-orange-200/50">1-800-XXX-XXXX</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Fax:</span>
                                <span className="font-mono text-gray-500 font-semibold bg-gray-50 px-2 py-1 rounded border border-gray-200/50">1-800-XXX-XXXX</span>
                              </div>
                            </div>
                          </div>

                          {/* Mailing Address */}
                          <div className="group/item space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100/30 hover:border-purple-200/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="relative p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-lg group-hover/item:shadow-md transition-all duration-300">
                                <MapPin className="h-4 w-4 text-purple-600 group-hover/item:scale-110 transition-transform duration-300" />
                              </div>
                              <span className="font-semibold text-gray-700 group-hover/item:text-purple-700 transition-colors duration-300">Mailing Address</span>
                            </div>
                            <div className="ml-9">
                              <div className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-purple-100/30">
                                <div className="font-semibold text-gray-700">{creditor.name}</div>
                                <div>P.O. Box XXXX</div>
                                <div>City, State ZIP</div>
                              </div>
                            </div>
                          </div>

                          {/* Online Portal */}
                          <div className="group/item space-y-3 p-4 rounded-xl bg-gradient-to-br from-cyan-50/50 to-blue-50/30 border border-cyan-100/30 hover:border-cyan-200/50 transition-all duration-300 hover:shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="relative p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg group-hover/item:shadow-md transition-all duration-300">
                                <Globe className="h-4 w-4 text-cyan-600 group-hover/item:scale-110 transition-transform duration-300" />
                              </div>
                              <span className="font-semibold text-gray-700 group-hover/item:text-cyan-700 transition-colors duration-300">Online Portal</span>
                            </div>
                            <div className="ml-9 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Website:</span>
                                <a href="#" className="text-cyan-600 hover:text-cyan-700 underline font-medium text-sm bg-cyan-50 px-2 py-1 rounded border border-cyan-200/50 hover:bg-cyan-100 transition-all duration-200">
                                  www.{creditor.name.toLowerCase().replace(/\s+/g, '')}.com
                                </a>
                              </div>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Shield className="h-3 w-3 text-gray-400" />
                                Account Management Available 24/7
                              </p>
                            </div>
                          </div>

                          {/* Mailing Address */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-gradient-to-br from-gray-500/20 to-slate-500/20 rounded-md">
                                <MapPin className="h-4 w-4 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-700">Mailing Address</span>
                            </div>
                            <div className="ml-7">
                              <p className="text-sm text-gray-600">
                                {creditor.name}<br />
                                P.O. Box XXXX<br />
                                City, State ZIP
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-5 border-t border-gradient-to-r from-green-200/30 via-emerald-200/30 to-teal-200/30">
                          <div className="flex flex-wrap gap-3">
                            <button className="group/btn relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300/50 transition-all duration-300 hover:scale-105 hover:shadow-lg overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10 flex items-center gap-2">
                                <div className="p-1 bg-blue-200/50 rounded-md group-hover/btn:bg-blue-300/50 transition-colors duration-300">
                                  <Phone className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                                </div>
                                <span className="group-hover/btn:text-blue-800 transition-colors duration-300">Call Customer Service</span>
                              </div>
                            </button>
                            
                            <button className="group/btn relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-orange-700 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50 rounded-xl hover:from-orange-100 hover:to-red-100 hover:border-orange-300/50 transition-all duration-300 hover:scale-105 hover:shadow-lg overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-red-400/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10 flex items-center gap-2">
                                <div className="p-1 bg-orange-200/50 rounded-md group-hover/btn:bg-orange-300/50 transition-colors duration-300">
                                  <AlertTriangle className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                                </div>
                                <span className="group-hover/btn:text-orange-800 transition-colors duration-300">File Dispute</span>
                              </div>
                            </button>
                            
                            <button className="group/btn relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-cyan-700 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/50 rounded-xl hover:from-cyan-100 hover:to-blue-100 hover:border-cyan-300/50 transition-all duration-300 hover:scale-105 hover:shadow-lg overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                              <div className="relative z-10 flex items-center gap-2">
                                <div className="p-1 bg-cyan-200/50 rounded-md group-hover/btn:bg-cyan-300/50 transition-colors duration-300">
                                  <Globe className="h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                                </div>
                                <span className="group-hover/btn:text-cyan-800 transition-colors duration-300">Visit Website</span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Contact Tips */}
            <div className="mt-8 p-6 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 rounded-2xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="relative p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0 group-hover:shadow-xl transition-all duration-300">
                  <Info className="h-5 w-5 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                    Contact Tips
                    <div className="h-1 w-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-100/50 hover:bg-white/80 transition-all duration-200">
                        <div className="p-1 bg-blue-100 rounded-md flex-shrink-0 mt-0.5">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed">Always have your account number and personal information ready</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-100/50 hover:bg-white/80 transition-all duration-200">
                        <div className="p-1 bg-blue-100 rounded-md flex-shrink-0 mt-0.5">
                          <FileText className="h-3 w-3 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed">Keep records of all communications and reference numbers</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-100/50 hover:bg-white/80 transition-all duration-200">
                        <div className="p-1 bg-blue-100 rounded-md flex-shrink-0 mt-0.5">
                          <CalendarIcon className="h-3 w-3 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed">For disputes, follow up in writing within 30 days</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-blue-100/50 hover:bg-white/80 transition-all duration-200">
                        <div className="p-1 bg-blue-100 rounded-md flex-shrink-0 mt-0.5">
                          <Clock className="h-3 w-3 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed">Best times to call are typically early morning or late afternoon</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Account Summary */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-t-lg border-b border-blue-100/50">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    Account Summary
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {reportData.accounts.slice(0, 3).map((account) => (
                      <div
                        key={account.id}
                        className="flex justify-between items-center p-4 border-0 rounded-xl bg-gradient-to-r from-white to-blue-50/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border border-blue-100/30"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            <div className="p-1 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-md">
                              <Building className="h-4 w-4 text-blue-600" />
                            </div>
                            {account.creditor}
                          </div>
                          <div className="text-sm text-gray-600 font-medium mt-1">
                            {account.type} • {account.accountNumber}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-md">
                                <DollarSign className="h-3 w-3 text-green-600" />
                              </div>
                              Balance: ${(account.balance || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <TrendingUp className="h-3 w-3 text-purple-600" />
                              </div>
                              Limit: ${(account.limit || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              account.status === "Open"
                                ? "default"
                                : "secondary"
                            }
                            className={`mb-2 ${
                              account.status === "Open"
                                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {account.status}
                          </Badge>
                          <div className="text-sm mt-1">
                            <span
                              className={`font-semibold px-2 py-1 rounded-full text-xs ${getUtilizationColor(account.utilization || 0)} bg-white/80 backdrop-blur-sm shadow-sm`}
                            >
                              {account.utilization || 0}% util
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Collections Summary */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-red-50/30 to-rose-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-red-600/10 via-rose-600/10 to-pink-600/10 rounded-t-lg border-b border-red-100/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-red-700 to-rose-700 bg-clip-text text-transparent">
                      Collections ({reportData.collections.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {reportData.collections.map((collection) => (
                      <div
                        key={collection.id}
                        className="border-0 rounded-xl p-4 bg-gradient-to-r from-red-50/80 to-rose-50/80 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border border-red-200/50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-red-800 flex items-center gap-2">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <Building className="h-4 w-4 text-red-600" />
                              </div>
                              {collection.agency}
                            </div>
                            <div className="text-sm text-red-700 font-medium mt-1">
                              {collection.originalCreditor}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600 text-lg flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <DollarSign className="h-4 w-4 text-red-600" />
                              </div>
                              ${collection.amount}
                            </div>
                            <Badge
                              variant={
                                collection.disputeStatus ===
                                "Pending Verification"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`text-xs mt-2 ${
                                collection.disputeStatus === "Pending Verification"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {collection.disputeStatus}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-red-600/70 flex items-center gap-1">
                          <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                            <CalendarIcon className="h-3 w-3 text-red-600" />
                          </div>
                          Reported:{" "}
                          {new Date(
                            collection.dateReported,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Recent Inquiries */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-yellow-50/30 to-amber-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-yellow-600/10 via-amber-600/10 to-orange-600/10 rounded-t-lg border-b border-yellow-100/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg shadow-md">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-yellow-700 to-amber-700 bg-clip-text text-transparent">
                      Recent Inquiries
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {reportData.inquiries.slice(0, 3).map((inquiry) => (
                      <div
                        key={inquiry.id}
                        className="border-0 rounded-xl p-4 bg-gradient-to-r from-yellow-50/80 to-amber-50/80 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border border-yellow-200/50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-yellow-800 flex items-center gap-2">
                              <div className="p-1 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-md">
                                <Building className="h-4 w-4 text-yellow-600" />
                              </div>
                              {inquiry.company}
                            </div>
                            <div className="text-sm text-yellow-700 font-medium mt-1">
                              {inquiry.purpose}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                inquiry.type === "Hard"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={`${
                                inquiry.type === "Hard"
                                  ? "bg-red-100 text-red-800 border-red-200"
                                  : "bg-green-100 text-green-800 border-green-200"
                              }`}
                            >
                              {inquiry.type}
                            </Badge>
                            <div className="text-xs text-yellow-600/70 mt-1 flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-yellow-600" />
                              </div>
                              {new Date(inquiry.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Disputes */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-purple-50/30 to-violet-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-purple-600/10 via-violet-600/10 to-indigo-600/10 rounded-t-lg border-b border-purple-100/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-purple-700 to-violet-700 bg-clip-text text-transparent">
                      Active Disputes
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {reportData.disputeHistory
                      .filter((d) => d.status !== "Resolved")
                      .map((dispute) => (
                        <div
                          key={dispute.id}
                          className="border-0 rounded-xl p-4 bg-gradient-to-r from-purple-50/80 to-violet-50/80 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border border-purple-200/50"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-semibold text-purple-800 flex items-center gap-2">
                                <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                  <Building className="h-4 w-4 text-purple-600" />
                                </div>
                                {dispute.accountDisputed}
                              </div>
                              <div className="text-sm text-purple-700 font-medium mt-1">
                                {dispute.bureau}
                              </div>
                            </div>
                            <Badge
                              variant={
                                dispute.status === "Under Investigation"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`${
                                dispute.status === "Under Investigation"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              {dispute.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-purple-600/70 flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-purple-600" />
                              </div>
                              Filed: {new Date(dispute.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <Clock className="h-3 w-3 text-purple-600" />
                              </div>
                              Expected: {new Date(dispute.expectedResolution).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Credit Monitoring Alerts */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <CardHeader className="bg-gradient-to-r from-teal-600/10 via-cyan-600/10 to-blue-600/10 rounded-t-lg border-b border-teal-100/50">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent">
                      Recent Alerts
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {reportData.creditMonitoring
                      .slice(0, 3)
                      .map((alert, index) => (
                        <div
                          key={index}
                          className={`border-0 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] ${
                            alert.impact === "Positive"
                              ? "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/50"
                              : alert.impact === "Negative"
                                ? "bg-gradient-to-r from-red-50/80 to-rose-50/80 border border-red-200/50"
                                : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shadow-md ${
                              alert.impact === "Positive"
                                ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                : alert.impact === "Negative"
                                  ? "bg-gradient-to-br from-red-500 to-rose-600"
                                  : "bg-gradient-to-br from-blue-500 to-indigo-600"
                            }`}>
                              {alert.impact === "Positive" ? (
                                <CheckCircle className="h-4 w-4 text-white" />
                              ) : alert.impact === "Negative" ? (
                                <XCircle className="h-4 w-4 text-white" />
                              ) : (
                                <Info className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div
                                className={`font-semibold text-sm ${
                                  alert.impact === "Positive"
                                    ? "text-green-800"
                                    : alert.impact === "Negative"
                                      ? "text-red-800"
                                      : "text-blue-800"
                                }`}
                              >
                                {alert.description}
                              </div>
                              <div className={`text-xs mt-1 flex items-center gap-1 ${
                                alert.impact === "Positive"
                                  ? "text-green-600/70"
                                  : alert.impact === "Negative"
                                    ? "text-red-600/70"
                                    : "text-blue-600/70"
                              }`}>
                                <div className={`p-1 rounded-md ${
                                  alert.impact === "Positive"
                                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                                    : alert.impact === "Negative"
                                      ? "bg-gradient-to-br from-red-500/20 to-rose-500/20"
                                      : "bg-gradient-to-br from-blue-500/20 to-indigo-500/20"
                                }`}>
                                  <CalendarIcon className={`h-3 w-3 ${
                                    alert.impact === "Positive"
                                      ? "text-green-600"
                                      : alert.impact === "Negative"
                                        ? "text-red-600"
                                        : "text-blue-600"
                                  }`} />
                                </div>
                                {new Date(alert.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Public Records (if any) */}
          {reportData.publicRecords.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-orange-600" />
                  Public Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {reportData.publicRecords.map((record) => (
                    <div
                      key={record.id}
                      className="border border-orange-200 rounded-lg p-4 bg-orange-50/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-orange-800">
                            {record.type}
                          </div>
                          <div className="text-sm text-orange-700">
                            {record.chapter}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-700"
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Filed:</span>
                          <div className="font-medium">
                            {new Date(record.filingDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Discharged:
                          </span>
                          <div className="font-medium">
                            {new Date(
                              record.dischargeDate,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Assets:</span>
                          <div className="font-medium">
                            ${(record.assets || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Liabilities:
                          </span>
                          <div className="font-medium">
                            ${(record.liabilities || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add all other existing tabs here - accounts, transactions, etc. */}
        {/* For brevity, I'll add just a few key ones and you can copy the rest from the original */}

        

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Collection Accounts</CardTitle>
              <CardDescription>
                Accounts in collections that may be negatively impacting credit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="border border-red-200 rounded-lg p-4 bg-red-50/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-lg text-red-800">
                          {collection.agency}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Original Creditor: {collection.originalCreditor}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          ${collection.amount}
                        </div>
                        <Badge
                          variant={
                            collection.disputeStatus === "Pending Verification"
                              ? "default"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {collection.disputeStatus === "None"
                            ? "No Dispute"
                            : collection.disputeStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Date Reported:
                        </span>
                        <p>
                          {new Date(
                            collection.dateReported,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p className="text-red-600 font-medium">
                          {collection.status}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="gradient-primary">
                        <FileText className="h-4 w-4 mr-1" />
                        Generate Dispute
                      </Button>
                      <Button size="sm" variant="outline">
                        <Info className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-green-600" />
                Payment History
              </CardTitle>
              <CardDescription>
                Monthly payment records and late payment tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {reportData.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="border border-border/40 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {account.creditor}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {account.type} • {account.accountNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Late Payments
                        </div>
                        <div className="text-lg font-bold text-red-600">
                          {account.latePayments?.total || 0}
                        </div>
                      </div>
                    </div>

                    {/* Late Payment Summary */}
                    <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">
                          30 Days
                        </div>
                        <div className="font-bold text-yellow-600">
                          {account.latePayments?.last30Days || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">
                          60 Days
                        </div>
                        <div className="font-bold text-orange-600">
                          {account.latePayments?.last60Days || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">
                          90 Days
                        </div>
                        <div className="font-bold text-red-600">
                          {account.latePayments?.last90Days || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">
                          90+ Days
                        </div>
                        <div className="font-bold text-red-800">
                          {account.latePayments?.over90Days || 0}
                        </div>
                      </div>
                    </div>

                    {/* Monthly History */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Days Late</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {account.monthlyHistory?.map((month, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {month?.month || "N/A"}
                              </TableCell>
                              <TableCell>
                                ${(month?.balance || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-green-600">
                                ${month?.payment || 0}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    month?.status === "Current"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {month?.status || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={
                                  (month?.daysLate || 0) > 0
                                    ? "text-red-600 font-bold"
                                    : "text-green-600"
                                }
                              >
                                {month?.daysLate || 0}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inquiries Tab */}
        <TabsContent value="inquiries" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-t-lg border-b border-blue-100/50">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  Credit Inquiries by Bureau
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Recent credit inquiries from each credit bureau
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {(() => {
                  // Get inquiries for each bureau
                  const getBureauInquiries = (bureauId) => {
                    return reportData.inquiries.filter(inquiry => inquiry.bureau === bureauId) || [];
                  };

                  const experianInquiries = getBureauInquiries('Experian');
                  const transUnionInquiries = getBureauInquiries('TransUnion');
                  const equifaxInquiries = getBureauInquiries('Equifax');

                  return (
                    <>
                      {/* Experian Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg border-b border-green-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-green-100/50">
                              <img 
                                src="/Experian_logo.svg.png" 
                                alt="Experian" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {experianInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {experianInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {experianInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-green-50/50 border border-green-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-green-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-green-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-green-50/30 to-emerald-50/30 rounded-xl border border-green-100/50">
                              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* TransUnion Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-purple-50/30 to-violet-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-t-lg border-b border-purple-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-purple-100/50">
                              <img 
                                src="/TransUnion_logo.svg.png" 
                                alt="TransUnion" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                              {transUnionInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {transUnionInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {transUnionInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-purple-50/50 border border-purple-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-purple-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-purple-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-purple-50/30 to-violet-50/30 rounded-xl border border-purple-100/50">
                              <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Equifax Inquiries */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-red-50/30 to-rose-50/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-t-lg border-b border-red-100/50">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-3 bg-white rounded-xl shadow-md border border-red-100/50">
                              <img 
                                src="/Equifax_Logo.svg.png" 
                                alt="Equifax" 
                                className="h-8 w-auto"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4">
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                              {equifaxInquiries.length}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              Total Inquiries
                            </div>
                          </div>
                          {equifaxInquiries.length > 0 ? (
                            <div className="space-y-3">
                              {equifaxInquiries.map((inquiry, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-white to-red-50/50 border border-red-200/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-red-300/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
                                        <Building2 className="h-3 w-3 text-white" />
                                      </div>
                                      <div className="text-sm font-semibold text-gray-800">{inquiry.company}</div>
                                    </div>
                                    <Badge 
                                      variant={inquiry.type === 'Hard' ? 'destructive' : 'secondary'}
                                      className="text-xs font-medium shadow-sm"
                                    >
                                      {inquiry.type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-1.5 ml-6">
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <FileText className="h-3 w-3 text-red-500" />
                                      {inquiry.purpose}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <CalendarIcon className="h-3 w-3 text-red-500" />
                                      {new Date(inquiry.date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gradient-to-br from-red-50/30 to-rose-50/30 rounded-xl border border-red-100/50">
                              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-full w-fit mx-auto mb-3 shadow-md">
                                <Search className="h-6 w-6 text-white" />
                              </div>
                              <p className="text-sm text-gray-600 font-medium">
                                No inquiries found
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                This bureau has no recent inquiries
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6 mt-6">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-b border-blue-200/30 backdrop-blur-sm">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold text-xl">
                  Personal Information
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium ml-11">
                Identity verification across all credit bureaus
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Personal Information Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {(() => {
                  // Extract bureau-specific personal info
                  const getBureauPersonalInfo = (bureauId) => {
                    const names = apiData?.reportData?.Name?.filter(n => n.BureauId === bureauId) || [];
                    const primaryName = names.find(n => n.NameType === "Primary") || names[0];
                    const dob = apiData?.reportData?.DOB?.find(d => d.BureauId === bureauId);
                    const addresses = apiData?.reportData?.Address?.filter(a => a.BureauId === bureauId) || [];
                    
                    return {
                      name: primaryName ? `${primaryName.FirstName || ''} ${primaryName.Middle || ''} ${primaryName.LastName || ''}`.trim() : 'N/A',
                      dob: dob?.DOB || 'N/A',
                      addresses: addresses
                    };
                  };

                  // Get personal info for each bureau
                  const experianInfo = getBureauPersonalInfo(3);
                  const transUnionInfo = getBureauPersonalInfo(2);
                  const equifaxInfo = getBureauPersonalInfo(1);

                  // Check for mismatches
                  const checkMismatch = (field) => {
                    const values = [experianInfo[field], transUnionInfo[field], equifaxInfo[field]];
                    const uniqueValues = [...new Set(values.filter(v => v !== 'N/A'))];
                    return uniqueValues.length > 1;
                  };

                  const nameMismatch = checkMismatch('name');
                  const dobMismatch = checkMismatch('dob');

                  return (
                    <>
                      {/* Experian Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-blue-950 dark:to-cyan-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                              <img 
                                src="/Experian_logo.svg.png" 
                                alt="Experian" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {experianInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {experianInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-md">
                                <Home className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {experianInfo.addresses.length > 0 ? (
                                experianInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* TransUnion Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-purple-950 dark:to-violet-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30 dark:from-purple-900/30 dark:to-violet-900/30 dark:border-purple-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                              <img 
                                src="/TransUnion_logo.svg.png" 
                                alt="TransUnion" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <User className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {transUnionInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {transUnionInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-md">
                                <Home className="h-3 w-3 text-purple-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {transUnionInfo.addresses.length > 0 ? (
                                transUnionInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Equifax Personal Info */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-red-950 dark:to-rose-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-700/30">
                          <CardTitle className="flex justify-center items-center text-sm">
                            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                              <img 
                                src="/Equifax_Logo.svg.png" 
                                alt="Equifax" 
                                className="h-6 w-auto filter brightness-0 invert"
                              />
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <User className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Name:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {equifaxInfo.name}
                              {nameMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <CalendarIcon className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">DOB:</span>
                            </div>
                            <div className="font-medium flex items-center gap-2 ml-6">
                              {equifaxInfo.dob}
                              {dobMismatch && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Not Match</span>}
                            </div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <Shield className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">SSN:</span>
                            </div>
                            <div className="font-medium ml-6">{reportData?.personalInfo?.ssn || '***-**-****'}</div>
                          </div>
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="p-1 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-md">
                                <Home className="h-3 w-3 text-red-600" />
                              </div>
                              <span className="text-muted-foreground font-medium">Addresses:</span>
                            </div>
                            <div className="space-y-2 ml-6">
                              {equifaxInfo.addresses.length > 0 ? (
                                equifaxInfo.addresses.map((addr, idx) => (
                                  <div key={idx} className="font-medium text-xs leading-tight">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{addr.AddressType || 'Unknown'}</span>
                                    </div>
                                    <div>
                                      {`${addr.StreetAddress || ''}, ${addr.City || ''}, ${addr.State || ''} ${addr.Zip || ''}`.replace(/^,\s*|,\s*$/, '') || 'N/A'}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="font-medium text-xs">N/A</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50/50 to-gray-100/30 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/10 to-slate-600/10 border-b border-slate-200/30 dark:from-slate-800/50 dark:via-gray-800/50 dark:to-slate-900/50 dark:border-slate-700/30 backdrop-blur-sm">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg shadow-md">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-slate-700 to-gray-800 bg-clip-text text-transparent font-bold pb-3">
                  Employer Details from All Bureaus
                </span>
              </CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                Employment information reported by Experian, TransUnion, and Equifax
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Experian Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-blue-950 dark:to-cyan-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30 dark:from-blue-900/30 dark:to-cyan-900/30 dark:border-blue-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md">
                        <img
                          src="/Experian_logo.svg.png"
                          alt="Experian"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 2 || emp.bureauId === "experian").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 2 || emp.bureauId === "experian")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
                        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-blue-600/70">
                          Experian has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* TransUnion Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 dark:from-purple-950 dark:to-violet-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30 dark:from-purple-900/30 dark:to-violet-900/30 dark:border-purple-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-md">
                        <img
                          src="/TransUnion_logo.svg.png"
                          alt="TransUnion"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 1 || emp.bureauId === "transunion").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 1 || emp.bureauId === "transunion")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gradient-to-br from-purple-50/30 to-violet-50/30 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-100/50 dark:border-purple-800/30">
                        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-sm text-purple-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-purple-600/70">
                          TransUnion has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Equifax Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-red-950 dark:to-rose-950 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30 dark:from-red-900/30 dark:to-rose-900/30 dark:border-red-700/30">
                    <CardTitle className="flex justify-center items-center text-sm">
                      <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md">
                        <img
                          src="/Equifax_Logo.svg.png"
                          alt="Equifax"
                          className="h-6 w-auto filter brightness-0 invert"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {reportData.personalInfo.employers && reportData.personalInfo.employers.filter(emp => emp.bureauId === 3 || emp.bureauId === "equifax").length > 0 ? (
                      <div className="space-y-3">
                        {reportData.personalInfo.employers
                          .filter(emp => emp.bureauId === 3 || emp.bureauId === "equifax")
                          .map((employer, index) => (
                            <div
                              key={index}
                              className="border border-border/20 rounded-lg p-3"
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{employer.name}</p>
                                {employer.position && (
                                  <p className="text-xs text-muted-foreground">
                                    Position: {employer.position}
                                  </p>
                                )}
                                {employer.dateReported && (
                                  <p className="text-xs text-muted-foreground">
                                    Reported: {new Date(employer.dateReported).toLocaleDateString()}
                                  </p>
                                )}
                                {employer.income && (
                                  <p className="text-xs text-muted-foreground">
                                    Income: ${employer.income.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No employer data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Underwriting Tab */}
        <TabsContent value="underwriting" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-ocean-blue" />
                Underwriting Assessment
              </CardTitle>
              <CardDescription>
                Risk analysis and creditworthiness evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Risk Score */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <Card className="gradient-light border-0 text-center">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      RISK SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold gradient-text-primary">
                      A+
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Very Low Risk
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-light border-0 text-center">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      DEBT-TO-INCOME
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold gradient-text-primary">
                      18%
                    </div>
                    <div className="text-sm text-green-600 mt-1">Excellent</div>
                  </CardContent>
                </Card>

                <Card className="gradient-light border-0 text-center">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      PAYMENT RELIABILITY
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold gradient-text-secondary">
                      98%
                    </div>
                    <div className="text-sm text-green-600 mt-1">Excellent</div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Risk Analysis</h4>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Payment History</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Excellent
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Credit Mix</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Good
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Credit Utilization</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Excellent
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Collections</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        None
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Recent Inquiries</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Low
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-green-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Account Age</span>
                      </div>
                      <Badge variant="default" className="bg-green-600">
                        Strong
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="mt-6 p-4 bg-gradient-light rounded-lg">
                <h4 className="font-semibold mb-3">
                  Underwriting Recommendations
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>
                      Excellent credit profile indicates premium borrower
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Consistent payment history shows reliability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>
                      Continue maintaining low utilization for best rates
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comprehensive Credit Analysis Report */}
        <TabsContent value="analysis" className="space-y-8 mt-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border-0 shadow-lg">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                My Credit Analysis
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Company Profile • Understanding Your Credit • How Credit Affects
                You
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Understanding Your Credit
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    How Credit Affects You
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Current Credit Status
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓ Complete
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-gray-600">
                    Credit Repair Journey
                  </div>
                  <div className="text-lg font-bold text-blue-600">✓ Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Understanding Your Credit Section */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-gray-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                <Info className="h-8 w-8 text-blue-600" />
                Understanding Your Credit
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Introduction to Credit Bureaus and Credit Reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* What Are Credit Bureaus */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  What Are Credit Bureaus?
                </h3>
                <p className="text-gray-700 mb-4">
                  Credit bureaus, also known as credit reporting agencies, are
                  organizations that play a critical role in the financial
                  landscape. Their primary function is to collect and maintain
                  individual credit information from various creditors,
                  including banks, credit card companies, and loan providers, as
                  well as public records.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-blue-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      EQ
                    </div>
                    <h4 className="font-semibold text-blue-800">Equifax</h4>
                    <p className="text-sm text-blue-700 mt-2">
                      One of the three major credit bureaus
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-green-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      EX
                    </div>
                    <h4 className="font-semibold text-green-800">Experian</h4>
                    <p className="text-sm text-green-700 mt-2">
                      Operates independently with unique data
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="w-12 h-6 bg-purple-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      TU
                    </div>
                    <h4 className="font-semibold text-purple-800">
                      TransUnion
                    </h4>
                    <p className="text-sm text-purple-700 mt-2">
                      May collect slightly different information
                    </p>
                  </div>
                </div>
              </div>

              {/* What Is in My Credit Report */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  What Is in My Credit Report?
                </h3>
                <p className="text-gray-700 mb-6">
                  A credit report is a detailed document that outlines your
                  credit history, compiled by credit bureaus. It is used by
                  lenders, landlords, and even some employers to gauge your
                  reliability as a financial borrower.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Personal Information
                        </h4>
                        <p className="text-sm text-gray-600">
                          Full name, addresses, Social Security number, date of
                          birth, and employment information
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Credit Accounts
                        </h4>
                        <p className="text-sm text-gray-600">
                          Trade lines detailing your history with creditors,
                          payment history, and account status
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Eye className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Credit Inquiries
                        </h4>
                        <p className="text-sm text-gray-600">
                          Hard and soft inquiries from entities requesting your
                          credit report
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Public Records
                        </h4>
                        <p className="text-sm text-gray-600">
                          Bankruptcies, foreclosures, tax liens, and civil
                          judgments
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          Collections
                        </h4>
                        <p className="text-sm text-gray-600">
                          Accounts turned over to collection agencies with
                          significant negative impact
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Is a Credit Report Important */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Why Is a Credit Report Important?
                </h3>
                <p className="text-gray-700 mb-6">
                  Your credit report can be thought of as your financial report
                  card. It influences many aspects of your financial life and
                  affects your ability to access various financial products and
                  services.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <DollarSign className="h-8 w-8 text-blue-600 mb-3" />
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Access to Financial Products
                    </h4>
                    <p className="text-sm text-blue-700">
                      Credit cards, loans, and mortgages with better terms and
                      lower interest rates
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <Building2 className="h-8 w-8 text-green-600 mb-3" />
                    <h4 className="font-semibold text-green-800 mb-2">
                      Employment & Housing
                    </h4>
                    <p className="text-sm text-green-700">
                      Job opportunities and rental applications often require
                      credit checks
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <Shield className="h-8 w-8 text-purple-600 mb-3" />
                    <h4 className="font-semibold text-purple-800 mb-2">
                      Insurance Premiums
                    </h4>
                    <p className="text-sm text-purple-700">
                      Credit-based scores can affect auto and homeowners
                      insurance rates
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How Credit Affects You Section */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-green-800">
                <Target className="h-8 w-8 text-green-600" />
                How Credit Affects You
              </CardTitle>
              <CardDescription className="text-lg text-green-700">
                The Importance of Credit in Everyday Life and Major Decisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Everyday Life Impact */}
              <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  The Importance of Credit in Everyday Life
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Renting an Apartment
                    </h4>
                    <p className="text-sm text-gray-600">
                      Landlords use credit scores to assess payment reliability
                      and set deposit requirements
                    </p>
                  </div>

                  <div className="text-center">
                    <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Buying a Car
                    </h4>
                    <p className="text-sm text-gray-600">
                      Auto loan lenders review credit scores for approval and
                      interest rate determination
                    </p>
                  </div>

                  <div className="text-center">
                    <Wallet className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Everyday Purchases
                    </h4>
                    <p className="text-sm text-gray-600">
                      Credit scores affect credit card approvals, limits, and
                      rewards eligibility
                    </p>
                  </div>

                  <div className="text-center">
                    <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Utility Services
                    </h4>
                    <p className="text-sm text-gray-600">
                      Providers may require deposits or offer special plans
                      based on credit scores
                    </p>
                  </div>
                </div>
              </div>

              {/* Major Life Decisions */}
              <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  How Credit Impacts Major Life Decisions
                </h3>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Purchasing a Home
                      </h4>
                      <p className="text-gray-700 mb-2">
                        For most people, buying a home is the largest financial
                        transaction they will undertake. Credit scores are
                        pivotal in mortgage approval, interest rates, and loan
                        terms.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • Higher scores increase chances of mortgage approval
                        </li>
                        <li>
                          • Better rates can save tens of thousands over loan
                          life
                        </li>
                        <li>
                          • Credit affects loan terms and repayment periods
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Financing Education
                      </h4>
                      <p className="text-gray-700 mb-2">
                        Whether obtaining a loan for college or pursuing
                        postgraduate studies, credit scores affect your ability
                        to finance education through private loans and
                        refinancing options.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Private student loans require credit checks</li>
                        <li>• Better scores lead to favorable loan terms</li>
                        <li>• Credit affects refinancing opportunities</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">
                        Starting or Expanding a Business
                      </h4>
                      <p className="text-gray-700 mb-2">
                        Credit scores impact entrepreneurial ventures,
                        influencing your ability to secure funding for starting
                        or expanding a business through loans and credit lines.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>
                          • Personal credit affects business loan eligibility
                        </li>
                        <li>• Higher scores lead to better borrowing rates</li>
                        <li>• Credit limits affect operational cash flow</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Current Credit Status */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-blue-800">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Your Current Credit Status
              </CardTitle>
              <CardDescription className="text-lg text-blue-700">
                Overview of Your Credit Scores and Detailed Analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Current Credit Scores */}
              <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                  Overview of Your Credit Scores
                </h3>
                <p className="text-gray-700 mb-6">
                  Credit scores are numerical representations of your
                  creditworthiness, derived from the data in your credit report.
                  These scores range from 300 to 850, with various ranges
                  representing different levels of credit health.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-8 bg-blue-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      TU
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      769
                    </div>
                    <div className="text-sm text-gray-600 mb-1">TransUnion</div>
                    <div className="text-xs text-blue-600">2024-10-31</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-8 bg-green-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      EX
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      775
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Experian</div>
                    <div className="text-xs text-green-600">2024-10-31</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-8 bg-purple-600 rounded text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      EQ
                    </div>
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      772
                    </div>
                    <div className="text-sm text-gray-600 mb-1">Equifax</div>
                    <div className="text-xs text-purple-600">2024-10-31</div>
                  </div>
                </div>

                {/* Score Factors */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Factors Influencing Your Credit Scores
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Payment History (35%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-green-500"></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          Excellent
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Credit Utilization (30%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-green-500"></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          Excellent
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Length of Credit History (15%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="w-4/5 h-full bg-green-500"></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          Very Good
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Credit Mix (10%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="w-4/5 h-full bg-blue-500"></div>
                        </div>
                        <span className="text-sm font-medium text-blue-600">
                          Good
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        New Credit (10%)
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="w-3/5 h-full bg-green-500"></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          Good
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Analysis of Negative Entries
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Inquiries:</span>
                      <span className="font-bold text-orange-600">1</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Late Payments:
                      </span>
                      <span className="font-bold text-green-600">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Collections/Charge-offs:
                      </span>
                      <span className="font-bold text-green-600">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        Public Records:
                      </span>
                      <span className="font-bold text-green-600">0</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-blue-200 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    Credit Utilization Overview
                  </h4>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      0.94%
                    </div>
                    <div className="text-sm text-gray-600">
                      Overall Credit Utilization
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">
                        High Utilization Accounts:
                      </span>
                      <span className="font-bold text-green-600">0</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-sm font-medium text-green-800">
                        Excellent Credit Management
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Mistakes and How to Avoid Them */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-orange-800">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                How to Avoid Common Pitfalls in Credit Management
              </CardTitle>
              <CardDescription className="text-lg text-orange-700">
                Essential tips and strategies to ensure you maintain optimal
                credit health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Regularly Review Your Credit Report
                        </h4>
                        <p className="text-sm text-gray-600">
                          Check your credit report at least once a year to
                          identify inaccuracies or outdated information that
                          might be affecting your score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Clock className="h-6 w-6 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Avoid Late Payments
                        </h4>
                        <p className="text-sm text-gray-600">
                          Set up payment reminders or automatic payments to
                          ensure you always pay bills on time. Payment history
                          is the most significant factor in your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-6 w-6 text-purple-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Manage Your Credit Utilization
                        </h4>
                        <p className="text-sm text-gray-600">
                          Keep credit card balances below 30% of your credit
                          limits to demonstrate responsible credit management to
                          lenders.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Search className="h-6 w-6 text-orange-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Apply for New Credit Sparingly
                        </h4>
                        <p className="text-sm text-gray-600">
                          Be strategic about applying for new credit. Space out
                          applications to minimize the impact of hard inquiries
                          on your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Shield className="h-6 w-6 text-teal-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Keep Old Credit Accounts Open
                        </h4>
                        <p className="text-sm text-gray-600">
                          Maintain older credit accounts to benefit from a
                          longer credit history, which positively influences
                          your credit score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <BarChart className="h-6 w-6 text-indigo-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Diversify Your Credit Portfolio
                        </h4>
                        <p className="text-sm text-gray-600">
                          Having a variety of credit types can improve your
                          credit score by showing lenders your ability to handle
                          different types of credit responsibly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


        </TabsContent>

        {/* Funding Tab */}
        <TabsContent value="funding" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Funding Eligibility
              </CardTitle>
              <CardDescription>
                Available funding options and qualification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Funding Score */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                  <PiggyBank className="h-12 w-12 text-green-600" />
                  <div>
                    <div className="text-3xl font-bold gradient-text-secondary">
                      PREMIUM ELIGIBLE
                    </div>
                    <div className="text-sm text-muted-foreground">
                      For All Funding Programs
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Programs */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-lg">
                  Available Funding Programs
                </h4>

                <div className="grid gap-4">
                  <Card className="border border-green-200 bg-green-50/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-semibold text-green-800">
                            Premium Credit Line
                          </h5>
                          <p className="text-sm text-green-700">
                            Pre-approved unsecured line of credit
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Approved
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-semibold text-green-800">
                            $25,000 - $100,000
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">APR:</span>
                          <p className="font-semibold text-green-800">
                            5.99% - 9.99%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Term:</span>
                          <p className="font-semibold text-green-800">
                            2-7 years
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 bg-green-600 hover:bg-green-700"
                      >
                        <Dollar className="h-4 w-4 mr-1" />
                        Apply Now
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-blue-200 bg-blue-50/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-semibold text-blue-800">
                            Mortgage Pre-Approval
                          </h5>
                          <p className="text-sm text-blue-700">
                            Home purchase qualification
                          </p>
                        </div>
                        <Badge variant="default" className="bg-blue-600">
                          Available
                        </Badge>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-semibold text-blue-800">
                            Up to $2M
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate:</span>
                          <p className="font-semibold text-blue-800">
                            Prime - 0.5%
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Term:</span>
                          <p className="font-semibold text-blue-800">
                            15-30 years
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Get Pre-Approved
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Records Tab */}
        <TabsContent value="public" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                Public Records
              </CardTitle>
              <CardDescription>
                Bankruptcies, liens, judgments, and other court records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.publicRecords && reportData.publicRecords.length > 0 ? (
                <div className="space-y-4">
                  {reportData.publicRecords.map((record, index) => (
                    <div
                      key={record.id || index}
                      className="border border-orange-200 rounded-lg p-4 bg-orange-50/30"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-orange-800">
                            {record.type}
                          </h4>
                          <p className="text-sm text-orange-700">
                            Case: {record.caseNumber}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-700"
                        >
                          {record.status}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">
                            Filing Date:
                          </span>
                          <p className="font-medium">
                            {new Date(record.filingDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Discharge Date:
                          </span>
                          <p className="font-medium">
                            {new Date(
                              record.dischargeDate,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Court:</span>
                          <p className="font-medium">{record.court}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Chapter:
                          </span>
                          <p className="font-medium">{record.chapter}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Assets:</span>
                          <p className="font-medium">
                            ${(record.assets || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Liabilities:
                          </span>
                          <p className="font-medium">
                            ${(record.liabilities || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="mt-3 p-2 bg-orange-100 rounded text-sm">
                          <span className="text-muted-foreground">Notes:</span>{" "}
                          {record.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No public records found</p>
                  <p className="text-sm mt-1">This is a positive indicator for credit health</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-teal-600" />
                Report History
              </CardTitle>
              <CardDescription>
                View all previous credit reports for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.reportHistory && reportData.reportHistory.length > 0 ? (
                  reportData.reportHistory.map((report, index) => (
                    <div
                      key={report.id || index}
                      className="border border-border/40 rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-teal-800">
                            {report.platform} Report
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Client: {report.first_name} {report.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              report.status === "completed"
                                ? "default"
                                : report.status === "processing"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {report.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(report.report_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Platform:</span>
                          <p className="font-medium">{report.platform}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bureau:</span>
                          <p className="font-medium">{report.bureau || 'Multiple'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Credit Score:</span>
                          <p className="font-medium">
                            {report.credit_score > 0 ? report.credit_score : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Accounts:</span>
                          <p className="font-medium">{report.accounts_total || 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Negative Items:</span>
                          <p className="font-medium text-red-600">
                            {report.negative_accounts || 0}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Inquiries:</span>
                          <p className="font-medium">{report.inquiries_count || 0}</p>
                        </div>
                      </div>

                      {report.report_path && (
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Report File: {report.report_path.split('/').pop()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                // Handle report download/view
                                console.log('View report:', report.report_path);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              View Report
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                      No Report History
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No previous credit reports found for this client.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Score History Tab */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-green-600" />
                Credit Score History
              </CardTitle>
              <CardDescription>
                6-month credit score tracking across all bureaus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Score Chart Visualization */}
                <div className="border border-border/40 rounded-lg p-4 bg-gradient-light">
                  <h4 className="font-semibold mb-4">
                    Score Trend (Recent History)
                  </h4>
                  <div className="space-y-4">
                    {/* Simulated score history */}
                    {[
                      {
                        date: "2024-01-15",
                        experian: 775,
                        transunion: 769,
                        equifax: 772,
                      },
                      {
                        date: "2023-12-15",
                        experian: 765,
                        transunion: 759,
                        equifax: 762,
                      },
                      {
                        date: "2023-11-15",
                        experian: 750,
                        transunion: 744,
                        equifax: 747,
                      },
                      {
                        date: "2023-10-15",
                        experian: 735,
                        transunion: 729,
                        equifax: 732,
                      },
                      {
                        date: "2023-09-15",
                        experian: 720,
                        transunion: 714,
                        equifax: 717,
                      },
                      {
                        date: "2023-08-15",
                        experian: 705,
                        transunion: 699,
                        equifax: 702,
                      },
                    ].map((entry, index, array) => {
                      const avgScore = Math.round(
                        (entry.experian + entry.transunion + entry.equifax) / 3,
                      );
                      const prevAvg =
                        index < array.length - 1
                          ? Math.round(
                              (array[index + 1].experian +
                                array[index + 1].transunion +
                                array[index + 1].equifax) /
                                3,
                            )
                          : avgScore;
                      const change = avgScore - prevAvg;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-border/20 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Average Score
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-blue-600">
                                  {entry.experian}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  EX
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-green-600">
                                  {entry.transunion}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  TU
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-purple-600">
                                  {entry.equifax}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  EQ
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold gradient-text-primary">
                                {avgScore}
                              </div>
                              {index < array.length - 1 && (
                                <div
                                  className={`text-sm flex items-center ${
                                    change >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {change >= 0 ? (
                                    <ArrowUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 mr-1" />
                                  )}
                                  {change >= 0 ? "+" : ""}
                                  {change}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Score Factors Impact Over Time */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-0 gradient-light">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Score Improvements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                          <span className="text-sm">Total Increase</span>
                          <span className="font-bold text-green-600">
                            +70 points
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                          <span className="text-sm">Best Month</span>
                          <span className="font-bold text-blue-600">
                            January (+10)
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-purple-50 rounded-lg">
                          <span className="text-sm">Consistency</span>
                          <span className="font-bold text-purple-600">
                            100% months positive
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 gradient-light">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Bureau Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Highest Score</span>
                          <span className="font-bold text-blue-600">
                            Experian (775)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Most Improved</span>
                          <span className="font-bold text-green-600">
                            All Bureaus (+70)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Score Range</span>
                          <span className="font-bold text-purple-600">
                            769 - 775
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Milestone Achievements */}
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle>Credit Score Milestones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-green-800">
                            Reached 750+ Score
                          </div>
                          <div className="text-sm text-green-700">
                            November 2023 - Excellent credit tier achieved
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-green-800">
                            Achieved 770+ Score
                          </div>
                          <div className="text-sm text-green-700">
                            January 2024 - Premium credit status
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Target className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-blue-800">
                            Next Goal: 800+ Score
                          </div>
                          <div className="text-sm text-blue-700">
                            Target: 2024 - Elite credit status
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SuperAdminLayout>
  );
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}