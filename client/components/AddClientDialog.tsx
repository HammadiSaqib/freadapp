import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { clientsApi } from "@/lib/api";
import {
  closeReportPullLoading,
  openReportPullLoading,
  showReportPullError,
} from "@/lib/reportPullFeedback";
import {
  notifyBasicAdminClientChanged,
  rememberBasicAdminLastPulledClientId,
} from "@/lib/basicAdminReportPull";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "scrape" | "manual";
}

export default function AddClientDialog({ isOpen, onClose, onSuccess, mode = "scrape" }: AddClientDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClient, setNewClient] = useState({
    platform: "",
    email: "",
    password: "",
    ssnLast4: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [scrapeAuthorization, setScrapeAuthorization] = useState(false);
  const [manualClient, setManualClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
    platform: "",
    platform_email: "",
    platform_password: "",
  });
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [manualAuthorization, setManualAuthorization] = useState(false);

  const { isEliteActive } = useScoreMachineEliteStatus();
  const authorizationCheckboxClassName = "mt-3 h-5 w-5 min-w-[1.25rem] rounded-md !border-transparent bg-white dark:bg-slate-950 shadow-[inset_0_0_0_2px_#2dabdc] data-[state=checked]: data-[state=checked]:text-white data-[state=checked]:shadow-[inset_0_0_0_2px_#2dabdc]";

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeAuthorization) {
      toast({
        title: "Authorization Required",
        description: "Please confirm authorization to use the credit report for educational analysis.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    let reportPullFeedbackOpen = false;

    try {
      // Check if user is authenticated
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

      // First, scrape the credit report to get personal information
      console.log("Starting credit report scraping...");
      openReportPullLoading();
      reportPullFeedbackOpen = true;
      
      const scraperResponse = await fetch("/api/credit-reports/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: newClient.platform,
          credentials: {
            username: newClient.email,
            password: newClient.password,
          },
          options: {
            saveHtml: false,
            takeScreenshots: false,
            ...(((newClient.platform === "identityiq" || newClient.platform === "myscoreiq") && newClient.ssnLast4)
              ? { ssnLast4: newClient.ssnLast4 }
              : {}),
          },
          clientId: "unknown",
        }),
      });
      const contentType = scraperResponse.headers.get("content-type") || "";
      let scraperData: any = null;
      if (scraperResponse.ok) {
        if (contentType.includes("application/json")) {
          scraperData = await scraperResponse.json();
        }
      } else {
        if (scraperResponse.status === 401 || scraperResponse.status === 403) {
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
        if (contentType.includes("application/json")) {
          try {
            const errorData = await scraperResponse.json();
            const msg = errorData?.message || "Failed to scrape credit report";
            if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error(msg);
            }
          } catch {
            if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
              scraperData = null;
            } else {
              throw new Error("Failed to scrape credit report");
            }
          }
        } else {
          try { await scraperResponse.text(); } catch {}
          if (scraperResponse.status >= 500 || scraperResponse.status === 504) {
            scraperData = null;
          } else {
            throw new Error("Failed to scrape credit report");
          }
        }
      }
      if (!scraperData) {
        const start = Date.now();
        const timeoutMs = 120000;
        const intervalMs = 3000;
        let reportPath: string | null = null;
        while (Date.now() - start < timeoutMs && !reportPath) {
          const histResp = await fetch("/api/credit-reports/history", {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (histResp.ok) {
            const histJson = await histResp.json();
            const list = (histJson?.data ?? histJson) as any[];
            if (Array.isArray(list) && list.length > 0) {
              const match = list.find((item: any) =>
                String(item?.platform || '').toLowerCase() === String(newClient.platform || '').toLowerCase() &&
                String(item?.status || '').toLowerCase() === 'completed' &&
                item?.report_path
              );
              if (match) {
                reportPath = String(match.report_path);
              }
            }
          }
          if (!reportPath) {
            await new Promise((r) => setTimeout(r, intervalMs));
          }
        }
        if (reportPath) {
          const fileResp = await fetch(`/api/credit-reports/json-file?path=${encodeURIComponent(reportPath)}`, {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (fileResp.ok) {
            const fileJson = await fileResp.json();
            scraperData = { data: fileJson?.data ?? fileJson };
          }
        }
      }
      if (!scraperData) {
        throw new Error("Scrape is taking longer than expected. Please try again shortly.");
      }
      console.log("Scraper response:", scraperData);
      console.log("Scraper response keys:", Object.keys(scraperData));
      console.log("Report data structure:", scraperData.data ? Object.keys(scraperData.data) : "No data");

      // Extract personal information from the scraped data
      let firstName = "";
      let lastName = "";
      let dateOfBirth = "";
      let address = "";
      let city = "";
      let state = "";
      let zipCode = "";
      let creditScore = 0;
      let experianScore = 0;
      let equifaxScore = 0;
      let transunionScore = 0;

      // The scraper returns data in the format: { success: true, message: "...", data: { reportData: { ... } } }
      if (scraperData.data && scraperData.data.reportData) {
        const reportData = scraperData.data.reportData;
        console.log("Found reportData, checking Name array:", reportData.Name);
        
        // Try to extract name from Name section (based on scraper structure)
        if (reportData.Name && Array.isArray(reportData.Name) && reportData.Name.length > 0) {
          // Find the primary name entry (BureauId 1 or first entry with Primary type)
          const primaryName = reportData.Name.find(name => name.NameType === "Primary") || reportData.Name[0];
          console.log("Primary name data:", primaryName);
          
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
          console.log("Extracted names:", { firstName, lastName });
        }

        // Try to extract date of birth from DOB section
        if (reportData.DOB && Array.isArray(reportData.DOB) && reportData.DOB.length > 0) {
          const dobData = reportData.DOB[0];
          dateOfBirth = dobData.DOB || "";
          console.log("Extracted DOB:", dateOfBirth);
        }

        // Extract address information from Address section
        if (reportData.Address && Array.isArray(reportData.Address) && reportData.Address.length > 0) {
          // Find current address (AddressType === "Current") or use first address
          const currentAddress = reportData.Address.find(addr => addr.AddressType === "Current") || reportData.Address[0];
          console.log("Current address data:", currentAddress);
          
          address = currentAddress.StreetAddress || "";
          city = currentAddress.City || "";
          state = currentAddress.State || "";
          zipCode = currentAddress.Zip || "";
          console.log("Extracted address:", { address, city, state, zipCode });
        }

        // Extract bureau scores from Score section
        if (reportData.Score && Array.isArray(reportData.Score) && reportData.Score.length > 0) {
          console.log("Score data:", reportData.Score);
          
          // Map bureau IDs to scores: 1=TransUnion, 2=Experian, 3=Equifax
          reportData.Score.forEach(scoreData => {
            const score = parseInt(scoreData.Score, 10);
            if (score && score > 0) {
              switch (scoreData.BureauId) {
                case 1: // TransUnion
                  transunionScore = score;
                  break;
                case 2: // Experian
                  experianScore = score;
                  break;
                case 3: // Equifax
                  equifaxScore = score;
                  break;
              }
            }
          });
          
          // Set the primary credit score to the highest available score
          creditScore = Math.max(experianScore, equifaxScore, transunionScore);
          console.log("Extracted scores:", { 
            creditScore, 
            experianScore, 
            equifaxScore, 
            transunionScore 
          });
        }

        // Fallback: try to extract from nested reportData structure or direct data access
        if (!firstName && !lastName) {
          console.log("Trying fallback data access");
          
          // Try direct access to scraperData.data (in case reportData is at the top level)
          if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
            const primaryName = scraperData.data.Name.find(name => name.NameType === "Primary") || scraperData.data.Name[0];
            firstName = primaryName.FirstName || "";
            lastName = primaryName.LastName || "";
            console.log("Extracted names from direct data:", { firstName, lastName });
          }
          
          // Try DOB section in direct data
          if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
            const dobData = scraperData.data.DOB[0];
            dateOfBirth = dobData.DOB || "";
            console.log("Extracted DOB from direct data:", dateOfBirth);
          }

          // Try Address section in direct data
          if (scraperData.data.Address && Array.isArray(scraperData.data.Address) && scraperData.data.Address.length > 0) {
            const currentAddress = scraperData.data.Address.find(addr => addr.AddressType === "Current") || scraperData.data.Address[0];
            address = currentAddress.StreetAddress || "";
            city = currentAddress.City || "";
            state = currentAddress.State || "";
            zipCode = currentAddress.Zip || "";
            console.log("Extracted address from direct data:", { address, city, state, zipCode });
          }

          // Try Score section in direct data
          if (scraperData.data.Score && Array.isArray(scraperData.data.Score) && scraperData.data.Score.length > 0) {
            scraperData.data.Score.forEach(scoreData => {
              const score = parseInt(scoreData.Score, 10);
              if (score && score > 0) {
                switch (scoreData.BureauId) {
                  case 1: transunionScore = score; break;
                  case 2: experianScore = score; break;
                  case 3: equifaxScore = score; break;
                }
              }
            });
            creditScore = Math.max(experianScore, equifaxScore, transunionScore);
            console.log("Extracted scores from direct data:", { creditScore, experianScore, equifaxScore, transunionScore });
          }
          
          // Try nested reportData structure
          if (!firstName && !lastName && reportData.reportData) {
            console.log("Trying nested reportData structure");
            const nestedReportData = reportData.reportData;
            
            // Try Name section in nested data
            if (nestedReportData.Name && Array.isArray(nestedReportData.Name) && nestedReportData.Name.length > 0) {
              const primaryName = nestedReportData.Name.find(name => name.NameType === "Primary") || nestedReportData.Name[0];
              firstName = primaryName.FirstName || "";
              lastName = primaryName.LastName || "";
              console.log("Extracted names from nested:", { firstName, lastName });
            }
            
            // Try DOB section in nested data
            if (nestedReportData.DOB && Array.isArray(nestedReportData.DOB) && nestedReportData.DOB.length > 0) {
              const dobData = nestedReportData.DOB[0];
              dateOfBirth = dobData.DOB || "";
              console.log("Extracted DOB from nested:", dateOfBirth);
            }

            // Try Address section in nested data
            if (nestedReportData.Address && Array.isArray(nestedReportData.Address) && nestedReportData.Address.length > 0) {
              const currentAddress = nestedReportData.Address.find(addr => addr.AddressType === "Current") || nestedReportData.Address[0];
              address = currentAddress.StreetAddress || "";
              city = currentAddress.City || "";
              state = currentAddress.State || "";
              zipCode = currentAddress.Zip || "";
              console.log("Extracted address from nested:", { address, city, state, zipCode });
            }

            // Try Score section in nested data
            if (nestedReportData.Score && Array.isArray(nestedReportData.Score) && nestedReportData.Score.length > 0) {
              nestedReportData.Score.forEach(scoreData => {
                const score = parseInt(scoreData.Score, 10);
                if (score && score > 0) {
                  switch (scoreData.BureauId) {
                    case 1: transunionScore = score; break;
                    case 2: experianScore = score; break;
                    case 3: equifaxScore = score; break;
                  }
                }
              });
              creditScore = Math.max(experianScore, equifaxScore, transunionScore);
              console.log("Extracted scores from nested:", { creditScore, experianScore, equifaxScore, transunionScore });
            }
          }
        }
      }

      // Additional fallback: try direct access to scraperData.data if no reportData wrapper
      if (!firstName && !lastName && scraperData.data) {
        console.log("Trying direct scraperData.data access");
        
        if (scraperData.data.Name && Array.isArray(scraperData.data.Name) && scraperData.data.Name.length > 0) {
          const primaryName = scraperData.data.Name.find(name => name.NameType === "Primary") || scraperData.data.Name[0];
          firstName = primaryName.FirstName || "";
          lastName = primaryName.LastName || "";
          console.log("Extracted names from scraperData.data:", { firstName, lastName });
        }
        
        if (scraperData.data.DOB && Array.isArray(scraperData.data.DOB) && scraperData.data.DOB.length > 0) {
          const dobData = scraperData.data.DOB[0];
          dateOfBirth = dobData.DOB || "";
          console.log("Extracted DOB from scraperData.data:", dateOfBirth);
        }

        if (scraperData.data.Address && Array.isArray(scraperData.data.Address) && scraperData.data.Address.length > 0) {
          const currentAddress = scraperData.data.Address.find(addr => addr.AddressType === "Current") || scraperData.data.Address[0];
          address = currentAddress.StreetAddress || "";
          city = currentAddress.City || "";
          state = currentAddress.State || "";
          zipCode = currentAddress.Zip || "";
          console.log("Extracted address from scraperData.data:", { address, city, state, zipCode });
        }

        if (scraperData.data.Score && Array.isArray(scraperData.data.Score) && scraperData.data.Score.length > 0) {
          scraperData.data.Score.forEach(scoreData => {
            const score = parseInt(scoreData.Score, 10);
            if (score && score > 0) {
              switch (scoreData.BureauId) {
                case 1: transunionScore = score; break;
                case 2: experianScore = score; break;
                case 3: equifaxScore = score; break;
              }
            }
          });
          creditScore = Math.max(experianScore, equifaxScore, transunionScore);
          console.log("Extracted scores from scraperData.data:", { creditScore, experianScore, equifaxScore, transunionScore });
        }
      }

      console.log("Final extracted data:", { 
        firstName, 
        lastName, 
        dateOfBirth, 
        address, 
        city, 
        state, 
        zipCode, 
        creditScore,
        experianScore,
        equifaxScore,
        transunionScore
      });

      if (!firstName && !lastName) {
        throw new Error(
          `We couldn't verify the client name in the ${newClient.platform} report. Please double-check the monitoring email and password. If those are correct, the client's password may have changed or the monitoring subscription may need renewal.`
        );
      }

      const hadReportInfo = Boolean(firstName || dateOfBirth || address || creditScore || experianScore || equifaxScore || transunionScore);
      const notesMessage = hadReportInfo
        ? `Client created via credit report scraping from ${newClient.platform}. Bureau Scores - Experian: ${experianScore || 'N/A'}, Equifax: ${equifaxScore || 'N/A'}, TransUnion: ${transunionScore || 'N/A'}`
        : `Client created without attached report due to temporary scraper error on ${newClient.platform}. You can retry scraping from the client profile.`;

      closeReportPullLoading();
      reportPullFeedbackOpen = false;

      const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: newClient.email,
        date_of_birth: dateOfBirth || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        credit_score: creditScore > 0 ? creditScore : undefined,
        experian_score: experianScore > 0 ? experianScore : undefined,
        equifax_score: equifaxScore > 0 ? equifaxScore : undefined,
        transunion_score: transunionScore > 0 ? transunionScore : undefined,
        status: "active" as const,
        platform: newClient.platform,
        platform_email: newClient.email,
        platform_password: newClient.password,
        ...(newClient.ssnLast4 ? { ssn_last_four: newClient.ssnLast4 } : {}),
        notes: notesMessage,
      };

      console.log("Creating client with extracted data:", clientData);
      const response = await clientsApi.createClient(clientData);
      console.log("Create client response:", response);
      const responseData = response?.data ?? response;

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      const reusedExisting = responseData?.reusedExisting === true || responseData?.created === false;

      // Reset form and close modal
      setNewClient({
        platform: "",
        email: "",
        password: "",
        ssnLast4: "",
      });
      onClose();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Success!",
        description: hadReportInfo
          ? reusedExisting
            ? `Client ${firstName} ${lastName} already existed. A fresh credit report was added to the existing profile.`
            : `Client ${firstName} ${lastName} has been added with credit report details.`
          : reusedExisting
            ? `Client ${firstName} ${lastName} already existed. You can retry scraping from the client profile.`
            : `Client ${firstName} ${lastName} has been added without report; you can retry scraping from the client profile.`,
      });

      // Redirect to the client's credit report page
      const clientId = responseData?.id;
      const clientName = `${firstName} ${lastName}`;
      if (clientId) {
        if (hadReportInfo) {
          rememberBasicAdminLastPulledClientId(clientId);
        }
        notifyBasicAdminClientChanged(clientId);
        navigate(`/credit-report?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
      }
    } catch (error: any) {
      console.error("Error adding client:", error);
      if (reportPullFeedbackOpen) {
        showReportPullError();
        reportPullFeedbackOpen = false;
      }
      
      // Handle quota exceeded error specifically
      if (error.response?.status === 403 && error.response?.data?.error === 'Client quota exceeded') {
        const planLimits = error.response.data.planLimits;
        toast({
          title: "Client Quota Exceeded",
          description: error.response.data.message || `You have reached the maximum of ${planLimits?.maxClients || 1} client(s) allowed on your plan. Please upgrade to add more clients.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error Adding Client",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAuthorization) {
      toast({
        title: "Authorization Required",
        description: "Please confirm authorization to use the credit report for educational analysis.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

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

      if (!manualClient.first_name || !manualClient.last_name || !manualClient.email) {
        toast({
          title: "Missing Information",
          description: "First name, last name and email are required.",
          variant: "destructive",
        });
        return;
      }

      const selectedPlatform = manualClient.platform || undefined;
      const platformNote = manualClient.platform
        ? (["transunion", "experian", "equifax", "creditkarma"].includes(manualClient.platform)
            ? `Saved platform: ${manualClient.platform} (not pullable)`
            : `Saved platform: ${manualClient.platform} (pullable)`)
        : "";

      const data = {
        first_name: manualClient.first_name,
        last_name: manualClient.last_name,
        email: manualClient.email,
        phone: manualClient.phone || undefined,
        date_of_birth: manualClient.date_of_birth || undefined,
        address: manualClient.address || undefined,
        city: manualClient.city || undefined,
        state: manualClient.state || undefined,
        zip_code: manualClient.zip_code || undefined,
        status: "active" as const,
        platform: selectedPlatform,
        platform_email: manualClient.platform_email || undefined,
        platform_password: manualClient.platform_password || undefined,
        notes: (manualClient.notes || "Client created manually") + (platformNote ? ` | ${platformNote}` : ""),
      };

      const response = await clientsApi.createClient(data);
      const responseData = response?.data ?? response;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      setManualClient({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        date_of_birth: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        notes: "",
        platform: "",
        platform_email: "",
        platform_password: "",
      });
      onClose();

      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: "Success!",
        description: `Client ${data.first_name} ${data.last_name} has been added manually.`,
      });

      if (responseData?.id) {
        notifyBasicAdminClientChanged(responseData.id);
      }

      // Stay on the current page after manual addition
    } catch (error: any) {
      console.error("Error adding client manually:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add client",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setNewClient({
      platform: "",
      email: "",
      password: "",
      ssnLast4: "",
    });
    setScrapeAuthorization(false);
    setManualClient({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      notes: "",
      platform: "",
      platform_email: "",
      platform_password: "",
    });
    setManualAuthorization(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-md ${isEliteActive ? "bg-white dark:bg-slate-950 border-0 dark:border dark:border-slate-800 dark:text-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(2,6,23,0.7)] rounded-3xl overflow-hidden p-0 gap-0 elite-nested-wrapper" : ""}`}>
        {isEliteActive && (
          <style dangerouslySetInnerHTML={{__html: `
            .elite-nested-wrapper label {
              font-size: 0.75rem !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              color: #475569 !important;
            }
            .dark .elite-nested-wrapper label {
              color: #94a3b8 !important;
            }
            .elite-nested-wrapper input, .elite-nested-wrapper select, .elite-nested-wrapper [role="combobox"] {
              border-radius: 1rem !important;
              border: 1px solid #e2e8f0 !important;
              background-color: #f8fafc !important;
              color: #0f172a !important;
              font-weight: 600 !important;
              box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.02) !important;
              transition: all 0.2s !important;
            }
            .dark .elite-nested-wrapper input,
            .dark .elite-nested-wrapper select,
            .dark .elite-nested-wrapper [role="combobox"] {
              border-color: #334155 !important;
              background-color: #0f172a !important;
              color: #f8fafc !important;
              box-shadow: inset 0 2px 4px 0 rgb(2 6 23 / 0.35) !important;
            }
            .elite-nested-wrapper input:focus, .elite-nested-wrapper select:focus, .elite-nested-wrapper [role="combobox"]:focus {
              background-color: #ffffff !important;
              border-color: #00d4ff !important;
              box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2) !important;
            }
            .dark .elite-nested-wrapper input:focus,
            .dark .elite-nested-wrapper select:focus,
            .dark .elite-nested-wrapper [role="combobox"]:focus {
              background-color: #020617 !important;
              border-color: #22d3ee !important;
              box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.25) !important;
            }
            .elite-nested-wrapper .elite-btn-primary {
              background: linear-gradient(to right, #0f172a, #1e293b) !important;
              border-radius: 1rem !important;
              color: white !important;
              font-weight: 700 !important;
              height: 3rem !important;
            }
            .dark .elite-nested-wrapper .elite-btn-primary {
              background: linear-gradient(to right, #06b6d4, #7c3aed) !important;
              color: #f8fafc !important;
              box-shadow: 0 0 24px rgba(34, 211, 238, 0.25) !important;
            }
            .elite-nested-wrapper .elite-btn-outline {
              border-radius: 1rem !important;
              height: 3rem !important;
              font-weight: 700 !important;
            }
            .dark .elite-nested-wrapper .elite-btn-outline {
              border: 1px solid #334155 !important;
              background: #020617 !important;
              color: #e2e8f0 !important;
            }
            .dark .elite-nested-wrapper .dark\\:bg-slate-900 {
              background-color: #020617 !important;
            }
            .dark .elite-nested-wrapper .dark\\:text-white {
              color: #f8fafc !important;
            }
            .dark .elite-nested-wrapper .dark\\:border-slate-800 {
              border-color: #334155 !important;
            }
          `}} />
        )}
        {isEliteActive && (
          <>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00d4ff] to-[#7000ff] z-50"></div>
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#00d4ff]/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#7000ff]/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl pointer-events-none"></div>
          </>
        )}
        
        <div className={isEliteActive ? "p-6 relative z-10" : ""}>
          <DialogHeader>
            <DialogTitle className={isEliteActive ? "text-2xl font-black text bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight" : "gradient-text-primary"}>
              Add New Client
            </DialogTitle>
            {mode === "scrape" ? (
              <DialogDescription className={isEliteActive ? "text-sm font-semibold text-slate-500" : ""}>
                Enter the client's credit monitoring platform credentials to automatically import their information.
              </DialogDescription>
            ) : (
              <DialogDescription className={isEliteActive ? "text-sm font-semibold text-slate-500" : ""}>
                Enter the client's personal information to create the profile.
              </DialogDescription>
            )}
          </DialogHeader>
        {mode === "scrape" ? (
          <form onSubmit={handleSubmitClient} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Credit Monitoring Platform</Label>
                <Select
                  value={newClient.platform}
                  onValueChange={(value) =>
                    setNewClient({ ...newClient, platform: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myfreescorenow">My Free Score Now</SelectItem>
                    <SelectItem value="identityiq">IdentityIQ</SelectItem>
                    <SelectItem value="myscoreiq">MyScoreIQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Platform Email/Username</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="Enter platform email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Platform Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newClient.password}
                    onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    placeholder="Enter platform password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {(newClient.platform === "identityiq" || newClient.platform === "myscoreiq") && (
                <div className="space-y-2">
                  <Label htmlFor="ssnLast4">SSN Last 4 *</Label>
                  <Input
                    id="ssnLast4"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    autoComplete="off"
                    title="Please enter 4 digits (e.g., 1234)"
                    value={newClient.ssnLast4}
                    onChange={(e) =>
                      setNewClient({ ...newClient, ssnLast4: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="1234"
                    required
                  />
                </div>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                className={authorizationCheckboxClassName}
                id="scrape-authorization"
                checked={scrapeAuthorization}
                onCheckedChange={(checked) => setScrapeAuthorization(checked === true)}
              />
              <Label htmlFor="scrape-authorization" className="text-sm leading-5 text-slate-600 cursor-pointer">
                Confirm this is my credit report and I authorize its use for educational analysis.
              </Label>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className={isEliteActive ? "elite-btn-outline" : ""}
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={isEliteActive ? "elite-btn-primary" : "gradient-primary"}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding Client..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmitManual} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={manualClient.first_name}
                  onChange={(e) => setManualClient({ ...manualClient, first_name: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={manualClient.last_name}
                  onChange={(e) => setManualClient({ ...manualClient, last_name: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_manual">Email</Label>
                <Input
                  id="email_manual"
                  type="email"
                  value={manualClient.email}
                  onChange={(e) => setManualClient({ ...manualClient, email: e.target.value })}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={manualClient.phone}
                  onChange={(e) => setManualClient({ ...manualClient, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={manualClient.date_of_birth}
                  onChange={(e) => setManualClient({ ...manualClient, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={manualClient.address}
                  onChange={(e) => setManualClient({ ...manualClient, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={manualClient.city}
                  onChange={(e) => setManualClient({ ...manualClient, city: e.target.value })}
                  placeholder="Anytown"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={manualClient.state}
                  onChange={(e) => setManualClient({ ...manualClient, state: e.target.value.toUpperCase() })}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={manualClient.zip_code}
                  onChange={(e) => setManualClient({ ...manualClient, zip_code: e.target.value })}
                  placeholder="90210"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={manualClient.notes}
                  onChange={(e) => setManualClient({ ...manualClient, notes: e.target.value })}
                  placeholder="Notes"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="manual_platform">Platform (for saving only)</Label>
                <Select
                  value={manualClient.platform}
                  onValueChange={(value) => setManualClient({ ...manualClient, platform: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transunion">TransUnion — Not Pullable</SelectItem>
                    <SelectItem value="experian">Experian — Not Pullable</SelectItem>
                    <SelectItem value="equifax">Equifax — Not Pullable</SelectItem>
                    <SelectItem value="creditkarma">Credit Karma — Not Pullable</SelectItem>
                    <SelectItem value="myfreescorenow">My Free Score Now — Pullable</SelectItem>
                    <SelectItem value="identityiq">IdentityIQ — Pullable</SelectItem>
                    <SelectItem value="myscoreiq">MyScoreIQ — Pullable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual_platform_email">Platform Email/Username</Label>
                <Input
                  id="manual_platform_email"
                  type="email"
                  value={manualClient.platform_email}
                  onChange={(e) => setManualClient({ ...manualClient, platform_email: e.target.value })}
                  placeholder="Enter platform email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual_platform_password">Platform Password</Label>
                <div className="relative">
                  <Input
                    id="manual_platform_password"
                    type={showManualPassword ? "text" : "password"}
                    value={manualClient.platform_password}
                    onChange={(e) => setManualClient({ ...manualClient, platform_password: e.target.value })}
                    placeholder="Enter platform password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManualPassword(!showManualPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showManualPassword ? "Hide password" : "Show password"}
                    aria-pressed={showManualPassword}
                    title={showManualPassword ? "Hide password" : "Show password"}
                  >
                    {showManualPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                className={authorizationCheckboxClassName}
                id="manual-authorization"
                checked={manualAuthorization}
                onCheckedChange={(checked) => setManualAuthorization(checked === true)}
              />
              <Label htmlFor="manual-authorization" className="text-sm leading-5 text-slate-600 cursor-pointer">
                I confirm this is my client credit report and I am authorized to use for educational analysis.
              </Label>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className={isEliteActive ? "elite-btn-outline" : ""}
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={isEliteActive ? "elite-btn-primary" : "gradient-primary"}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding Client..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
