//import { Booking, BookingData, SupabaseBooking } from "@/lib/types";
import { fetchBookings, getApiStatus } from "./supabase";
import { BookingData } from "../lib/types";
import { addLog, getLogs } from "../logger";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Use import.meta.url to get directory in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Move rooms.json to data/ subdirectory
const roomsPath = path.join(process.cwd(), 'data', 'rooms.json');
// Check for presence of rooms.json at startup
if (!fs.existsSync(roomsPath)) {
  console.error(`rooms.json not found at ${roomsPath}. Please ensure the file exists.`);
  process.exit(1);
}

// Update import for rooms
import { rooms } from "../rooms";

// Parse the Supabase time format (HH:MM) and return a full date object
// combining the date from the booking with the time
function parseBookingTime(timeStr: string, dateStr: string): Date {
  try {
    // Split time into hours and minutes
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Split date into year, month, day
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));

    // Create the date object
    const date = new Date();
    date.setFullYear(year);
    date.setMonth(month - 1); // Month is 0-based in JavaScript
    date.setDate(day);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
  } catch (error) {
    addLog("ERROR", `Failed to parse time: ${timeStr} on date ${dateStr}: ${(error as Error).message}`);
    throw error;
  }
}

// Format time for display (HH:MM)
function formatTimeForDisplay(timeStr: string): string {
  return timeStr; // The Supabase data already comes in HH:MM format, so we can use it directly
}

// Helper to round time to the nearest quarter hour
function roundToQuarterHour(hours: number, minutes: number) {
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  return {
    hours,
    minutes: roundedMinutes,
    timeStr: `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`
  };
}

