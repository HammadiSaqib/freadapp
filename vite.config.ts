import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import fs from "fs";

const portalAliases = [
  'admin',
  'super-admin',
  'support',
  'affiliate',
  'funding-manager',
  'member',
  'printing-team',
];

const portalLocalhostOrigins = portalAliases.flatMap((alias) => [
  `http://${alias}.localhost:3001`,
  `http://${alias}.localhost:3000`,
]);

//1 https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to IPv4 to ensure external access over public IP on VPS
    host: "0.0.0.0",
    port: 3001,
    allowedHosts: ['.localhost', '.lvh.me', '.localtest.me'],
  },
  publicDir: path.resolve(__dirname, "./client/public"),
  build: {
    outDir: "dist/spa",
  },
  ssr: {
    noExternal: ["react-helmet-async"],
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Use return so the configuration is async
      return createServer(server)
        .then(({ app, httpServer, websocketService }) => {
          // Add the express app as middleware before Vite's internal middleware
          server.middlewares.use((req, res, next) => {
            const urlPath = req.url?.split("?")[0] || "";
            const isApi = urlPath.startsWith("/api");
            const isBlogSsr = /^\/blog\/[^/]+/.test(urlPath);
            const isHomeSsr = urlPath === "/";
            if (isApi || isBlogSsr || isHomeSsr) {
              if (isApi) {
                console.log("Proxying API request:", req.url, req.method);
              }
              return app(req as any, res as any, next);
            }
            next();
          });
          
          // Attach WebSocket service to Vite's HTTP server
          if (server.httpServer && websocketService) {
            // Get the Socket.IO instance from websocketService and attach it to Vite's server
            const io = websocketService.socketIO;
            if (io) {
              // Add custom error handling for Socket.IO
              io.engine.on('connection_error', (err) => {
                console.error('Socket.IO connection error:', err);
              });
              
              // Add global error handler for Socket.IO
              io.on('error', (err) => {
                console.error('Socket.IO error:', err);
              });
              
              // Add parser error handling
              io.on('connect_error', (err) => {
                console.error('Socket.IO connect error (possibly JSON parsing):', err);
              });
              
              // Allow dev connections from local and optional env-defined origin
              const devOrigins = [
                'http://localhost:3001',
                'http://localhost:3000',
                'http://localhost:5173',
                ...portalLocalhostOrigins,
              ];
              if (process.env.CORS_ORIGIN) {
                // Support comma-separated list
                const extra = process.env.CORS_ORIGIN.includes(',')
                  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
                  : [process.env.CORS_ORIGIN];
                devOrigins.push(...extra);
              }

              if (process.env.FRONTEND_URL) {
                devOrigins.push(process.env.FRONTEND_URL);
              }

              io.attach(server.httpServer, {
                cors: {
                  origin: devOrigins,
                  methods: ['GET', 'POST'],
                  credentials: true
                },
                transports: ['websocket', 'polling'],
                connectTimeout: 30000,
                pingTimeout: 60000,
                pingInterval: 25000
              });
              console.log('🔌 WebSocket service attached to Vite dev server');
            }
          }
          
          console.log('🔌 WebSocket service initialized in development mode');
          
          server.middlewares.use((req, res, next) => {
            const urlPath = req.url?.split("?")[0] || "";
            const isApi = urlPath.startsWith("/api");
            if (isApi) return next();
            const isStatic = /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(urlPath);
            if (!isStatic) return next();
            const filePath = path.resolve(process.cwd(), "public", urlPath.replace(/^\//, ""));
            fs.stat(filePath, (err, stats) => {
              if (err || !stats.isFile()) return next();
              const ext = path.extname(filePath).toLowerCase();
              const types: Record<string, string> = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".ico": "image/x-icon",
              };
              res.setHeader("Content-Type", types[ext] || "application/octet-stream");
              fs.createReadStream(filePath).pipe(res);
            });
          });
        })
        .catch((error) => {
          console.error("Failed to create Express server:", error);
        });
    },
  };
}
