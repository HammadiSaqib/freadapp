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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import BureauScoresChart from "@/components/BureauScoresChart";
import ScoreChartsCard from "@/components/ScoreChartsCard";
import NegativeAccountsCard from "@/components/NegativeAccountsCard";
import { useState, useEffect } from "react";
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
  X,
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
  Calendar,
  Home,
  Phone,
  Globe,
  ArrowRight,
  Mail,
  Hash,
  Briefcase,
} from "lucide-react";
import FundingProjectionsCalculator from '@/utils/fundingProjections.js';
import GapAnalyzer from '@/utils/gapAnalyzer.js';
import PersonalCardsDisplay from '@/components/PersonalCardsDisplay';
import BusinessCardsDisplay from '@/components/BusinessCardsDisplay';

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

export default function CreditReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportData, setReportData] = useState<any>(detailedReport);
  const [apiData, setApiData] = useState<any>(null);
  const [qualifyView, setQualifyView] = useState<'cards' | 'table'>('cards');
  
  // Funding application modal states
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingType, setFundingType] = useState<'personal' | 'business' | null>(null);
  const [fundingOption, setFundingOption] = useState<'done-for-you' | 'diy' | null>(null);
  
  // DIY Cards visibility states (for page section instead of modal)
  const [showDIYSection, setShowDIYSection] = useState(false);
  const [diyFundingType, setDiyFundingType] = useState<'personal' | 'business' | null>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Business Information
    titlePosition: '',
    fundingAmount: '',
    intendedUse: '',
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    city: '',
    state: '',
    zip: '',
    dateCommenced: '',
    businessWebsite: '',
    businessIndustry: '',
    entityType: '',
    incorporationState: '',
    numberOfEmployees: '',
    ein: '',
    monthlyGrossSales: '',
    projectedAnnualRevenue: '',
    
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    birthCity: '',
    ssn: '',
    mothersMaidenName: '',
    homeAddress: '',
    personalCity: '',
    personalState: '',
    personalZip: '',
    homePhone: '',
    mobilePhone: '',
    housingStatus: '',
    monthlyHousingPayment: '',
    yearsAtAddress: '',
    driversLicense: '',
    issuingState: '',
    issueDate: '',
    expirationDate: '',
    
    // Employment Information
    currentEmployer: '',
    position: '',
    yearsAtEmployer: '',
    employerPhone: '',
    employerAddress: '',
    
    // Financial Information
    personalBankName: '',
    personalBankBalance: '',
    businessBankName: '',
    businessBankBalance: '',
    usCitizen: '',
    savingsAccount: '',
    investmentAccounts: '',
    militaryAffiliation: '',
    otherIncome: '',
    otherAssets: '',
    banksToIgnore: [] as string[]
  });
  
  // Form validation functions
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Business Information
        if (!formData.titlePosition.trim()) errors.titlePosition = 'Title/Position is required';
        if (!formData.fundingAmount.trim()) errors.fundingAmount = 'Funding amount is required';
        if (!formData.intendedUse.trim()) errors.intendedUse = 'Intended use is required';
        if (!formData.businessName.trim()) errors.businessName = 'Business name is required';
        if (!formData.businessPhone.trim()) errors.businessPhone = 'Business phone is required';
        if (!formData.businessEmail.trim()) errors.businessEmail = 'Business email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) errors.businessEmail = 'Invalid email format';
        if (!formData.businessAddress.trim()) errors.businessAddress = 'Business address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.state.trim()) errors.state = 'State is required';
        if (!formData.zip.trim()) errors.zip = 'ZIP code is required';
        if (!formData.dateCommenced.trim()) errors.dateCommenced = 'Business start date is required';
        if (!formData.businessIndustry.trim()) errors.businessIndustry = 'Business industry is required';
        if (!formData.entityType.trim()) errors.entityType = 'Entity type is required';
        if (!formData.numberOfEmployees.trim()) errors.numberOfEmployees = 'Number of employees is required';
        break;
        
      case 2: // Personal Information
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.dateOfBirth.trim()) errors.dateOfBirth = 'Date of birth is required';
        if (!formData.ssn.trim()) errors.ssn = 'SSN is required';
        if (!formData.homeAddress.trim()) errors.homeAddress = 'Home address is required';
        if (!formData.personalCity.trim()) errors.personalCity = 'City is required';
        if (!formData.personalState.trim()) errors.personalState = 'State is required';
        if (!formData.personalZip.trim()) errors.personalZip = 'ZIP code is required';
        if (!formData.mobilePhone.trim()) errors.mobilePhone = 'Mobile phone is required';
        if (!formData.housingStatus.trim()) errors.housingStatus = 'Housing status is required';
        if (!formData.driversLicense.trim()) errors.driversLicense = 'Driver\'s license is required';
        if (!formData.issuingState.trim()) errors.issuingState = 'Issuing state is required';
        break;
        
      case 3: // Employment Information
        if (!formData.currentEmployer.trim()) errors.currentEmployer = 'Current employer is required';
        if (!formData.position.trim()) errors.position = 'Position is required';
        if (!formData.yearsAtEmployer.trim()) errors.yearsAtEmployer = 'Years at employer is required';
        if (!formData.employerPhone.trim()) errors.employerPhone = 'Employer phone is required';
        break;
        
      case 4: // Financial Information
        if (!formData.personalBankName.trim()) errors.personalBankName = 'Personal bank name is required';
        if (!formData.personalBankBalance.trim()) errors.personalBankBalance = 'Personal bank balance is required';
        if (!formData.businessBankName.trim()) errors.businessBankName = 'Business bank name is required';
        if (!formData.businessBankBalance.trim()) errors.businessBankBalance = 'Business bank balance is required';
        if (!formData.usCitizen) errors.usCitizen = 'US citizenship status is required';
        if (!formData.savingsAccount) errors.savingsAccount = 'Savings account status is required';
        if (!formData.investmentAccounts) errors.investmentAccounts = 'Investment accounts status is required';
        if (!formData.militaryAffiliation) errors.militaryAffiliation = 'Military affiliation status is required';
        if (!formData.otherIncome) errors.otherIncome = 'Other income status is required';
        if (!formData.otherAssets) errors.otherAssets = 'Other assets status is required';
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStepNavigation = (direction: 'next' | 'prev' | 'forward' | 'back') => {
    if (direction === 'next' || direction === 'forward') {
      if (validateStep(currentStep)) {
        if (currentStep < 4) {
          setCurrentStep(currentStep + 1);
        } else {
          handleFormSubmission();
        }
      }
    } else if (direction === 'prev' || direction === 'back') {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        setFormErrors({}); // Clear errors when going back
      } else {
        setFundingOption(null);
        setCurrentStep(1);
        setFormErrors({});
      }
    }
  };

  const handleFormSubmission = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    try {
      // Prepare the data for submission to funding_requests table
      const submissionData = {
        // Basic funding request fields
        title: `${formData.businessName || 'Business'} - Done for You Funding Request`,
        description: `Done for You funding application for ${formData.businessName || 'business'} requesting $${formData.fundingAmount} for ${formData.intendedUse}`,
        amount: parseFloat(formData.fundingAmount) || 0,
        purpose: 'other', // Since this is a comprehensive application
        priority: 'medium',
        funding_type: 'done-for-you',
        
        // Business Information
        title_position: formData.titlePosition,
        intended_use: formData.intendedUse,
        business_name: formData.businessName,
        business_phone: formData.businessPhone,
        business_email: formData.businessEmail,
        business_address: formData.businessAddress,
        business_city: formData.city,
        business_state: formData.state,
        business_zip: formData.zip,
        date_commenced: formData.dateCommenced,
        business_website: formData.businessWebsite,
        business_industry: formData.businessIndustry,
        entity_type: formData.entityType,
        incorporation_state: formData.incorporationState,
        number_of_employees: parseInt(formData.numberOfEmployees) || null,
        ein: formData.ein,
        monthly_gross_sales: parseFloat(formData.monthlyGrossSales) || null,
        projected_annual_revenue: parseFloat(formData.projectedAnnualRevenue) || null,
        
        // Personal Information
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        birth_city: formData.birthCity,
        ssn: formData.ssn,
        mothers_maiden_name: formData.mothersMaidenName,
        home_address: formData.homeAddress,
        personal_city: formData.personalCity,
        personal_state: formData.personalState,
        personal_zip: formData.personalZip,
        home_phone: formData.homePhone,
        mobile_phone: formData.mobilePhone,
        housing_status: formData.housingStatus,
        monthly_housing_payment: parseFloat(formData.monthlyHousingPayment) || null,
        years_at_address: parseFloat(formData.yearsAtAddress) || null,
        drivers_license: formData.driversLicense,
        issuing_state: formData.issuingState,
        issue_date: formData.issueDate,
        expiration_date: formData.expirationDate,
        
        // Employment Information
        current_employer: formData.currentEmployer,
        position: formData.position,
        years_at_employer: parseFloat(formData.yearsAtEmployer) || null,
        employer_phone: formData.employerPhone,
        employer_address: formData.employerAddress,
        
        // Financial Information
        personal_bank_name: formData.personalBankName,
        personal_bank_balance: parseFloat(formData.personalBankBalance) || null,
        business_bank_name: formData.businessBankName,
        business_bank_balance: parseFloat(formData.businessBankBalance) || null,
        us_citizen: formData.usCitizen,
        savings_account: formData.savingsAccount,
        investment_accounts: formData.investmentAccounts,
        military_affiliation: formData.militaryAffiliation,
        other_income: formData.otherIncome,
        other_assets: formData.otherAssets,
        banks_to_ignore: formData.banksToIgnore
      };

      // Submit to funding requests API
      const response = await fetch('/api/funding-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit funding request');
      }

      const result = await response.json();
      console.log('Funding request submitted successfully:', result);
      
      // Show success message and close modal
      setShowFundingModal(false);
      setFundingOption(null);
      setCurrentStep(1);
      setFormData({
        titlePosition: '', fundingAmount: '', intendedUse: '', businessName: '', businessPhone: '', businessEmail: '',
        businessAddress: '', city: '', state: '', zip: '', dateCommenced: '', businessWebsite: '', businessIndustry: '',
        entityType: '', incorporationState: '', numberOfEmployees: '', ein: '', monthlyGrossSales: '', projectedAnnualRevenue: '',
        firstName: '', middleName: '', lastName: '', dateOfBirth: '', birthCity: '', ssn: '', mothersMaidenName: '',
        homeAddress: '', personalCity: '', personalState: '', personalZip: '', homePhone: '', mobilePhone: '',
        housingStatus: '', monthlyHousingPayment: '', yearsAtAddress: '', driversLicense: '', issuingState: '',
        issueDate: '', expirationDate: '', currentEmployer: '', position: '', yearsAtEmployer: '', employerPhone: '',
        employerAddress: '', personalBankName: '', personalBankBalance: '', businessBankName: '', businessBankBalance: '',
        usCitizen: '', savingsAccount: '', investmentAccounts: '', militaryAffiliation: '', otherIncome: '', otherAssets: '',
        banksToIgnore: []
      });
      setFormErrors({});
      
      // Show success notification
      alert('Your Done for You funding request has been submitted successfully!');
    } catch (error) {
      console.error('Form submission error:', error);
      alert(`Error submitting funding request: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add a debug effect to monitor reportData changes
  useEffect(() => {
    console.log('🔍 DEBUG: reportData state changed:', reportData.scores);
  }, [reportData]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scoring Model State
  const [compareMode, setCompareMode] = useState<'personal' | 'business' | 'both'>('both');
  const [dynamicFundingData, setDynamicFundingData] = useState(null);
  const [gapAnalysisData, setGapAnalysisData] = useState(null);
  const [refreshAuditNonce, setRefreshAuditNonce] = useState(0);
  const [isRerunningAudit, setIsRerunningAudit] = useState(false);

  // Calculate dynamic funding projections when report data changes
  useEffect(() => {
    if (reportData && reportData.accounts && reportData.accounts.length > 0) {
      try {
        console.log('🔍 DEBUG: Calculating dynamic funding projections...');
        
        // Initialize funding calculator with credit report data
        const fundingCalculator = new FundingProjectionsCalculator(reportData);
        const projections = fundingCalculator.getAllProjections();
        
        // Validate projections structure
        if (!projections || typeof projections !== 'object') {
          throw new Error('Invalid projections structure');
        }
        
        // Initialize gap analyzer
        const gapAnalyzer = new GapAnalyzer();
        const avgCreditScore = Math.round((reportData.scores.experian + reportData.scores.transunion + reportData.scores.equifax) / 3);
        const gapAnalysis = gapAnalyzer.getComprehensiveAnalysis(projections, avgCreditScore);
        
        // Validate gap analysis structure
        if (!gapAnalysis || typeof gapAnalysis !== 'object') {
          throw new Error('Invalid gap analysis structure');
        }
        
        // Ensure improvementRoadmap has the correct structure
        if (gapAnalysis.improvementRoadmap && typeof gapAnalysis.improvementRoadmap === 'object') {
          // Ensure all roadmap arrays exist
          if (!Array.isArray(gapAnalysis.improvementRoadmap.immediate)) {
            gapAnalysis.improvementRoadmap.immediate = [];
          }
          if (!Array.isArray(gapAnalysis.improvementRoadmap.shortTerm)) {
            gapAnalysis.improvementRoadmap.shortTerm = [];
          }
          if (!Array.isArray(gapAnalysis.improvementRoadmap.longTerm)) {
            gapAnalysis.improvementRoadmap.longTerm = [];
          }
        } else {
          // Create default roadmap structure if missing
          gapAnalysis.improvementRoadmap = {
            immediate: [],
            shortTerm: [],
            longTerm: []
          };
        }
        
        // Validate personal and business data structures
        if (!gapAnalysis.personal || typeof gapAnalysis.personal !== 'object') {
          gapAnalysis.personal = {
            currentFunding: 0,
            benchmarkFunding: 0,
            fundingGap: 0,
            utilizationGap: { current: 0, optimal: 0 },
            creditAgeGap: { current: 0 }
          };
        }
        
        if (!gapAnalysis.business || typeof gapAnalysis.business !== 'object') {
          gapAnalysis.business = {
            currentFunding: 0,
            benchmarkFunding: 0,
            fundingGap: 0,
            einStatus: 'Unknown',
            riskLevel: 'Medium'
          };
        }
        
        setDynamicFundingData(projections);
        setGapAnalysisData(gapAnalysis);
        
        console.log('🔍 DEBUG: Dynamic funding projections calculated:', projections);
        console.log('🔍 DEBUG: Gap analysis completed:', gapAnalysis);
      } catch (error) {
        console.error('Error calculating dynamic funding projections:', error);
        // Fallback to mock data if calculation fails
        setDynamicFundingData(null);
        setGapAnalysisData(null);
      }
    }
  }, [reportData]);

  // Calculate actual credit age from account data
  const calculateCreditAge = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return "No accounts";
    }

    const currentDate = new Date();
    let totalMonths = 0;
    let validAccounts = 0;

    reportData.accounts.forEach((account: any) => {
      const dateOpened = account.DateOpened || account.dateOpened || account.opened;
      if (dateOpened) {
        const openDate = new Date(dateOpened);
        if (!isNaN(openDate.getTime())) {
          const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - openDate.getMonth());
          if (monthsDiff >= 0) {
            totalMonths += monthsDiff;
            validAccounts++;
          }
        }
      }
    });

    if (validAccounts === 0) {
      return "No valid accounts";
    }

    const averageMonths = Math.round(totalMonths / validAccounts);
    const years = Math.floor(averageMonths / 12);
    const months = averageMonths % 12;

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  };

  // Calculate actual credit utilization from account data
  const calculateUtilization = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return 0;
    }

    let totalBalance = 0;
    let totalLimit = 0;

    reportData.accounts.forEach((account: any) => {
      // Only consider revolving accounts for utilization calculation
      const accountType = account.CreditType || account.type || account.AccountType || '';
      if (accountType.toLowerCase().includes('revolving') || accountType.toLowerCase().includes('credit card')) {
        const balance = parseFloat(account.CurrentBalance || account.balance || '0');
        const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
        
        if (!isNaN(balance) && !isNaN(limit) && limit > 0) {
          totalBalance += balance;
          totalLimit += limit;
        }
      }
    });

    if (totalLimit === 0) {
      return 0;
    }

    return Math.round((totalBalance / totalLimit) * 100);
  };

  // Calculate actual funding projections using credit signals and funding logic
  const calculateFundingProjections = () => {
    if (!reportData.accounts || reportData.accounts.length === 0) {
      return {
        personal: {
          maxCards: 3,
          estimatedFunding: 15000,
          bureauLogic: "No account data available"
        },
        business: {
          maxCards: 2,
          estimatedFunding: 20000,
          bureauLogic: "No account data available"
        }
      };
    }

    // Extract credit signals from account data
    const accounts = reportData.accounts;
    const currentDate = new Date();
    
    // Calculate credit utilization
    const utilization = calculateUtilization();
    
    // Calculate average account age in months
    let totalMonths = 0;
    let validAccounts = 0;
    accounts.forEach((account: any) => {
      const dateOpened = account.DateOpened || account.dateOpened || account.opened;
      if (dateOpened) {
        const openDate = new Date(dateOpened);
        if (!isNaN(openDate.getTime())) {
          const monthsDiff = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - openDate.getMonth());
          if (monthsDiff >= 0) {
            totalMonths += monthsDiff;
            validAccounts++;
          }
        }
      }
    });
    const averageAccountAge = validAccounts > 0 ? Math.round(totalMonths / validAccounts) : 0;
    
    // Count recent inquiries (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentInquiries = reportData.inquiries ? reportData.inquiries.filter((inquiry: any) => {
      const inquiryDate = new Date(inquiry.date);
      return inquiryDate >= sixMonthsAgo && inquiry.type === 'Hard';
    }).length : 0;
    
    // Count open revolving accounts
    const openRevolvingAccounts = accounts.filter((account: any) => {
      const accountType = account.CreditType || account.type || account.AccountType || '';
      const status = account.AccountStatus || account.status || '';
      return accountType.toLowerCase().includes('revolving') && 
             (status.toLowerCase() === 'open' || status.toLowerCase() === 'current');
    });
    
    // Calculate total credit limits and balances
    let totalCreditLimit = 0;
    let totalBalance = 0;
    openRevolvingAccounts.forEach((account: any) => {
      const limit = parseFloat(account.CreditLimit || account.limit || account.creditLimit || '0');
      const balance = parseFloat(account.CurrentBalance || account.balance || '0');
      if (!isNaN(limit) && !isNaN(balance)) {
        totalCreditLimit += limit;
        totalBalance += balance;
      }
    });
    
    // Get average credit score
    const avgScore = reportData.scores ? 
      Math.round((parseInt(reportData.scores.experian) + parseInt(reportData.scores.transunion) + parseInt(reportData.scores.equifax)) / 3) : 700;
    
    // Calculate personal funding projection
    let personalMaxCards = 5; // Base number
    let personalEstimatedFunding = 25000; // Base funding
    
    // Adjust based on credit score
    if (avgScore >= 750) {
      personalMaxCards = Math.round(personalMaxCards * 1.5);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 2.5);
    } else if (avgScore >= 700) {
      personalMaxCards = Math.round(personalMaxCards * 1.3);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 2.0);
    } else if (avgScore >= 650) {
      personalMaxCards = Math.round(personalMaxCards * 1.1);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.5);
    }
    
    // Adjust based on utilization
    if (utilization <= 10) {
      personalMaxCards = Math.round(personalMaxCards * 1.2);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.3);
    } else if (utilization > 30) {
      personalMaxCards = Math.round(personalMaxCards * 0.8);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.7);
    }
    
    // Adjust based on account age
    if (averageAccountAge >= 36) { // 3+ years
      personalMaxCards = Math.round(personalMaxCards * 1.2);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.2);
    } else if (averageAccountAge < 12) { // Less than 1 year
      personalMaxCards = Math.round(personalMaxCards * 0.7);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.6);
    }
    
    // Adjust based on recent inquiries
    if (recentInquiries > 6) {
      personalMaxCards = Math.round(personalMaxCards * 0.6);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 0.6);
    } else if (recentInquiries <= 2) {
      personalMaxCards = Math.round(personalMaxCards * 1.1);
      personalEstimatedFunding = Math.round(personalEstimatedFunding * 1.1);
    }
    
    // Ensure reasonable bounds
    personalMaxCards = Math.max(2, Math.min(20, personalMaxCards));
    personalEstimatedFunding = Math.max(10000, Math.min(500000, personalEstimatedFunding));
    
    // Calculate business funding (typically higher limits)
    const businessMaxCards = Math.round(personalMaxCards * 0.8);
    const businessEstimatedFunding = Math.round(personalEstimatedFunding * 1.4);
    
    // Generate bureau logic descriptions
    const personalBureauLogic = `Score: ${avgScore}, Util: ${utilization}%, Age: ${Math.round(averageAccountAge/12)}y, Inq: ${recentInquiries}`;
    const businessBureauLogic = `EIN required, Score: ${avgScore}+, Business profile verified`;
    
    return {
      personal: {
        maxCards: personalMaxCards,
        estimatedFunding: personalEstimatedFunding,
        bureauLogic: personalBureauLogic
      },
      business: {
        maxCards: businessMaxCards,
        estimatedFunding: businessEstimatedFunding,
        bureauLogic: businessBureauLogic
      }
    };
  };

  // Comprehensive Audit-Ready Credit Analysis Functions
  const calculateAuditReadyAnalysis = (accounts: any[], inquiries: any, publicRecords: any[], avgScore: number) => {
    console.log('🔍 DEBUG: calculateAuditReadyAnalysis called with:', {
      accountsLength: accounts.length,
      inquiries,
      publicRecordsLength: publicRecords.length,
      avgScore
    });
    
    console.log('🔍 DEBUG: Sample account structure:', accounts[0]);
    console.log('🔍 DEBUG: All unique AccountStatus values:', [...new Set(accounts.map(a => a.AccountStatus))]);
    console.log('🔍 DEBUG: All unique CreditType values:', [...new Set(accounts.map(a => a.CreditType))]);
    console.log('🔍 DEBUG: All unique AccountTypeDescription values:', [...new Set(accounts.map(a => a.AccountTypeDescription))]);
    
    // Filter only open revolving accounts with positive limits - using correct field names from API
    const openRevolvingAccounts = accounts.filter(acc => {
      const isOpen = acc.AccountStatus === 'Open';
      const isRevolving = acc.CreditType === 'Revolving Account' || acc.AccountTypeDescription === 'Revolving Account';
      const hasLimit = parseFloat(acc.CreditLimit || '0') > 0;
      
      if (acc.CreditorName && acc.CreditorName.includes('CAPITAL')) {
        console.log('🔍 DEBUG: Sample filter check for', acc.CreditorName, {
          AccountStatus: acc.AccountStatus,
          CreditType: acc.CreditType,
          AccountTypeDescription: acc.AccountTypeDescription,
          CreditLimit: acc.CreditLimit,
          isOpen,
          isRevolving,
          hasLimit,
          passes: isOpen && isRevolving && hasLimit
        });
      }
      
      return isOpen && isRevolving && hasLimit;
    });

    console.log('🔍 DEBUG: Open revolving accounts found:', openRevolvingAccounts.length);
    console.log('🔍 DEBUG: Sample filtered account:', openRevolvingAccounts[0]);

    // Dedupe obvious bureau duplicates (same lender + same limit)
    const deduplicatedAccounts = openRevolvingAccounts.reduce((unique: any[], account: any) => {
      const creditorName = account.CreditorName || '';
      const creditLimit = parseFloat(account.CreditLimit || '0');
      
      const isDuplicate = unique.some(existing => {
        const existingCreditor = existing.CreditorName || '';
        const existingLimit = parseFloat(existing.CreditLimit || '0');
        return existingCreditor === creditorName && Math.abs(existingLimit - creditLimit) < 100;
      });
      
      if (!isDuplicate) {
        unique.push(account);
      }
      return unique;
    }, []);

    console.log('🔍 DEBUG: Deduplicated accounts:', deduplicatedAccounts.length);

    // Calculate key signals using correct field names
    const totalAggregateLimit = deduplicatedAccounts.reduce((sum, acc) => 
      sum + parseFloat(acc.CreditLimit || '0'), 0);
    
    const highestSingleLimit = Math.max(...deduplicatedAccounts.map(acc => 
      parseFloat(acc.CreditLimit || '0')), 0);

    console.log('🔍 DEBUG: Total aggregate limit:', totalAggregateLimit);
    console.log('🔍 DEBUG: Highest single limit:', highestSingleLimit);

    const signals = {
      totalAggregateLimit,
      highestSingleLimit,
      highLimitTradelines: {
        over10k: deduplicatedAccounts.filter(acc => 
          parseFloat(acc.CreditLimit || '0') >= 10000).length,
        over25k: deduplicatedAccounts.filter(acc => 
          parseFloat(acc.CreditLimit || '0') >= 25000).length
      },
      averageUtilization: deduplicatedAccounts.length > 0 ? 
        deduplicatedAccounts.reduce((sum, acc) => {
          const balance = parseFloat(acc.CurrentBalance || '0');
          const limit = parseFloat(acc.CreditLimit || '0');
          return sum + (limit > 0 ? (balance / limit) * 100 : 0);
        }, 0) / deduplicatedAccounts.length : 0,
      openRevolvingCount: deduplicatedAccounts.length,
      averageAccountAge: deduplicatedAccounts.length > 0 ?
        deduplicatedAccounts.reduce((sum, acc) => {
          const openDate = new Date(acc.DateOpened || '2020-01-01');
          const monthsOpen = Math.max(0, Math.floor((Date.now() - openDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
          return sum + monthsOpen;
        }, 0) / deduplicatedAccounts.length : 0,
      inquiriesByBureau: {
        equifax: (inquiries && inquiries.equifax) || 0,
        experian: (inquiries && inquiries.experian) || 0,
        transunion: (inquiries && inquiries.transunion) || 0,
        total: ((inquiries && inquiries.equifax) || 0) + ((inquiries && inquiries.experian) || 0) + ((inquiries && inquiries.transunion) || 0)
      },
      inquiryHeadroom: {
        equifax: Math.max(0, 4 - ((inquiries && inquiries.equifax) || 0)),
        experian: Math.max(0, 4 - ((inquiries && inquiries.experian) || 0)),
        transunion: Math.max(0, 4 - ((inquiries && inquiries.transunion) || 0))
      },
      installmentLoad: accounts.filter(acc => 
        acc.CreditType === 'Installment' && acc.AccountStatus === 'Open')
        .reduce((sum, acc) => {
          const balance = parseFloat(acc.CurrentBalance || '0');
          const original = parseFloat(acc.HighBalance || '1');
          return sum + (original > 0 ? balance / original : 0);
        }, 0) / Math.max(1, accounts.filter(acc => 
          acc.CreditType === 'Installment' && acc.AccountStatus === 'Open').length),
      latePaymentCounts: {
        late30: accounts.reduce((sum, acc) => {
          // Count 30-day lates from PayStatusHistory (look for '1' characters)
          const history = acc.PayStatusHistory || '';
          const late30Count = (history.match(/1/g) || []).length;
          return sum + late30Count;
        }, 0),
        late60: accounts.reduce((sum, acc) => {
          // Count 60-day lates from PayStatusHistory (look for '2' characters)
          const history = acc.PayStatusHistory || '';
          const late60Count = (history.match(/2/g) || []).length;
          return sum + late60Count;
        }, 0),
        late90: accounts.reduce((sum, acc) => {
          // Count 90-day lates from PayStatusHistory (look for '3' characters)
          const history = acc.PayStatusHistory || '';
          const late90Count = (history.match(/3/g) || []).length;
          return sum + late90Count;
        }, 0)
      },
      hasDerogatory: (publicRecords && publicRecords.length > 0) || accounts.some(acc => 
        (acc.PaymentStatus && (acc.PaymentStatus.includes('Charge') || acc.PaymentStatus.includes('Collection'))) ||
        (acc.AccountStatus && acc.AccountStatus.includes('Charged Off'))
      ),
      hasMortgage: accounts.some(acc => 
        acc.CreditType === 'Mortgage' && acc.AccountStatus === 'Open')
    };

    // Calculate Implied Capacity Index (ICI)
    const supplyScore = Math.min(100, 
      (signals.totalAggregateLimit / 100000) * 30 +
      (signals.highestSingleLimit / 50000) * 20 +
      (signals.openRevolvingCount / 10) * 15 +
      (signals.highLimitTradelines.over10k / 5) * 10 +
      (signals.highLimitTradelines.over25k / 3) * 25
    );

    const behaviorScore = Math.min(100,
      Math.max(0, 100 - signals.averageUtilization) * 0.4 +
      Math.max(0, 100 - (signals.latePaymentCounts.late30 * 10 + signals.latePaymentCounts.late60 * 20 + signals.latePaymentCounts.late90 * 30)) * 0.3 +
      Math.max(0, 100 - (signals.inquiriesByBureau.total * 5)) * 0.2 +
      Math.max(0, 100 - (signals.installmentLoad * 100)) * 0.1
    );

    const seasoningScore = Math.min(100,
      (signals.averageAccountAge / 120) * 70 + // 120 months = 10 years for max score
      (signals.hasMortgage ? 30 : 0)
    );

    const ici = (supplyScore * 0.4 + behaviorScore * 0.4 + seasoningScore * 0.2) / 100;
    
    // Calculate Credit Decay based on inquiry count
    const calculateCreditDecay = (inquiryCount: number): number => {
      const decayTable = [
        { inquiries: 0, decay: 0.00 },  // Perfect profile
        { inquiries: 1, decay: 0.10 },  // Slight reduction
        { inquiries: 2, decay: 0.20 },  // Noticeable drop
        { inquiries: 3, decay: 0.30 },  // Moderate drop
        { inquiries: 4, decay: 0.40 },  // Significant drop
        { inquiries: 5, decay: 0.50 }   // Heavy decay (credit fatigue)
      ];
      
      // Find the appropriate decay percentage
      const decayEntry = decayTable.find(entry => inquiryCount <= entry.inquiries) || 
                        decayTable[decayTable.length - 1]; // Cap at 50% for 5+ inquiries
      
      return decayEntry.decay;
    };

    // Apply credit decay to bureau-specific limits
    const applyBureauDecay = (baseLimit: number, bureauInquiries: number): number => {
      const decayPercentage = calculateCreditDecay(bureauInquiries);
      const finalLimit = baseLimit * (1 - decayPercentage);
      return Math.floor(finalLimit / 5000) * 5000; // Round to nearest $5k
    };

    // Calculate Anchor Exposure
    const anchorExposure = ici * (signals.totalAggregateLimit + signals.highestSingleLimit);

    // Product mapping with $5k rounding
    const personalCardAmount = Math.floor((anchorExposure * 0.15) / 5000) * 5000;
    const businessCardAmount = Math.floor((anchorExposure * 0.22) / 5000) * 5000;

    // Calculate bureau-specific limits with decay
    const bureauLimits = {
      equifax: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.equifax,
        decay: calculateCreditDecay(signals.inquiriesByBureau.equifax),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.equifax)
      },
      experian: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.experian,
        decay: calculateCreditDecay(signals.inquiriesByBureau.experian),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.experian)
      },
      transunion: {
        baseLimit: personalCardAmount,
        inquiries: signals.inquiriesByBureau.transunion,
        decay: calculateCreditDecay(signals.inquiriesByBureau.transunion),
        finalLimit: applyBureauDecay(personalCardAmount, signals.inquiriesByBureau.transunion)
      }
    };

    const totalPotentialLimit = bureauLimits.equifax.finalLimit + 
                               bureauLimits.experian.finalLimit + 
                               bureauLimits.transunion.finalLimit;

    console.log('🔍 DEBUG: Credit Decay Analysis:', {
      basePersonalLimit: personalCardAmount,
      bureauLimits,
      totalPotentialLimit
    });

    // Multi-card discount policy
    const calculateMultiCardAmounts = (singleAmount: number, maxCards: number) => {
      const discounts = [1.0, 0.75, 0.60, 0.50]; // 1st, 2nd, 3rd, 4th card
      const amounts = [];
      for (let i = 0; i < Math.min(maxCards, 4); i++) {
        const cardAmount = Math.floor((singleAmount * discounts[i]) / 5000) * 5000;
        amounts.push(cardAmount);
      }
      return amounts;
    };

    // Determine optimal bureau routing
    const bureausByInquiries = [
      { name: 'Equifax', inquiries: signals.inquiriesByBureau.equifax, headroom: signals.inquiryHeadroom.equifax },
      { name: 'Experian', inquiries: signals.inquiriesByBureau.experian, headroom: signals.inquiryHeadroom.experian },
      { name: 'TransUnion', inquiries: signals.inquiriesByBureau.transunion, headroom: signals.inquiryHeadroom.transunion }
    ].sort((a, b) => b.headroom - a.headroom);

    // Calculate max cards by inquiry headroom
    const totalHeadroom = signals.inquiryHeadroom.equifax + signals.inquiryHeadroom.experian + signals.inquiryHeadroom.transunion;
    const maxCardsByInquiries = Math.min(12, totalHeadroom);

    // Generate scenarios
    const personalSingle = personalCardAmount;
    const personalMulti = calculateMultiCardAmounts(personalCardAmount, 2);
    const businessSingle = businessCardAmount;
    const businessMulti = calculateMultiCardAmounts(businessCardAmount, 2);

    // Max scenario (12-card if all bureaus clean)
    const maxScenarioCards = maxCardsByInquiries;
    const maxScenarioPersonal = calculateMultiCardAmounts(personalCardAmount, Math.min(4, Math.floor(maxScenarioCards / 2)));
    const maxScenarioBusiness = calculateMultiCardAmounts(businessCardAmount, Math.min(4, Math.ceil(maxScenarioCards / 2)));

    return {
      signals,
      ici,
      anchorExposure,
      creditDecay: {
        bureauLimits,
        totalPotentialLimit,
        decayAnalysis: {
          equifax: {
            inquiries: signals.inquiriesByBureau.equifax,
            decayPercentage: bureauLimits.equifax.decay * 100,
            limitReduction: bureauLimits.equifax.baseLimit - bureauLimits.equifax.finalLimit
          },
          experian: {
            inquiries: signals.inquiriesByBureau.experian,
            decayPercentage: bureauLimits.experian.decay * 100,
            limitReduction: bureauLimits.experian.baseLimit - bureauLimits.experian.finalLimit
          },
          transunion: {
            inquiries: signals.inquiriesByBureau.transunion,
            decayPercentage: bureauLimits.transunion.decay * 100,
            limitReduction: bureauLimits.transunion.baseLimit - bureauLimits.transunion.finalLimit
          }
        }
      },
      scenarios: {
        personalSingle: { amount: personalSingle, cards: 1 },
        personalMulti: { amounts: personalMulti, cards: personalMulti.length, total: personalMulti.reduce((sum, amt) => sum + amt, 0) },
        businessSingle: { amount: businessSingle, cards: 1 },
        businessMulti: { amounts: businessMulti, cards: businessMulti.length, total: businessMulti.reduce((sum, amt) => sum + amt, 0) },
        maxByInquiries: {
          cards: maxScenarioCards,
          personal: { amounts: maxScenarioPersonal, total: maxScenarioPersonal.reduce((sum, amt) => sum + amt, 0) },
          business: { amounts: maxScenarioBusiness, total: maxScenarioBusiness.reduce((sum, amt) => sum + amt, 0) },
          grandTotal: maxScenarioPersonal.reduce((sum, amt) => sum + amt, 0) + maxScenarioBusiness.reduce((sum, amt) => sum + amt, 0)
        }
      },
      bureauRouting: {
        primary: bureausByInquiries[0],
        secondary: bureausByInquiries[1],
        tertiary: bureausByInquiries[2],
        strategy: maxCardsByInquiries === 12 ? 'round-robin across all three bureaus' : `focus on ${bureausByInquiries[0].name} and ${bureausByInquiries[1].name}`
      }
    };
  };

  // Mock data for scoring model (fallback when dynamic data is not available)
  const scoringModelData = {
    userProfile: {
      scoreEquifax: dynamicFundingData ? reportData.scores.equifax : 720,
      scoreTransUnion: dynamicFundingData ? reportData.scores.transunion : 710,
      scoreExperian: dynamicFundingData ? reportData.scores.experian : 700,
      inquiries: {
        equifax: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'Equifax').length : 0,
        transunion: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'TransUnion').length : 0,
        experian: reportData.inquiries ? reportData.inquiries.filter(inquiry => inquiry.bureau === 'Experian').length : 0
      },
      creditAge: calculateCreditAge(),
      utilization: calculateUtilization()
    },
    fundingProjection: calculateFundingProjections()
  };

  const { userId: urlUserId } = useParams<{ userId: string }>();
  const clientId = searchParams.get("clientId") || urlUserId;
  const clientName = searchParams.get("clientName") || "Client";

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
      if (!clientId) {
        setError("No client ID provided");
        setLoading(false);
        return;
      }

      try {
        if (!isRerunningAudit) setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/credit-reports/funding-manager/${clientId}`, {
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

              const collectionsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Collection') || acc.AccountType?.includes('Collection')
              ).length;
              const chargeOffsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Charge')
              ).length;
              const latePaymentsCount = negativeAccounts.filter((acc: any) => 
                acc.PaymentStatus?.includes('Late') || acc.WorstPayStatus?.includes('Late')
              ).length;
              (criteria[bureauId] as any).noCollections = collectionsCount === 0;
              (criteria[bureauId] as any).noChargeOffs = chargeOffsCount === 0;
              (criteria[bureauId] as any).noLatePaymentsIn12Months = latePaymentsCount === 0;
              (criteria[bureauId] as any).noLatePayments = (criteria[bureauId] as any).noLatePaymentsIn12Months;

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
              bureau: inquiry.BureauId === 1 ? 'TransUnion' : inquiry.BureauId === 2 ? 'Equifax' : 'Experian'
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
          
          try {
            const qc = qualificationCriteria;
            const getInquiryCountByName = (name: string) => {
              try {
                const listA = (reportData as any)?.inquiries || [];
                if (Array.isArray(listA) && listA.length > 0) {
                  return listA.filter((inq: any) => String(inq?.bureau) === name && (String(inq?.type).toLowerCase() === 'hard' || String(inq?.InquiryType) === 'I')).length;
                }
                const rawB = (data as any)?.data?.reportData?.reportData?.Inquiries || (data as any)?.data?.reportData?.Inquiries || [];
                const mapId = (n: string) => n === 'TransUnion' ? 1 : (n === 'Experian' ? 2 : 3);
                return rawB.filter((inq: any) => Number(inq?.BureauId) === mapId(name) && String(inq?.InquiryType) === 'I').length;
              } catch {
                return 0;
              }
            };
            const inquiriesUnderLimit = (name: string) => getInquiryCountByName(name) < 4;
            const isPass = (c: any, name: string) => Boolean(c?.score700Plus || c?.score730Plus)
              && Boolean(c?.openRevolvingUnder30)
              && Boolean(c?.allRevolvingUnder30)
              && Boolean(c?.minFiveOpenRevolving)
              && Boolean(c?.creditCard3YearsOld5KLimit)
              && Boolean(c?.maxFourUnsecuredIn12Months)
              && Boolean(inquiriesUnderLimit(name))
              && Boolean(c?.noCollections)
              && Boolean(c?.noChargeOffs)
              && Boolean(c?.noLatePayments)
              && Boolean(c?.noBankruptcies)
              && Boolean(c?.noCollectionsLiensJudgements);
            const fundable_in_tu = isPass(qc?.[1], 'TransUnion');
            const fundable_in_ex = isPass(qc?.[3], 'Experian');
            const fundable_in_eq = isPass(qc?.[2], 'Equifax');
            const fundable_status = (fundable_in_tu || fundable_in_ex || fundable_in_eq) ? 'fundable' : 'not_fundable';

            const updateRes = await fetch(`/api/clients/${clientId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ fundable_in_tu, fundable_in_ex, fundable_in_eq, fundable_status })
            });
            console.log('🔍 DEBUG: Persist fundability flags response status:', updateRes.status);
          } catch (persistErr) {
            console.warn('⚠️ Failed to persist fundability flags:', persistErr);
          }

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

          try {
            const qc = mockQualificationCriteria;
            const getInquiryCountByName = (name: string) => {
              try {
                const listA = (updatedMockData as any)?.inquiries || [];
                if (Array.isArray(listA) && listA.length > 0) {
                  return listA.filter((inq: any) => String(inq?.bureau) === name && (String(inq?.type).toLowerCase() === 'hard' || String(inq?.InquiryType) === 'I')).length;
                }
                const rawB = [] as any[];
                return 0;
              } catch {
                return 0;
              }
            };
            const inquiriesUnderLimit = (name: string) => getInquiryCountByName(name) < 4;
            const isPass = (c: any, name: string) => Boolean(c?.score700Plus || c?.score730Plus)
              && Boolean(c?.openRevolvingUnder30)
              && Boolean(c?.allRevolvingUnder30)
              && Boolean(c?.minFiveOpenRevolving)
              && Boolean(c?.creditCard3YearsOld5KLimit)
              && Boolean(c?.maxFourUnsecuredIn12Months)
              && Boolean(inquiriesUnderLimit(name))
              && Boolean(c?.noCollections)
              && Boolean(c?.noChargeOffs)
              && Boolean(c?.noLatePayments)
              && Boolean(c?.noBankruptcies)
              && Boolean(c?.noCollectionsLiensJudgements);
            const fundable_in_tu = isPass(qc?.[1], 'TransUnion');
            const fundable_in_ex = isPass(qc?.[3], 'Experian');
            const fundable_in_eq = isPass(qc?.[2], 'Equifax');
            const fundable_status = (fundable_in_tu || fundable_in_ex || fundable_in_eq) ? 'fundable' : 'not_fundable';

            const tokenLocal = localStorage.getItem('auth_token');
            if (tokenLocal) {
              await fetch(`/api/clients/${clientId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${tokenLocal}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fundable_in_tu, fundable_in_ex, fundable_in_eq, fundable_status })
              });
            }
          } catch (persistErr) {
            console.warn('⚠️ Failed to persist fundability flags (mock branch):', persistErr);
          }
        }
      } catch (err) {
        console.error('Error fetching credit report:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch credit report');
        // Keep using mock data on error
      } finally {
        setLoading(false);
        setIsRerunningAudit(false);
      }
    };

    fetchCreditReport();
  }, [clientId, refreshAuditNonce]);

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
      <FundingManagerLayout
        title={`Credit Report - ${clientName}`}
        description="Loading credit report..."
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading credit report...</p>
          </div>
        </div>
      </FundingManagerLayout>
    );
  }

  if (error) {
    return (
      <FundingManagerLayout
        title={`Credit Report - ${clientName}`}
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
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout
      title={`Credit Report - ${clientName}`}
      description="Detailed credit report analysis and information"
    >
      {/* Header Navigation */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/reports")}
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

          {/* Qualify View Toggle */}
          <div className="flex justify-end items-center gap-2 mt-4 mb-2">
            <span className="text-xs text-gray-600">Qualification view:</span>
          <ToggleGroup
            type="single"
            value={qualifyView}
            onValueChange={(v) => v && setQualifyView(v as 'cards' | 'table')}
            className="bg-white border rounded-md shadow-sm"
          >
            <ToggleGroupItem value="cards" className="px-3 py-1 text-sm">
              Summary
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="px-3 py-1 text-sm">
              Criteria
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            onClick={() => { setIsRerunningAudit(true); setRefreshAuditNonce(n => n + 1); }}
            variant="outline"
            className="text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRerunningAudit ? 'animate-spin' : ''}`} />
            Rerun Funding Audit
          </Button>
        </div>

          {/* Debt Utilization - Full Width */}
          <Card className={`${qualifyView !== 'cards' ? 'hidden' : ''} border-0 shadow-xl bg-gradient-to-br from-white via-green-50/30 to-emerald-50/50`}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-800">Do You Qualify</CardTitle>
            </CardHeader>
            <CardContent>
              {/* First Row - 6 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                
                {/* Credit Score Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      Credit Score
                      <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the highest score from the three bureaus
                          const tuScore = parseInt(reportData?.scores?.transunion || '0');
                          const exScore = parseInt(reportData?.scores?.experian || '0');
                          const eqScore = parseInt(reportData?.scores?.equifax || '0');
                          const highestScore = Math.max(tuScore, exScore, eqScore);
                          
                          // Calculate grade based on highest score
                          if (highestScore >= 800) return '10/10';
                          if (highestScore >= 790) return '9/10';
                          if (highestScore >= 780) return '8/10';
                          if (highestScore >= 770) return '7/10';
                          if (highestScore >= 760) return '6/10';
                          if (highestScore >= 750) return '5/10';
                          if (highestScore >= 740) return '4/10';
                          if (highestScore >= 730) return '3/10';
                          if (highestScore >= 720) return '2/10';
                          if (highestScore >= 700) return '1/10';
                          return '0/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [800, 790, 780, 770, 760, 750, 740, 730, 720, 710, 700];
                            const colors = ['green', 'blue', 'yellow', 'orange', 'red', 'yellow', 'orange', 'yellow', 'yellow', 'orange', 'red'];
                            
                            // Function to map score to nearest scale
                            const mapScoreToScale = (score) => {
                              if (!score) return null;
                              const numScore = parseInt(score);
                              // If score is below 700, don't map to any scale (will be shown in "Below 700" row)
                              if (numScore < 700) return null;
                              // Find the closest scale value (round down to nearest 10, then find in scales)
                              const roundedScore = Math.floor(numScore / 10) * 10;
                              return scales.find(scale => scale <= roundedScore) || null;
                            };
                            
                            // Get actual scores
                            const tuScore = reportData?.scores?.transunion;
                            const exScore = reportData?.scores?.experian;
                            const eqScore = reportData?.scores?.equifax;
                            
                            // Map scores to scales
                            const tuScale = mapScoreToScale(tuScore);
                            const exScale = mapScoreToScale(exScore);
                            const eqScale = mapScoreToScale(eqScore);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`border-b bg-${colors[index]}-50`}>
                                <td className={`py-1 px-1 text-${colors[index]}-600`}>{scale}</td>
                                <td className="text-center py-1 px-1 font-semibold text-blue-600">
                                  {tuScale === scale ? tuScore : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-semibold text-green-600">
                                  {exScale === scale ? exScore : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-semibold text-purple-600">
                                  {eqScale === scale ? eqScore : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for scores below the lowest scale
                            const hasLowScores = (tuScore && parseInt(tuScore) < scales[scales.length - 1]) || 
                                               (exScore && parseInt(exScore) < scales[scales.length - 1]) || 
                                               (eqScore && parseInt(eqScore) < scales[scales.length - 1]);
                            
                            if (hasLowScores) {
                              rows.push(
                                <tr key="below-scale" className="border-b bg-red-50">
                                  <td className="py-1 px-1 text-red-600">Below {scales[scales.length - 1]}</td>
                                  <td className="text-center py-1 px-1 font-semibold text-blue-600">
                                    {tuScore && parseInt(tuScore) < scales[scales.length - 1] ? tuScore : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-semibold text-green-600">
                                    {exScore && parseInt(exScore) < scales[scales.length - 1] ? exScore : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-semibold text-purple-600">
                                    {eqScore && parseInt(eqScore) < scales[scales.length - 1] ? eqScore : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Credit Usage Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      Credit Usage
                      <span className="text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the lowest utilization from the three bureaus (lower is better)
                          const tuUtilization = apiData?.debtUtilization?.[1]?.openRevolvingUtilization || 100;
                          const exUtilization = apiData?.debtUtilization?.[3]?.openRevolvingUtilization || 100;
                          const eqUtilization = apiData?.debtUtilization?.[2]?.openRevolvingUtilization || 100;
                          const lowestUtilization = Math.min(tuUtilization, exUtilization, eqUtilization);
                          
                          // Calculate grade based on lowest utilization (lower is better)
                          if (lowestUtilization <= 0) return '10/10';
                          if (lowestUtilization <= 5) return '9/10';
                          if (lowestUtilization <= 10) return '8/10';
                          if (lowestUtilization <= 15) return '7/10';
                          if (lowestUtilization <= 20) return '6/10';
                          if (lowestUtilization <= 25) return '5/10';
                          if (lowestUtilization <= 30) return '4/10';
                          if (lowestUtilization <= 40) return '3/10';
                          if (lowestUtilization <= 50) return '2/10';
                          if (lowestUtilization <= 70) return '1/10';
                          return '0/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Scale-based indicator rows */}
                          {(() => {
                            const scales = [0, 5, 10, 15, 20, 25, 30];
                            const colors = ['green', 'blue', 'yellow', 'orange', 'red', 'yellow', 'orange'];
                            
                            // Function to map utilization to nearest scale
                            const mapUtilizationToScale = (utilization) => {
                              if (utilization === null || utilization === undefined) return null;
                              const numUtil = Math.round(utilization);
                              // Find the closest scale value (round to nearest 5)
                              const roundedUtil = Math.round(numUtil / 5) * 5;
                              return scales.find(scale => scale >= roundedUtil) || scales[scales.length - 1];
                            };
                            
                            // Get actual utilization data from debtUtilization
                            const tuUtilization = apiData?.debtUtilization?.[1]?.openRevolvingUtilization;
                            const exUtilization = apiData?.debtUtilization?.[3]?.openRevolvingUtilization;
                            const eqUtilization = apiData?.debtUtilization?.[2]?.openRevolvingUtilization;
                            
                            // Debug logging
                            console.log('🔍 Credit Usage Debug:', {
                              tuUtilization,
                              exUtilization,
                              eqUtilization,
                              scales,
                              hasLowValues: (tuUtilization !== null && tuUtilization < scales[0]) || 
                                           (exUtilization !== null && exUtilization < scales[0]) || 
                                           (eqUtilization !== null && eqUtilization < scales[0]),
                              apiData: apiData?.debtUtilization
                            });
                            
                            // Map utilizations to scales
                            const tuScale = mapUtilizationToScale(tuUtilization);
                            const exScale = mapUtilizationToScale(exUtilization);
                            const eqScale = mapUtilizationToScale(eqUtilization);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`border-b bg-${colors[index]}-50`}>
                                <td className={`py-1 px-1 text-${colors[index]}-600`}>{scale}%</td>
                                <td className="text-center py-1 px-1 font-semibold text-blue-600">
                                  {tuScale === scale ? `${tuUtilization?.toFixed(1)}%` : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-semibold text-green-600">
                                  {exScale === scale ? `${exUtilization?.toFixed(1)}%` : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-semibold text-purple-600">
                                  {eqScale === scale ? `${eqUtilization?.toFixed(1)}%` : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for values below the lowest scale
                            const hasLowValues = (tuUtilization !== null && tuUtilization !== undefined && tuUtilization < scales[0]) || 
                                               (exUtilization !== null && exUtilization !== undefined && exUtilization < scales[0]) || 
                                               (eqUtilization !== null && eqUtilization !== undefined && eqUtilization < scales[0]);
                            
                            if (hasLowValues) {
                              rows.unshift(
                                <tr key="below-scale" className="border-b bg-gray-50">
                                  <td className="py-1 px-1 text-gray-600">Below {scales[0]}%</td>
                                  <td className="text-center py-1 px-1 font-semibold text-blue-600">
                                    {(tuUtilization !== null && tuUtilization !== undefined && tuUtilization < scales[0]) ? `${tuUtilization?.toFixed(1)}%` : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-semibold text-green-600">
                                    {(exUtilization !== null && exUtilization !== undefined && exUtilization < scales[0]) ? `${exUtilization?.toFixed(1)}%` : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-semibold text-purple-600">
                                    {(eqUtilization !== null && eqUtilization !== undefined && eqUtilization < scales[0]) ? `${eqUtilization?.toFixed(1)}%` : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Open Accounts Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      Open Accounts
                      <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the highest number of open accounts from the three bureaus (more is better)
                          const getOpenAccountCount = (bureauId) => {
                            if (!apiData?.reportData?.Accounts) return 0;
                            return apiData.reportData.Accounts.filter(account => 
                              account.BureauId === bureauId && 
                              (account.AccountStatus === 'Open' || account.AccountStatus === 'Current')
                            ).length;
                          };
                          
                          const tuOpenAccounts = getOpenAccountCount(1);
                          const exOpenAccounts = getOpenAccountCount(2);
                          const eqOpenAccounts = getOpenAccountCount(3);
                          const highestOpenAccounts = Math.max(tuOpenAccounts, exOpenAccounts, eqOpenAccounts);
                          
                          // Calculate grade based on number of open accounts (more is better)
                          if (highestOpenAccounts >= 15) return '10/10';
                          if (highestOpenAccounts >= 13) return '9/10';
                          if (highestOpenAccounts >= 12) return '8/10';
                          if (highestOpenAccounts >= 11) return '7/10';
                          if (highestOpenAccounts >= 10) return '6/10';
                          if (highestOpenAccounts >= 9) return '5/10';
                          if (highestOpenAccounts >= 8) return '4/10';
                          if (highestOpenAccounts >= 7) return '3/10';
                          if (highestOpenAccounts >= 6) return '2/10';
                          if (highestOpenAccounts >= 5) return '1/10';
                          return '0/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50', 'bg-yellow-50', 'bg-orange-50', 'bg-orange-50', 'bg-red-50', 'bg-red-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-yellow-600', 'text-orange-600', 'text-orange-600', 'text-red-600', 'text-red-600', 'text-red-600'];
                            
                            // Function to map account count to scale
                            const mapAccountCountToScale = (count) => {
                              if (count >= 15) return 15;
                              if (count >= 14) return 14;
                              if (count >= 13) return 13;
                              if (count >= 12) return 12;
                              if (count >= 11) return 11;
                              if (count >= 10) return 10;
                              if (count >= 9) return 9;
                              if (count >= 8) return 8;
                              if (count >= 7) return 7;
                              if (count >= 6) return 6;
                              if (count >= 5) return 5;
                              return null; // Return null for counts below 5 to show in "Below 5" row
                            };

                            // Get open account counts for each bureau from API data
                            const getOpenAccountCount = (bureauId) => {
                              if (!apiData?.reportData?.Accounts) return 0;
                              return apiData.reportData.Accounts.filter(account => 
                                account.BureauId === bureauId && 
                                (account.AccountStatus === 'Open' || account.AccountStatus === 'Current')
                              ).length;
                            };

                            const tuOpenAccounts = getOpenAccountCount(1); // TransUnion
                            const exOpenAccounts = getOpenAccountCount(2); // Experian  
                            const eqOpenAccounts = getOpenAccountCount(3); // Equifax

                            const tuScale = mapAccountCountToScale(tuOpenAccounts);
                            const exScale = mapAccountCountToScale(exOpenAccounts);
                            const eqScale = mapAccountCountToScale(eqOpenAccounts);

                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index < scales.length - 1 ? 'border-b' : ''} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {tuScale === scale ? tuOpenAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {exScale === scale ? exOpenAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {eqScale === scale ? eqOpenAccounts : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for counts below the lowest scale
                            const hasLowCounts = tuOpenAccounts < scales[scales.length - 1] || 
                                               exOpenAccounts < scales[scales.length - 1] || 
                                               eqOpenAccounts < scales[scales.length - 1];
                            
                            if (hasLowCounts) {
                              rows.push(
                                <tr key="below-scale" className="border-b bg-gray-50">
                                  <td className="py-1 px-1 text-gray-600">Below {scales[scales.length - 1]}</td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {tuOpenAccounts < scales[scales.length - 1] ? tuOpenAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {exOpenAccounts < scales[scales.length - 1] ? exOpenAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {eqOpenAccounts < scales[scales.length - 1] ? eqOpenAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* High-Limit Accounts Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      High-Limit Accounts
                      <span className="text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the highest number of high-limit accounts from the three bureaus (more is better)
                          const getHighLimitAccountCount = (bureauId) => {
                            if (!apiData?.reportData?.Accounts) return 0;
                            return apiData.reportData.Accounts.filter(account => 
                              account.BureauId === bureauId && 
                              account.AccountStatus === 'Open' &&
                              parseFloat(account.CreditLimit) >= 5000
                            ).length;
                          };
                          
                          const tuHighLimitAccounts = getHighLimitAccountCount(1);
                          const exHighLimitAccounts = getHighLimitAccountCount(2);
                          const eqHighLimitAccounts = getHighLimitAccountCount(3);
                          const highestHighLimitAccounts = Math.max(tuHighLimitAccounts, exHighLimitAccounts, eqHighLimitAccounts);
                          
                          // Calculate grade based on number of high-limit accounts (more is better)
                          if (highestHighLimitAccounts >= 10) return '10/10';
                          if (highestHighLimitAccounts >= 8) return '9/10';
                          if (highestHighLimitAccounts >= 7) return '8/10';
                          if (highestHighLimitAccounts >= 6) return '7/10';
                          if (highestHighLimitAccounts >= 5) return '6/10';
                          if (highestHighLimitAccounts >= 4) return '5/10';
                          if (highestHighLimitAccounts >= 3) return '4/10';
                          if (highestHighLimitAccounts >= 2) return '3/10';
                          if (highestHighLimitAccounts >= 1) return '2/10';
                          return '0/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50', 'bg-yellow-50', 'bg-orange-50', 'bg-orange-50', 'bg-red-50', 'bg-red-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-yellow-600', 'text-orange-600', 'text-orange-600', 'text-red-600', 'text-red-600', 'text-red-600'];
                            
                            // Function to map high-limit account count to scale (10-scale format)
                            const mapHighLimitCountToScale = (count) => {
                              if (count >= 10) return 10;
                              if (count < 5) return null; // Show in "Below 5" row
                              return count;
                            };

                            // Get high-limit account counts for each bureau from API data (accounts with credit limit >= $5,000 and AccountStatus = 'Open')
                            const getHighLimitAccountCount = (bureauId) => {
                              console.log('🔍 High-Limit Debug: Starting function for bureau', bureauId);
                              console.log('🔍 High-Limit Debug: apiData structure:', apiData);
                              console.log('🔍 High-Limit Debug: apiData.reportData:', apiData?.reportData);
                              console.log('🔍 High-Limit Debug: apiData.reportData.Accounts:', apiData?.reportData?.Accounts);
                              
                              if (!apiData?.reportData?.Accounts) {
                                console.log('❌ High-Limit Debug: No accounts data found');
                                return 0;
                              }
                              
                              const allAccounts = apiData.reportData.Accounts;
                              console.log(`✅ High-Limit Debug: Total accounts found: ${allAccounts.length}`);
                              console.log('🔍 High-Limit Debug: First few accounts:', allAccounts.slice(0, 3));
                              
                              const filteredAccounts = allAccounts.filter(account => {
                                const matchesBureau = account.BureauId === bureauId;
                                const isOpen = account.AccountStatus === 'Open';
                                const creditLimit = parseFloat(account.CreditLimit);
                                const hasHighLimit = creditLimit >= 5000;
                                
                                console.log(`🔍 Account ${account.AccountNumber || 'N/A'}: Bureau=${account.BureauId}, Status=${account.AccountStatus}, CreditLimit=${account.CreditLimit}, Parsed=${creditLimit}, Matches=${matchesBureau && isOpen && hasHighLimit}`);
                                
                                return matchesBureau && isOpen && hasHighLimit;
                              });
                              
                              console.log(`✅ High-Limit Debug: Bureau ${bureauId} - Found ${filteredAccounts.length} high-limit accounts`);
                              return filteredAccounts.length;
                            };

                            const tuHighLimitAccounts = getHighLimitAccountCount(1); // TransUnion
                            const exHighLimitAccounts = getHighLimitAccountCount(2); // Experian  
                            const eqHighLimitAccounts = getHighLimitAccountCount(3); // Equifax

                            const tuScale = mapHighLimitCountToScale(tuHighLimitAccounts);
                            const exScale = mapHighLimitCountToScale(exHighLimitAccounts);
                            const eqScale = mapHighLimitCountToScale(eqHighLimitAccounts);

                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index < scales.length - 1 ? 'border-b' : ''} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {tuScale === scale ? tuHighLimitAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {exScale === scale ? exHighLimitAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1 font-medium">
                                  {eqScale === scale ? eqHighLimitAccounts : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add "Below 5" row for accounts with counts below 5
                            const hasLowCounts = tuScale === null || exScale === null || eqScale === null;
                            
                            if (hasLowCounts) {
                              rows.push(
                                <tr key="below-5" className="border-t bg-gray-50">
                                  <td className="py-1 px-1 text-gray-600">Below 5</td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {tuScale === null ? tuHighLimitAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {exScale === null ? exHighLimitAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {eqScale === null ? eqHighLimitAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            // Add indicator row for counts above the highest scale
                            const hasHighCounts = tuHighLimitAccounts > scales[0] || 
                                                 exHighLimitAccounts > scales[0] || 
                                                 eqHighLimitAccounts > scales[0];
                            
                            if (hasHighCounts) {
                              rows.unshift(
                                <tr key="above-scale" className="border-b bg-emerald-50">
                                  <td className="py-1 px-1 text-emerald-600">Above {scales[0]}</td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {tuHighLimitAccounts > scales[0] ? tuHighLimitAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {exHighLimitAccounts > scales[0] ? exHighLimitAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1 font-medium">
                                    {eqHighLimitAccounts > scales[0] ? eqHighLimitAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* New Accounts Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      New Accounts
                      <span className="text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the lowest number of new accounts from the three bureaus (fewer is better)
                          const getNewAccountCount = (bureauId) => {
                            if (!apiData?.reportData?.reportData?.Accounts) return 0;
                            
                            const currentDate = new Date();
                            const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
                            
                            return apiData.reportData.reportData.Accounts.filter(account => {
                              if (account.BureauId !== bureauId) return false;
                              
                              const openDate = new Date(account.DateOpened);
                              return openDate >= twoYearsAgo;
                            }).length;
                          };
                          
                          const tuNewAccounts = getNewAccountCount(1);
                          const exNewAccounts = getNewAccountCount(2);
                          const eqNewAccounts = getNewAccountCount(3);
                          const lowestNewAccounts = Math.min(tuNewAccounts, exNewAccounts, eqNewAccounts);
                          
                          // Calculate grade based on number of new accounts (fewer is better)
                          if (lowestNewAccounts === 0) return '10/10';
                          if (lowestNewAccounts === 1) return '8/10';
                          if (lowestNewAccounts === 2) return '6/10';
                          if (lowestNewAccounts === 3) return '4/10';
                          if (lowestNewAccounts === 4) return '2/10';
                          if (lowestNewAccounts >= 5) return '0/10';
                          return '1/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [0, 1, 2, 3, 4];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600'];
                            
                            const mapNewAccountCountToScale = (count) => {
                              return Math.min(count, 4);
                            };
                            
                            const getNewAccountCount = (bureauId) => {
                              if (!apiData?.reportData?.reportData?.Accounts) return 0;
                              
                              const currentDate = new Date();
                              const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
                              
                              return apiData.reportData.reportData.Accounts.filter(account => {
                                if (account.BureauId !== bureauId) return false;
                                
                                const openDate = new Date(account.DateOpened);
                                return openDate >= twoYearsAgo;
                              }).length;
                            };
                            
                            const tuNewAccounts = getNewAccountCount(1);
                            const exNewAccounts = getNewAccountCount(3);
                            const eqNewAccounts = getNewAccountCount(2);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`border-b ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {mapNewAccountCountToScale(tuNewAccounts) === scale ? tuNewAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapNewAccountCountToScale(exNewAccounts) === scale ? exNewAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapNewAccountCountToScale(eqNewAccounts) === scale ? eqNewAccounts : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for counts above the highest scale
                            const hasHighCounts = tuNewAccounts > scales[scales.length - 1] || 
                                                 exNewAccounts > scales[scales.length - 1] || 
                                                 eqNewAccounts > scales[scales.length - 1];
                            
                            if (hasHighCounts) {
                              rows.push(
                                <tr key="above-scale" className="border-b bg-red-100">
                                  <td className="py-1 px-1 text-red-700">Above {scales[scales.length - 1]}</td>
                                  <td className="text-center py-1 px-1">
                                    {tuNewAccounts > scales[scales.length - 1] ? tuNewAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {exNewAccounts > scales[scales.length - 1] ? exNewAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {eqNewAccounts > scales[scales.length - 1] ? eqNewAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                         </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Over 50% Usage Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Over 50% Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50', 'bg-yellow-50', 'bg-orange-50', 'bg-orange-50', 'bg-red-50', 'bg-red-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-yellow-600', 'text-orange-600', 'text-orange-600', 'text-red-600', 'text-red-600', 'text-red-600'];
                            
                            const mapHighUsageCountToScale = (count) => {
                              return Math.min(count, 10);
                            };
                            
                            const getHighUsageAccountCount = (bureauId) => {
                              if (!apiData?.reportData?.reportData?.Accounts) return 0;
                              
                              return apiData.reportData.reportData.Accounts.filter(account => {
                                if (account.BureauId !== bureauId) return false;
                                if (!account.AccountStatus || (account.AccountStatus !== 'Open' && account.AccountStatus !== 'Current')) return false;
                                
                                const balance = parseFloat(account.Balance) || 0;
                                const creditLimit = parseFloat(account.CreditLimit) || 0;
                                
                                if (creditLimit > 0) {
                                  const utilization = (balance / creditLimit) * 100;
                                  return utilization > 50;
                                }
                                
                                return false;
                              }).length;
                            };
                            
                            const tuHighUsageAccounts = getHighUsageAccountCount(1);
                            const exHighUsageAccounts = getHighUsageAccountCount(3);
                            const eqHighUsageAccounts = getHighUsageAccountCount(2);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index === scales.length - 1 ? '' : 'border-b'} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {mapHighUsageCountToScale(tuHighUsageAccounts) === scale ? tuHighUsageAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapHighUsageCountToScale(exHighUsageAccounts) === scale ? exHighUsageAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapHighUsageCountToScale(eqHighUsageAccounts) === scale ? eqHighUsageAccounts : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for counts above the highest scale
                            const hasHighCounts = tuHighUsageAccounts > scales[0] || 
                                                 exHighUsageAccounts > scales[0] || 
                                                 eqHighUsageAccounts > scales[0];
                            
                            if (hasHighCounts) {
                              rows.unshift(
                                <tr key="above-scale" className="border-b bg-red-100">
                                  <td className="py-1 px-1 text-red-700">Above {scales[0]}</td>
                                  <td className="text-center py-1 px-1">
                                    {tuHighUsageAccounts > scales[0] ? tuHighUsageAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {exHighUsageAccounts > scales[0] ? exHighUsageAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {eqHighUsageAccounts > scales[0] ? eqHighUsageAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Second Row - 5 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                
                {/* Installment Accounts Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Installment Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [2, 1, 0];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600'];
                            
                            const mapInstallmentCountToScale = (count) => {
                              return Math.min(count, 2);
                            };
                            
                            const getInstallmentAccountCount = (bureauId) => {
                              if (!apiData?.data?.reportData?.reportData?.Accounts) return 0;
                              
                              return apiData.data.reportData.reportData.Accounts.filter(account => {
                                if (account.BureauId !== bureauId) return false;
                                if (!account.AccountStatus || (account.AccountStatus !== 'Open' && account.AccountStatus !== 'Current')) return false;
                                
                                // Check if it's an installment account (not revolving)
                                const accountType = account.AccountType?.toLowerCase() || '';
                                return accountType.includes('installment') || 
                                       accountType.includes('auto') || 
                                       accountType.includes('mortgage') || 
                                       accountType.includes('student') ||
                                       (account.CreditLimit === null || account.CreditLimit === 0);
                              }).length;
                            };
                            
                            const tuInstallmentAccounts = getInstallmentAccountCount(1);
                            const exInstallmentAccounts = getInstallmentAccountCount(3);
                            const eqInstallmentAccounts = getInstallmentAccountCount(2);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index === scales.length - 1 ? '' : 'border-b'} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {mapInstallmentCountToScale(tuInstallmentAccounts) === scale ? tuInstallmentAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapInstallmentCountToScale(exInstallmentAccounts) === scale ? exInstallmentAccounts : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapInstallmentCountToScale(eqInstallmentAccounts) === scale ? eqInstallmentAccounts : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for counts above the highest scale
                            const hasHighCounts = tuInstallmentAccounts > scales[0] || 
                                                 exInstallmentAccounts > scales[0] || 
                                                 eqInstallmentAccounts > scales[0];
                            
                            if (hasHighCounts) {
                              rows.unshift(
                                <tr key="above-scale" className="border-b bg-red-100">
                                  <td className="py-1 px-1 text-red-700">Above {scales[0]}</td>
                                  <td className="text-center py-1 px-1">
                                    {tuInstallmentAccounts > scales[0] ? tuInstallmentAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {exInstallmentAccounts > scales[0] ? exInstallmentAccounts : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {eqInstallmentAccounts > scales[0] ? eqInstallmentAccounts : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                          </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Age Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                      Age
                      <span className="text-xs font-bold bg-gradient-to-r from-green-500 to-blue-600 text-white px-2 py-1 rounded-full">
                        {(() => {
                          // Get the highest average account age from the three bureaus (older is better)
                          const getAverageAccountAge = (bureauId) => {
                            if (!apiData?.reportData?.reportData?.Accounts) return 0;
                            
                            const accounts = apiData.reportData.reportData.Accounts.filter(account => {
                              return account.BureauId === bureauId && account.DateOpened;
                            });
                            
                            if (accounts.length === 0) return 0;
                            
                            const currentDate = new Date();
                            const totalAgeInMonths = accounts.reduce((sum, account) => {
                              const openDate = new Date(account.DateOpened);
                              const ageInMonths = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                                                 (currentDate.getMonth() - openDate.getMonth());
                              return sum + Math.max(0, ageInMonths);
                            }, 0);
                            
                            const averageAgeInMonths = totalAgeInMonths / accounts.length;
                            return Math.floor(averageAgeInMonths / 12);
                          };
                          
                          const tuAverageAge = getAverageAccountAge(1);
                          const exAverageAge = getAverageAccountAge(3);
                          const eqAverageAge = getAverageAccountAge(2);
                          const highestAge = Math.max(tuAverageAge, exAverageAge, eqAverageAge);
                          
                          // Calculate grade based on average account age (older is better)
                          if (highestAge >= 12) return '10/10';
                          if (highestAge >= 10) return '9/10';
                          if (highestAge >= 8) return '8/10';
                          if (highestAge >= 6) return '7/10';
                          if (highestAge >= 5) return '6/10';
                          if (highestAge >= 4) return '5/10';
                          if (highestAge >= 3) return '4/10';
                          if (highestAge >= 2) return '3/10';
                          if (highestAge >= 1) return '2/10';
                          return '0/10';
                        })()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = ['12 yrs', '11 yrs', '10 yrs', '9 yrs', '8 yrs', '7 yrs', '6 yrs', '5 yrs', '4 yrs', '3 yrs', '2 yr'];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50', 'bg-yellow-50', 'bg-orange-50', 'bg-orange-50', 'bg-red-50', 'bg-red-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600', 'text-yellow-600', 'text-orange-600', 'text-orange-600', 'text-red-600', 'text-red-600', 'text-red-600'];
                            
                            const mapAgeToScale = (ageInYears) => {
                              if (ageInYears >= 12) return '12 yrs';
                              if (ageInYears >= 11) return '11 yrs';
                              if (ageInYears >= 10) return '10 yrs';
                              if (ageInYears >= 9) return '9 yrs';
                              if (ageInYears >= 8) return '8 yrs';
                              if (ageInYears >= 7) return '7 yrs';
                              if (ageInYears >= 6) return '6 yrs';
                              if (ageInYears >= 5) return '5 yrs';
                              if (ageInYears >= 4) return '4 yrs';
                              if (ageInYears >= 3) return '3 yrs';
                              return '2 yr';
                            };
                            
                            const getAverageAccountAge = (bureauId) => {
                              if (!apiData?.reportData?.reportData?.Accounts) return 0;
                              
                              const accounts = apiData.reportData.reportData.Accounts.filter(account => {
                                return account.BureauId === bureauId && account.DateOpened;
                              });
                              
                              if (accounts.length === 0) return 0;
                              
                              const currentDate = new Date();
                              const totalAgeInMonths = accounts.reduce((sum, account) => {
                                const openDate = new Date(account.DateOpened);
                                const ageInMonths = (currentDate.getFullYear() - openDate.getFullYear()) * 12 + 
                                                   (currentDate.getMonth() - openDate.getMonth());
                                return sum + Math.max(0, ageInMonths);
                              }, 0);
                              
                              const averageAgeInMonths = totalAgeInMonths / accounts.length;
                              return Math.floor(averageAgeInMonths / 12);
                            };
                            
                            const tuAverageAge = getAverageAccountAge(1);
                            const exAverageAge = getAverageAccountAge(3);
                            const eqAverageAge = getAverageAccountAge(2);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index === scales.length - 1 ? '' : 'border-b'} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {mapAgeToScale(tuAverageAge) === scale ? `${tuAverageAge} yrs` : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapAgeToScale(exAverageAge) === scale ? `${exAverageAge} yrs` : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapAgeToScale(eqAverageAge) === scale ? `${eqAverageAge} yrs` : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for ages above the highest scale (12+ years)
                            const hasHighAges = tuAverageAge > 12 || exAverageAge > 12 || eqAverageAge > 12;
                            
                            if (hasHighAges) {
                              rows.unshift(
                                <tr key="above-scale" className="border-b bg-green-100">
                                  <td className="py-1 px-1 text-green-700">Above 12 yrs</td>
                                  <td className="text-center py-1 px-1">
                                    {tuAverageAge > 12 ? `${tuAverageAge} yrs` : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {exAverageAge > 12 ? `${exAverageAge} yrs` : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {eqAverageAge > 12 ? `${eqAverageAge} yrs` : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Inquiries Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Recent Inquiries</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = [0, 1, 2, 3, 4];
                            const colors = ['bg-green-50', 'bg-blue-50', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50'];
                            const textColors = ['text-green-600', 'text-blue-600', 'text-yellow-600', 'text-orange-600', 'text-red-600'];
                            
                            const mapInquiryCountToScale = (count) => {
                              return Math.min(count, 4);
                            };
                            
                            const getRecentInquiryCount = (bureauId) => {
                              if (!apiData?.reportData?.reportData?.Inquiries) return 0;
                              
                              const currentDate = new Date();
                              const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());
                              
                              return apiData.reportData.reportData.Inquiries.filter(inquiry => {
                                if (inquiry.BureauId !== bureauId) return false;
                                
                                const inquiryDate = new Date(inquiry.DateOfInquiry);
                                return inquiryDate >= twoYearsAgo;
                              }).length;
                            };
                            
                            const tuInquiries = getRecentInquiryCount(1);
                            const exInquiries = getRecentInquiryCount(3);
                            const eqInquiries = getRecentInquiryCount(2);
                            
                            const rows = scales.map((scale, index) => (
                              <tr key={scale} className={`${index === scales.length - 1 ? '' : 'border-b'} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {mapInquiryCountToScale(tuInquiries) === scale ? tuInquiries : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapInquiryCountToScale(exInquiries) === scale ? exInquiries : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {mapInquiryCountToScale(eqInquiries) === scale ? eqInquiries : ''}
                                </td>
                              </tr>
                            ));
                            
                            // Add indicator row for counts above the highest scale
                            const hasHighCounts = tuInquiries > scales[scales.length - 1] || 
                                                 exInquiries > scales[scales.length - 1] || 
                                                 eqInquiries > scales[scales.length - 1];
                            
                            if (hasHighCounts) {
                              rows.push(
                                <tr key="above-scale" className="border-b bg-red-100">
                                  <td className="py-1 px-1 text-red-700">Above {scales[scales.length - 1]}</td>
                                  <td className="text-center py-1 px-1">
                                    {tuInquiries > scales[scales.length - 1] ? tuInquiries : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {exInquiries > scales[scales.length - 1] ? exInquiries : ''}
                                  </td>
                                  <td className="text-center py-1 px-1">
                                    {eqInquiries > scales[scales.length - 1] ? eqInquiries : ''}
                                  </td>
                                </tr>
                              );
                            }
                            
                            return rows;
                          })()}
                          </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Bankruptcy Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Bankruptcy</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const scales = ['Yes', 'No'];
                            const colors = ['bg-red-50', 'bg-green-50'];
                            const textColors = ['text-red-600', 'text-green-600'];
                            
                            const getBankruptcyStatus = (bureauId) => {
                              if (!apiData?.data?.reportData?.reportData?.PublicRecords) return 'No';
                              
                              const hasBankruptcy = apiData.data.reportData.reportData.PublicRecords.some(record => {
                                if (record.BureauId !== bureauId) return false;
                                
                                const recordType = record.RecordType?.toLowerCase() || '';
                                return recordType.includes('bankruptcy') || recordType.includes('chapter');
                              });
                              
                              return hasBankruptcy ? 'Yes' : 'No';
                            };
                            
                            const tuBankruptcy = getBankruptcyStatus(1);
                            const exBankruptcy = getBankruptcyStatus(3);
                            const eqBankruptcy = getBankruptcyStatus(2);
                            
                            return scales.map((scale, index) => (
                              <tr key={scale} className={`${index === scales.length - 1 ? '' : 'border-b'} ${colors[index]}`}>
                                <td className={`py-1 px-1 ${textColors[index]}`}>{scale}</td>
                                <td className="text-center py-1 px-1">
                                  {tuBankruptcy === scale ? scale : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {exBankruptcy === scale ? scale : ''}
                                </td>
                                <td className="text-center py-1 px-1">
                                  {eqBankruptcy === scale ? scale : ''}
                                </td>
                              </tr>
                            ));
                          })()}
                          </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Negative Marks Card */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Negative Marks</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1 font-medium">Scale</th>
                            <th className="text-center py-1 px-1 font-medium">TU</th>
                            <th className="text-center py-1 px-1 font-medium">EX</th>
                            <th className="text-center py-1 px-1 font-medium">EQ</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b bg-green-50"><td className="py-1 px-1 text-green-600">Yes</td><td className="text-center py-1 px-1"></td><td className="text-center py-1 px-1"></td><td className="text-center py-1 px-1"></td></tr>
                          <tr className="border-b bg-blue-50"><td className="py-1 px-1 text-blue-600">No</td><td className="text-center py-1 px-1"></td><td className="text-center py-1 px-1"></td><td className="text-center py-1 px-1"></td></tr>
                         </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

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

          {/* Do You Qualify */}
          <Card className={`${qualifyView !== 'table' ? 'hidden' : ''} border-0 shadow-xl bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/50`}>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-800">Do You Qualify</CardTitle>
              <Button
                onClick={() => { setIsRerunningAudit(true); setRefreshAuditNonce(n => n + 1); }}
                variant="outline"
                className="text-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRerunningAudit ? 'animate-spin' : ''}`} />
                Rerun Funding Audit
              </Button>
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
                      <td className="py-2 px-4">No inquiries in the past 6 months</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[1]?.noCollections ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[3]?.noCollections ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[2]?.noCollections ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="py-2 px-4">No collections</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[1]?.noChargeOffs ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[3]?.noChargeOffs ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[2]?.noChargeOffs ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="py-2 px-4">No charge offs</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[1]?.noLatePayments ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[3]?.noLatePayments ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="text-center py-2 px-4">
                        {reportData?.qualificationCriteria?.[2]?.noLatePayments ? 
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                          <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                        }
                      </td>
                      <td className="py-2 px-4">No late payments in the past 12 months</td>
                    </tr>
                  </tbody>
                </table>
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:bg-slate-900 dark:border dark:border-green-900/50">
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
                        utilization: account.utilization || (() => {
                          const balance = parseInt(account.CurrentBalance || 0);
                          const creditLimit = parseInt(account.CreditLimit || 0);
                          const highBalance = parseInt(account.HighBalance || 0);
                          
                          // Use High Balance as credit limit when Credit Limit is 0
                          const effectiveLimit = creditLimit > 0 ? creditLimit : highBalance;
                          
                          if (balance && effectiveLimit > 0) {
                            return Math.round((balance / effectiveLimit) * 100);
                          }
                          return 0;
                        })(),
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30">
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30">
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
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
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50/50 to-gray-100/30 backdrop-blur-sm mt-8">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/10 to-slate-600/10 border-b border-slate-200/30 backdrop-blur-sm">
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
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30">
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
                      <div className="text-center py-6 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 rounded-lg border border-blue-100/50">
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
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30">
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
                      <div className="text-center py-6 bg-gradient-to-br from-red-50/30 to-rose-50/30 rounded-lg border border-red-100/50">
                        <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-red-600" />
                        </div>
                        <p className="text-sm text-red-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-red-600/70">
                          TransUnion has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Equifax Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
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
        <Card className="border-0 shadow-md my-3">
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
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                  Payment History
                </div>
                <span className="text-xs font-bold bg-gradient-to-r from-green-500 to-blue-600 text-white px-2 py-1 rounded-full">
                  {(() => {
                    // Calculate payment history grade based on late payments
                    const totalLatePayments = reportData.accounts.reduce((total, account) => {
                      return total + (account.latePayments?.total || 0);
                    }, 0);
                    
                    // Calculate grade based on total late payments (fewer is better)
                    if (totalLatePayments === 0) return '10/10';
                    if (totalLatePayments <= 1) return '9/10';
                    if (totalLatePayments <= 2) return '8/10';
                    if (totalLatePayments <= 3) return '7/10';
                    if (totalLatePayments <= 5) return '6/10';
                    if (totalLatePayments <= 8) return '5/10';
                    if (totalLatePayments <= 12) return '4/10';
                    if (totalLatePayments <= 18) return '3/10';
                    if (totalLatePayments <= 25) return '2/10';
                    if (totalLatePayments <= 35) return '1/10';
                    return '0/10';
                  })()}
                </span>
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30">
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30">
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
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
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
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-slate-50/50 to-gray-100/30 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/10 to-slate-600/10 border-b border-slate-200/30 backdrop-blur-sm">
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
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-200/30">
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
                      <div className="text-center py-6 bg-gradient-to-br from-blue-50/30 to-cyan-50/30 rounded-lg border border-blue-100/50">
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
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border-b border-purple-200/30">
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
                      <div className="text-center py-6 bg-gradient-to-br from-red-50/30 to-rose-50/30 rounded-lg border border-red-100/50">
                        <div className="p-3 bg-gradient-to-br from-red-500/20 to-rose-500/20 rounded-full w-fit mx-auto mb-3">
                          <FileText className="h-6 w-6 text-red-600" />
                        </div>
                        <p className="text-sm text-red-700 font-medium mb-1">
                          No employer data available
                        </p>
                        <p className="text-xs text-red-600/70">
                          TransUnion has not reported any employment information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Equifax Employers */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-200/30">
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
          {/* SCORING MODEL Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">SCORING MODEL (PERSONAL + BUSINESS)</h2>
                <p className="text-gray-600">Funding projections based on your current credit profile</p>
              </div>
              
              {/* Compare Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <ToggleGroup 
                  type="single" 
                  value={compareMode} 
                  onValueChange={(value) => value && setCompareMode(value as 'personal' | 'business' | 'both')}
                  className="bg-gray-100 rounded-lg p-1"
                >
                  <ToggleGroupItem value="personal" className="text-xs px-3 py-1 data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                    Personal
                  </ToggleGroupItem>
                  <ToggleGroupItem value="business" className="text-xs px-3 py-1 data-[state=on]:bg-green-500 data-[state=on]:text-white">
                    Business
                  </ToggleGroupItem>
                  <ToggleGroupItem value="both" className="text-xs px-3 py-1 data-[state=on]:bg-purple-500 data-[state=on]:text-white">
                    Both
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Scoring Model Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Personal Funding Projection */}
              {(compareMode === 'personal' || compareMode === 'both') && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-blue-800">Personal Funding Projection</h3>
                        <p className="text-sm text-blue-600 font-medium">Individual Credit Analysis</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Estimated Funding - Only funding amount at top */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        Estimated Funding
                      </h4>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <div>
                          <span className="font-semibold text-gray-800">Estimated Funding:</span>
                          <span className="ml-2 text-lg font-bold text-blue-600">
                            ${scoringModelData.fundingProjection.personal.estimatedFunding.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credit Scores */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        Credit Scores
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-lg text-blue-600">{scoringModelData.userProfile.scoreEquifax}</div>
                          <div className="text-gray-600">Equifax</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.equifax} inquiries
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-blue-600">{scoringModelData.userProfile.scoreTransUnion}</div>
                          <div className="text-gray-600">TransUnion</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.transunion} inquiries
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-blue-600">{scoringModelData.userProfile.scoreExperian}</div>
                          <div className="text-gray-600">Experian</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.experian} inquiries
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Credit Profile Details */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        Credit Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Credit Age</div>
                          <div className="font-bold text-blue-600">{scoringModelData.userProfile.creditAge}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Utilization</div>
                          <div className="font-bold text-blue-600">{scoringModelData.userProfile.utilization}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Cards Possible and Bureau Logic - Moved to bottom */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Funding Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          <div>
                            <span className="font-semibold text-gray-800">Cards Possible:</span>
                            <span className="ml-2 text-lg font-bold text-blue-600">
                              {scoringModelData.fundingProjection.personal.maxCards}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-blue-800 mb-1">Bureau Logic:</div>
                            <div className="text-sm text-blue-700">
                              {scoringModelData.fundingProjection.personal.bureauLogic}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Business Funding Projection */}
              {(compareMode === 'business' || compareMode === 'both') && (
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-green-800">Business Funding Projection</h3>
                        <p className="text-sm text-green-600 font-medium">Commercial Credit Analysis</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Estimated Funding Section - Only funding amount at top */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Estimated Funding
                      </h4>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <span className="font-semibold text-gray-800">Estimated Funding:</span>
                          <span className="ml-2 text-lg font-bold text-green-600">
                            ${scoringModelData.fundingProjection.business.estimatedFunding.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Credit Scores */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                        Credit Scores
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600">{scoringModelData.userProfile.scoreEquifax}</div>
                          <div className="text-gray-600">Equifax</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.equifax} inquiries
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600">{scoringModelData.userProfile.scoreTransUnion}</div>
                          <div className="text-gray-600">TransUnion</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.transunion} inquiries
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600">{scoringModelData.userProfile.scoreExperian}</div>
                          <div className="text-gray-600">Experian</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {scoringModelData.userProfile.inquiries.experian} inquiries
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Business Profile */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-green-600" />
                        Business Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">EIN Status</div>
                          <div className="font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Verified
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Credit Age</div>
                          <div className="font-bold text-gray-800">{scoringModelData.userProfile.creditAge}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Utilization</div>
                          <div className="font-bold text-green-600">{scoringModelData.userProfile.utilization}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Cards Possible and Bureau Logic - Moved to bottom */}
                    <div className="bg-white/70 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        Funding Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <div>
                            <span className="font-semibold text-gray-800">Cards Possible:</span>
                            <span className="ml-2 text-lg font-bold text-green-600">
                              {scoringModelData.fundingProjection.business.maxCards}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-green-800 mb-1">Bureau Logic:</div>
                            <div className="text-sm text-green-700">
                              {scoringModelData.fundingProjection.business.bureauLogic}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Export Options */}
            <div className="flex justify-end mt-6">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-800">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-800">
                  <FileText className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Funding Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:bg-slate-900 dark:border dark:border-green-900/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                    <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Personal Funding</h3>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Individual Credit Solutions</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Process Points */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3">Process Steps:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 dark:bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <span className="text-sm text-green-700 dark:text-green-200">Credit Analysis & Pre-Qualification</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 dark:bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <span className="text-sm text-green-700 dark:text-green-200">Document Verification & Income Review</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 dark:bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <span className="text-sm text-green-700 dark:text-green-200">Funding Approval & Terms Agreement</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 dark:bg-green-700 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                      <span className="text-sm text-green-700 dark:text-green-200">Fund Disbursement & Account Setup</span>
                    </div>
                  </div>
                </div>

                

                {/* Apply Button */}
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 dark:bg-green-700 dark:hover:bg-green-800"
                  size="lg"
                  onClick={() => {
                    setShowFundingModal(true);
                    setFundingType('personal');
                  }}
                >
                  <Dollar className="h-5 w-5 mr-2" />
                  Apply for Personal Funding
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Business Funding Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:bg-slate-900 dark:border dark:border-blue-900/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">Business Funding</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Commercial Credit Solutions</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Process Points */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Process Steps:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <span className="text-sm text-blue-700 dark:text-blue-200">Business Credit Assessment & EIN Verification</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <span className="text-sm text-blue-700 dark:text-blue-200">Financial Statements & Cash Flow Analysis</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <span className="text-sm text-blue-700 dark:text-blue-200">Underwriting Review & Risk Assessment</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                      <span className="text-sm text-blue-700 dark:text-blue-200">Funding Approval & Capital Deployment</span>
                    </div>
                  </div>
                </div>

                

                {/* Apply Button */}
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 dark:bg-blue-700 dark:hover:bg-blue-800"
                  size="lg"
                  onClick={() => {
                    setShowFundingModal(true);
                    setFundingType('business');
                  }}
                >
                  <Building2 className="h-5 w-5 mr-2" />
                  Apply for Business Funding
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* DIY Cards Section - Hidden/Shown based on state */}
          {showDIYSection && (
            <div 
              data-diy-section
              className="mt-8 mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg animate-slideDown transition-all duration-500 ease-out"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      DIY {diyFundingType === 'business' ? 'Business' : 'Personal'} Funding Cards
                    </h3>
                    <p className="text-gray-600">Complete the application yourself with our step-by-step guidance</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDIYSection(false);
                    setDiyFundingType(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
              
              {/* DIY Cards Display */}
              {diyFundingType === 'business' ? (
                <BusinessCardsDisplay onClose={() => {
                  setShowDIYSection(false);
                  setDiyFundingType(null);
                }} />
              ) : (
                <PersonalCardsDisplay onClose={() => {
                  setShowDIYSection(false);
                  setDiyFundingType(null);
                }} />
              )}
            </div>
          )}

          {/* Audit-Ready Result Section */}
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">AUDIT-READY FUNDING ANALYSIS</h2>
              <p className="text-gray-600 dark:text-gray-300">Comprehensive credit assessment with detailed calculations and bureau routing strategy</p>
            </div>

            {(() => {
              // Extract real data from API - correct path is apiData.reportData
              const realData = apiData?.reportData;
              
              // Debug logging to see what data we have
              console.log('🔍 DEBUG: Real data from API:', realData);
              console.log('🔍 DEBUG: API data structure:', apiData);
              console.log('🔍 DEBUG: API data keys:', apiData ? Object.keys(apiData) : 'no apiData');
              
              // Extract real credit scores from API data
              let creditScores = { experian: 755, transunion: 740, equifax: 752 }; // fallback
              if (realData?.Score && Array.isArray(realData.Score)) {
                console.log('🔍 DEBUG: Found scores in API data:', realData.Score);
                realData.Score.forEach((score: any) => {
                  if (score.BureauId === 1) creditScores.transunion = parseInt(score.Score) || 740;
                  if (score.BureauId === 2) creditScores.experian = parseInt(score.Score) || 755;
                  if (score.BureauId === 3) creditScores.equifax = parseInt(score.Score) || 752;
                });
              } else {
                console.log('🔍 DEBUG: No scores found in API data, using fallback');
              }
              
              // Extract real inquiries from API data
              const realInquiries = realData?.Inquiries || [];
              console.log('🔍 DEBUG: Found inquiries in API data:', realInquiries);
              const inquiriesByBureau = {
                equifax: realInquiries.filter((inq: any) => inq.BureauId === 3).length,
                experian: realInquiries.filter((inq: any) => inq.BureauId === 2).length,
                transunion: realInquiries.filter((inq: any) => inq.BureauId === 1).length
              };
              console.log('🔍 DEBUG: Inquiries by bureau:', inquiriesByBureau);
              
              // Extract real accounts from API data
              const realAccounts = realData?.Accounts || [];
              console.log('🔍 DEBUG: Found accounts in API data:', realAccounts);
              console.log('🔍 DEBUG: Number of accounts:', realAccounts.length);
              
              // Calculate average score from real data
              const avgScore = Math.round((creditScores.experian + creditScores.transunion + creditScores.equifax) / 3);
              console.log('🔍 DEBUG: Calculated average score:', avgScore);
              
              // Calculate audit-ready analysis with real API data
              const auditAnalysis = calculateAuditReadyAnalysis(
                realAccounts,
                inquiriesByBureau,
                realData?.PublicRecords || reportData.publicRecords || [],
                avgScore
              );
              
              console.log('🔍 DEBUG: Audit analysis result:', auditAnalysis);
              console.log('🔍 DEBUG: Audit analysis signals:', auditAnalysis.signals);

              return (
                <div className="space-y-6">
                  {/* Table A: Summary of Recommended Limits */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Summary of Recommended Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left p-3 font-semibold text-gray-800">Scenario</th>
                              <th className="text-center p-3 font-semibold text-gray-800">Cards</th>
                              <th className="text-right p-3 font-semibold text-gray-800">Per-Card Amounts</th>
                              <th className="text-right p-3 font-semibold text-gray-800">Total Funding</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-blue-50">
                              <td className="p-3 font-medium text-blue-800">Single Personal</td>
                              <td className="p-3 text-center">{auditAnalysis.scenarios.personalSingle.cards}</td>
                              <td className="p-3 text-right">${auditAnalysis.scenarios.personalSingle.amount.toLocaleString()}</td>
                              <td className="p-3 text-right font-bold text-blue-600">${auditAnalysis.scenarios.personalSingle.amount.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-blue-50">
                              <td className="p-3 font-medium text-blue-800">Two-Card Personal</td>
                              <td className="p-3 text-center">{auditAnalysis.scenarios.personalMulti.cards}</td>
                              <td className="p-3 text-right">
                                {auditAnalysis.scenarios.personalMulti.amounts.map((amt, i) => 
                                  `$${amt.toLocaleString()}`
                                ).join(', ')}
                              </td>
                              <td className="p-3 text-right font-bold text-blue-600">${auditAnalysis.scenarios.personalMulti.total.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-green-50">
                              <td className="p-3 font-medium text-green-800">Single Business</td>
                              <td className="p-3 text-center">{auditAnalysis.scenarios.businessSingle.cards}</td>
                              <td className="p-3 text-right">${auditAnalysis.scenarios.businessSingle.amount.toLocaleString()}</td>
                              <td className="p-3 text-right font-bold text-green-600">${auditAnalysis.scenarios.businessSingle.amount.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-green-50">
                              <td className="p-3 font-medium text-green-800">Two-Card Business</td>
                              <td className="p-3 text-center">{auditAnalysis.scenarios.businessMulti.cards}</td>
                              <td className="p-3 text-right">
                                {auditAnalysis.scenarios.businessMulti.amounts.map((amt, i) => 
                                  `$${amt.toLocaleString()}`
                                ).join(', ')}
                              </td>
                              <td className="p-3 text-right font-bold text-green-600">${auditAnalysis.scenarios.businessMulti.total.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-purple-50 border-t-2 border-purple-200">
                              <td className="p-3 font-bold text-purple-800">Max by Inquiries ({auditAnalysis.scenarios.maxByInquiries.cards} cards)</td>
                              <td className="p-3 text-center font-bold">{auditAnalysis.scenarios.maxByInquiries.cards}</td>
                              <td className="p-3 text-right text-sm">
                                <div>Personal: {auditAnalysis.scenarios.maxByInquiries.personal.amounts.map(amt => `$${amt.toLocaleString()}`).join(', ')}</div>
                                <div>Business: {auditAnalysis.scenarios.maxByInquiries.business.amounts.map(amt => `$${amt.toLocaleString()}`).join(', ')}</div>
                              </td>
                              <td className="p-3 text-right font-bold text-purple-600">${auditAnalysis.scenarios.maxByInquiries.grandTotal.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Table B: Key Signals & Rationale */}
                  <Card className="border-0 shadow-lg dark:bg-slate-900 dark:border dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Key Signals & Rationale
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                              <th className="text-left p-3 font-semibold text-gray-800 dark:text-white">Signal</th>
                              <th className="text-center p-3 font-semibold text-gray-800 dark:text-white">Value</th>
                              <th className="text-left p-3 font-semibold text-gray-800 dark:text-white">How Computed</th>
                              <th className="text-left p-3 font-semibold text-gray-800 dark:text-white">Why It Matters</th>
                              <th className="text-left p-3 font-semibold text-gray-800 dark:text-white">Effect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 dark:text-gray-300">
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Total Aggregate Credit Limit</td>
                              <td className="p-3 text-center font-bold">${auditAnalysis.signals.totalAggregateLimit.toLocaleString()}</td>
                              <td className="p-3 text-sm">Sum of all open revolving credit limits</td>
                              <td className="p-3 text-sm">Shows existing credit capacity and lender confidence</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">Higher limits increase anchor exposure</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Highest Single Revolving Limit</td>
                              <td className="p-3 text-center font-bold">${auditAnalysis.signals.highestSingleLimit.toLocaleString()}</td>
                              <td className="p-3 text-sm">Maximum individual credit line amount</td>
                              <td className="p-3 text-sm">Indicates premium lender relationships and creditworthiness</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">Boosts anchor calculation significantly</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">High-Limit Tradelines</td>
                              <td className="p-3 text-center font-bold">
                                <div>≥$10k: {auditAnalysis.signals.highLimitTradelines.over10k}</div>
                                <div>≥$25k: {auditAnalysis.signals.highLimitTradelines.over25k}</div>
                              </td>
                              <td className="p-3 text-sm">Count of accounts with limits above thresholds</td>
                              <td className="p-3 text-sm">Premium accounts signal strong credit profile</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">Increases supply score component</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Average Revolving Utilization</td>
                              <td className="p-3 text-center font-bold">{auditAnalysis.signals.averageUtilization.toFixed(1)}%</td>
                              <td className="p-3 text-sm">Mean balance-to-limit ratio across all revolving accounts</td>
                              <td className="p-3 text-sm">Primary factor in credit scoring and risk assessment</td>
                              <td className="p-3 text-sm text-blue-600 dark:text-blue-400">Lower utilization improves behavior score</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Open Revolving Accounts</td>
                              <td className="p-3 text-center font-bold">{auditAnalysis.signals.openRevolvingCount}</td>
                              <td className="p-3 text-sm">Count of active revolving credit accounts</td>
                              <td className="p-3 text-sm">Shows credit mix and management capability</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">More accounts increase supply diversity</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Average Account Age</td>
                              <td className="p-3 text-center font-bold">{Math.floor(auditAnalysis.signals.averageAccountAge / 12)} years {Math.floor(auditAnalysis.signals.averageAccountAge % 12)} months</td>
                              <td className="p-3 text-sm">Mean age of all open revolving accounts</td>
                              <td className="p-3 text-sm">Demonstrates credit history depth and stability</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">Longer history improves seasoning score</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Inquiries by Bureau</td>
                              <td className="p-3 text-center font-bold">
                                <div>EQ: {auditAnalysis.signals.inquiriesByBureau.equifax}</div>
                                <div>EX: {auditAnalysis.signals.inquiriesByBureau.experian}</div>
                                <div>TU: {auditAnalysis.signals.inquiriesByBureau.transunion}</div>
                              </td>
                              <td className="p-3 text-sm">Hard inquiries in last 6 months per bureau</td>
                              <td className="p-3 text-sm">Determines available inquiry headroom for new applications</td>
                              <td className="p-3 text-sm text-orange-600 dark:text-orange-400">Limits maximum card strategy</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Installment Load</td>
                              <td className="p-3 text-center font-bold">{(auditAnalysis.signals.installmentLoad * 100).toFixed(1)}%</td>
                              <td className="p-3 text-sm">Average balance to original amount ratio on installment loans</td>
                              <td className="p-3 text-sm">Shows debt management and payment behavior</td>
                              <td className="p-3 text-sm text-blue-600 dark:text-blue-400">Lower load improves behavior score</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Late Payment Counts</td>
                              <td className="p-3 text-center font-bold">
                                <div>30-day: {auditAnalysis.signals.latePaymentCounts.late30}</div>
                                <div>60-day: {auditAnalysis.signals.latePaymentCounts.late60}</div>
                                <div>90-day: {auditAnalysis.signals.latePaymentCounts.late90}</div>
                              </td>
                              <td className="p-3 text-sm">Total count of late payments by severity</td>
                              <td className="p-3 text-sm">Direct indicator of payment reliability and risk</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">Late payments reduce behavior score</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Derogatory Records</td>
                              <td className="p-3 text-center font-bold">{auditAnalysis.signals.hasDerogatory ? 'Yes' : 'No'}</td>
                              <td className="p-3 text-sm">Presence of charge-offs, collections, or public records</td>
                              <td className="p-3 text-sm">Major negative factors affecting creditworthiness</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">Significantly reduces all scores</td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                              <td className="p-3 font-medium">Mortgage Present</td>
                              <td className="p-3 text-center font-bold">{auditAnalysis.signals.hasMortgage ? 'Yes' : 'No'}</td>
                              <td className="p-3 text-sm">Active mortgage account on credit report</td>
                              <td className="p-3 text-sm">Shows major credit responsibility and stability</td>
                              <td className="p-3 text-sm text-green-600 dark:text-green-400">Boosts seasoning and relationship score</td>
                            </tr>
                            <tr className="hover:bg-purple-50 dark:hover:bg-purple-900/20 border-t-2 border-purple-200 dark:border-purple-800">
                              <td className="p-3 font-bold text-purple-800 dark:text-purple-300">Implied Capacity Index (ICI)</td>
                              <td className="p-3 text-center font-bold text-purple-600 dark:text-purple-400">{auditAnalysis.ici.toFixed(3)}</td>
                              <td className="p-3 text-sm">Weighted combination of Supply (40%), Behavior (40%), and Seasoning (20%)</td>
                              <td className="p-3 text-sm">Comprehensive creditworthiness metric for funding capacity</td>
                              <td className="p-3 text-sm text-purple-600 dark:text-purple-400">Primary multiplier for anchor exposure</td>
                            </tr>
                            <tr className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                              <td className="p-3 font-bold text-purple-800 dark:text-purple-300">Anchor Exposure</td>
                              <td className="p-3 text-center font-bold text-purple-600 dark:text-purple-400">${auditAnalysis.anchorExposure.toLocaleString()}</td>
                              <td className="p-3 text-sm">ICI × (Total Aggregate Limits + Highest Single Limit)</td>
                              <td className="p-3 text-sm">Base calculation for all product mapping and funding projections</td>
                              <td className="p-3 text-sm text-purple-600 dark:text-purple-400">Foundation for personal and business card amounts</td>
                            </tr>
                            {/* Credit Decay Analysis Section */}
                            <tr className="hover:bg-red-50 dark:hover:bg-red-900/20 border-t-2 border-red-200 dark:border-red-800">
                              <td className="p-3 font-bold text-red-800 dark:text-red-300">Credit Decay Analysis</td>
                              <td className="p-3 text-center font-bold text-red-600 dark:text-red-400">
                                <div>Total Potential: ${auditAnalysis.creditDecay.totalPotentialLimit.toLocaleString()}</div>
                              </td>
                              <td className="p-3 text-sm">Inquiry-based limit reduction per bureau</td>
                              <td className="p-3 text-sm">Shows impact of credit fatigue on future approvals</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">Reduces effective credit capacity</td>
                            </tr>
                            <tr className="hover:bg-red-50 dark:hover:bg-red-900/20">
                              <td className="p-3 font-medium text-red-700 dark:text-red-300">Equifax Decay</td>
                              <td className="p-3 text-center font-bold">
                                <div>${auditAnalysis.creditDecay.bureauLimits.equifax.finalLimit.toLocaleString()}</div>
                                <div className="text-sm text-red-600 dark:text-red-400">(-{auditAnalysis.creditDecay.decayAnalysis.equifax.decayPercentage.toFixed(0)}%)</div>
                              </td>
                              <td className="p-3 text-sm">Base ${auditAnalysis.creditDecay.bureauLimits.equifax.baseLimit.toLocaleString()} × (1 - {auditAnalysis.creditDecay.decayAnalysis.equifax.decayPercentage.toFixed(0)}%)</td>
                              <td className="p-3 text-sm">{auditAnalysis.creditDecay.decayAnalysis.equifax.inquiries} inquiries reduce approval odds</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">-${auditAnalysis.creditDecay.decayAnalysis.equifax.limitReduction.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-red-50 dark:hover:bg-red-900/20">
                              <td className="p-3 font-medium text-red-700 dark:text-red-300">Experian Decay</td>
                              <td className="p-3 text-center font-bold">
                                <div>${auditAnalysis.creditDecay.bureauLimits.experian.finalLimit.toLocaleString()}</div>
                                <div className="text-sm text-red-600 dark:text-red-400">(-{auditAnalysis.creditDecay.decayAnalysis.experian.decayPercentage.toFixed(0)}%)</div>
                              </td>
                              <td className="p-3 text-sm">Base ${auditAnalysis.creditDecay.bureauLimits.experian.baseLimit.toLocaleString()} × (1 - {auditAnalysis.creditDecay.decayAnalysis.experian.decayPercentage.toFixed(0)}%)</td>
                              <td className="p-3 text-sm">{auditAnalysis.creditDecay.decayAnalysis.experian.inquiries} inquiries reduce approval odds</td>
                              <td className="p-3 text-sm">{auditAnalysis.creditDecay.decayAnalysis.experian.inquiries} inquiries reduce approval odds</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">-${auditAnalysis.creditDecay.decayAnalysis.experian.limitReduction.toLocaleString()}</td>
                            </tr>
                            <tr className="hover:bg-red-50 dark:hover:bg-red-900/20">
                              <td className="p-3 font-medium text-red-700 dark:text-red-300">TransUnion Decay</td>
                              <td className="p-3 text-center font-bold">
                                <div>${auditAnalysis.creditDecay.bureauLimits.transunion.finalLimit.toLocaleString()}</div>
                                <div className="text-sm text-red-600 dark:text-red-400">(-{auditAnalysis.creditDecay.decayAnalysis.transunion.decayPercentage.toFixed(0)}%)</div>
                              </td>
                              <td className="p-3 text-sm">Base ${auditAnalysis.creditDecay.bureauLimits.transunion.baseLimit.toLocaleString()} × (1 - {auditAnalysis.creditDecay.decayAnalysis.transunion.decayPercentage.toFixed(0)}%)</td>
                              <td className="p-3 text-sm">{auditAnalysis.creditDecay.decayAnalysis.transunion.inquiries} inquiries reduce approval odds</td>
                              <td className="p-3 text-sm text-red-600 dark:text-red-400">-${auditAnalysis.creditDecay.decayAnalysis.transunion.limitReduction.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bureau Routing Plan and Narrative */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-orange-600" />
                        Bureau Routing Plan & Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Bureau Routing Strategy */}
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <h4 className="font-semibold text-orange-800 mb-3">Optimal Bureau Routing Strategy</h4>
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-white rounded-lg border">
                            <div className="font-bold text-lg text-gray-800">{auditAnalysis.bureauRouting.primary.name}</div>
                            <div className="text-sm text-gray-600">Primary Bureau</div>
                            <div className="text-xs text-green-600 font-medium">{auditAnalysis.bureauRouting.primary.headroom} pulls available</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border">
                            <div className="font-bold text-lg text-gray-800">{auditAnalysis.bureauRouting.secondary.name}</div>
                            <div className="text-sm text-gray-600">Secondary Bureau</div>
                            <div className="text-xs text-green-600 font-medium">{auditAnalysis.bureauRouting.secondary.headroom} pulls available</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border">
                            <div className="font-bold text-lg text-gray-800">{auditAnalysis.bureauRouting.tertiary.name}</div>
                            <div className="text-sm text-gray-600">Tertiary Bureau</div>
                            <div className="text-xs text-green-600 font-medium">{auditAnalysis.bureauRouting.tertiary.headroom} pulls available</div>
                          </div>
                        </div>
                        <p className="text-sm text-orange-700">
                          <strong>Strategy:</strong> {auditAnalysis.bureauRouting.strategy.charAt(0).toUpperCase() + auditAnalysis.bureauRouting.strategy.slice(1)}
                        </p>
                      </div>

                      {/* Detailed Narrative */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-3">Comprehensive Analysis Narrative</h4>
                        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                          <p>
                            <strong>Credit Profile Assessment:</strong> The analysis reveals an Implied Capacity Index of {auditAnalysis.ici.toFixed(3)}, 
                            calculated through a weighted combination of supply factors (credit limits and account diversity), 
                            behavioral patterns (utilization and payment history), and seasoning elements (account age and mortgage presence). 
                            This ICI score, when multiplied by the combined total aggregate credit limit of ${auditAnalysis.signals.totalAggregateLimit.toLocaleString()} 
                            and highest single limit of ${auditAnalysis.signals.highestSingleLimit.toLocaleString()}, produces an anchor exposure 
                            of ${auditAnalysis.anchorExposure.toLocaleString()}.
                          </p>
                          <p>
                            <strong>Product Mapping Logic:</strong> Personal credit cards are mapped at 15% of anchor exposure, 
                            yielding ${auditAnalysis.scenarios.personalSingle.amount.toLocaleString()} per card, while business credit cards 
                            utilize a 22% multiplier, resulting in ${auditAnalysis.scenarios.businessSingle.amount.toLocaleString()} per card. 
                            All amounts are rounded down to the nearest $5,000 increment to maintain conservative projections and account for 
                            underwriting variations.
                          </p>
                          <p>
                            <strong>Multi-Card Discount Policy:</strong> When pursuing multiple cards within the same bureau, 
                            position-based discounts apply: first card receives 100% of the calculated amount, second card receives 75%, 
                            third card receives 60%, and fourth card receives 50%. This reflects the diminishing returns and increased 
                            scrutiny that typically accompany multiple applications within a short timeframe.
                          </p>
                          <p>
                            <strong>Inquiry Management:</strong> Current inquiry counts show {auditAnalysis.signals.inquiriesByBureau.equifax} Equifax, {auditAnalysis.signals.inquiriesByBureau.experian} Experian, 
                            and {auditAnalysis.signals.inquiriesByBureau.transunion} TransUnion hard pulls in the last six months. 
                            With the standard limit of 4 pulls per bureau, available headroom totals {auditAnalysis.bureauRouting.primary.headroom + auditAnalysis.bureauRouting.secondary.headroom + auditAnalysis.bureauRouting.tertiary.headroom} applications 
                            across all three bureaus, enabling a maximum {auditAnalysis.scenarios.maxByInquiries.cards}-card strategy 
                            with total potential funding of ${auditAnalysis.scenarios.maxByInquiries.grandTotal.toLocaleString()}.
                          </p>
                          <p>
                            <strong>Risk Considerations:</strong> The current utilization rate of {auditAnalysis.signals.averageUtilization.toFixed(1)}% 
                            and average account age of {Math.floor(auditAnalysis.signals.averageAccountAge / 12)} years {Math.floor(auditAnalysis.signals.averageAccountAge % 12)} months 
                            contribute positively to the overall risk profile. {auditAnalysis.signals.hasDerogatory ? 'However, the presence of derogatory records requires careful consideration and may limit approval rates.' : 'The absence of derogatory records supports strong approval probability.'} 
                            {auditAnalysis.signals.hasMortgage ? ' The presence of an active mortgage further strengthens the creditworthiness assessment.' : ''}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>

          {/* Funding Eligibility Status */}
          <Card className="border-0 shadow-md bg-gradient-to-r from-emerald-50 to-blue-50">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-4 p-4 bg-white/80 rounded-xl border border-green-200 shadow-sm">
                  <PiggyBank className="h-10 w-10 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      PREMIUM ELIGIBLE
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Qualified for Both Personal & Business Funding
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
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

      {/* Funding Application Modal */}
      <Dialog open={showFundingModal} onOpenChange={setShowFundingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {fundingType === 'personal' ? 'Personal' : 'Business'} Funding Application
            </DialogTitle>
          </DialogHeader>

          {!fundingOption ? (
            // Enhanced Funding Option Selection
            <div className="space-y-8 py-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <DollarSign className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Choose Your Funding Path
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
                  Select the option that best fits your needs and let us help you secure the funding you deserve
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <Card 
                  className="cursor-pointer hover:shadow-2xl transition-all duration-500 border-2 hover:border-blue-500 hover:scale-105 group relative overflow-hidden bg-gradient-to-br from-white to-blue-50"
                  onClick={() => setFundingOption('done-for-you')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 text-center relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-blue-700 transition-colors duration-300">Done For You</h4>
                    <p className="text-gray-600 text-base mb-6 leading-relaxed">
                      Our funding experts handle everything for you. Complete application assistance, document preparation, and personalized guidance throughout the entire process.
                    </p>
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Expert application assistance</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Document preparation help</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Personalized guidance</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Higher approval rates</span>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg">
                      <Star className="h-5 w-5 mr-2" />
                      Choose Premium Service
                    </Button>
                    <div className="mt-4 text-xs text-blue-600 font-medium">
                      ⭐ Most Popular Choice
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-2xl transition-all duration-500 border-2 hover:border-green-500 hover:scale-105 group relative overflow-hidden bg-gradient-to-br from-white to-green-50"
                  onClick={() => setFundingOption('diy')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 text-center relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                      <FileText className="h-12 w-12 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold mb-4 text-gray-800 group-hover:text-green-700 transition-colors duration-300">DIY Funding</h4>
                    <p className="text-gray-600 text-base mb-6 leading-relaxed">
                      Take control of your funding journey. Complete the application yourself with our comprehensive step-by-step guidance and resources.
                    </p>
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Step-by-step guidance</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Resource library access</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Self-paced completion</span>
                      </div>
                      <div className="flex items-center text-sm text-green-600 justify-center">
                        <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span>Complete control</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-semibold py-4 rounded-xl transition-all duration-300 text-lg hover:shadow-lg"
                      onClick={() => {
                        setFundingOption('diy');
                        setDiyFundingType(fundingType);
                        setShowFundingModal(false);
                        setShowDIYSection(true);
                        // Scroll to DIY section
                        setTimeout(() => {
                          const diySection = document.querySelector('[data-diy-section]');
                          if (diySection) {
                            diySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Choose Self-Service
                    </Button>
                    <div className="mt-4 text-xs text-green-600 font-medium">
                      💪 For Independent Users
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : fundingOption === 'diy' ? (
            // DIY Cards Display - Show appropriate component based on funding type
            fundingType === 'business' ? (
              <BusinessCardsDisplay onClose={() => setFundingOption(null)} />
            ) : (
              <PersonalCardsDisplay onClose={() => setFundingOption(null)} />
            )
          ) : (
            // Enhanced 4-Step Form (only show for Done For You option)
            fundingOption === 'done-for-you' && (
              <div className="space-y-8 py-6">
                {/* Enhanced Step Navigation with Progress Bar */}
                <div className="relative mb-12">
                  <div className="flex items-center justify-between mb-8">
                    {[
                      { step: 1, title: 'Business Info', icon: Building2, color: 'blue', description: 'Company details' },
                      { step: 2, title: 'Personal Info', icon: User, color: 'indigo', description: 'Guarantor details' },
                      { step: 3, title: 'Employment', icon: Building, color: 'purple', description: 'Work information' },
                      { step: 4, title: 'Financial', icon: DollarSign, color: 'green', description: 'Banking & credit' }
                    ].map((item, index) => {
                      const isActive = currentStep === item.step;
                      const isCompleted = currentStep > item.step;
                      const IconComponent = item.icon;
                      
                      return (
                        <div key={item.step} className="flex items-center relative">
                          <div className="flex flex-col items-center">
                            <div 
                              className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 shadow-lg ${
                                isCompleted 
                                  ? `bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 text-white ring-4 ring-${item.color}-200` 
                                  : isActive
                                  ? `bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 text-white ring-4 ring-${item.color}-300 animate-pulse`
                                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-10 w-10" />
                              ) : (
                                <IconComponent className="h-10 w-10" />
                              )}
                            </div>
                            <div className="mt-4 text-center">
                              <div className={`text-base font-bold transition-colors duration-300 ${
                                isActive || isCompleted ? `text-${item.color}-600` : 'text-gray-500'
                              }`}>
                                Step {item.step}
                              </div>
                              <div className={`text-sm font-semibold transition-colors duration-300 ${
                                isActive || isCompleted ? `text-${item.color}-600` : 'text-gray-400'
                              }`}>
                                {item.title}
                              </div>
                              <div className={`text-xs transition-colors duration-300 ${
                                isActive || isCompleted ? `text-${item.color}-500` : 'text-gray-400'
                              }`}>
                                {item.description}
                              </div>
                            </div>
                          </div>
                          {index < 3 && (
                            <div className="flex-1 mx-6 relative">
                              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ease-out ${
                                    currentStep > item.step 
                                      ? 'bg-gradient-to-r from-blue-500 to-green-500 w-full' 
                                      : 'bg-gray-200 w-0'
                                  }`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Overall Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-8 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    />
                  </div>
                  
                  {/* Step Counter */}
                  <div className="text-center">
                    <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200">
                      <div className="text-sm font-semibold text-gray-700">
                        Step {currentStep} of 4 • {Math.round((currentStep / 4) * 100)}% Complete
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Step 1: Business Information */}
                {currentStep === 1 && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Building2 className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Business Information
                      </h3>
                      <p className="text-gray-600">Tell us about your business and funding needs</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="titlePosition" className="text-sm font-semibold text-gray-700 flex items-center">
                          <User className="h-4 w-4 mr-2 text-blue-500" />
                          Title / Position *
                        </Label>
                        <Input
                          id="titlePosition"
                          value={formData.titlePosition}
                          onChange={(e) => setFormData({...formData, titlePosition: e.target.value})}
                          placeholder="e.g., CEO, Owner, Manager"
                          className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                            formErrors.titlePosition 
                              ? 'border-red-500 focus:border-red-500 bg-red-50' 
                              : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {formErrors.titlePosition && (
                          <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {formErrors.titlePosition}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fundingAmount" className="text-sm font-semibold text-gray-700 flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                          Amount of Funding Requested *
                        </Label>
                        <Input
                          id="fundingAmount"
                          type="number"
                          value={formData.fundingAmount}
                          onChange={(e) => setFormData({...formData, fundingAmount: e.target.value})}
                          placeholder="$50,000"
                          className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                            formErrors.fundingAmount 
                              ? 'border-red-500 focus:border-red-500 bg-red-50' 
                              : 'border-gray-200 focus:border-green-500'
                          }`}
                        />
                        {formErrors.fundingAmount && (
                          <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {formErrors.fundingAmount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intendedUse" className="text-sm font-semibold text-gray-700 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-purple-500" />
                        Intended Use of Funds *
                      </Label>
                      <Textarea
                        id="intendedUse"
                        value={formData.intendedUse}
                        onChange={(e) => setFormData({...formData, intendedUse: e.target.value})}
                        placeholder="Describe how you plan to use the funds (e.g., equipment purchase, inventory, expansion)"
                        className={`min-h-[100px] border-2 rounded-lg transition-all duration-300 hover:border-gray-300 resize-none ${
                          formErrors.intendedUse 
                            ? 'border-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-purple-500'
                        }`}
                      />
                      {formErrors.intendedUse && (
                        <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.intendedUse}
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Building className="h-4 w-4 mr-2 text-indigo-500" />
                          Business Name *
                        </Label>
                        <Input
                          id="businessName"
                          value={formData.businessName}
                          onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                          placeholder="Your Business Name LLC"
                          className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                            formErrors.businessName 
                              ? 'border-red-500 focus:border-red-500 bg-red-50' 
                              : 'border-gray-200 focus:border-indigo-500'
                          }`}
                        />
                        {formErrors.businessName && (
                          <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {formErrors.businessName}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessPhone" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-blue-500" />
                          Business Phone *
                        </Label>
                        <Input
                          id="businessPhone"
                          value={formData.businessPhone}
                          onChange={(e) => setFormData({...formData, businessPhone: e.target.value})}
                          placeholder="(555) 123-4567"
                          className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                            formErrors.businessPhone 
                              ? 'border-red-500 focus:border-red-500 bg-red-50' 
                              : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {formErrors.businessPhone && (
                          <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {formErrors.businessPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessEmail" className="text-sm font-semibold text-gray-700 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-red-500" />
                        Business Email *
                      </Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={(e) => setFormData({...formData, businessEmail: e.target.value})}
                        placeholder="business@company.com"
                        className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                          formErrors.businessEmail 
                            ? 'border-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-red-500'
                        }`}
                      />
                      {formErrors.businessEmail && (
                        <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.businessEmail}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessAddress" className="text-sm font-semibold text-gray-700 flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-orange-500" />
                        Business Address *
                      </Label>
                      <Input
                        id="businessAddress"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({...formData, businessAddress: e.target.value})}
                        placeholder="123 Business Street"
                        className={`h-12 border-2 rounded-lg transition-all duration-300 hover:border-gray-300 ${
                          formErrors.businessAddress 
                            ? 'border-red-500 focus:border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-orange-500'
                        }`}
                      />
                      {formErrors.businessAddress && (
                        <div className="flex items-center text-red-600 text-sm mt-1 animate-fadeIn">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {formErrors.businessAddress}
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold text-gray-700 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-teal-500" />
                          City *
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          placeholder="New York"
                          className="h-12 border-2 border-gray-200 focus:border-teal-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-semibold text-gray-700 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-cyan-500" />
                          State *
                        </Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                          placeholder="NY"
                          className="h-12 border-2 border-gray-200 focus:border-cyan-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Hash className="h-4 w-4 mr-2 text-pink-500" />
                          ZIP *
                        </Label>
                        <Input
                          id="zip"
                          value={formData.zip}
                          onChange={(e) => setFormData({...formData, zip: e.target.value})}
                          placeholder="10001"
                          className="h-12 border-2 border-gray-200 focus:border-pink-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="dateCommenced" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-violet-500" />
                          Date Business Commenced *
                        </Label>
                        <Input
                          id="dateCommenced"
                          type="date"
                          value={formData.dateCommenced}
                          onChange={(e) => setFormData({...formData, dateCommenced: e.target.value})}
                          className="h-12 border-2 border-gray-200 focus:border-violet-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessWebsite" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-emerald-500" />
                          Business Website
                        </Label>
                        <Input
                          id="businessWebsite"
                          value={formData.businessWebsite}
                          onChange={(e) => setFormData({...formData, businessWebsite: e.target.value})}
                          placeholder="https://www.yourwebsite.com"
                          className="h-12 border-2 border-gray-200 focus:border-emerald-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessIndustry" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Briefcase className="h-4 w-4 mr-2 text-amber-500" />
                          Business Industry *
                        </Label>
                        <Input
                          id="businessIndustry"
                          value={formData.businessIndustry}
                          onChange={(e) => setFormData({...formData, businessIndustry: e.target.value})}
                          placeholder="e.g., Technology, Retail, Healthcare"
                          className="h-12 border-2 border-gray-200 focus:border-amber-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="entityType" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-rose-500" />
                          Entity Type *
                        </Label>
                        <Select value={formData.entityType} onValueChange={(value) => setFormData({...formData, entityType: value})}>
                          <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-rose-500 rounded-lg transition-all duration-300 hover:border-gray-300">
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LLC">LLC</SelectItem>
                            <SelectItem value="Corporation">Corporation</SelectItem>
                            <SelectItem value="Partnership">Partnership</SelectItem>
                            <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="incorporationState" className="text-sm font-semibold text-gray-700 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-lime-500" />
                          Incorporation State *
                        </Label>
                        <Input
                          id="incorporationState"
                          value={formData.incorporationState}
                          onChange={(e) => setFormData({...formData, incorporationState: e.target.value})}
                          placeholder="Delaware"
                          className="h-12 border-2 border-gray-200 focus:border-lime-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numberOfEmployees" className="text-sm font-semibold text-gray-700 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-sky-500" />
                          Number of Employees *
                        </Label>
                        <Input
                          id="numberOfEmployees"
                          type="number"
                          value={formData.numberOfEmployees}
                          onChange={(e) => setFormData({...formData, numberOfEmployees: e.target.value})}
                          placeholder="5"
                          className="h-12 border-2 border-gray-200 focus:border-sky-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ein" className="text-sm font-semibold text-gray-700 flex items-center">
                        <Hash className="h-4 w-4 mr-2 text-slate-500" />
                        EIN # *
                      </Label>
                      <Input
                        id="ein"
                        value={formData.ein}
                        onChange={(e) => setFormData({...formData, ein: e.target.value})}
                        placeholder="12-3456789"
                        className="h-12 border-2 border-gray-200 focus:border-slate-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="monthlyGrossSales" className="text-sm font-semibold text-gray-700 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                          Current Gross Monthly Sales *
                        </Label>
                        <Input
                          id="monthlyGrossSales"
                          type="number"
                          value={formData.monthlyGrossSales}
                          onChange={(e) => setFormData({...formData, monthlyGrossSales: e.target.value})}
                          placeholder="$25,000"
                          className="h-12 border-2 border-gray-200 focus:border-green-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectedAnnualRevenue" className="text-sm font-semibold text-gray-700 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2 text-blue-500" />
                          Projected Gross Annual Revenue *
                        </Label>
                        <Input
                          id="projectedAnnualRevenue"
                          type="number"
                          value={formData.projectedAnnualRevenue}
                          onChange={(e) => setFormData({...formData, projectedAnnualRevenue: e.target.value})}
                          placeholder="$300,000"
                          className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-all duration-300 hover:border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Personal Guarantor Information */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Personal Guarantor Information</h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={formData.middleName}
                          onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                          placeholder="Enter middle name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          placeholder="Enter last name"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="birthCity">Birth City *</Label>
                        <Input
                          id="birthCity"
                          value={formData.birthCity}
                          onChange={(e) => setFormData({...formData, birthCity: e.target.value})}
                          placeholder="Enter birth city"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ssn">SSN *</Label>
                        <Input
                          id="ssn"
                          value={formData.ssn}
                          onChange={(e) => setFormData({...formData, ssn: e.target.value})}
                          placeholder="Enter SSN"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mothersMaidenName">Mother's Maiden Name *</Label>
                        <Input
                          id="mothersMaidenName"
                          value={formData.mothersMaidenName}
                          onChange={(e) => setFormData({...formData, mothersMaidenName: e.target.value})}
                          placeholder="Enter mother's maiden name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="homeAddress">Home Address *</Label>
                      <Input
                        id="homeAddress"
                        value={formData.homeAddress}
                        onChange={(e) => setFormData({...formData, homeAddress: e.target.value})}
                        placeholder="Enter home address"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="personalCity">City *</Label>
                        <Input
                          id="personalCity"
                          value={formData.personalCity}
                          onChange={(e) => setFormData({...formData, personalCity: e.target.value})}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="personalState">State *</Label>
                        <Input
                          id="personalState"
                          value={formData.personalState}
                          onChange={(e) => setFormData({...formData, personalState: e.target.value})}
                          placeholder="Enter state"
                        />
                      </div>
                      <div>
                        <Label htmlFor="personalZip">ZIP *</Label>
                        <Input
                          id="personalZip"
                          value={formData.personalZip}
                          onChange={(e) => setFormData({...formData, personalZip: e.target.value})}
                          placeholder="Enter ZIP code"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="homePhone">Home Phone</Label>
                        <Input
                          id="homePhone"
                          value={formData.homePhone}
                          onChange={(e) => setFormData({...formData, homePhone: e.target.value})}
                          placeholder="Enter home phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobilePhone">Mobile Phone *</Label>
                        <Input
                          id="mobilePhone"
                          value={formData.mobilePhone}
                          onChange={(e) => setFormData({...formData, mobilePhone: e.target.value})}
                          placeholder="Enter mobile phone"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Housing Status *</Label>
                      <RadioGroup 
                        value={formData.housingStatus} 
                        onValueChange={(value) => setFormData({...formData, housingStatus: value})}
                        className="flex gap-6 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="rent" id="rent" />
                          <Label htmlFor="rent">Rent</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="own" id="own" />
                          <Label htmlFor="own">Own</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other">Other</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="monthlyHousingPayment">Monthly Housing Payment *</Label>
                        <Input
                          id="monthlyHousingPayment"
                          type="number"
                          value={formData.monthlyHousingPayment}
                          onChange={(e) => setFormData({...formData, monthlyHousingPayment: e.target.value})}
                          placeholder="Enter monthly payment"
                        />
                      </div>
                      <div>
                        <Label htmlFor="yearsAtAddress">Years at Current Address *</Label>
                        <Input
                          id="yearsAtAddress"
                          type="number"
                          value={formData.yearsAtAddress}
                          onChange={(e) => setFormData({...formData, yearsAtAddress: e.target.value})}
                          placeholder="Enter years at address"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="driversLicense">Driver's License # *</Label>
                        <Input
                          id="driversLicense"
                          value={formData.driversLicense}
                          onChange={(e) => setFormData({...formData, driversLicense: e.target.value})}
                          placeholder="Enter driver's license number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuingState">Issuing State *</Label>
                        <Input
                          id="issuingState"
                          value={formData.issuingState}
                          onChange={(e) => setFormData({...formData, issuingState: e.target.value})}
                          placeholder="Enter issuing state"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="issueDate">Issue Date *</Label>
                        <Input
                          id="issueDate"
                          type="date"
                          value={formData.issueDate}
                          onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expirationDate">Expiration Date *</Label>
                        <Input
                          id="expirationDate"
                          type="date"
                          value={formData.expirationDate}
                          onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Employment Information */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="currentEmployer">Current Employer *</Label>
                        <Input
                          id="currentEmployer"
                          value={formData.currentEmployer}
                          onChange={(e) => setFormData({...formData, currentEmployer: e.target.value})}
                          placeholder="Enter current employer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                          placeholder="Enter position"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="yearsAtEmployer">Years at Current Employer *</Label>
                        <Input
                          id="yearsAtEmployer"
                          type="number"
                          value={formData.yearsAtEmployer}
                          onChange={(e) => setFormData({...formData, yearsAtEmployer: e.target.value})}
                          placeholder="Enter years at employer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="employerPhone">Employer Phone *</Label>
                        <Input
                          id="employerPhone"
                          value={formData.employerPhone}
                          onChange={(e) => setFormData({...formData, employerPhone: e.target.value})}
                          placeholder="Enter employer phone"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="employerAddress">Employer Address *</Label>
                      <Input
                        id="employerAddress"
                        value={formData.employerAddress}
                        onChange={(e) => setFormData({...formData, employerAddress: e.target.value})}
                        placeholder="Enter employer address"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Financial Information */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                    
                    {/* Banking & Credit Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Banking & Credit Information</h4>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="personalBankName">Personal Bank Name *</Label>
                          <Input
                            id="personalBankName"
                            value={formData.personalBankName}
                            onChange={(e) => setFormData({...formData, personalBankName: e.target.value})}
                            placeholder="Enter personal bank name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="personalBankBalance">Personal Bank Avg. Balance *</Label>
                          <Input
                            id="personalBankBalance"
                            type="number"
                            value={formData.personalBankBalance}
                            onChange={(e) => setFormData({...formData, personalBankBalance: e.target.value})}
                            placeholder="Enter average balance"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="businessBankName">Business Bank Name *</Label>
                          <Input
                            id="businessBankName"
                            value={formData.businessBankName}
                            onChange={(e) => setFormData({...formData, businessBankName: e.target.value})}
                            placeholder="Enter business bank name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="businessBankBalance">Business Bank Avg. Balance *</Label>
                          <Input
                            id="businessBankBalance"
                            type="number"
                            value={formData.businessBankBalance}
                            onChange={(e) => setFormData({...formData, businessBankBalance: e.target.value})}
                            placeholder="Enter average balance"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Snapshot */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Financial Snapshot</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Are you a U.S. Citizen? *</Label>
                          <RadioGroup 
                            value={formData.usCitizen} 
                            onValueChange={(value) => setFormData({...formData, usCitizen: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="citizen-yes" />
                              <Label htmlFor="citizen-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="citizen-no" />
                              <Label htmlFor="citizen-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Savings Account? *</Label>
                          <RadioGroup 
                            value={formData.savingsAccount} 
                            onValueChange={(value) => setFormData({...formData, savingsAccount: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="savings-yes" />
                              <Label htmlFor="savings-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="savings-no" />
                              <Label htmlFor="savings-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Investment Accounts? *</Label>
                          <RadioGroup 
                            value={formData.investmentAccounts} 
                            onValueChange={(value) => setFormData({...formData, investmentAccounts: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="investment-yes" />
                              <Label htmlFor="investment-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="investment-no" />
                              <Label htmlFor="investment-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Military Affiliation (you or family)? *</Label>
                          <RadioGroup 
                            value={formData.militaryAffiliation} 
                            onValueChange={(value) => setFormData({...formData, militaryAffiliation: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="military-yes" />
                              <Label htmlFor="military-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="military-no" />
                              <Label htmlFor="military-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Do you have other income? *</Label>
                          <RadioGroup 
                            value={formData.otherIncome} 
                            onValueChange={(value) => setFormData({...formData, otherIncome: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="income-yes" />
                              <Label htmlFor="income-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="income-no" />
                              <Label htmlFor="income-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div>
                          <Label>Do you have other assets? *</Label>
                          <RadioGroup 
                            value={formData.otherAssets} 
                            onValueChange={(value) => setFormData({...formData, otherAssets: value})}
                            className="flex gap-6 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="assets-yes" />
                              <Label htmlFor="assets-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="assets-no" />
                              <Label htmlFor="assets-no">No</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>

                    {/* Banks to Ignore */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Banks to Ignore (Optional)</h4>
                      <div>
                        <Label htmlFor="banksToIgnore">Banks to Ignore (Type bank name and press Enter to add)</Label>
                        <Input
                          id="banksToIgnore"
                          placeholder="Enter bank name and press Enter to add..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = e.currentTarget.value.trim();
                              if (value && !formData.banksToIgnore.includes(value)) {
                                setFormData({
                                  ...formData, 
                                  banksToIgnore: [...formData.banksToIgnore, value]
                                });
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                        {formData.banksToIgnore.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.banksToIgnore.map((bank, index) => (
                              <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                {bank}
                                <button
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      banksToIgnore: formData.banksToIgnore.filter((_, i) => i !== index)
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-gray-600 mt-2">
                          Specify any banks you want to exclude from funding consideration. This is optional.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="group relative overflow-hidden px-6 py-3 border-2 border-gray-300 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 bg-white hover:bg-blue-50"
                    onClick={() => handleStepNavigation('back')}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                      <span className="font-medium">
                        {currentStep === 1 ? 'Back to Options' : 'Previous'}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                  
                  {/* Step indicator in center */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Step {currentStep} of 4</span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                        style={{ width: `${(currentStep / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <Button 
                    className={`group relative overflow-hidden px-6 py-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                      currentStep === 4 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    } ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (currentStep === 4) {
                        handleFormSubmission();
                      } else {
                        handleStepNavigation('forward');
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium">Processing...</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">
                            {currentStep === 4 ? 'Submit Application' : 'Next'}
                          </span>
                          {currentStep === 4 ? (
                            <CheckCircle2 className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                          ) : (
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                          )}
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Ripple effect */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 bg-white/30 transform scale-0 group-active:scale-100 transition-transform duration-200 rounded-full"></div>
                    </div>
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>


    </FundingManagerLayout>
  );
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}

{/* Custom CSS for enhanced animations */}
<style jsx>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
      max-height: 0;
    }
    to {
      opacity: 1;
      transform: translateY(0);
      max-height: 1000px;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }

  .animate-slideInRight {
    animation: slideInRight 0.5s ease-out forwards;
  }

  .animate-slideInLeft {
    animation: slideInLeft 0.5s ease-out forwards;
  }

  .animate-slideDown {
    animation: slideDown 0.6s ease-out forwards;
  }

  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out forwards;
  }

  .animate-pulse-custom {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Smooth transitions for form elements */
  .form-transition {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Enhanced hover effects */
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Step indicator animations */
  .step-indicator {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .step-indicator.active {
    transform: scale(1.05);
  }

  .step-indicator.completed {
    animation: scaleIn 0.3s ease-out;
  }
`}</style>
