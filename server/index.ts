import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { addLog } from "./logger";

// Logging utility function moved from vite.ts
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API key middleware (must be before routes)
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    addLog("ERROR", "Missing required header: x-api-key");
    return res.status(401).json({ message: 'Missing required header: x-api-key' });
  }
  if (apiKey !== config.apiKey) {
    addLog("WARN", `Invalid API key attempt: ${apiKey}`);
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import { config } from './config';

(async () => {
  // Start the server
  try {
    // Log server startup
    console.log("Starting Room Bookings API Server...");
    addLog("INFO", "Starting Room Bookings API Server");
    
    // Register routes
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      addLog("ERROR", `Error handler: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Simple route for the root URL
    app.get("/", (_req, res) => {
      res.send("Room Bookings API Server is running");
    });

    // Use port and host from config
    server.listen(config.port, config.host, () => {
      const startupMessage = `Room Bookings API Server running on port ${config.port}`;
      console.log(startupMessage);
      addLog("INFO", startupMessage);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    addLog("ERROR", `Failed to start server: ${(error as Error).message}`);
  }
})();