// Convert time string (HH:MM) to total minutes
function timeStrToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Determine the status of each booking
export async function fetchAndProcessBookings(requestDate?: string, roomName?: string, printTable: boolean = false): Promise<BookingData> {
  try {
    // Fetch bookings from Supabase, passing any requested date and room name
    const { room, bookings: supabaseBookings } = await fetchBookings(requestDate, roomName);

    addLog("INFO", `Processing ${supabaseBookings.length} bookings from Supabase for room: ${room.name}`);

    // Sort bookings by start time
    supabaseBookings.sort((a, b) => {
      const timeA = a.start_time.split(':').map(Number);
      const timeB = b.start_time.split(':').map(Number);

      // Compare hours
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0];
      }

      // If hours are the same, compare minutes
      return timeA[1] - timeB[1];
    });

    // Get current time in NZ timezone in a reliable way
    const nzTimeString = new Date().toLocaleString("en-NZ", { 
      timeZone: "Pacific/Auckland",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const timeParts = nzTimeString.split(":");
    const nowHours = parseInt(timeParts[0], 10);
    const nowMinutes = parseInt(timeParts[1], 10);
    const nowTotalMinutes = nowHours * 60 + nowMinutes;
    addLog("INFO", `Current time in NZ: ${nowHours}:${nowMinutes.toString().padStart(2, '0')}`);

    // Only keep bookings that end after the current (rounded) time
    const roundedNow = roundToQuarterHour(nowHours, nowMinutes);
    const roundedNowMinutes = roundedNow.hours * 60 + roundedNow.minutes;
    const futureBookings = supabaseBookings.filter(booking => {
      const [endHours, endMinutes] = booking.end_time.split(":").map(Number);
      const bookingEndMinutes = endHours * 60 + endMinutes;
      return bookingEndMinutes > roundedNowMinutes;
    });

    const processedBookings: any[] = [];
    let lastEndMinutes = roundedNowMinutes;
    let lastEndTime = roundedNow.timeStr;
    let timePeriod: "now" | "upcoming" | "later" = "now";
    let isFirstSlot = true;
    let foundNow = false;
    let foundUpcoming = false;

    for (const booking of futureBookings) {
      const [startHours, startMinutes] = booking.start_time.split(":").map(Number);
      const [endHours, endMinutes] = booking.end_time.split(":").map(Number);
      const bookingStartMinutes = startHours * 60 + startMinutes;
      const bookingEndMinutes = endHours * 60 + endMinutes;

      // Insert available slot if there's a gap
      if (bookingStartMinutes > lastEndMinutes) {
        // Assign timePeriod for available slot
        let slotTimePeriod: "now" | "upcoming" | "later" = "later";
        if (!foundNow && nowTotalMinutes >= lastEndMinutes && nowTotalMinutes < bookingStartMinutes) {
          slotTimePeriod = "now";
          foundNow = true;
        } else if (!foundUpcoming && foundNow) {
          slotTimePeriod = "upcoming";
          foundUpcoming = true;
        }
        let minutes_left: number | undefined = undefined;
        if (slotTimePeriod === "now") {
          minutes_left = bookingStartMinutes - nowTotalMinutes;
        }
        processedBookings.push({
          start_time: lastEndTime,
          end_time: booking.start_time,
          status: "available",
          timePeriod: slotTimePeriod,
          timeRange: `${lastEndTime} - ${booking.start_time}`,
          ...(minutes_left !== undefined ? { minutes_left } : {})
        });
        isFirstSlot = false;
      }

      // Assign timePeriod for booking
      let bookingTimePeriod: "now" | "upcoming" | "later" = "later";
      if (!foundNow && nowTotalMinutes >= bookingStartMinutes && nowTotalMinutes < bookingEndMinutes) {
        bookingTimePeriod = "now";
        foundNow = true;
      } else if (!foundUpcoming && foundNow) {
        bookingTimePeriod = "upcoming";
        foundUpcoming = true;
      }
      processedBookings.push({
        name: booking.name,
        creator: booking.creator,
        start_time: booking.start_time,
        end_time: booking.end_time,
        status: "booked",
        timePeriod: bookingTimePeriod,
        timeRange: `${booking.start_time} - ${booking.end_time}`
      });
      lastEndMinutes = bookingEndMinutes;
      lastEndTime = booking.end_time;
      isFirstSlot = false;
    }

    // Get open/close times and restriction from room config
    const roomConfig = roomName ? rooms[roomName] : undefined;
    const restricted = roomConfig?.restricted_hours;
    const openTime = roomConfig?.open_time || "07:00";
    const closeTime = roomConfig?.close_time || "23:00";
    const bookable = roomConfig?.bookable ?? false;

    // If there are no bookings for the day
    if (futureBookings.length === 0) {
      if (restricted) {
        // Available from openTime to closeTime
        processedBookings.push({
          start_time: openTime,
          end_time: closeTime,
          status: "available",
          timePeriod: "now",
          timeRange: `${openTime} - ${closeTime}`
        });
        // Room is closed from closeTime to openTime
        processedBookings.push({
          start_time: closeTime,
          end_time: openTime,
          status: "closed",
          timePeriod: "later",
          timeRange: `${closeTime} - ${openTime}`
        });
      } else {
        // Not restricted: available all day
        processedBookings.push({
          start_time: "00:00",
          end_time: "24:00",
          status: "available",
          timePeriod: "now",
          timeRange: "00:00 - 24:00"
        });
      }
      addLog("INFO", `No bookings for the day. Returning default slots for room: ${roomName}`);
      return {
        room: { ...room, bookable },
        bookings: processedBookings,
        apiStatus: getApiStatus(),
        logs: getLogs(),
      };
    }

    // After last booking, handle available/closed slots based on restriction
    if (restricted) {
      if (lastEndTime !== closeTime) {
        // Determine timePeriod for final available slot
        if (isFirstSlot) {
          timePeriod = "now";
        } else if (timePeriod === "now") {
          timePeriod = "upcoming";
        } else {
          timePeriod = "later";
        }
        let minutes_left: number | undefined = undefined;
        if (timePeriod === "now") {
          minutes_left = timeStrToMinutes(closeTime) - nowTotalMinutes;
        }
        processedBookings.push({
          start_time: lastEndTime,
          end_time: closeTime,
          status: "available",
          timePeriod,
          timeRange: `${lastEndTime} - ${closeTime}`,
          ...(minutes_left !== undefined ? { minutes_left } : {})
        });
      }
      // Add closed slot from closeTime to openTime
      processedBookings.push({
        start_time: closeTime,
        end_time: openTime,
        status: "closed",
        timePeriod: "later",
        timeRange: `${closeTime} - ${openTime}`
      });
    } else {
      // Not restricted: available from last booking to midnight
      if (lastEndTime !== "24:00") {
        processedBookings.push({
          start_time: lastEndTime,
          end_time: "24:00",
          status: "available",
          timePeriod: "later",
          timeRange: `${lastEndTime} - 24:00`
        });
      }
    }

    // Log the results
    addLog("INFO", `Total processed bookings: ${processedBookings.length}`);

    // Count bookings by status and by timePeriod
    const statusCounts = processedBookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const timePeriodCounts = processedBookings.reduce((acc, b) => {
      acc[b.timePeriod] = (acc[b.timePeriod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusString = Object.entries(statusCounts)
      .map(([status, count]) => `${count} ${status.toUpperCase()}`)
      .join(", ");
    const timePeriodString = Object.entries(timePeriodCounts)
      .map(([period, count]) => `${count} ${period.toUpperCase()}`)
      .join(", ");

    addLog("INFO", `Status assignment complete: ${statusString}`);
    addLog("INFO", `Time periods: ${timePeriodString}`);
    addLog("INFO", "Ready to serve API requests");

    // After processing bookings, optionally print as ASCII table
    // (ASCII table output not implemented in this version)

    // Return the processed bookings with API status and logs
    return {
      room: { name: room.name, id: room.id, bookable },
      bookings: processedBookings,
      apiStatus: getApiStatus(),
      logs: getLogs(),
    };
  } catch (error) {
    addLog("ERROR", `Error in fetchAndProcessBookings: ${(error as Error).message}`);
    return {
      room: roomName ? { name: roomName, id: null } : { name: "", id: null },
      bookings: [],
      apiStatus: getApiStatus(),
      logs: getLogs(),
    };
  }
}