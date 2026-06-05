import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { Building2, DollarSign, User, ArrowLeft, CheckCircle, Upload, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { clientsApi } from "@/lib/api";

type FundingType = "personal" | "business";

export default function FundingApplication() {
  const navigate = useNavigate();
  const { type } = useParams();
  const fundingType = (type as FundingType) || "personal";
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const clientFromState = (location.state as any)?.client || null;
  const clientIdParam = searchParams.get("clientId") || searchParams.get("client_id") || null;
  const clientId = clientIdParam
    ? parseInt(clientIdParam, 10)
    : (clientFromState?.id ? parseInt(String(clientFromState.id), 10) : NaN);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    // Basic funding details
    fundingAmount: "",
    intendedUse: "",
    titlePosition: "",

    // Business Information
    businessName: "",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    city: "",
    state: "",
    zip: "",
    dateCommenced: "",
    businessWebsite: "",
    businessIndustry: "",
    entityType: "",
    incorporationState: "",
    numberOfEmployees: "",
    ein: "",
    monthlyGrossSales: "",
    projectedAnnualRevenue: "",

    // Personal Information
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    birthCity: "",
    ssn: "",
    mothersMaidenName: "",
    homeAddress: "",
    personalCity: "",
    personalState: "",
    personalZip: "",
    homePhone: "",
    mobilePhone: "",
    housingStatus: "",
    monthlyHousingPayment: "",
    yearsAtAddress: "",
    driversLicense: "",
    issuingState: "",
    issueDate: "",
    expirationDate: "",
    personalEmail: "",
    personalPhone: "",

    // Employment Information
    currentEmployer: "",
    position: "",
    yearsAtEmployer: "",
    employerPhone: "",
    employerAddress: "",

    // Financial Information
    personalBankName: "",
    personalBankBalance: "",
    businessBankName: "",
    businessBankBalance: "",
    usCitizen: "",
    savingsAccount: "",
    investmentAccounts: "",
    militaryAffiliation: "",
    otherIncome: "",
    otherAssets: "",
    banksToIgnore: "",
  });

  // Document uploads (drag & drop + preview)
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [driversLicensePreview, setDriversLicensePreview] = useState<string | null>(null);
  const [einConfirmationFile, setEinConfirmationFile] = useState<File | null>(null);
  const [einConfirmationPreview, setEinConfirmationPreview] = useState<string | null>(null);
  const [articlesFromStateFile, setArticlesFromStateFile] = useState<File | null>(null);
  const [articlesFromStatePreview, setArticlesFromStatePreview] = useState<string | null>(null);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const setField = (key: keyof typeof form) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const prefill = async () => {
      let c = clientFromState;
      if (!c && Number.isFinite(clientId) && clientId > 0) {
        try {
          const resp = await clientsApi.getClient(String(clientId));
          c = resp.data;
        } catch {}
      }
      if (!c) return;
      setForm(prev => ({
        ...prev,
        firstName: c.first_name || "",
        lastName: c.last_name || "",
        personalEmail: c.email || "",
        personalPhone: c.phone || "",
        homeAddress: c.address || "",
        personalCity: c.city || prev.personalCity,
        personalState: c.state || prev.personalState,
        personalZip: c.zip_code || prev.personalZip,
        dateOfBirth: c.date_of_birth || prev.dateOfBirth,
        businessEmail: fundingType === "business" ? (prev.businessEmail || c.email || "") : prev.businessEmail,
        businessPhone: fundingType === "business" ? (prev.businessPhone || c.phone || "") : prev.businessPhone,
        businessAddress: fundingType === "business" ? (prev.businessAddress || c.address || "") : prev.businessAddress,
        city: fundingType === "business" ? (prev.city || c.city || "") : prev.city,
        state: fundingType === "business" ? (prev.state || c.state || "") : prev.state,
        zip: fundingType === "business" ? (prev.zip || c.zip_code || "") : prev.zip
      }));
    };
    prefill();
  }, [clientFromState, clientId, fundingType]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const amountNum = parseFloat((form.fundingAmount || "").replace(/[^0-9.]/g, "")) || 0;
      const banksToIgnoreArray = form.banksToIgnore
        ? form.banksToIgnore.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      const submissionData: any = {
        title: `${form.businessName || `${form.firstName} ${form.lastName}`}`.trim() + ` - Funding Request (${fundingType})`,
        description: `Funding application for ${form.intendedUse || "general purposes"}`,
        amount: amountNum,
        purpose: "other",
        title_position: form.titlePosition,
        intended_use: form.intendedUse,
        business_name: form.businessName,
        business_phone: form.businessPhone,
        business_email: form.businessEmail,
        business_address: form.businessAddress,
        business_city: form.city,
        business_state: form.state,
        business_zip: form.zip,
        date_commenced: form.dateCommenced,
        business_website: form.businessWebsite,
        business_industry: form.businessIndustry,
        entity_type: form.entityType,
        incorporation_state: form.incorporationState,
        number_of_employees: form.numberOfEmployees ? parseInt(form.numberOfEmployees) : undefined,
        ein: form.ein,
        monthly_gross_sales: form.monthlyGrossSales ? parseFloat(form.monthlyGrossSales) : undefined,
        projected_annual_revenue: form.projectedAnnualRevenue ? parseFloat(form.projectedAnnualRevenue) : undefined,
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        date_of_birth: form.dateOfBirth,
        birth_city: form.birthCity,
        ssn: form.ssn,
        mothers_maiden_name: form.mothersMaidenName,
        home_address: form.homeAddress,
        personal_city: form.personalCity,
        personal_state: form.personalState,
        personal_zip: form.personalZip,
        home_phone: form.homePhone,
        mobile_phone: form.mobilePhone,
        housing_status: form.housingStatus,
        monthly_housing_payment: form.monthlyHousingPayment ? parseFloat(form.monthlyHousingPayment) : undefined,
        years_at_address: form.yearsAtAddress ? parseFloat(form.yearsAtAddress) : undefined,
        drivers_license: form.driversLicense,
        issuing_state: form.issuingState,
        issue_date: form.issueDate,
        expiration_date: form.expirationDate,
        current_employer: form.currentEmployer,
        position: form.position,
        years_at_employer: form.yearsAtEmployer ? parseFloat(form.yearsAtEmployer) : undefined,
        employer_phone: form.employerPhone,
        employer_address: form.employerAddress,
        personal_bank_name: form.personalBankName,
        personal_bank_balance: form.personalBankBalance ? parseFloat(form.personalBankBalance) : undefined,
        business_bank_name: form.businessBankName,
        business_bank_balance: form.businessBankBalance ? parseFloat(form.businessBankBalance) : undefined,
        us_citizen: form.usCitizen,
        savings_account: form.savingsAccount,
        investment_accounts: form.investmentAccounts,
        military_affiliation: form.militaryAffiliation,
        other_income: form.otherIncome,
        other_assets: form.otherAssets,
        banks_to_ignore: banksToIgnoreArray
      };
      const token = localStorage.getItem("auth_token") || "";
      const response = await fetch("/api/funding-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(submissionData)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit funding request");
      }
      const result = await response.json();
      if (driversLicenseFile || einConfirmationFile || articlesFromStateFile) {
        const uploadForm = new FormData();
        uploadForm.append("requestId", String(result.id));
        if (driversLicenseFile) uploadForm.append("driverLicenseFile", driversLicenseFile);
        if (einConfirmationFile) uploadForm.append("einConfirmationFile", einConfirmationFile);
        if (articlesFromStateFile) uploadForm.append("articlesFromStateFile", articlesFromStateFile);
        await fetch("/api/funding-requests/upload-documents", {
          method: "POST",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: uploadForm
        });
      }
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {fundingType === "business" ? (
                <Building2 className="h-6 w-6 text-blue-600" />
              ) : (
                <User className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {fundingType === "business" ? "Business" : "Personal"} Funding Application
              </h1>
              <p className="text-sm text-muted-foreground">Same dashboard layout, streamlined application form</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        {!submitted ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Funding Details
              </CardTitle>
              <CardDescription>
                Provide required information to start your {fundingType} funding application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Funding Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fundingAmount">Requested Funding Amount</Label>
                  <Input id="fundingAmount" value={form.fundingAmount} onChange={update("fundingAmount")} placeholder="$50,000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intendedUse">Intended Use</Label>
                  <Input id="intendedUse" value={form.intendedUse} onChange={update("intendedUse")} placeholder="Inventory, marketing, expansion" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titlePosition">Your Title/Position</Label>
                  <Input id="titlePosition" value={form.titlePosition} onChange={update("titlePosition")} placeholder="Owner, CEO, Manager" />
                </div>
              </div>

              {/* Business Information (only for business) */}
              {fundingType === "business" && (
                <>
                  <h3 className="text-lg font-semibold mt-6">Business Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input id="businessName" value={form.businessName} onChange={update("businessName")} placeholder="Acme LLC" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ein">EIN</Label>
                      <Input id="ein" value={form.ein} onChange={update("ein")} placeholder="12-3456789" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessEmail">Business Email</Label>
                      <Input id="businessEmail" value={form.businessEmail} onChange={update("businessEmail")} placeholder="owner@acme.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input id="businessPhone" value={form.businessPhone} onChange={update("businessPhone")} placeholder="(555) 555-1234" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="businessAddress">Business Address</Label>
                      <Input id="businessAddress" value={form.businessAddress} onChange={update("businessAddress")} placeholder="123 Main St" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={form.city} onChange={update("city")} placeholder="Springfield" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" value={form.state} onChange={update("state")} placeholder="IL" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input id="zip" value={form.zip} onChange={update("zip")} placeholder="62704" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateCommenced">Date Commenced</Label>
                      <Input id="dateCommenced" type="date" value={form.dateCommenced} onChange={update("dateCommenced")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessWebsite">Business Website</Label>
                      <Input id="businessWebsite" value={form.businessWebsite} onChange={update("businessWebsite")} placeholder="https://example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessIndustry">Business Industry</Label>
                      <Input id="businessIndustry" value={form.businessIndustry} onChange={update("businessIndustry")} placeholder="Retail, Services, Manufacturing" />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Select value={form.entityType} onValueChange={setField("entityType")}>
                        <SelectTrigger>
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
                    <div className="space-y-2">
                      <Label htmlFor="incorporationState">Incorporation State</Label>
                      <Input id="incorporationState" value={form.incorporationState} onChange={update("incorporationState")} placeholder="DE" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfEmployees">Number of Employees</Label>
                      <Input id="numberOfEmployees" type="number" value={form.numberOfEmployees} onChange={update("numberOfEmployees")} placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyGrossSales">Monthly Gross Sales (USD)</Label>
                      <Input id="monthlyGrossSales" type="number" value={form.monthlyGrossSales} onChange={update("monthlyGrossSales")} placeholder="25000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectedAnnualRevenue">Projected Annual Revenue (USD)</Label>
                      <Input id="projectedAnnualRevenue" type="number" value={form.projectedAnnualRevenue} onChange={update("projectedAnnualRevenue")} placeholder="300000" />
                    </div>
                  </div>
                </>
              )}

              {/* Personal Information (always required; business asks both) */}
              <h3 className="text-lg font-semibold mt-6">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={form.firstName} onChange={update("firstName")} placeholder="Sarah" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" value={form.middleName} onChange={update("middleName")} placeholder="A." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={form.lastName} onChange={update("lastName")} placeholder="Johnson" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update("dateOfBirth")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthCity">Birth City</Label>
                  <Input id="birthCity" value={form.birthCity} onChange={update("birthCity")} placeholder="Portland" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssn">SSN</Label>
                  <Input id="ssn" value={form.ssn} onChange={update("ssn")} placeholder="***-**-****" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="mothersMaidenName">Mother's Maiden Name</Label>
                  <Input id="mothersMaidenName" value={form.mothersMaidenName} onChange={update("mothersMaidenName")} placeholder="Maiden Name" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="homeAddress">Home Address</Label>
                  <Input id="homeAddress" value={form.homeAddress} onChange={update("homeAddress")} placeholder="456 Oak Ave" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalCity">City</Label>
                  <Input id="personalCity" value={form.personalCity} onChange={update("personalCity")} placeholder="Denver" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalState">State</Label>
                  <Input id="personalState" value={form.personalState} onChange={update("personalState")} placeholder="CO" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalZip">ZIP</Label>
                  <Input id="personalZip" value={form.personalZip} onChange={update("personalZip")} placeholder="80202" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homePhone">Home Phone</Label>
                  <Input id="homePhone" value={form.homePhone} onChange={update("homePhone")} placeholder="(555) 555-1111" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Mobile Phone</Label>
                  <Input id="mobilePhone" value={form.mobilePhone} onChange={update("mobilePhone")} placeholder="(555) 555-2222" />
                </div>
                <div className="space-y-2">
                  <Label>Housing Status</Label>
                  <Select value={form.housingStatus} onValueChange={setField("housingStatus")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select housing status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="own">Own</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyHousingPayment">Monthly Housing Payment (USD)</Label>
                  <Input id="monthlyHousingPayment" type="number" value={form.monthlyHousingPayment} onChange={update("monthlyHousingPayment")} placeholder="1500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsAtAddress">Years at Address</Label>
                  <Input id="yearsAtAddress" value={form.yearsAtAddress} onChange={update("yearsAtAddress")} placeholder="3" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driversLicense">Driver's License</Label>
                  <Input id="driversLicense" value={form.driversLicense} onChange={update("driversLicense")} placeholder="D1234567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuingState">Issuing State</Label>
                  <Input id="issuingState" value={form.issuingState} onChange={update("issuingState")} placeholder="CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input id="issueDate" type="date" value={form.issueDate} onChange={update("issueDate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expirationDate">Expiration Date</Label>
                  <Input id="expirationDate" type="date" value={form.expirationDate} onChange={update("expirationDate")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Email</Label>
                  <Input id="personalEmail" value={form.personalEmail} onChange={update("personalEmail")} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalPhone">Phone</Label>
                  <Input id="personalPhone" value={form.personalPhone} onChange={update("personalPhone")} placeholder="(555) 555-9876" />
                </div>
              </div>

              {/* Employment Information */}
              <h3 className="text-lg font-semibold mt-6">Employment Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="currentEmployer">Current Employer</Label>
                  <Input id="currentEmployer" value={form.currentEmployer} onChange={update("currentEmployer")} placeholder="ABC Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" value={form.position} onChange={update("position")} placeholder="Manager" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearsAtEmployer">Years at Employer</Label>
                  <Input id="yearsAtEmployer" value={form.yearsAtEmployer} onChange={update("yearsAtEmployer")} placeholder="2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employerPhone">Employer Phone</Label>
                  <Input id="employerPhone" value={form.employerPhone} onChange={update("employerPhone")} placeholder="(555) 555-3333" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="employerAddress">Employer Address</Label>
                  <Input id="employerAddress" value={form.employerAddress} onChange={update("employerAddress")} placeholder="789 Pine Rd" />
                </div>
              </div>

              {/* Financial Information */}
              <h3 className="text-lg font-semibold mt-6">Financial Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="personalBankName">Personal Bank Name</Label>
                  <Input id="personalBankName" value={form.personalBankName} onChange={update("personalBankName")} placeholder="Bank of America" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalBankBalance">Personal Bank Balance (USD)</Label>
                  <Input id="personalBankBalance" type="number" value={form.personalBankBalance} onChange={update("personalBankBalance")} placeholder="5000" />
                </div>
                {fundingType === "business" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="businessBankName">Business Bank Name</Label>
                      <Input id="businessBankName" value={form.businessBankName} onChange={update("businessBankName")} placeholder="Chase" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessBankBalance">Business Bank Balance (USD)</Label>
                      <Input id="businessBankBalance" type="number" value={form.businessBankBalance} onChange={update("businessBankBalance")} placeholder="12000" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>US Citizen</Label>
                  <Select value={form.usCitizen} onValueChange={setField("usCitizen")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Savings Account</Label>
                  <Select value={form.savingsAccount} onValueChange={setField("savingsAccount")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Investment Accounts</Label>
                  <Select value={form.investmentAccounts} onValueChange={setField("investmentAccounts")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Military Affiliation</Label>
                  <Select value={form.militaryAffiliation} onValueChange={setField("militaryAffiliation")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Other Income</Label>
                  <Select value={form.otherIncome} onValueChange={setField("otherIncome")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Other Assets</Label>
                  <Select value={form.otherAssets} onValueChange={setField("otherAssets")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="banksToIgnore">Banks to Ignore (comma-separated)</Label>
                <Input id="banksToIgnore" value={form.banksToIgnore} onChange={update("banksToIgnore")} placeholder="Bank A, Bank B" />
              </div>
            </div>

            {/* Documents Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mt-2">Documents</h3>
              <p className="text-sm text-muted-foreground">Drag and drop or click to upload. Preview appears inside each box.</p>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Driver's License */}
                <div>
                  <Label className="mb-2 block">Driver's License</Label>
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setDriversLicenseFile(file);
                        setDriversLicensePreview(URL.createObjectURL(file));
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("driversLicenseUpload") as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    {driversLicensePreview && driversLicenseFile ? (
                      driversLicenseFile.type.startsWith("image/") ? (
                        <img src={driversLicensePreview} alt="Driver's License Preview" className="w-full h-32 object-cover rounded" />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm">{driversLicenseFile.name}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Upload className="h-6 w-6 mb-2" />
                        <span className="text-sm">Drop file here or click to upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="driversLicenseUpload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setDriversLicenseFile(file);
                        setDriversLicensePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>

                {/* EIN Confirmation */}
                <div>
                  <Label className="mb-2 block">EIN Confirmation</Label>
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setEinConfirmationFile(file);
                        setEinConfirmationPreview(URL.createObjectURL(file));
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("einConfirmationUpload") as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    {einConfirmationPreview && einConfirmationFile ? (
                      einConfirmationFile.type.startsWith("image/") ? (
                        <img src={einConfirmationPreview} alt="EIN Confirmation Preview" className="w-full h-32 object-cover rounded" />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm">{einConfirmationFile.name}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Upload className="h-6 w-6 mb-2" />
                        <span className="text-sm">Drop file here or click to upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="einConfirmationUpload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setEinConfirmationFile(file);
                        setEinConfirmationPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>

                {/* Articles from State */}
                <div>
                  <Label className="mb-2 block">Articles from State</Label>
                  <div
                    className="border-2 border-dashed rounded-md p-4 text-center hover:bg-muted/30 cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        setArticlesFromStateFile(file);
                        setArticlesFromStatePreview(URL.createObjectURL(file));
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById("articlesFromStateUpload") as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    {articlesFromStatePreview && articlesFromStateFile ? (
                      articlesFromStateFile.type.startsWith("image/") ? (
                        <img src={articlesFromStatePreview} alt="Articles from State Preview" className="w-full h-32 object-cover rounded" />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm">{articlesFromStateFile.name}</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Upload className="h-6 w-6 mb-2" />
                        <span className="text-sm">Drop file here or click to upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="articlesFromStateUpload"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        setArticlesFromStateFile(file);
                        setArticlesFromStatePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Application Submitted</h2>
              <p className="text-muted-foreground mb-6">We will reach out shortly with next steps.</p>
              <Button onClick={() => (Number.isFinite(clientId) && clientId > 0) ? navigate(`/clients/${clientId}`) : navigate(-1)}>Return to Client Profile</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
