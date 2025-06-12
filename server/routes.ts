import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { fetchAndProcessBookings } from "./api/bookings";
import { addLog } from "./logger";
import { rooms, validRoomNames } from "./rooms";
import dotenv from "dotenv";

dotenv.config();

export async function registerRoutes(app: Express): Promise<Server> {
  // Main API route to get bookings
  app.get("/api/bookings", async (req: Request, res: Response) => {
    try {
      addLog("INFO", "Received request to /api/bookings");
      const requestDate = req.query.date as string;
      const roomName = req.headers["room_name"] as string;
      if (!roomName) {
        addLog("ERROR", "Missing required header: room_name");
        return res.status(400).json({ message: "Missing required header: room_name" });
      }
      if (!validRoomNames.includes(roomName)) {
        addLog("WARN", `Invalid room_name requested: ${roomName}`);
        return res.status(400).json({ message: `Invalid room_name: ${roomName}` });
      }
      // Fetch bookings, optionally with a specific date and room
      const bookingsData = await fetchAndProcessBookings(requestDate, roomName);
      res.json({ room: bookingsData.room, bookings: bookingsData.bookings });
    } catch (error) {
      addLog("ERROR", `Error in /api/bookings: ${(error as Error).message}`);
      res.status(500).json({ 
        message: "Failed to fetch bookings",
        error: (error as Error).message
      });
    }
  });
  
  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
