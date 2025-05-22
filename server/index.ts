import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import { addLog } from "./api/supabse";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Check if required environment variables are set
const checkRequiredEnvVars = () => {
  const required = ['SUPABASE_KEY', 'SUPABASE_EMAIL', 'SUPABASE_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    addLog("ERROR", `Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

(async () => {
  // Start the server
  try {
    // Log server startup
    console.log("Starting Small Tutorial Room Booking API server...");
    addLog("INFO", "Starting Small Tutorial Room Booking API server");
    
    // Check environment variables
    if (!checkRequiredEnvVars()) {
      console.error("Server startup aborted due to missing environment variables");
      addLog("ERROR", "Server startup aborted due to missing environment variables");
      return;
    }
    
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
      res.send("Small Tutorial Room Booking API Server is running");
    });

    // ALWAYS serve the app on port 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      const startupMessage = `API server running on port ${port}`;
      console.log(startupMessage);
      addLog("INFO", startupMessage);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    addLog("ERROR", `Failed to start server: ${(error as Error).message}`);
  }
})();
