import { Booking, BookingData, SupabaseBooking } from "@/lib/types";
import { fetchBookings, getApiStatus, getLogs, addLog } from "./supabse";

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

// Determine the status of each booking
export async function fetchAndProcessBookings(requestDate?: string): Promise<BookingData> {
  try {
    // Fetch bookings from Supabase, passing any requested date
    const supabaseBookings = await fetchBookings(requestDate);

    addLog("INFO", `Processing ${supabaseBookings.length} bookings from Supabase`);

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

    // Parse hours and minutes from the time string (format should be HH:MM)
    const timeParts = nzTimeString.split(":");
    const nowHours = parseInt(timeParts[0], 10);
    const nowMinutes = parseInt(timeParts[1], 10);

    addLog("INFO", `Current time in NZ: ${nowHours}:${nowMinutes.toString().padStart(2, '0')}`);

    // Process bookings to determine status
    const processedBookings: Booking[] = [];
    let foundNowOrUpcoming = false;
    let firstStatusIsNow = false;

    // First pass - identify "now" or "upcoming"
    for (const booking of supabaseBookings) {
      try {
        // Get start and end times as hours and minutes
        const [startHoursStr, startMinutesStr] = booking.start_time.split(':');
        const [endHoursStr, endMinutesStr] = booking.end_time.split(':');

        const startHours = parseInt(startHoursStr, 10);
        const startMinutes = parseInt(startMinutesStr, 10);
        const endHours = parseInt(endHoursStr, 10);
        const endMinutes = parseInt(endMinutesStr, 10);

        // Convert to total minutes for easier comparison
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const nowTotalMinutes = nowHours * 60 + nowMinutes;

        addLog("INFO", `Processing booking: ${booking.uid}, Start: ${startHours}:${startMinutes}, End: ${endHours}:${endMinutes}, Now: ${nowHours}:${nowMinutes}`);

        // Skip past bookings
        if (endTotalMinutes < nowTotalMinutes) {
          addLog("INFO", `Skipping past booking: ${booking.uid}`);
          continue;
        }

        if (!foundNowOrUpcoming) {
          if (startTotalMinutes <= nowTotalMinutes && endTotalMinutes > nowTotalMinutes) {
            // Current booking
            addLog("INFO", `Found NOW booking: ${booking.uid}`);
            processedBookings.push({
              id: booking.uid,
              name: booking.name,
              creator: booking.creator,
              start_time: booking.start_time,
              end_time: booking.end_time,
              status: "now",
              timeRange: `${booking.start_time} - ${booking.end_time}`
            });
            foundNowOrUpcoming = true;
            firstStatusIsNow = true;
          } else if (startTotalMinutes > nowTotalMinutes) {
            // If no current booking, add "Room available" slot
            if (!firstStatusIsNow) {
              const currentHourStr = nowHours.toString().padStart(2, '0');
              const endTimeStr = booking.start_time;
              processedBookings.push({
                id: 'available-now',
                name: 'Room available',
                creator: '',
                start_time: `${currentHourStr}:00`,
                end_time: endTimeStr,
                status: "now",
                timeRange: `${currentHourStr}:00 - ${endTimeStr}`
              });
              firstStatusIsNow = true;
            }
            // Next upcoming booking
            addLog("INFO", `Found UPCOMING booking: ${booking.uid}`);
            processedBookings.push({
              id: booking.uid,
              name: booking.name,
              creator: booking.creator,
              start_time: booking.start_time,
              end_time: booking.end_time,
              status: "upcoming",
              timeRange: `${booking.start_time} - ${booking.end_time}`
            });
            foundNowOrUpcoming = true;
          }
        }
      } catch (error) {
        addLog("ERROR", `Error processing booking: ${(error as Error).message}`);
      }
    }

    // Second pass - identify "next"/"then" and "later"
    let foundNextOrThen = false;

    for (const booking of supabaseBookings) {
      try {
        // Skip bookings we've already processed
        if (processedBookings.some(b => b.id === booking.uid)) {
          continue;
        }

        // Get start and end times as hours and minutes
        const [startHoursStr, startMinutesStr] = booking.start_time.split(':');
        const [endHoursStr, endMinutesStr] = booking.end_time.split(':');

        const startHours = parseInt(startHoursStr, 10);
        const startMinutes = parseInt(startMinutesStr, 10);
        const endHours = parseInt(endHoursStr, 10);
        const endMinutes = parseInt(endMinutesStr, 10);

        // Convert to total minutes for easier comparison
        const endTotalMinutes = endHours * 60 + endMinutes;
        const nowTotalMinutes = nowHours * 60 + nowMinutes;

        // Skip past bookings
        if (endTotalMinutes < nowTotalMinutes) {
          continue;
        }

        if (!foundNextOrThen && foundNowOrUpcoming) {
          // First booking after the now/upcoming one
          const status = firstStatusIsNow ? "next" : "then";
          addLog("INFO", `Found ${status.toUpperCase()} booking: ${booking.uid}`);

          processedBookings.push({
            id: booking.uid,
            name: booking.name,
            creator: booking.creator,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: status as "next" | "then",
            timeRange: `${booking.start_time} - ${booking.end_time}`
          });
          foundNextOrThen = true;
        } else {
          // Any remaining future bookings
          addLog("INFO", `Found LATER booking: ${booking.uid}`);

          processedBookings.push({
            id: booking.uid,
            name: booking.name,
            creator: booking.creator,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: "later",
            timeRange: `${booking.start_time} - ${booking.end_time}`
          });
        }
      } catch (error) {
        addLog("ERROR", `Error in second pass: ${(error as Error).message}`);
      }
    }

    // Log the results
    addLog("INFO", `Total processed bookings: ${processedBookings.length}`);

    const statusCounts = {
      now: processedBookings.filter(b => b.status === "now").length,
      upcoming: processedBookings.filter(b => b.status === "upcoming").length,
      next: processedBookings.filter(b => b.status === "next").length,
      then: processedBookings.filter(b => b.status === "then").length,
      later: processedBookings.filter(b => b.status === "later").length,
    };

    const statusString = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => `${count} ${status.toUpperCase()}`)
      .join(", ");

    addLog("INFO", `Status assignment complete: ${statusString}`);
    addLog("INFO", "Ready to serve API requests");

    // Return the processed bookings with API status and logs
    return {
      bookings: processedBookings,
      apiStatus: getApiStatus(),
      logs: getLogs(),
    };
  } catch (error) {
    addLog("ERROR", `Error in fetchAndProcessBookings: ${(error as Error).message}`);

    // Return empty data with error status
    return {
      bookings: [],
      apiStatus: getApiStatus(),
      logs: getLogs(),
    };
  }
}