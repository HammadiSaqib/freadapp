import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FundingManagerLayout from "@/components/FundingManagerLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import {
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Eye,
  Edit,
  Mail,
  User,
  Building,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Banknote,
  Shield,
  Users,
  ArrowLeft,
  Clock,
} from "lucide-react";

interface FundingRequest {
  id: number;
  title: string;
  description: string;
  amount: number;
  purpose: string;
  funding_type?: string;
  title_position?: string;
  intended_use?: string;
  
  // Business Information
  business_name?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  date_commenced?: string;
  business_website?: string;
  business_industry?: string;
  entity_type?: string;
  incorporation_state?: string;
  number_of_employees?: number;
  ein?: string;
  monthly_gross_sales?: number;
  projected_annual_revenue?: number;
  
  // Personal Information
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  birth_city?: string;
  ssn?: string;
  mothers_maiden_name?: string;
  home_address?: string;
  personal_city?: string;
  personal_state?: string;
  personal_zip?: string;
  home_phone?: string;
  mobile_phone?: string;
  housing_status?: string;
  monthly_housing_payment?: number;
  years_at_address?: number;
  drivers_license?: string;
  issuing_state?: string;
  issue_date?: string;
  expiration_date?: string;
  
  // Employment Information
  current_employer?: string;
  position?: string;
  years_at_employer?: number;
  employer_phone?: string;
  employer_address?: string;
  
  // Financial Information
  personal_bank_name?: string;
  personal_bank_balance?: number;
  business_bank_name?: string;
  business_bank_balance?: number;
  us_citizen?: string;
  savings_account?: string;
  investment_accounts?: string;
  military_affiliation?: string;
  other_income?: string;
  other_assets?: string;
  banks_to_ignore?: string;
  
  // System fields
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requested_date: string;
  reviewed_date?: string;
  reviewer_notes?: string;
  user_id: number;
  reviewer_id?: number;
  created_at: string;
  updated_at: string;
  user_email: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
  
  // Document fields
  driver_license_file_path?: string;
  ein_confirmation_file_path?: string;
  articles_from_state_file_path?: string;
}

const FundingRequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<FundingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view request details.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      const response = await fetch(`/api/funding-requests/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionStorage');
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to update request status.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/funding-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionStorage');
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast({
        title: "Success",
        description: `Request status updated to ${newStatus.replace('_', ' ')}.`,
      });

      // Refresh the request details
      fetchRequestDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status.",
        variant: "destructive",
      });
    }
  };

  const downloadPDF = async (request: FundingRequest) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download PDF.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/funding-requests/${request.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionStorage');
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `funding-request-${request.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF.",
        variant: "destructive",
      });
    }
  };

  const viewDocument = async (filePath: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view documents.",
          variant: "destructive",
        });
        return;
      }

      const filename = filePath.split('/').pop();
      const response = await fetch(`/api/funding-requests/documents/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionStorage');
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "Error",
        description: "Failed to view document.",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, downloadName: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download documents.",
          variant: "destructive",
        });
        return;
      }

      const filename = filePath.split('/').pop();
      const response = await fetch(`/api/funding-requests/documents/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionStorage');
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Document downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    
    return (
      <Badge className={config?.color || 'bg-gray-100 text-gray-800'}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={priorityConfig[priority as keyof typeof priorityConfig] || 'bg-gray-100 text-gray-800'}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading request details...</div>
        </div>
      </FundingManagerLayout>
    );
  }

  if (!request) {
    return (
      <FundingManagerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Request not found</div>
        </div>
      </FundingManagerLayout>
    );
  }

  return (
    <FundingManagerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/funding-manager/funding-requests')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Funding Requests
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Funding Request Details</h1>
              <p className="text-gray-600">Request #{request.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadPDF(request)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Request'}
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-sm font-medium">Request ID</Label>
              <p className="text-sm mt-1">#{request.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <p className="text-sm mt-1">{request.title}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Amount Requested</Label>
              <p className="text-sm font-semibold mt-1">{formatCurrency(request.amount)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Purpose</Label>
              <p className="text-sm mt-1">{request.purpose?.replace('_', ' ') || 'N/A'}</p>
            </div>
            {request.funding_type && (
              <div>
                <Label className="text-sm font-medium">Funding Type</Label>
                <p className="text-sm mt-1">{request.funding_type}</p>
              </div>
            )}
            {request.intended_use && (
              <div>
                <Label className="text-sm font-medium">Intended Use</Label>
                <p className="text-sm mt-1">{request.intended_use}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <div className="mt-1">{getPriorityBadge(request.priority)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">{getStatusBadge(request.status)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Requested Date</Label>
              <p className="text-sm mt-1">{formatDate(request.requested_date)}</p>
            </div>
            {request.reviewed_date && (
              <div>
                <Label className="text-sm font-medium">Reviewed Date</Label>
                <p className="text-sm mt-1">{formatDate(request.reviewed_date)}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Created At</Label>
              <p className="text-sm mt-1">{formatDate(request.created_at)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Updated At</Label>
              <p className="text-sm mt-1">{formatDate(request.updated_at)}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{request.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-sm font-medium">First Name</Label>
              <p className="text-sm mt-1">{request.first_name}</p>
            </div>
            {request.middle_name && (
              <div>
                <Label className="text-sm font-medium">Middle Name</Label>
                <p className="text-sm mt-1">{request.middle_name}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Last Name</Label>
              <p className="text-sm mt-1">{request.last_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm mt-1">{request.user_email}</p>
            </div>
            {request.date_of_birth && (
              <div>
                <Label className="text-sm font-medium">Date of Birth</Label>
                <p className="text-sm mt-1">{formatDate(request.date_of_birth)}</p>
              </div>
            )}
            {request.birth_city && (
              <div>
                <Label className="text-sm font-medium">Birth City</Label>
                <p className="text-sm mt-1">{request.birth_city}</p>
              </div>
            )}
            {request.ssn && (
              <div>
                <Label className="text-sm font-medium">SSN</Label>
                <p className="text-sm mt-1">***-**-{request.ssn.slice(-4)}</p>
              </div>
            )}
            {request.mothers_maiden_name && (
              <div>
                <Label className="text-sm font-medium">Mother's Maiden Name</Label>
                <p className="text-sm mt-1">{request.mothers_maiden_name}</p>
              </div>
            )}
            {request.home_address && (
              <div>
                <Label className="text-sm font-medium">Home Address</Label>
                <p className="text-sm mt-1">{request.home_address}</p>
              </div>
            )}
            {(request.personal_city || request.personal_state || request.personal_zip) && (
              <div>
                <Label className="text-sm font-medium">Personal Location</Label>
                <p className="text-sm mt-1">
                  {[request.personal_city, request.personal_state, request.personal_zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
            {request.home_phone && (
              <div>
                <Label className="text-sm font-medium">Home Phone</Label>
                <p className="text-sm mt-1">{request.home_phone}</p>
              </div>
            )}
            {request.mobile_phone && (
              <div>
                <Label className="text-sm font-medium">Mobile Phone</Label>
                <p className="text-sm mt-1">{request.mobile_phone}</p>
              </div>
            )}
            {request.housing_status && (
              <div>
                <Label className="text-sm font-medium">Housing Status</Label>
                <p className="text-sm mt-1">{request.housing_status}</p>
              </div>
            )}
            {request.monthly_housing_payment && (
              <div>
                <Label className="text-sm font-medium">Monthly Housing Payment</Label>
                <p className="text-sm mt-1">{formatCurrency(request.monthly_housing_payment)}</p>
              </div>
            )}
            {request.years_at_address && (
              <div>
                <Label className="text-sm font-medium">Years at Address</Label>
                <p className="text-sm mt-1">{request.years_at_address} years</p>
              </div>
            )}
            {request.drivers_license && (
              <div>
                <Label className="text-sm font-medium">Driver's License</Label>
                <p className="text-sm mt-1">{request.drivers_license}</p>
              </div>
            )}
            {request.issuing_state && (
              <div>
                <Label className="text-sm font-medium">Issuing State</Label>
                <p className="text-sm mt-1">{request.issuing_state}</p>
              </div>
            )}
            {request.issue_date && (
              <div>
                <Label className="text-sm font-medium">Issue Date</Label>
                <p className="text-sm mt-1">{formatDate(request.issue_date)}</p>
              </div>
            )}
            {request.expiration_date && (
              <div>
                <Label className="text-sm font-medium">Expiration Date</Label>
                <p className="text-sm mt-1">{formatDate(request.expiration_date)}</p>
              </div>
            )}
            {request.title_position && (
              <div>
                <Label className="text-sm font-medium">Title/Position</Label>
                <p className="text-sm mt-1">{request.title_position}</p>
              </div>
            )}
            {request.us_citizen && (
              <div>
                <Label className="text-sm font-medium">US Citizen</Label>
                <p className="text-sm mt-1">{request.us_citizen}</p>
              </div>
            )}
            {request.military_affiliation && (
              <div>
                <Label className="text-sm font-medium">Military Affiliation</Label>
                <p className="text-sm mt-1">{request.military_affiliation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        {(request.current_employer || request.position || request.years_at_employer || request.employer_phone || request.employer_address) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {request.current_employer && (
                <div>
                  <Label className="text-sm font-medium">Current Employer</Label>
                  <p className="text-sm mt-1">{request.current_employer}</p>
                </div>
              )}
              {request.position && (
                <div>
                  <Label className="text-sm font-medium">Position</Label>
                  <p className="text-sm mt-1">{request.position}</p>
                </div>
              )}
              {request.years_at_employer && (
                <div>
                  <Label className="text-sm font-medium">Years at Employer</Label>
                  <p className="text-sm mt-1">{request.years_at_employer} years</p>
                </div>
              )}
              {request.employer_phone && (
                <div>
                  <Label className="text-sm font-medium">Employer Phone</Label>
                  <p className="text-sm mt-1">{request.employer_phone}</p>
                </div>
              )}
              {request.employer_address && (
                <div>
                  <Label className="text-sm font-medium">Employer Address</Label>
                  <p className="text-sm mt-1">{request.employer_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Business Information */}
        {request.business_name && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-sm font-medium">Business Name</Label>
                <p className="text-sm mt-1">{request.business_name}</p>
              </div>
              {request.business_phone && (
                <div>
                  <Label className="text-sm font-medium">Business Phone</Label>
                  <p className="text-sm mt-1">{request.business_phone}</p>
                </div>
              )}
              {request.business_email && (
                <div>
                  <Label className="text-sm font-medium">Business Email</Label>
                  <p className="text-sm mt-1">{request.business_email}</p>
                </div>
              )}
              {request.business_address && (
                <div>
                  <Label className="text-sm font-medium">Business Address</Label>
                  <p className="text-sm mt-1">{request.business_address}</p>
                </div>
              )}
              {(request.business_city || request.business_state || request.business_zip) && (
                <div>
                  <Label className="text-sm font-medium">Business Location</Label>
                  <p className="text-sm mt-1">
                    {[request.business_city, request.business_state, request.business_zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
              {request.date_commenced && (
                <div>
                  <Label className="text-sm font-medium">Date Commenced</Label>
                  <p className="text-sm mt-1">{formatDate(request.date_commenced)}</p>
                </div>
              )}
              {request.business_website && (
                <div>
                  <Label className="text-sm font-medium">Website</Label>
                  <p className="text-sm mt-1">
                    <a href={request.business_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {request.business_website}
                    </a>
                  </p>
                </div>
              )}
              {request.business_industry && (
                <div>
                  <Label className="text-sm font-medium">Industry</Label>
                  <p className="text-sm mt-1">{request.business_industry}</p>
                </div>
              )}
              {request.entity_type && (
                <div>
                  <Label className="text-sm font-medium">Entity Type</Label>
                  <p className="text-sm mt-1">{request.entity_type}</p>
                </div>
              )}
              {request.incorporation_state && (
                <div>
                  <Label className="text-sm font-medium">Incorporation State</Label>
                  <p className="text-sm mt-1">{request.incorporation_state}</p>
                </div>
              )}
              {request.number_of_employees && (
                <div>
                  <Label className="text-sm font-medium">Number of Employees</Label>
                  <p className="text-sm mt-1">{request.number_of_employees}</p>
                </div>
              )}
              {request.ein && (
                <div>
                  <Label className="text-sm font-medium">EIN</Label>
                  <p className="text-sm mt-1">{request.ein}</p>
                </div>
              )}
              {request.monthly_gross_sales && (
                <div>
                  <Label className="text-sm font-medium">Monthly Gross Sales</Label>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(request.monthly_gross_sales)}</p>
                </div>
              )}
              {request.projected_annual_revenue && (
                <div>
                  <Label className="text-sm font-medium">Projected Annual Revenue</Label>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(request.projected_annual_revenue)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {request.personal_bank_name && (
              <div>
                <Label className="text-sm font-medium">Personal Bank Name</Label>
                <p className="text-sm mt-1">{request.personal_bank_name}</p>
              </div>
            )}
            {request.personal_bank_balance && (
              <div>
                <Label className="text-sm font-medium">Personal Bank Balance</Label>
                <p className="text-sm font-semibold mt-1">{formatCurrency(request.personal_bank_balance)}</p>
              </div>
            )}
            {request.business_bank_name && (
              <div>
                <Label className="text-sm font-medium">Business Bank Name</Label>
                <p className="text-sm mt-1">{request.business_bank_name}</p>
              </div>
            )}
            {request.business_bank_balance && (
              <div>
                <Label className="text-sm font-medium">Business Bank Balance</Label>
                <p className="text-sm font-semibold mt-1">{formatCurrency(request.business_bank_balance)}</p>
              </div>
            )}
            {request.savings_account && (
              <div>
                <Label className="text-sm font-medium">Savings Account</Label>
                <p className="text-sm mt-1">{request.savings_account}</p>
              </div>
            )}
            {request.investment_accounts && (
              <div>
                <Label className="text-sm font-medium">Investment Accounts</Label>
                <p className="text-sm mt-1">{request.investment_accounts}</p>
              </div>
            )}
            {request.other_income && (
              <div>
                <Label className="text-sm font-medium">Other Income</Label>
                <p className="text-sm mt-1">{request.other_income}</p>
              </div>
            )}
            {request.other_assets && (
              <div>
                <Label className="text-sm font-medium">Other Assets</Label>
                <p className="text-sm mt-1">{request.other_assets}</p>
              </div>
            )}
            {request.banks_to_ignore && (
              <div>
                <Label className="text-sm font-medium">Banks to Ignore</Label>
                <p className="text-sm mt-1">{request.banks_to_ignore}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Documents
            </CardTitle>
            <CardDescription>
              View and download documents submitted with this funding request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Driver's License */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Driver's License</Label>
                </div>
                {request.driver_license_file_path ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {request.driver_license_file_path.split('/').pop()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDocument(request.driver_license_file_path!)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(request.driver_license_file_path!, 'drivers-license.pdf')}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No document uploaded</p>
                )}
              </div>

              {/* EIN Confirmation */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium">EIN Confirmation</Label>
                </div>
                {request.ein_confirmation_file_path ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {request.ein_confirmation_file_path.split('/').pop()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDocument(request.ein_confirmation_file_path!)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(request.ein_confirmation_file_path!, 'ein-confirmation.pdf')}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No document uploaded</p>
                )}
              </div>

              {/* Articles from State */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <Label className="text-sm font-medium">Articles from State</Label>
                </div>
                {request.articles_from_state_file_path ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {request.articles_from_state_file_path.split('/').pop()}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDocument(request.articles_from_state_file_path!)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(request.articles_from_state_file_path!, 'articles-from-state.pdf')}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No document uploaded</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <Label className="text-sm font-medium">Current Status</Label>
                <div className="mt-1">{getStatusBadge(request.status)}</div>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">Update Status</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRequestStatus(request.id, 'under_review')}
                    disabled={request.status === 'under_review'}
                  >
                    Under Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => updateRequestStatus(request.id, 'approved')}
                    disabled={request.status === 'approved'}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => updateRequestStatus(request.id, 'rejected')}
                    disabled={request.status === 'rejected'}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
            
            {request.reviewer_notes && (
              <div>
                <Label className="text-sm font-medium">Reviewer Notes</Label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{request.reviewer_notes}</p>
              </div>
            )}

            {(request.reviewer_first_name || request.reviewer_last_name) && (
              <div>
                <Label className="text-sm font-medium">Reviewed By</Label>
                <p className="text-sm mt-1">{request.reviewer_first_name} {request.reviewer_last_name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FundingManagerLayout>
  );
};

export default FundingRequestDetails;