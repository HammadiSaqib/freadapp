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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import EliteReports from "@/components/EliteReports";
import { useState, useEffect } from "react";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import { useNavigate } from "react-router-dom";
import { creditReportScraperApi, clientsApi, apiRequest, contractsApi } from "@/lib/api";
import { copyClientEnrollmentCheckoutLink, isClientPlanPaymentRequired } from "@/lib/clientEnrollment";
import {
  closeReportPullLoading,
  openReportPullLoading,
  runWithReportPullFeedback,
  showReportPullError,
} from "@/lib/reportPullFeedback";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/hooks/usePagePermissions";
// Import formatters from utils if needed for other components
// import { formatCreditScore, formatAccountCount } from "@/utils/creditReportFormatter";
import {
  FileText,
  Search,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Building,
  Users,
  Filter,
  Eye,
  EyeOff,
  BarChart3,
  Target,
  Award,
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
} from "lucide-react";

// Comprehensive credit report data structure
const creditReports = [
  {
    id: 1,
    clientName: "Sarah Johnson",
    clientId: 1,
    reportDate: "2024-01-15",
    bureau: "Experian",
    scores: {
      experian: 650,
      transunion: 645,
      equifax: 655,
    },
    previousScores: {
      experian: 580,
      transunion: 575,
      equifax: 585,
    },
    accounts: 12,
    collections: 3,
    inquiries: 8,
    status: "recent",
    scoreHistory: [
      { date: "2024-01-15", experian: 650, transunion: 645, equifax: 655 },
      { date: "2023-12-15", experian: 635, transunion: 630, equifax: 640 },
      { date: "2023-11-15", experian: 620, transunion: 615, equifax: 625 },
      { date: "2023-10-15", experian: 605, transunion: 600, equifax: 610 },
      { date: "2023-09-15", experian: 590, transunion: 585, equifax: 595 },
      { date: "2023-08-15", experian: 580, transunion: 575, equifax: 585 },
    ],
    personalInfo: {
      fullName: "Sarah Elizabeth Johnson",
      ssn: "***-**-4567",
      dateOfBirth: "03/15/1988",
      currentAddress: {
        street: "1234 Maple Street",
        city: "Boston",
        state: "MA",
        zipCode: "02101",
        dateReported: "2023-01-15",
      },
      previousAddresses: [
        {
          street: "5678 Oak Avenue",
          city: "Cambridge",
          state: "MA",
          zipCode: "02138",
          dateReported: "2020-06-01",
        },
      ],
      employment: {
        employer: "Tech Solutions Inc",
        position: "Software Engineer",
        income: 85000,
        employmentLength: "3 years",
      },
    },
  },
  {
    id: 2,
    clientName: "Michael Chen",
    clientId: 2,
    reportDate: "2024-01-20",
    bureau: "TransUnion",
    scores: {
      experian: 580,
      transunion: 585,
      equifax: 575,
    },
    previousScores: {
      experian: 560,
      transunion: 565,
      equifax: 555,
    },
    accounts: 8,
    collections: 5,
    inquiries: 12,
    status: "recent",
    scoreHistory: [
      { date: "2024-01-20", experian: 580, transunion: 585, equifax: 575 },
      { date: "2023-12-20", experian: 570, transunion: 575, equifax: 565 },
      { date: "2023-11-20", experian: 565, transunion: 570, equifax: 560 },
      { date: "2023-10-20", experian: 560, transunion: 565, equifax: 555 },
    ],
    personalInfo: {
      fullName: "Michael James Chen",
      ssn: "***-**-8901",
      dateOfBirth: "07/22/1985",
      currentAddress: {
        street: "9876 Pine Road",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102",
        dateReported: "2022-09-01",
      },
    },
  },
  {
    id: 3,
    clientName: "Emma Davis",
    clientId: 3,
    reportDate: "2024-01-18",
    bureau: "Equifax",
    scores: {
      experian: 720,
      transunion: 715,
      equifax: 725,
    },
    previousScores: {
      experian: 680,
      transunion: 675,
      equifax: 685,
    },
    accounts: 15,
    collections: 1,
    inquiries: 6,
    status: "recent",
    scoreHistory: [
      { date: "2024-01-18", experian: 720, transunion: 715, equifax: 725 },
      { date: "2023-12-18", experian: 710, transunion: 705, equifax: 715 },
      { date: "2023-11-18", experian: 695, transunion: 690, equifax: 700 },
      { date: "2023-10-18", experian: 680, transunion: 675, equifax: 685 },
    ],
    personalInfo: {
      fullName: "Emma Louise Davis",
      ssn: "***-**-2345",
      dateOfBirth: "12/03/1990",
      currentAddress: {
        street: "2468 Cedar Lane",
        city: "Austin",
        state: "TX",
        zipCode: "73301",
        dateReported: "2021-03-15",
      },
    },
  },
];

// Comprehensive detailed credit report data
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

// Utility functions for formatting credit report data
function formatCreditScore(score: any): string {
  if (score === null || score === undefined || isNaN(Number(score))) {
    return 'N/A';
  }
  return String(score);
}

