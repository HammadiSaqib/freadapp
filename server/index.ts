import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs/promises";
import type { ViteDevServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
const enableDebugRoutes = process.env.ENABLE_DEBUG_ROUTES === "true";

import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { handleDemo } from "./routes/demo.js";
import { initializeDatabaseAdapter } from "./database/databaseAdapter.js";
import { loadEnvironmentConfig } from "./config/environment.js";
import { authenticateToken, requireRole } from "./middleware/authMiddleware.js";
import { requireSignedAdminContract } from "./middleware/contractGuard.js";
import { requireSignedScoreMachineEliteAgreement } from "./middleware/scoreMachineEliteGuard.js";
import { jsonErrorHandler, generalErrorHandler } from "./middleware/errorHandlingMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import blogRoutes, { fetchBlogPostBySlug } from "./routes/blog.js";
import newsletterRoutes from "./routes/newsletter.js";
import profileUploadRoutes from "./routes/profileUpload.js";
import communityRoutes from "./routes/community.js";
import featureRequestsRoutes from "./routes/featureRequests.js";
import groupRoutes from "./routes/groups.js";
import superAdminRoutes from "./routes/superAdmin.js";
import supportBlogRoutes from "./routes/supportBlog.js";
import schoolManagementRoutes from "./routes/schoolManagement.js";
import adminManagementRoutes from "./routes/adminManagement.js";
import affiliateManagementRoutes from "./routes/affiliateManagement.js";
import affiliateDashboardRoutes from "./routes/affiliateDashboard.js";
import affiliateRegistrationRoutes from "./routes/affiliateRegistration.js";
import affiliateLandingRoutes from "./routes/affiliateLanding.js";
import affiliateSettingsRoutes from "./routes/affiliateSettings.js";
import commissionRoutes from "./routes/commissionRoutes.js";
import commissionPaymentsRoutes from "./routes/commissionPayments.js";
import supportUsersRoutes from "./routes/supportUsers.js";
import supportTicketsRoutes from "./routes/supportTickets.js";
import supportChatRoutes from "./routes/supportChat.js";
import supportReportsRoutes from "./routes/supportReports.js";
import supportDashboardRoutes from "./routes/supportDashboard.js";
import supportSettingsRoutes from "./routes/supportSettings.js";
import emailCampaignRoutes from "./routes/emailCampaign.js";
import adminNotificationRoutes from "./routes/adminNotifications.js";
import knowledgeBaseRoutes from "./routes/knowledgeBase.js";
import pricingRoutes from "./routes/pricing.js";
import billingRoutes from "./routes/billing.js";
import { initializeStripe } from "./routes/billing.js";
import invoicesRoutes from "./routes/invoices.js";
import payslipsRoutes from "./routes/payslips.js";
import { initializeWebSocketService } from "./services/websocketService.js";
import creditReportScraperRoutes from "./routes/creditreportscraper.js";
import scraperLogsRoutes from "./routes/scraperLogs.js";
import aiRoutes from "./routes/ai.js";
import proxyRoutes from "./routes/proxy.js";
import warMachineRoutes from "./routes/warMachine.js";
import contractsRoutes from "./routes/contracts.js";
import contractsAdminRoutes from "./routes/contractsAdmin.js";
import contractAgreementsRoutes from "./routes/contractAgreements.js";
import employeesRoutes from "./routes/employees.js";
import debtPayoffRoutes from "./routes/debtPayoff.js";
import shopRoutes from "./routes/shop.js";
import testimonialsRoutes, { publicTestimonialsRoutes } from "./routes/testimonials.js";
import testimonialsExternalRoutes from "./routes/testimonialsExternal.js";
import integrationsRoutes from "./routes/integrations.js";
import { emailService } from "./services/emailService.js";

import { reminderService } from "./services/reminderService.js";

// Course routes
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  getEnrolledCourses,
  checkEnrollment,
} from "./routes/courses.js";

// Calendar routes
import {
  getCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  registerForEvent,
  unregisterFromEvent,
  getUserRegisteredEvents,
  getAdminCalendarEvents,
  getUpcomingAdminEvents,
  markReminderCompleted,
} from "./routes/calendar.js";

// Client routes
import {
  getClients,
  getClient,
  createClient,
  createClientIntakeToken,
  getClientIntakeConfig,
  submitClientIntake,
  submitGhlWebhook,
  updateClient,
  deleteClient,
  getClientStats,
  getEquifaxSettlementSnapshot,
  startEquifaxSettlementLiveBrowser,
  getEquifaxSettlementLiveBrowser,
  getEquifaxSettlementLiveBrowserPreview,
  clickEquifaxSettlementPreview,
  scrollEquifaxSettlementPreview,
  getEquifaxSettlementSavedScreenshot,
  serveEquifaxSettlementSavedScreenshot,
  saveEquifaxSettlementScreenshot,
  focusEquifaxSettlementLiveBrowser,
  closeEquifaxSettlementLiveBrowser,
} from "./routes/clients.js";

