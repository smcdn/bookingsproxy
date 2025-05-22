import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchAndProcessBookings } from "./api/bookings";
import { addLog } from "./api/supabse";

export async function registerRoutes(app: Express): Promise<Server> {
  // Main API route to get bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      addLog("INFO", "Received request to /api/bookings");
      
      // Check if date parameter is provided
      const requestDate = req.query.date as string;
      
      // Fetch bookings, optionally with a specific date
      const bookingsData = await fetchAndProcessBookings(requestDate);
      
      // Return only the bookings array, not the logs or apiStatus
      res.json({ bookings: bookingsData.bookings });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      addLog("ERROR", `Error in /api/bookings: ${(error as Error).message}`);
      res.status(500).json({ 
        message: "Failed to fetch bookings",
        error: (error as Error).message
      });
    }
  });
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