function formatAccountCount(count: any): string {
  if (count === null || count === undefined || isNaN(Number(count))) {
    return 'N/A';
  }
  return String(count);
}

export default function Reports() {
  const subscriptionStatus = useSubscriptionStatus();
  const { isEliteActive } = useScoreMachineEliteStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "fundable" | "notFundable" | "thisMonth">("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [fetchingClientId, setFetchingClientId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch reports from backend
  const fetchReports = async () => {
    setLoading(true);
    console.log('🔍 REPORT DEBUG: Fetching report history... Client ID:', selectedClientId);
    
    try {
      // Call the API with the correct parameter format
      let response;
      if (selectedClientId && selectedClientId !== 'all') {
        // If client is selected, pass the ID as a number
        response = await creditReportScraperApi.getReportHistory(parseInt(selectedClientId));
      } else {
        // If no client selected or "all" is selected, don't pass clientId
        response = await creditReportScraperApi.getReportHistory();
      }
      
      console.log('🔍 REPORT DEBUG: Raw API response:', response);

      if (response.data?.error) {
        console.error('🔍 REPORT DEBUG: API returned error:', response.data.error);
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive",
        });
        return;
      }

      // Transform backend data to match component expectations
      const responseObj = response.data as { data?: any[], savedReportPath?: string } || {};
      const responseData = responseObj.data || [];
      console.log('🔍 REPORT DEBUG: Processed API Response data:', responseObj);
      console.log('🔍 REPORT DEBUG: Response data array length:', responseData.length);
      
      // Keep existing reports to ensure we don't lose any data
      // This is critical for showing reports when selecting a client
      const existingReports = [...reports];
      console.log('🔍 REPORT DEBUG: Existing reports count:', existingReports.length);
      console.log('🔍 REPORT DEBUG: Existing reports:', existingReports);
      
      const transformedReports = await Promise.all(responseData.map(async (report: any) => {
        console.log('🔍 REPORT DEBUG: Processing report:', report);
        let reportData: any = {};
        
        // If we have a JSON file path, fetch the JSON data from the file
        if (report.json_file_path || report.savedReportPath || report.report_path) {
          const filePath = report.json_file_path || report.savedReportPath || report.report_path;
          try {
            console.log('🔍 REPORT DEBUG: Fetching JSON file:', filePath);
            const token = localStorage.getItem('auth_token');
            const jsonResponse = await fetch(`/api/credit-reports/json-file?path=${encodeURIComponent(filePath)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('🔍 REPORT DEBUG: JSON response status:', jsonResponse.status);
            if (jsonResponse.ok) {
              reportData = await jsonResponse.json();
              console.log('🔍 REPORT DEBUG: Successfully loaded JSON data from file', reportData);
            } else {
              console.error('🔍 REPORT DEBUG: Failed to fetch JSON file, status:', jsonResponse.status);
            }
          } catch (error) {
            console.error('🔍 REPORT DEBUG: Error fetching JSON file:', error);
          }
        } else if (report.report_data) {
          // Fall back to report_data if available
          try {
            console.log('🔍 REPORT DEBUG: Parsing report_data');
            reportData = JSON.parse(report.report_data);
            console.log('🔍 REPORT DEBUG: Successfully parsed report_data', reportData);
          } catch (error) {
            console.error('🔍 REPORT DEBUG: Error parsing report data:', error);
          }
        } else if (responseObj.savedReportPath) {
          // Handle case where savedReportPath is at the top level of the response
          try {
            console.log('🔍 REPORT DEBUG: Fetching JSON file from top-level savedReportPath:', responseObj.savedReportPath);
            const token = localStorage.getItem('auth_token');
            const jsonResponse = await fetch(`/api/credit-reports/json-file?path=${encodeURIComponent(responseObj.savedReportPath)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            console.log('🔍 REPORT DEBUG: Top-level JSON response status:', jsonResponse.status);
            if (jsonResponse.ok) {
              reportData = await jsonResponse.json();
              console.log('🔍 REPORT DEBUG: Successfully loaded JSON data from top-level savedReportPath', reportData);
            } else {
              console.error('🔍 REPORT DEBUG: Failed to fetch top-level JSON file, status:', jsonResponse.status);
            }
          } catch (error) {
            console.error('🔍 REPORT DEBUG: Error fetching JSON file from top-level savedReportPath:', error);
          }
        }
        
        // Extract client info from the report data if available
        const clientInfo = reportData?.clientInfo as Record<string, any> || {};
        const reportDataContent = reportData?.reportData as Record<string, any> || {};
        
        // Get credit scores from the report data if available
        let creditScore = 'N/A';
        let bureauName = report.bureau || 'Unknown';
        
        if (reportDataContent.Score && reportDataContent.Score.length > 0) {
          const scores = reportDataContent.Score;
          // Find the highest score or use the first one
          const highestScore = scores.reduce((max: any, score: any) => 
            (parseInt(score.Score) > parseInt(max.Score) ? score : max), scores[0]);
          
          creditScore = highestScore.Score || 'N/A';
          
          // Map bureau ID to name if needed
          if (highestScore.BureauId) {
            const bureauMap: {[key: number]: string} = {
              1: 'Experian',
              2: 'TransUnion',
              3: 'Equifax'
            };
            bureauName = bureauMap[highestScore.BureauId] || bureauName;
          }
        } else {
          const numericCandidates = [
            report.experian_score,
            report.equifax_score,
            report.transunion_score,
            report.credit_score
          ]
            .map((v) => (v !== undefined && v !== null ? parseInt(v) : NaN))
            .filter((n) => !isNaN(n));
          if (numericCandidates.length) {
            creditScore = String(Math.max(...numericCandidates));
          }
        }
        
        // Count accounts, negative accounts, and inquiries
        const accountsTotal = reportDataContent.Accounts?.length || 0;
        const negativeAccounts = reportDataContent.Accounts?.filter((account: any) => 
          account.PaymentStatus !== 'Current').length || 0;
        const inquiriesCount = reportDataContent.Inquiries?.length || 0;
        
        return {
          id: report.id || clientInfo.clientId || 'unknown',
          clientId: report.client_id || clientInfo.clientId || 'unknown',
          clientName: report.first_name && report.last_name ? 
            `${report.first_name} ${report.last_name}` : 
            (reportDataContent.Name && reportDataContent.Name.length > 0 ? 
              `${reportDataContent.Name[0].FirstName} ${reportDataContent.Name[0].LastName}` : 
              clientInfo.username || 'Unknown'),
          platform: report.platform || 'Unknown',
          date: report.report_date || clientInfo.reportDate || new Date().toLocaleDateString(),
          score: creditScore,
          previousScore: report.previous_credit_score ? String(report.previous_credit_score) : 'N/A',
          changeValue: report.credit_score && report.previous_credit_score ? 
            report.credit_score - report.previous_credit_score : 0,
          accounts: String(accountsTotal),
          negativeAccounts: String(negativeAccounts),
          inquiries: String(inquiriesCount),
          publicRecords: reportDataContent.PublicRecords?.length || 0,
          // Include per-bureau scores from history if available
          experian_score: (report.experian_score !== undefined && report.experian_score !== null) ? parseInt(report.experian_score) : undefined,
          equifax_score: (report.equifax_score !== undefined && report.equifax_score !== null) ? parseInt(report.equifax_score) : undefined,
          transunion_score: (report.transunion_score !== undefined && report.transunion_score !== null) ? parseInt(report.transunion_score) : undefined,
          jsonData: reportData, // Add the JSON data to the report object
          jsonFilePath: report.json_file_path || report.savedReportPath || responseObj.savedReportPath // Store the file path for reference
        };
      }));

      // Combine existing reports with new ones, avoiding duplicates
      const combinedReports = [...existingReports];
      
      // Add new reports that don't exist in the current list
      transformedReports.forEach(newReport => {
        const exists = combinedReports.some(
          existingReport => existingReport.id === newReport.id
        );
        
        if (!exists) {
          combinedReports.push(newReport);
        }
      });

      // Group reports by client and keep only the newest report for each client
      const clientReportsMap = new Map();
      
      combinedReports.forEach((report: any) => {
        const clientKey = report.clientId.toString();
        const reportDate = new Date(report.date);
        
        if (!clientReportsMap.has(clientKey) || 
            new Date(clientReportsMap.get(clientKey).date) < reportDate) {
          clientReportsMap.set(clientKey, report);
        }
      });

      // Convert map back to array with only the newest reports
      const newestReports = Array.from(clientReportsMap.values());
      
      console.log('🔍 REPORT DEBUG: Combined reports count:', combinedReports.length);
      console.log('🔍 REPORT DEBUG: Newest reports count:', newestReports.length);
      setReports(newestReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Derived helpers for filtering and counts
  const parseScore = (s: any) => {
    if (s === 'N/A' || s === undefined || s === null) return NaN;
    return typeof s === 'string' ? parseInt(s, 10) : s;
  };

  const isFundable = (r: any) => {
    const s = parseScore(r.score);
    if (!isNaN(s)) return s >= 700;
    const nums = [
      r.experian_score,
      r.equifax_score,
      r.transunion_score,
      r.credit_score
    ]
      .map(parseScore)
      .filter((n) => !isNaN(n));
    const m = nums.length ? Math.max(...nums) : NaN;
    return !isNaN(m) && m >= 700;
  };

  const isThisMonth = (d: any) => {
    try {
      const dateObj = new Date(d);
      const now = new Date();
      return (
        dateObj.getFullYear() === now.getFullYear() &&
        dateObj.getMonth() === now.getMonth()
      );
    } catch {
      return false;
    }
  };

  const totalReports = reports.length;
  const fundableCount = reports.filter(isFundable).length;
  const notFundableCount = totalReports - fundableCount;
  const recentCount = reports.filter((r) => {
    try {
      const reportDate = new Date(r?.date);
      const now = new Date();
      const daysSinceReport = (now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
      return !isNaN(reportDate.getTime()) && daysSinceReport >= 0 && daysSinceReport <= 30;
    } catch {
      return false;
    }
  }).length;
  const thisMonthCount = reports.filter((r) => isThisMonth(r.date)).length;

  // Apply search, platform filter, and summary card filters
  const filteredReports = (Array.isArray(reports) ? reports : [])
    .filter((r) =>
      searchTerm.trim() === "" ||
      (r.clientName || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((r) => platformFilter === "all" || r.platform === platformFilter)
    .filter((r) => {
      if (filterMode === "all") return true;
      if (filterMode === "fundable") return isFundable(r);
      if (filterMode === "notFundable") return !isFundable(r);
      if (filterMode === "thisMonth") return isThisMonth(r.date);
      return true;
    });

  const getScoreChange = (current: string | number, previous: string | number) => {
    // Handle N/A values
    if (current === 'N/A' || previous === 'N/A') {
      return {
        value: 'N/A',
        isPositive: true,
        icon: ArrowUp,
        color: "text-gray-500",
      };
    }
    
    // Convert to numbers for calculation
    const currentNum = typeof current === 'string' ? parseInt(current, 10) : current;
    const previousNum = typeof previous === 'string' ? parseInt(previous, 10) : previous;
    
    // Check if conversion resulted in valid numbers
    if (isNaN(currentNum) || isNaN(previousNum)) {
      return {
        value: 'N/A',
        isPositive: true,
        icon: ArrowUp,
        color: "text-gray-500",
      };
    }
    
    const change = currentNum - previousNum;
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

  // Client scraper form state
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [platforms, setPlatforms] = useState<string[]>([]);

  // Inline Add Client form state
  const [addPlatform, setAddPlatform] = useState<string>("");
  const [addEmail, setAddEmail] = useState<string>("");
  const [addPassword, setAddPassword] = useState<string>("");
  const [addSsnLast4, setAddSsnLast4] = useState<string>("");
  const [addAuthorization, setAddAuthorization] = useState(false);
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState<boolean>(false);
  
  // Fetch clients and platforms on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Using the clientsApi from the imported API module
        const response = await clientsApi.getClients();
        if (response.data && response.data.clients) {
          setClients(response.data.clients);
          console.log('Clients loaded:', response.data.clients);
        } else {
          console.error('No clients data returned from API');
          setClients([]); // Initialize with empty array if no data
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]); // Initialize with empty array on error
      }
    };
    
    const fetchPlatforms = async () => {
      try {
        const response = await creditReportScraperApi.getPlatforms();
        if (response.data?.platforms) {
          setPlatforms(response.data.platforms);
        }
      } catch (error) {
        console.error('Error fetching platforms:', error);
      }
    };
    
    fetchClients();
    fetchPlatforms();
  }, []);

  // Inline Add Client handler (mirrors Dashboard add-client submission)
  const handleAddClientInline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingClient(true);
    let reportPullFeedbackOpen = false;
    let pendingCheckoutClientData: Record<string, any> | null = null;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add a new client.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (!addPlatform || !addEmail || !addPassword) {
        toast({
          title: "Missing Information",
          description: "Platform, email and password are required.",
          variant: "destructive",
        });
        return;
      }
      if (!addAuthorization) {
        toast({
          title: "Authorization Required",
          description: "Please confirm authorization to use the credit report for educational analysis.",
          variant: "destructive",
        });
        return;
      }

      // Scrape credit report to extract personal info
      openReportPullLoading();
      reportPullFeedbackOpen = true;
      const scrapeResponse = await fetch("/api/credit-reports/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: addPlatform,
          credentials: {
            username: addEmail,
            password: addPassword,
          },
          options: {
            saveHtml: false,
            takeScreenshots: false,
            ...(((addPlatform === "identityiq" || addPlatform === "myscoreiq") && addSsnLast4)
              ? { ssnLast4: addSsnLast4 }
              : {}),
          },
        }),
      });

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json().catch(() => ({}));
        if (scrapeResponse.status === 401 || scrapeResponse.status === 403) {
          closeReportPullLoading();
          reportPullFeedbackOpen = false;
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          localStorage.removeItem("auth_token");
          navigate("/login");
          return;
        }
        throw new Error(errorData.message || "Failed to scrape credit report");
      }

      const scraperData = await scrapeResponse.json();

      // Extract personal information with robust fallbacks
      let firstName = "";
      let lastName = "";
      let dateOfBirth = "";

      if (scraperData.data && scraperData.data.reportData) {
        const reportData = scraperData.data.reportData;

        if (reportData.Name && Array.isArray(reportData.Name) && reportData.Name.length > 0) {
          const primaryName = reportData.Name.find((n: any) => n.NameType === "Primary") || reportData.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
        }

        if (reportData.DOB && Array.isArray(reportData.DOB) && reportData.DOB.length > 0) {
          const dobData = reportData.DOB[0];
          dateOfBirth = dobData.DOB || "";
        }

        if (!firstName && !lastName) {
          if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
            const primaryName = scraperData.data.Name.find((n: any) => n.NameType === "Primary") || scraperData.data.Name[0];
            firstName = primaryName.FirstName || "";
            lastName = primaryName.LastName || "";
          }
          if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
            const dobData = scraperData.data.DOB[0];
            dateOfBirth = dobData.DOB || "";
          }
          if (!firstName && !lastName && reportData.reportData) {
            const nestedReportData = reportData.reportData;
            if (nestedReportData.Name && Array.isArray(nestedReportData.Name) && nestedReportData.Name.length > 0) {
              const primaryName = nestedReportData.Name.find((n: any) => n.NameType === "Primary") || nestedReportData.Name[0];
              firstName = primaryName.FirstName || "";
              lastName = primaryName.LastName || "";
            }
            if (nestedReportData.DOB && Array.isArray(nestedReportData.DOB) && nestedReportData.DOB.length > 0) {
              const dobData = nestedReportData.DOB[0];
              dateOfBirth = dobData.DOB || "";
            }
          }
        }
      }

      if (!firstName && !lastName && scraperData.data) {
        if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
          const primaryName = scraperData.data.Name.find((n: any) => n.NameType === "Primary") || scraperData.data.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
        }
        if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
          const dobData = scraperData.data.DOB[0];
          dateOfBirth = dobData.DOB || "";
        }
      }

      if (!firstName && !lastName) {
        throw new Error("Could not extract personal information from credit report. Please verify the credentials and try again.");
      }

      closeReportPullLoading();
      reportPullFeedbackOpen = false;

      const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: addEmail,
        date_of_birth: dateOfBirth || undefined,
        status: "active" as const,
        platform: addPlatform,
        platform_email: addEmail,
        platform_password: addPassword,
        ...(addSsnLast4 ? { ssn_last_four: addSsnLast4 } : {}),
        notes: `Client created via credit report scraping from ${addPlatform}`,
      };
      pendingCheckoutClientData = clientData;

      const createResponse = await clientsApi.createClient(clientData);
      const createResponseData = createResponse?.data ?? createResponse;
      if (createResponseData?.error) {
        throw new Error(createResponseData.error);
      }

      const reusedExisting = createResponseData?.reusedExisting === true || createResponseData?.created === false;

      // Reset inline form
      setAddPlatform("");
      setAddEmail("");
      setAddPassword("");
      setAddSsnLast4("");
      setAddAuthorization(false);

      // Optionally refresh clients and reports
      try {
        const resp = await clientsApi.getClients();
        if (resp.data?.clients) setClients(resp.data.clients);
      } catch {}

      toast({
        title: "Success!",
        description: reusedExisting
          ? `Client ${firstName} ${lastName} already existed. A fresh credit report was added to the existing profile.`
          : `Client ${firstName} ${lastName} has been added successfully.`,
      });

      const clientId = createResponseData?.id;
      const clientName = `${firstName} ${lastName}`;
      if (clientId) {
        if (subscriptionStatus.hasActiveSubscription) {
          navigate(`/credit-report?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
        } else {
          navigate(`/clients/${clientId}`);
        }
      }
    } catch (error: any) {
      if (reportPullFeedbackOpen) {
        showReportPullError();
        reportPullFeedbackOpen = false;
      }
      if (isClientPlanPaymentRequired(error)) {
        const checkoutUrl = await copyClientEnrollmentCheckoutLink({
          source: "reports_page_scrape",
          returnUrl: window.location.href,
          clientData: pendingCheckoutClientData || {
            platform: addPlatform,
            email: addEmail,
            platform_email: addEmail,
            platform_password: addPassword,
            ...(addSsnLast4 ? { ssn_last_four: addSsnLast4 } : {}),
          },
        });
        toast({
          title: "Client payment link copied",
          description: "Send this payment link to the client so they can complete enrollment.",
        });
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        return;
      }
      if (error.response?.status === 403 && error.response?.data?.error === "Client quota exceeded") {
        const planLimits = error.response.data.planLimits;
        toast({
          title: "Client Quota Exceeded",
          description:
            error.response.data.message || `You have reached the maximum of ${planLimits?.maxClients || 1} client(s) allowed on your plan. Please upgrade to add more clients.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Adding Client",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingClient(false);
    }
  };
  
  // Handle scraper form submission
  const handleScrapeReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !username || !password || !selectedClient) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await runWithReportPullFeedback(() =>
        creditReportScraperApi.scrapeReport({
          platform,
          credentials: {
            username,
            password
          },
          options: {
            saveHtml: true,
            takeScreenshots: true
          },
          clientId: selectedClient
        }),
      );
      
      if (response.data?.error) {
        showReportPullError();
        toast({
          title: "Error",
          description: response.data.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Credit report scraping initiated successfully",
          variant: "default"
        });
        
        // Reset form
        setPlatform("");
        setUsername("");
        setPassword("");
        setSelectedClient("");
      }
    } catch (error) {
      console.error('Error scraping report:', error);
      toast({
        title: "Error",
        description: "Failed to initiate credit report scraping",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Per-row Fetch New Report action, mirrors ClientProfile behavior
  const handleFetchNewReport = async (clientId: string) => {
    try {
      setFetchingClientId(clientId);
      // Load client to get stored platform credentials
      const clientResponse = await clientsApi.getClient(clientId);
      if (clientResponse.data?.error || !clientResponse.data) {
        toast({
          title: "Error",
          description: "Failed to load client data",
          variant: "destructive",
        });
        return;
      }

      const client = clientResponse.data;
      const matchingReport = reports.find((report) => String(report.clientId) === String(clientId));
      const resolvedClientName = [
        client.first_name,
        client.last_name,
      ].filter(Boolean).join(' ').trim()
        || [client.firstName, client.lastName].filter(Boolean).join(' ').trim()
        || String(client.full_name || client.name || matchingReport?.clientName || clientId);

      if (!client.platform || !client.platform_email || !client.platform_password) {
        toast({
          title: "Missing Credentials",
          description:
            "Client credentials are not configured. Please update client profile with platform credentials.",
          variant: "destructive",
        });
        return;
      }

      const platformLower = String(client.platform || '').toLowerCase();
      const requiresSsn = platformLower === 'identityiq' || platformLower === 'myscoreiq';
      const ssn = client.ssn_last_four || '';
      if (requiresSsn && (!ssn || String(ssn).length !== 4)) {
        toast({
          title: 'SSN Last 4 Required',
          description: 'Please set SSN Last 4 on the client profile for IdentityIQ/MyScoreIQ.',
          variant: 'destructive',
        });
        return;
      }

      const scrapeStartResponse = await runWithReportPullFeedback(() =>
        creditReportScraperApi.scrapeReport({
          platform: client.platform,
          credentials: {
            username: client.platform_email,
            password: client.platform_password,
          },
          options: {
            ...(requiresSsn ? { ssnLast4: ssn } : {}),
          },
          clientId,
        }),
      );
      if ((scrapeStartResponse as any)?.data?.error) {
        showReportPullError();
        throw new Error((scrapeStartResponse as any).data.error);
      }

      toast({
        title: "Report Scraping Started",
        description: "Credit report pulled successfully. Redirecting to the client credit report.",
      });

      navigate(`/credit-report?clientId=${encodeURIComponent(clientId)}&clientName=${encodeURIComponent(resolvedClientName)}`);
    } catch (error) {
      console.error("Error starting credit report scrape:", error);
      toast({
        title: "Scraping Failed",
        description:
          (error as any)?.response?.data?.message ||
          (error instanceof Error ? error.message : "Failed to start credit report scraping. Please try again."),
        variant: "destructive",
      });
    } finally {
      setFetchingClientId(null);
    }
  };

  if (isEliteActive) {
    return (
      <DashboardLayout
        title="Credit Reports"
        description="View and analyze credit reports for all clients"
      >
        <EliteReports
          reports={reports}
          filteredReports={filteredReports}
          totalReports={totalReports}
          recentCount={recentCount}
          thisMonthCount={thisMonthCount}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          loading={loading}
          fetchingClientId={fetchingClientId}
          handleFetchNewReport={handleFetchNewReport}
          navigate={navigate}
          handleAddClientInline={handleAddClientInline}
          addPlatform={addPlatform}
          setAddPlatform={setAddPlatform}
          addEmail={addEmail}
          setAddEmail={setAddEmail}
          addPassword={addPassword}
          setAddPassword={setAddPassword}
          addSsnLast4={addSsnLast4}
          setAddSsnLast4={setAddSsnLast4}
          addAuthorization={addAuthorization}
          setAddAuthorization={setAddAuthorization}
          isAddingClient={isAddingClient}
          showInlinePassword={showInlinePassword}
          setShowInlinePassword={setShowInlinePassword}
          formatCreditScore={formatCreditScore}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Credit Reports"
      description="View and analyze credit reports for all clients"
    >
      {/* Credit Report Scraper Form 
      <Card className="mb-8 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Credit Report Scraper</CardTitle>
          <CardDescription>
            Select a client and enter credentials to scrape their credit report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrapeReport} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="client" className="text-sm font-medium">
                  Client
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.first_name} {client.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="platform" className="text-sm font-medium">
                  Platform
                </label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Scrape Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>*/}
      
      {/* Summary Stats 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-ocean-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text-primary">{reports.length}</div>
            <p className="text-xs text-muted-foreground">Across all clients</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fundable
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {reports.filter(r => parseInt(r.score) > 650).length}
            </div>
            <p className="text-xs text-muted-foreground">Clients with score &gt; 700+</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Not Fundable
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {reports.filter(r => parseInt(r.score) <= 650 || !r.score || r.score === 'N/A').length}
            </div>
            <p className="text-xs text-muted-foreground">
                Clients with score ≤ 699
              </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reports Pulled this Month
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {reports.filter(r => {
                const reportDate = new Date(r.date);
                const currentDate = new Date();
                return reportDate.getMonth() === currentDate.getMonth() && 
                       reportDate.getFullYear() === currentDate.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>*/}

      {/* Main Content */}
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="gradient-text-primary text-2xl">
                Clients Work Area
              </CardTitle>
              <CardDescription>
                Monitor and analyze credit reports across all clients
              </CardDescription>
            </div>
            {/* Header action buttons removed per request */}
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Reports */}
            <Card
              className={`cursor-pointer transition border ${
                filterMode === "all" ? "border-primary ring-2 ring-primary/40" : "border-border/40"
              } hover:border-primary`}
              onClick={() => setFilterMode("all")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Total Reports</CardTitle>
                </div>
                <CardDescription>Across all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold gradient-text-primary">{totalReports}</div>
              </CardContent>
            </Card>

            {/* Fundable */}
            <Card
              className={`cursor-pointer transition border ${
                filterMode === "fundable" ? "border-primary ring-2 ring-primary/40" : "border-border/40"
              } hover:border-primary`}
              onClick={() => setFilterMode("fundable")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Fundable</CardTitle>
                </div>
                <CardDescription>Clients with score ≥ 700</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{fundableCount}</div>
              </CardContent>
            </Card>

            {/* Not Fundable */}
            <Card
              className={`cursor-pointer transition border ${
                filterMode === "notFundable" ? "border-primary ring-2 ring-primary/40" : "border-border/40"
              } hover:border-primary`}
              onClick={() => setFilterMode("notFundable")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Not Fundable</CardTitle>
                </div>
                <CardDescription>Clients with score ≤ 699</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{notFundableCount}</div>
              </CardContent>
            </Card>

            {/* Reports Pulled this Month */}
            <Card
              className={`cursor-pointer transition border ${
                filterMode === "thisMonth" ? "border-primary ring-2 ring-primary/40" : "border-border/40"
              } hover:border-primary`}
              onClick={() => setFilterMode("thisMonth")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Reports Pulled this Month</CardTitle>
                </div>
                <CardDescription>This month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{thisMonthCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name..."
                className="pl-10 bg-gradient-light border-border/40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          <div className="flex flex-wrap gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {Array.from(new Set(reports.map((r) => r.platform)))
                  .filter((p) => p && p !== 'Unknown')
                  .map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            {/* Client Selection Dropdown */}
            <Select 
              value={selectedClientId || ""} 
              onValueChange={(value) => {
                console.log('🔍 REPORT DEBUG: Client selected:', value);
                setSelectedClientId(value === "" ? null : value);
                // Trigger report fetch when client is selected
                fetchReports();
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {/* Get unique clients from reports */}
                {Array.from(new Set(reports.map(report => report.clientId)))
                  .filter(clientId => clientId && clientId !== "unknown" && clientId !== "") // Filter out empty or invalid IDs
                  .map(clientId => {
                    const client = reports.find(r => r.clientId === clientId);
                    return (
                      <SelectItem key={clientId} value={clientId}>
                        {client?.clientName || clientId}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            {/* Inline Add Client form (no popup) */}
            <form className="flex items-center gap-2 flex-wrap" onSubmit={handleAddClientInline}>
              <Select value={addPlatform} onValueChange={setAddPlatform}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="myfreescorenow">MyFreeScoreNow</SelectItem>
                  <SelectItem value="identityiq">IdentityIQ</SelectItem>
                  <SelectItem value="myscoreiq">MyScoreIQ</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="w-full sm:w-48"
                placeholder="Platform Email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
              <div className="relative w-full sm:w-44">
                <Input
                  className="w-full pr-10"
                  type={showInlinePassword ? "text" : "password"}
                  placeholder="Platform Password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowInlinePassword(!showInlinePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showInlinePassword ? "Hide password" : "Show password"}
                  aria-pressed={showInlinePassword}
                  title={showInlinePassword ? "Hide password" : "Show password"}
                >
                  {showInlinePassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {(addPlatform === "identityiq" || addPlatform === "myscoreiq") && (
                <Input
                  className="w-full sm:w-28"
                  placeholder="SSN Last 4"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={addSsnLast4}
                  onChange={(e) => setAddSsnLast4(e.target.value.replace(/[^0-9]/g, ''))}
                />
              )}
              <div className="flex items-start space-x-2 w-full sm:w-auto">
                <Checkbox
                  id="reports-inline-authorization"
                  checked={addAuthorization}
                  onCheckedChange={(checked) => setAddAuthorization(checked === true)}
                />
                <Label htmlFor="reports-inline-authorization" className="text-sm text-slate-600">
                  I confirm this is my client credit report and I am authorized to use for educational analysis.
                </Label>
              </div>
              <Button type="submit" disabled={isAddingClient} className="w-full sm:w-auto">
                {isAddingClient ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>Add Client</>
                )}
              </Button>
            </form>
          </div>
        </div>

          {/* Reports Table */}
          <div className="rounded-lg border border-border/40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm overflow-x-auto">
            <div className="min-w-[900px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow className="gradient-light">
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Platform</TableHead>
                  <TableHead className="hidden md:table-cell">Report Pull Date</TableHead>
                  <TableHead className="hidden md:table-cell">Report Date</TableHead>
                  <TableHead>Scores</TableHead>
                  <TableHead className="w-40">Fetch New Report</TableHead>
                  <TableHead className="w-12 hidden sm:table-cell"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span>Loading reports...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        No reports found matching your criteria
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReports.map((report) => {
                  const scoreChange = getScoreChange(report.score, report.previousScore);
                  const ChangeIcon = scoreChange.icon;

                  // Extract latest bureau scores from embedded JSON data (matches Client profile logic)
                  const extractLatestBureauScores = (jsonData: any) => {
                    const scores = { experian: 'N/A', equifax: 'N/A', transunion: 'N/A' } as Record<string, string>;
                    if (!jsonData) return scores;

                    let scoreArray: any[] | null = null;
                    if (jsonData.reportData && Array.isArray(jsonData.reportData.Score)) {
                      scoreArray = jsonData.reportData.Score;
                    } else if (Array.isArray(jsonData.Score)) {
                      scoreArray = jsonData.Score;
                    }
                    if (scoreArray) {
                      scoreArray.forEach((s: any) => {
                        const bureauId = s.BureauId;
                        const val = s.Score !== undefined ? String(s.Score) : 'N/A';
                        // Map BureauId to bureau name per Client profile: 1=TransUnion, 2=Experian, 3=Equifax
                        if (bureauId === 1) {
                          scores.transunion = val;
                        } else if (bureauId === 2) {
                          scores.experian = val;
                        } else if (bureauId === 3) {
                          scores.equifax = val;
                        }
                      });
                    }
                    return scores;
                  };

                  // Report Pull Date: use the pulled timestamp from the report object
                  const reportPullDateStr = report?.date;
                  let reportPullDateFormatted: string = 'N/A';
                  try {
                    reportPullDateFormatted = reportPullDateStr ? new Date(reportPullDateStr).toLocaleDateString() : 'N/A';
                  } catch {
                    reportPullDateFormatted = reportPullDateStr || 'N/A';
                  }

                  // Report Date: extract from JSON CreditReport[0].DateReport with robust fallbacks
                  const jsonReportDateStr =
                    (report?.jsonData?.CreditReport && Array.isArray(report.jsonData.CreditReport) && report.jsonData.CreditReport[0]?.DateReport) ||
                    (report?.jsonData?.reportData?.CreditReport && Array.isArray(report.jsonData.reportData.CreditReport) && report.jsonData.reportData.CreditReport[0]?.DateReport) ||
                    (Array.isArray(report?.jsonData?.CreditReport) ? report.jsonData.CreditReport[0]?.Date : undefined) ||
                    (Array.isArray(report?.jsonData?.reportData?.CreditReport) ? report.jsonData.reportData.CreditReport[0]?.Date : undefined) ||
                    undefined;

                  let jsonReportDateFormatted: string = 'N/A';
                  try {
                    jsonReportDateFormatted = jsonReportDateStr ? new Date(jsonReportDateStr).toLocaleDateString() : (report?.date ? new Date(report.date).toLocaleDateString() : 'N/A');
                  } catch {
                    jsonReportDateFormatted = jsonReportDateStr || (report?.date || 'N/A');
                  }

                  const displayedScores = {
                    experian: formatCreditScore(report.experian_score),
                    equifax: formatCreditScore(report.equifax_score),
                    transunion: formatCreditScore(report.transunion_score),
                  } as Record<string, string>;

                  return (
                    <TableRow
                      key={report.id}
                      className="hover:bg-gradient-light/50 cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/credit-report?clientId=${report.clientId}&clientName=${encodeURIComponent(report.clientName)}`,
                        )
                      }
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="gradient-primary text-white text-xs">
                              {report.clientName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {report.clientName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {report.clientId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className="border-ocean-blue/30 text-ocean-blue"
                        >
                          {report.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          {reportPullDateFormatted}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          {jsonReportDateFormatted}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-500/30 text-green-600">
                            Experian: {displayedScores.experian}
                          </Badge>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-600">
                            Equifax: {displayedScores.equifax}
                          </Badge>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                            TransUnion: {displayedScores.transunion}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchNewReport(String(report.clientId));
                          }}
                          disabled={fetchingClientId === String(report.clientId)}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${fetchingClientId === String(report.clientId) ? 'animate-spin' : ''}`} />
                          {fetchingClientId === String(report.clientId) ? 'Fetching...' : 'Fetch New Report'}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex space-x-1">
                          {report.jsonFilePath && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/api/credit-reports/json-file?path=${encodeURIComponent(report.jsonFilePath)}`, '_blank');
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/credit-report?clientId=${report.clientId}&clientName=${encodeURIComponent(report.clientName)}`,
                              );
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}