// Funding request routes
import {
  getFundingRequests,
  getFundingRequest,
  createFundingRequest,
  updateFundingRequest,
  deleteFundingRequest,
  getFundingRequestStats,
  generateFundingRequestPDF,
  uploadFundingDocuments,
  fundingDocumentsUpload,
  serveDocument,
} from "./routes/fundingRequests.js";

// Funding Manager Dashboard routes
import {
  getFundingManagerDashboardStats,
} from "./routes/fundingManagerDashboard.js";

// Dispute routes
import {
  getDisputes,
  getDispute,
  createDispute,
  updateDispute,
  deleteDispute,
  getDisputeStats,
} from "./routes/disputes.js";

// Credit repair letter generation + enhanced dispute letter
import { generateDisputeLetter, generateCreditRepairLetters, getGeneratedLetterHistory, getDisputeLetterHistory } from "./routes/enhancedDisputeRoutes.js";

// Dispute letter ZIP generation + send for printing
import { generateDisputeLetterZip, sendForPrinting, downloadZipById } from "./routes/disputeLetterZipRoutes.js";

// Dispute letter content management
import disputeLetterContentRoutes from "./routes/disputeLetterContent.js";

// Letter management (categories + templates)
import letterManagementRoutes from "./routes/letterManagement.js";

// Client documents
import clientDocumentRoutes from "./routes/clientDocuments.js";

// Support templates
import supportTemplatesRoutes from "./routes/supportTemplates.js";

// Analytics routes
import {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getPerformanceMetrics,
  getClientAnalytics,
  getFinancialInsights,
  getRecentActivities,
  getGa4Realtime,
  getEliteDashboardData,
} from "./routes/analytics.js";

// Bank management routes
import {
  getBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank,
  getBankStats,
  exportBanksCSV,
  importBanksCSV,
} from "./routes/bankManagement.js";
import multer from 'multer';

import cardManagementRoutes from "./routes/cardManagement.js";
import fundingDIYSubmissionsRoutes from "./routes/fundingDIYSubmissions.js";
import affiliateTrialPlansRoutes from "./routes/affiliateTrialPlans.js";
import printingTeamRoutes from "./routes/printingTeamRoutes.js";

const portalAliases = [
  'admin',
  'super-admin',
  'support',
  'affiliate',
  'funding-manager',
  'member',
  'printing-team',
] as const;

const portalLocalhostOrigins = portalAliases.flatMap((alias) => [
  `http://${alias}.localhost:3001`,
  `http://${alias}.localhost:3000`,
]);

const publicLocalhostOrigins = [
  'http://ref.localhost:3001',
  'http://ref.localhost:3000',
  'http://refadmin.localhost:3001',
  'http://refadmin.localhost:3000',
  'http://onboarding.localhost:3001',
  'http://onboarding.localhost:3000',
];

const trustedProductionBaseDomains = [
  'thescoremachine.com',
  'tsmbasic.com',
] as const;

const defaultCorsOrigins = [
  'http://localhost:3002',
  'http://localhost:8080',
  'http://localhost:3001',
  'http://localhost:3000',
  ...portalLocalhostOrigins,
  ...publicLocalhostOrigins,
  'https://api.thescoremachine.com',
  'https://thescoremachine.com',
  'https://www.thescoremachine.com',
  'https://api.tsmbasic.com',
  'https://tsmbasic.com',
  'https://www.tsmbasic.com',
];

const envCorsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedCorsOrigins = new Set([...defaultCorsOrigins, ...envCorsOrigins]);

function isTrustedProductionOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:") {
      return false;
    }

    return trustedProductionBaseDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

const legacyAdminRedirectHostPattern = /^(?:www\.)?admin\.(?:localhost|thescoremachine\.com)(?::\d+)?$/i;

const normalizeLegacyRedirectPath = (value: string) => {
  let normalized = String(value || '').trim();
  if (!normalized) {
    return '/';
  }

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the raw path if decoding fails.
  }

  normalized = normalized.replace(/\/+$/, '');
  return (normalized || '/').toLowerCase();
};

