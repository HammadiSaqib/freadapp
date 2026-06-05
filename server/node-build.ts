import path from "path";
import { createServer } from "./index";
import * as express from "express";

async function startServer() {
  const { app, httpServer, websocketService } = await createServer();
  const port = process.env.PORT || 3000;
  const embedContentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors *",
  ].join('; ');

  // In production, serve the built SPA files
  const __dirname = import.meta.dirname;
  const distPath = path.join(__dirname, "../spa");

  app.use((req, res, next) => {
    if (
      req.path === '/shop/embed' ||
      req.path === '/shop/embed/' ||
      req.path === '/pricing/embed' ||
      req.path === '/pricing/embed/' ||
      req.path === '/contact/embed' ||
      req.path === '/contact/embed/' ||
      req.path === '/register/embed' ||
      req.path === '/register/embed/' ||
      req.path === '/join-affiliate/embed' ||
      req.path === '/join-affiliate/embed/'
    ) {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', embedContentSecurityPolicy);
    }

    next();
  });

  // Serve static files
  app.use(express.static(distPath));

  // Handle React Router - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    res.sendFile(path.join(distPath, "index.html"));
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  const { websocketService } = await createServer();
  if (websocketService) {
    await websocketService.shutdown();
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  const { websocketService } = await createServer();
  if (websocketService) {
    await websocketService.shutdown();
  }
  process.exit(0);
});