const legacyAdminRedirects = new Map<string, string>([
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1772133278352-285479203.png'), 'https://thescoremachine.com/blog/7-best-options-for-a-car-dealer-that-accept-bad-credit-near-me-in-2026'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1772133007196-461732941.png'), 'https://thescoremachine.com/blog/best-bad-credit-auto-loan-rates-top-5-lenders-for-2026'],
  [normalizeLegacyRedirectPath('/blog/check-credit-score-for-free-no-tricks-no-fees'), 'https://thescoremachine.com/blog/check-your-credit-score-for-free-no-tricks-no-fees-what-actually-works-in-2026'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1770850836618-960752995.jpg'), 'https://thescoremachine.com/blog/what-is-a-good-credit-score-number'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1771073616673-629648648.jpeg'), 'https://thescoremachine.com/blog/credit-analysiscar-finance-bad-credit-history'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1770850535158-795046018.JPG'), 'https://thescoremachine.com/blog/bad-credit-auto-loans-guaranteed-approval-online-a-realistic-guide'],
  [normalizeLegacyRedirectPath('/blog/bad-credit-car-loans-how-to-secure-financing-and-save-thousands-in-2026'), 'https://thescoremachine.com/blog/how-to-get-pre-approved-for-a-car-loan-the-smart-way'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1771073481871-440996995.jpeg'), 'https://thescoremachine.com/blog/credit-analysiscar-finance-bad-credit-history'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1771252057694-103412209.png'), 'https://thescoremachine.com/blog/credit-analysiscar-finance-bad-credit-history'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1771328055811-113875721.png'), 'https://thescoremachine.com/blog/bad-credit-auto-loans-guaranteed-approval-online-a-realistic-guide'],
  [normalizeLegacyRedirectPath('/ai-credit-analysis-software'), 'https://thescoremachine.com/blog/credit-repair-software-for-professionals'],
  [normalizeLegacyRedirectPath('/blog/credit-utilization-impact'), 'https://thescoremachine.com/blog/credit-repair-software-for-professionals'],
  [normalizeLegacyRedirectPath('/blog/debt-to-income-ratio-guide'), 'https://thescoremachine.com/blog/does-debt-consolidation-affect-your-credit-score-a-clear-guide'],
  [normalizeLegacyRedirectPath('/blog/how-lenders-evaluate-creditworthiness'), 'https://thescoremachine.com/blog/credit-risk-analytics'],
  [normalizeLegacyRedirectPath('/blog/the-history-and-evolution-of-credit-analysis-from-handshakes-to-ai-scoring-in-2026'), 'https://thescoremachine.com/blog/history-and-evolution-of-credit-analysis'],
  [normalizeLegacyRedirectPath('/uploads/blog/blog-1772299410155-126385860.png'), 'https://thescoremachine.com/blog/gap-insurance-explained-do-you-need-it-in-2026'],
  [normalizeLegacyRedirectPath('/blog/Bad%20Credit%20Car%20Loans%20in%202026'), 'https://thescoremachine.com/blog/bad-credit-car-loans-in-2026'],
  [normalizeLegacyRedirectPath('/credit'), 'https://thescoremachine.com/blog/can-you-pay-your-mortgage-with-a-credit-card'],
  [normalizeLegacyRedirectPath('/metro-2-compliance-software'), 'https://thescoremachine.com/blog/can-you-pay-your-mortgage-with-a-credit-card'],
]);

const resolveLegacyAdminRedirect = (value: string) => legacyAdminRedirects.get(normalizeLegacyRedirectPath(value)) || null;

export async function createServer(vite?: ViteDevServer) {
  const app = express();
  const httpServer = createHttpServer(app);

  try {
    (httpServer as any).setTimeout?.(0);
    (httpServer as any).requestTimeout = 0;
    (httpServer as any).headersTimeout = 0;
  } catch {}

  // Canonicalize host: strip leading "www." for localhost and production domain
  app.use((req, res, next) => {
    const host = String(req.headers.host || '').toLowerCase();
    if (/^www\.localhost(?::\d+)?$/.test(host)) {
      const targetHost = host.replace(/^www\./, '');
      return res.redirect(301, `http://${targetHost}${req.originalUrl}`);
    } else if (/^www\.(?:thescoremachine|tsmbasic)\.com(?::\d+)?$/.test(host)) {
      const targetHost = host.replace(/^www\./, '').replace(/:\d+$/, '');
      return res.redirect(301, `https://${targetHost}${req.originalUrl}`);
    }
    next();
  });

  app.use((req, res, next) => {
    const host = String(req.headers.host || '').toLowerCase();
    if (!legacyAdminRedirectHostPattern.test(host)) {
      return next();
    }

    const redirectTarget = resolveLegacyAdminRedirect(req.path);
    if (!redirectTarget) {
      return next();
    }

    const queryString = req.originalUrl.includes('?')
      ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
      : '';

    return res.redirect(301, `${redirectTarget}${queryString}`);
  });

  // Load configuration and initialize database adapter
  const config = loadEnvironmentConfig();
  const dbType = config.DATABASE_URL?.startsWith('mysql://') ? 'mysql' : 'sqlite';
  await initializeDatabaseAdapter(config, dbType);
  
  console.log(`🗄️  Database: Using ${dbType.toUpperCase()} adapter`);

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.has(origin) || isTrustedProductionOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Skip-Refresh-Token-Persist']
  }));
  // IMPORTANT: Use raw body for Stripe webhook BEFORE json/urlencoded parsers
  // This prevents express.json() from consuming and mutating the raw payload,
  // which would break Stripe signature verification.
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: "1000mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1000mb" }));

  // Serve static files from uploads directory
  app.use('/uploads', express.static('uploads'));
  // Serve testimonials videos from client/public/testimonials
  app.use('/testimonials', express.static(path.resolve(process.cwd(), 'client', 'public', 'testimonials')));
  // Serve root-level public assets for SPA image references
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // Health check
  app.get("/api/ping", (_req, res) => {
    console.log("Ping endpoint hit!");
    res.json({
      message: "CreditRepairPro API v1.0",
      timestamp: new Date().toISOString(),
      status: "healthy",
    });
  });

  // Client-side auth transfer debug sink (terminal-visible)
  app.post("/api/debug/transfer-log", (req, res) => {
    const payload = req.body || {};
    const event = payload.event || "unknown";
    const origin = payload.origin || "unknown";
    const pathname = payload.pathname || "unknown";
    const timestamp = payload.timestamp || new Date().toISOString();
    const details = payload.details || {};

    console.log("\n[TRANSFER DEBUG]", timestamp, event);
    console.log("  Origin:", origin, "Path:", pathname);
    console.log("  Details:", details);

    res.json({ ok: true });
  });

  // Simple user check endpoint
  app.get("/api/check-demo-user", async (_req, res) => {
    try {
      const { getUserByEmail } = await import(
        "./controllers/authController.js"
      );
      const user = await getUserByEmail("demo@creditrepairpro.com");

      res.json({
        user_exists: !!user,
        email: user?.email || null,
        has_password: !!user?.password_hash,
        is_active: user?.is_active || false,
        created_at: user?.created_at || null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  if (enableDebugRoutes) {
    app.get("/api/debug/current-user", authenticateToken, (req: any, res) => {
      res.json({
        user: req.user,
        message: "Current authenticated user info",
      });
    });

    app.get("/api/debug/users", async (_req, res) => {
      try {
        const { allQuery } = await import("./database/schema.js");
        const users = await allQuery(
          "SELECT email, first_name, last_name, role, created_at FROM users",
        );
        res.json({ users, count: users.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/debug/test-password", async (req, res) => {
      try {
        const { email, password } = req.body;
        const { getUserByEmail, comparePassword } = await import(
          "./controllers/authController.js"
        );

        const user = await getUserByEmail(email);
        if (!user) {
          return res.json({ result: "user_not_found" });
        }

        const passwordMatch = comparePassword(password, user.password_hash);
        res.json({
          result: passwordMatch ? "password_match" : "password_mismatch",
          user_exists: true,
          email: user.email,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/debug/reset-database", async (req, res) => {
      try {
        const { resetDatabase } = await import("./utils/resetDatabase.js");
        const success = await resetDatabase();
        res.json({
          success,
          message: success
            ? "Database reset successfully"
            : "Failed to reset database",
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // Legacy demo route
  app.get("/api/demo", handleDemo);

  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================
  // SSR for main landing page (improves SEO: real HTML in initial response)
  app.get("/", async (req, res) => {
    try {
      const isProd = process.env.NODE_ENV === "production" && !vite;
      const templatePath = isProd
        ? path.resolve(process.cwd(), "dist", "spa", "index.html")
        : path.resolve(process.cwd(), "index.html");

      let template = await fs.readFile(templatePath, "utf-8");
      if (vite) {
        template = await vite.transformIndexHtml(req.originalUrl, template);
      }

      let render: (url: string, blogSsrData: any) => Promise<{ appHtml: string; headTags: string }>;
      if (vite) {
        const mod = await vite.ssrLoadModule("/client/entry-server.tsx");
        render = mod.render;
      } else {
        const entryServerPath = path.resolve(
          process.cwd(),
          "dist",
          "ssr",
          "entry-server.js",
        );
        const mod = await import(pathToFileURL(entryServerPath).href);
        render = mod.render;
      }

      const { appHtml, headTags } = await render(req.originalUrl, null);
      const html = template
        .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
        .replace("</head>", `${headTags}</head>`);

      res.status(200).setHeader("Content-Type", "text/html").send(html);
    } catch (error) {
      console.error("Failed to render home SSR:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/blog", blogRoutes);
  app.get("/blog/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const post = await fetchBlogPostBySlug(slug);
      const blogSsrData = post
        ? { post, url }
        : { post: null, url, notFound: true };

      const isProd = process.env.NODE_ENV === "production" && !vite;
      const templatePath = isProd
        ? path.resolve(process.cwd(), "dist", "spa", "index.html")
        : path.resolve(process.cwd(), "index.html");
      let template = await fs.readFile(templatePath, "utf-8");
      if (vite) {
        template = await vite.transformIndexHtml(req.originalUrl, template);
      }

      let render: (url: string, blogSsrData: any) => Promise<{ appHtml: string; headTags: string }>;
      if (vite) {
        const mod = await vite.ssrLoadModule("/client/entry-server.tsx");
        render = mod.render;
      } else {
        const entryServerPath = path.resolve(process.cwd(), "dist", "ssr", "entry-server.js");
        const mod = await import(pathToFileURL(entryServerPath).href);
        render = mod.render;
      }

      const { appHtml, headTags } = await render(req.originalUrl, blogSsrData);
      const serializedData = JSON.stringify(blogSsrData).replace(/</g, "\\u003c");
      const html = template
        .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
        .replace("</head>", `${headTags}</head>`)
        .replace("</body>", `<script>window.__BLOG_SSR__=${serializedData}</script></body>`);

      res.status(post ? 200 : 404).setHeader("Content-Type", "text/html").send(html);
    } catch (error) {
      console.error("Failed to render blog SSR:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  app.use("/api/newsletter", newsletterRoutes);
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, phone, message, topic } = req.body || {};
      const safeName = String(name || "").trim();
      const safeEmail = String(email || "").trim();
      const safePhone = String(phone || "").trim();
      const safeMessage = String(message || "").trim();
      const safeTopic = String(topic || "General").trim();
      if (!safeName || !safeEmail || !safePhone || !safeMessage) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const html = `
        <h2>New Contact Request</h2>
        <p><strong>Topic:</strong> ${safeTopic}</p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
      `;
      const text = [
        "New Contact Request",
        `Topic: ${safeTopic}`,
        `Name: ${safeName}`,
        `Email: ${safeEmail}`,
        `Phone: ${safePhone}`,
        "Message:",
        safeMessage
      ].join("\n");

      const sent = await emailService.sendEmail({
        to: "support@thescoremachine.com",
        subject: `New Contact Request - ${safeTopic}`,
        html,
        text
      });

      if (!sent) {
        return res.status(500).json({ error: "Failed to send message" });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to send contact message:", error);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });
  app.use("/api/profile", profileUploadRoutes);

  // =============================================================================
  // COMMUNITY ROUTES
  // =============================================================================
  app.use("/api/community", communityRoutes);
  // Public testimonials route for landing page
  app.use("/api/testimonials", publicTestimonialsRoutes);

  // External testimonials API (public, CORS-open, for PHP/Node.js integrations)
  app.use("/api/v1/testimonials", testimonialsExternalRoutes);

  // =============================================================================
  // FEATURE REQUESTS ROUTES (Admin-only)
  // =============================================================================
  app.use("/api/feature-requests", authenticateToken, requireSignedAdminContract, requireRole('super_admin'), featureRequestsRoutes);

  // =============================================================================
  // GROUP ROUTES
  // =============================================================================
  app.use("/api/groups", groupRoutes);

  // =============================================================================
  // SUPER ADMIN ROUTES
  // =============================================================================
  console.log('🔍 Registering super admin routes at /api/super-admin');
  app.use("/api/super-admin", superAdminRoutes);
  app.use("/api/super-admin/affiliate-trial-plans", affiliateTrialPlansRoutes);
  app.use("/api/support/blog", supportBlogRoutes);

  // =============================================================================
  // SCHOOL MANAGEMENT ROUTES
  // =============================================================================
  app.use("/api/school-management", schoolManagementRoutes);

  // =============================================================================
  // ADMIN MANAGEMENT ROUTES (Support Staff)
  // =============================================================================
  app.use("/api/admin-management", authenticateToken, requireSignedAdminContract, adminManagementRoutes);

  // =============================================================================
  // EMPLOYEE ROUTES (Admin)
  // =============================================================================
  app.use("/api/employees", authenticateToken, requireSignedAdminContract, employeesRoutes);

  // =============================================================================
  // ADMIN NOTIFICATION ROUTES
  // =============================================================================
  app.use("/api/admin", authenticateToken, requireSignedAdminContract, adminNotificationRoutes);

  // =============================================================================
  // AFFILIATE MANAGEMENT ROUTES (Admin)
  // =============================================================================
  app.use("/api/affiliate-management", authenticateToken, requireSignedAdminContract, affiliateManagementRoutes);
  app.use("/api/affiliate", affiliateDashboardRoutes);
  app.use("/api/affiliate", affiliateRegistrationRoutes);
  app.use("/api/affiliate", affiliateSettingsRoutes);
  app.use("/api/landing", affiliateLandingRoutes);
  app.use("/api/commissions", commissionRoutes);
app.use("/api/commission-payments", commissionPaymentsRoutes);

  // =============================================================================
  // SUPPORT USERS ROUTES
  // =============================================================================
  app.use(supportUsersRoutes);
  app.use("/api/email-campaign", emailCampaignRoutes);

  // =============================================================================
  // SUPPORT TICKETS ROUTES
  // =============================================================================
  app.use("/api/support/tickets", supportTicketsRoutes);

  // =============================================================================
  // SUPPORT CHAT ROUTES
  // =============================================================================
  app.use("/api/support/chat", supportChatRoutes);

  // =============================================================================
  // SUPPORT REPORTS ROUTES
  // =============================================================================
  app.use("/api/support/reports", supportReportsRoutes);

  // =============================================================================
  // SUPPORT DASHBOARD ROUTES
  // =============================================================================
  app.use("/api/support/dashboard", supportDashboardRoutes);
  // Support-only testimonials management
  app.use("/api/support/testimonials", testimonialsRoutes);

  // =============================================================================
  // SUPPORT SETTINGS ROUTES
  // =============================================================================
  app.use("/api/support/settings", supportSettingsRoutes);
  app.use("/api/integrations", integrationsRoutes);

  // =============================================================================
  // KNOWLEDGE BASE ROUTES
  // =============================================================================
  app.use("/api/knowledge-base", knowledgeBaseRoutes);

  // =============================================================================
  // PUBLIC PRICING ROUTES
  // =============================================================================
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/shop", shopRoutes);
  // Proxy routes (e.g., Google Drive streaming)
  app.use("/api/proxy", proxyRoutes);

  // =============================================================================
  // BILLING AND STRIPE ROUTES
  // =============================================================================
  app.use("/api/billing", billingRoutes);
  // Invoices routes
  app.use("/api/invoices", invoicesRoutes);
  // Payslips routes
  app.use("/api/payslips", payslipsRoutes);

  // =============================================================================
  // AI ROUTES
  // =============================================================================
  app.use("/api/ai", aiRoutes);

  // =============================================================================
  // CONTRACTS ROUTES
  // =============================================================================
  app.use("/api/contracts", contractsRoutes);
  app.use("/api/contracts-admin", contractsAdminRoutes);
  app.use("/api/contract-agreements", contractAgreementsRoutes);

  app.post("/api/clients/intake", submitClientIntake);
  app.get("/api/clients/intake-config", getClientIntakeConfig);
  app.post("/api/webhooks/ghl/:integration_hash", submitGhlWebhook);
  app.post("/api/clients/intake-token", authenticateToken, requireSignedAdminContract, createClientIntakeToken);

  // Enforce contract signing for admin-specific REST endpoints
  // Clients
  app.use("/api/clients", authenticateToken, requireSignedAdminContract);
  // Disputes
  app.use("/api/disputes", authenticateToken, requireSignedAdminContract);
  // Analytics
  app.use("/api/analytics", authenticateToken, requireSignedAdminContract);
  // Banks
  app.use("/api/banks", authenticateToken, requireSignedAdminContract);
  // Cards
  app.use("/api/cards", authenticateToken, requireSignedAdminContract);
  // Admin calendar endpoints
  app.use("/api/calendar/admin", authenticateToken, requireSignedAdminContract);

  // =============================================================================
  // COURSE ROUTES
  // =============================================================================
  app.get("/api/courses", getCourses);
  app.get("/api/courses/:id", authenticateToken, getCourse);
  app.post("/api/courses", authenticateToken, createCourse);
  app.put("/api/courses/:id", authenticateToken, updateCourse);
  app.delete("/api/courses/:id", authenticateToken, deleteCourse);
  app.post("/api/courses/:id/enroll", authenticateToken, enrollInCourse);
  app.get("/api/courses/enrolled", authenticateToken, getEnrolledCourses);
  app.get("/api/courses/:id/enrollment", authenticateToken, checkEnrollment);

  // =============================================================================
  // CALENDAR ROUTES
  // =============================================================================
  app.get("/api/calendar/events", getCalendarEvents);
  app.get("/api/calendar/events/:id", getCalendarEvent);
  app.post("/api/calendar/events", authenticateToken, createCalendarEvent);
  app.put("/api/calendar/events/:id", authenticateToken, updateCalendarEvent);
  app.delete("/api/calendar/events/:id", authenticateToken, deleteCalendarEvent);
  app.post("/api/calendar/events/:id/register", authenticateToken, registerForEvent);
  app.delete("/api/calendar/events/:id/register", authenticateToken, unregisterFromEvent);
  app.get("/api/calendar/my-events", authenticateToken, getUserRegisteredEvents);
  
  // Admin Dashboard Calendar Routes
  app.get("/api/calendar/admin/events", authenticateToken, getAdminCalendarEvents);
  app.get("/api/calendar/admin/upcoming", authenticateToken, getUpcomingAdminEvents);
  app.post("/api/calendar/admin/mark-completed", authenticateToken, markReminderCompleted);

  // Client Management
  app.get("/api/clients", authenticateToken, getClients);
  app.get("/api/clients/stats", authenticateToken, getClientStats);
  app.get("/api/clients/:id", authenticateToken, getClient);
  app.post("/api/clients", authenticateToken, createClient);
  app.put("/api/clients/:id", authenticateToken, updateClient);
  app.delete("/api/clients/:id", authenticateToken, deleteClient);

  // Equifax Settlement
  app.post("/api/clients/:id/equifax-breach-settlement", authenticateToken, requireSignedScoreMachineEliteAgreement, getEquifaxSettlementSnapshot);
  app.post("/api/clients/:id/equifax-breach-settlement/live", authenticateToken, requireSignedScoreMachineEliteAgreement, startEquifaxSettlementLiveBrowser);
  app.get("/api/clients/:id/equifax-breach-settlement/live", authenticateToken, requireSignedScoreMachineEliteAgreement, getEquifaxSettlementLiveBrowser);
  app.get("/api/clients/:id/equifax-breach-settlement/live/preview", authenticateToken, requireSignedScoreMachineEliteAgreement, getEquifaxSettlementLiveBrowserPreview);
  app.post("/api/clients/:id/equifax-breach-settlement/live/preview/click", authenticateToken, requireSignedScoreMachineEliteAgreement, clickEquifaxSettlementPreview);
  app.post("/api/clients/:id/equifax-breach-settlement/live/preview/scroll", authenticateToken, requireSignedScoreMachineEliteAgreement, scrollEquifaxSettlementPreview);
  app.get("/api/clients/:id/equifax-breach-settlement/saved-screenshot", authenticateToken, requireSignedScoreMachineEliteAgreement, getEquifaxSettlementSavedScreenshot);
  app.get("/api/clients/:id/equifax-breach-settlement/saved-screenshot/file", authenticateToken, requireSignedScoreMachineEliteAgreement, serveEquifaxSettlementSavedScreenshot);
  app.post("/api/clients/:id/equifax-breach-settlement/saved-screenshot", authenticateToken, requireSignedScoreMachineEliteAgreement, saveEquifaxSettlementScreenshot);
  app.post("/api/clients/:id/equifax-breach-settlement/live/focus", authenticateToken, requireSignedScoreMachineEliteAgreement, focusEquifaxSettlementLiveBrowser);
  app.delete("/api/clients/:id/equifax-breach-settlement/live", authenticateToken, requireSignedScoreMachineEliteAgreement, closeEquifaxSettlementLiveBrowser);

  // Debt Payoff Plans
  app.use("/api/debt-payoff", debtPayoffRoutes);

  // Funding DIY submissions
  app.use('/api/funding/diy-submissions', fundingDIYSubmissionsRoutes);

  // Funding Requests
  app.get("/api/funding-requests", authenticateToken, requireRole('funding_manager'), getFundingRequests);
  app.get("/api/funding-requests/stats", authenticateToken, requireRole('funding_manager'), getFundingRequestStats);
  app.get("/api/funding-requests/:id", authenticateToken, requireRole('funding_manager'), getFundingRequest);
  app.post("/api/funding-requests", authenticateToken, requireRole('funding_manager'), createFundingRequest);
  app.put("/api/funding-requests/:id", authenticateToken, requireRole('funding_manager'), updateFundingRequest);
  app.delete("/api/funding-requests/:id", authenticateToken, requireRole('funding_manager'), deleteFundingRequest);
  app.get("/api/funding-requests/:id/pdf", authenticateToken, requireRole('funding_manager'), generateFundingRequestPDF);
  app.post("/api/funding-requests/upload-documents", authenticateToken, fundingDocumentsUpload.fields([
    { name: 'driverLicenseFile', maxCount: 1 },
    { name: 'einConfirmationFile', maxCount: 1 },
    { name: 'articlesFromStateFile', maxCount: 1 }
  ]), uploadFundingDocuments);
  app.get("/api/funding-requests/documents/:filename", authenticateToken, serveDocument);

  // Funding Manager Dashboard
  app.get("/api/funding-manager/dashboard/stats", authenticateToken, requireRole('funding_manager'), getFundingManagerDashboardStats);

  // Dispute Management
  app.get("/api/disputes", authenticateToken, getDisputes);
  app.get("/api/disputes/stats", authenticateToken, getDisputeStats);
  app.get("/api/disputes/:id", authenticateToken, getDispute);
  app.post("/api/disputes", authenticateToken, createDispute);
  app.put("/api/disputes/:id", authenticateToken, updateDispute);
  app.delete("/api/disputes/:id", authenticateToken, deleteDispute);
  app.get(
    "/api/disputes/letter-history/:clientId",
    authenticateToken,
    requireSignedScoreMachineEliteAgreement,
    getDisputeLetterHistory,
  );
  app.get(
    "/api/disputes/:dispute_id/letter",
    authenticateToken,
    generateDisputeLetter,
  );
  app.post(
    "/api/disputes/:dispute_id/letter",
    authenticateToken,
    generateDisputeLetter,
  );

  // =============================================================================
  // CREDIT REPAIR FLOW
  // =============================================================================

  // Credit repair letter generation
  app.post("/api/credit-repair/generate-letters", authenticateToken, requireSignedAdminContract, requireSignedScoreMachineEliteAgreement, generateCreditRepairLetters);
  app.get("/api/credit-repair/generated-letters", authenticateToken, requireSignedAdminContract, requireSignedScoreMachineEliteAgreement, getGeneratedLetterHistory);

  // Dispute letter ZIP & print
  app.post("/api/dispute-letters/generate-zip", authenticateToken, generateDisputeLetterZip);
  app.post("/api/dispute-letters/send-for-printing", authenticateToken, sendForPrinting);
  app.get("/api/dispute-letters/download-zip/:zipId", downloadZipById);

  // Printing team routes
  app.use("/api/printing-team", printingTeamRoutes);

  // Dispute letter content management (block-based templates)
  app.use("/api/dispute-letter-content", disputeLetterContentRoutes);

  // Letter management (categories + templates)
  app.use("/api/letter-management", authenticateToken, letterManagementRoutes);

  // Client documents (upload/delete/view)
  app.use("/api/client-documents", clientDocumentRoutes);

  // Support templates
  app.use("/api/support/templates", supportTemplatesRoutes);

  // Analytics and Reporting
  app.get("/api/analytics/dashboard", authenticateToken, getDashboardAnalytics);
  app.get("/api/analytics/revenue", authenticateToken, getRevenueAnalytics);
  app.get(
    "/api/analytics/performance",
    authenticateToken,
    getPerformanceMetrics,
  );
  app.get("/api/analytics/clients", authenticateToken, getClientAnalytics);
  app.get("/api/analytics/financial", authenticateToken, getFinancialInsights);
  app.get("/api/analytics/activities", authenticateToken, getRecentActivities);
  app.get("/api/analytics/ga4/realtime", authenticateToken, getGa4Realtime);
  app.get("/api/analytics/dashboard-elite", authenticateToken, getEliteDashboardData);

  // Bank Management
  app.get("/api/banks", authenticateToken, requireRole('admin', 'funding_manager'), getBanks);
  app.get("/api/banks/stats", authenticateToken, requireRole('admin', 'funding_manager'), getBankStats);
  app.get("/api/banks/export", authenticateToken, requireRole('admin', 'funding_manager'), exportBanksCSV);
  const bankUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  app.post("/api/banks/import", authenticateToken, requireRole('admin', 'funding_manager'), bankUpload.single('file'), importBanksCSV);
  app.get("/api/banks/:id", authenticateToken, requireRole('admin', 'funding_manager'), getBank);
  app.post("/api/banks", authenticateToken, requireRole('admin', 'funding_manager'), createBank);
  app.put("/api/banks/:id", authenticateToken, requireRole('admin', 'funding_manager'), updateBank);
  app.delete("/api/banks/:id", authenticateToken, requireRole('admin', 'funding_manager'), deleteBank);

  // Card Management
  app.use("/api/cards", cardManagementRoutes);

  // =============================================================================
  // CREDIT REPORTS
  // =============================================================================

  // Credit report scraper routes
  
  // Register credit report scraper routes
  app.use("/api/credit-reports", creditReportScraperRoutes);
  
  // Register scraper logs routes
  app.use("/api/scraper", scraperLogsRoutes);
  
  // Legacy credit report route
  app.get("/api/reports", authenticateToken, (req, res) => {
    res.json({ message: "Please use the new /api/credit-reports endpoints" });
  });

  // War Machine routes
  app.use("/api/war-machine", warMachineRoutes);

  // =============================================================================
  // AI FEATURES (Mock implementations)
  // =============================================================================

  // AI Coach recommendations
  app.get("/api/ai/recommendations", authenticateToken, (req, res) => {
    const mockRecommendations = [
      {
        id: 1,
        type: "client_action",
        priority: "high",
        title: "Follow up with Sarah Johnson",
        description:
          "Credit score increased by 70 points - time to celebrate and plan next steps",
        action_url: "/clients/1",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        type: "dispute_opportunity",
        priority: "medium",
        title: "New dispute opportunity detected",
        description: "3 clients have accounts ready for dispute filing",
        action_url: "/disputes/new",
        created_at: new Date().toISOString(),
      },
    ];

    res.json(mockRecommendations);
  });

  // AI insights
  app.get("/api/ai/insights", authenticateToken, (req, res) => {
    const mockInsights = [
      {
        insight_type: "performance",
        title: "Your success rate is 15% above industry average",
        description:
          "Your 94.5% dispute success rate significantly outperforms the industry average of 79%.",
        impact: "positive",
        confidence: 95,
      },
      {
        insight_type: "opportunity",
        title: "Optimal time for dispute filing",
        description:
          "Historical data shows disputes filed on Tuesdays have 12% higher success rates.",
        impact: "neutral",
        confidence: 87,
      },
    ];

    res.json(mockInsights);
  });

  // =============================================================================
  // COMPLIANCE FEATURES (Mock implementations)
  // =============================================================================

  // Compliance monitoring
  app.get("/api/compliance/status", authenticateToken, (req, res) => {
    const mockCompliance = {
      overall_score: 94,
      fcra_compliance: 96,
      croa_compliance: 89,
      state_licensing: 78,
      fdcpa_compliance: 98,
      last_audit: "2024-01-15",
      violations: [],
      warnings: [
        {
          type: "licensing",
          message: "License renewal pending for California",
          due_date: "2024-02-01",
        },
      ],
    };

    res.json(mockCompliance);
  });

  // =============================================================================
  // AUTOMATION FEATURES (Mock implementations)
  // =============================================================================

  // Automation workflows
  app.get("/api/automation/workflows", authenticateToken, (req, res) => {
    const mockWorkflows = [
      {
        id: 1,
        name: "New Client Onboarding",
        status: "active",
        triggers: 5,
        success_rate: 98,
        last_run: "2024-01-22T10:30:00Z",
      },
      {
        id: 2,
        name: "Dispute Follow-up",
        status: "active",
        triggers: 12,
        success_rate: 87,
        last_run: "2024-01-22T14:15:00Z",
      },
    ];

    res.json(mockWorkflows);
  });

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  // 404 handler for API routes - must be AFTER all other routes
  console.log('🔍 Registering 404 handler for /api/*');
  app.use("/api/*", (req: express.Request, res: express.Response) => {
    console.log('❌ 404 handler called for:', req.method, req.originalUrl);
    res.status(404).json({ 
      error: "API endpoint not found", 
      path: req.path, 
      method: req.method 
    });
  });

  // Global error handler
  app.use(jsonErrorHandler);
  app.use(generalErrorHandler);

  // Initialize Stripe
  console.log('🔄 Initializing Stripe...');
  await initializeStripe();

  // Initialize Reminder Service
  console.log('📅 Initializing Reminder Service...');
  reminderService.start();
  
  // Initialize WebSocket service
  const websocketService = initializeWebSocketService(httpServer);
  
  // Add WebSocket service to app for access in routes
  (app as any).websocketService = websocketService;

  return { app, httpServer, websocketService };
}
