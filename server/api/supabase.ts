import axios from "axios";
import { SupabaseAuthResponse, SupabaseBooking, Log } from "@/lib/types";

// Cache for the supabase token
let tokenCache: {
  access_token: string;
  expires_at: number;
  refresh_token: string;
} | null = null;

const logs: Log[] = [];

// Helper to log messages
export function addLog(
  level: "INFO" | "ERROR" | "WARN",
  message: string,
): void {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

  const timestamp = `${hours}:${minutes}:${seconds}`;

  logs.push({
    timestamp,
    level,
    message,
  });

  // Keep logs limited to last 100 entries
  if (logs.length > 100) {
    logs.shift();
  }

  // Also log to console for debugging
  console.log(`[${level}] ${timestamp}: ${message}`);
}

// Get all logs
export function getLogs(): Log[] {
  return [...logs];
}

// Get Supabase URL and API key from environment variables
import { config } from "../config";
//import { url } from "inspector";

const getSupabaseConfig = () => {
  return {
    url: config.supabase.url,
    key: config.supabase.key,
    email: config.supabase.email,
    password: config.supabase.password,
  };

};

// Authenticate with Supabase and get a token
export async function authenticateWithSupabase(): Promise<SupabaseAuthResponse> {
  try {
    const { url, email, password, key } = getSupabaseConfig();

    addLog("INFO", "Requesting authentication token from Supabase");

    const response = await axios.post(
      `${url}/auth/v1/token?grant_type=password`,
      {
        email,
        password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: key,
        },
      },
    );

    // Calculate expiration time
    const expiresAt = Date.now() + response.data.expires_in * 1000;

    // Cache the token
    tokenCache = {
      access_token: response.data.access_token,
      expires_at: expiresAt,
      refresh_token: response.data.refresh_token,
    };

    addLog("INFO", "Successfully authenticated with Supabase");
    addLog("INFO", "Token received and stored");

    return {
      ...response.data,
      expires_at: expiresAt,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      addLog(
        "ERROR",
        `Authentication failed: ${error.message}. Response: ${JSON.stringify(error.response?.data || {})}`,
      );
    } else {
      addLog("ERROR", `Authentication failed: ${(error as Error).message}`);
    }
    throw new Error(`Authentication failed: ${(error as Error).message}`);
  }
}

// Get a valid Supabase token, refreshing if necessary
export async function getSupabaseToken(): Promise<string> {
  // If we have a token and it's not expired, return it
  if (tokenCache && tokenCache.expires_at > Date.now() + 60000) {
    // More than a minute left, token is still valid
    return tokenCache.access_token;
  }

  // If we have a refresh token, try to refresh
  if (tokenCache && tokenCache.refresh_token) {
    try {
      const { url, key } = getSupabaseConfig();

      addLog("INFO", "Refreshing Supabase token");

      const response = await axios.post(
        `${url}/auth/v1/token?grant_type=refresh_token`,
        {
          refresh_token: tokenCache.refresh_token,
        },
        {
          headers: {
            "Content-Type": "application/json",
            apikey: key,
          },
        },
      );

      // Calculate expiration time
      const expiresAt = Date.now() + response.data.expires_in * 1000;

      // Update the cached token
      tokenCache = {
        access_token: response.data.access_token,
        expires_at: expiresAt,
        refresh_token: response.data.refresh_token,
      };

      addLog("INFO", "Token refreshed successfully");

      return tokenCache.access_token;
    } catch (error) {
      addLog("ERROR", `Token refresh failed: ${(error as Error).message}`);
      // If refresh fails, try full authentication
    }
  }

  // If we don't have a token or refresh failed, authenticate
  const authResponse = await authenticateWithSupabase();
  return authResponse.access_token;
}

// Format date for Supabase query
function formatDateForQuery(date: Date): string {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    addLog("ERROR", `Error formatting date: ${(error as Error).message}`);

    // Fallback to today's date using direct string manipulation
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
}

// Fetch bookings from Supabase
export async function fetchBookings(
  requestDate?: string,
): Promise<SupabaseBooking[]> {
  try {
    const { url, key } = getSupabaseConfig();
    const token = await getSupabaseToken();

    // Use the provided date or default to current date in NZ timezone
    let queryDate: string;

    if (requestDate) {
      // Use the date provided in the request
      queryDate = requestDate;
      addLog("INFO", `Using provided date: ${queryDate}`);
    } else {
      // Default to current date in New Zealand timezone
      const now = new Date();
      queryDate = now
        .toLocaleDateString("en-NZ", {
          timeZone: "Pacific/Auckland",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-");
      addLog("INFO", `Using current date (NZ): ${queryDate}`);
    }

    addLog("INFO", `Fetching bookings for Small Tutorial Room on ${queryDate}`);

    const response = await axios.get(
      `${url}/rest/v1/bookings?select=*&order=start_time.asc&date=eq.${queryDate}&room=eq.Small Tutorial Room`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // Log the first booking to understand the structure
    if (response.data && response.data.length > 0) {
      addLog(
        "INFO",
        `First booking raw data: ${JSON.stringify(response.data[0])}`,
      );
    }

    addLog("INFO", `Received ${response.data.length} bookings for today`);

    // If no data returned, show available slot from now to 23:00
    if (!response.data || response.data.length === 0) {
      const now = new Date();
      const currentHour = now.getHours();
      const today = queryDate;
      const availableBooking = [{
        uid: "available-slot",
        name: "Available",
        creator: "System",
        date: today,
        start_time: `${String(currentHour).padStart(2, "0")}:00`,
        end_time: "23:00",
        room: "Small Tutorial Room",
      }];
      addLog(
        "INFO",
        `No bookings found for today, showing available slot from ${String(currentHour).padStart(2, "0")}:00 to 23:00`,
      );
      return availableBooking;
    }

    // Normalize the response to ensure all required fields are present
    const normalizedData = response.data.map((booking: any) => {
      return {
        uid:
          booking.uid ||
          `booking-${Math.random().toString(36).substring(2, 9)}`,
        name: booking.name || "Untitled Booking",
        creator: booking.creator || "Unknown",
        date: booking.date || queryDate,
        start_time: booking.start_time || "00:00",
        end_time: booking.end_time || "23:59",
        room: booking.room || "Small Tutorial Room",
      };
    });

    return normalizedData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      addLog(
        "ERROR",
        `Failed to fetch bookings: ${error.message}. Response: ${JSON.stringify(error.response?.data || {})}`,
      );
    } else {
      addLog("ERROR", `Failed to fetch bookings: ${(error as Error).message}`);
    }
    throw new Error(`Failed to fetch bookings: ${(error as Error).message}`);
  }
}

// Get API status information
export function getApiStatus() {
  if (!tokenCache) {
    return {
      authenticated: false,
      tokenValid: false,
    };
  }

  const now = Date.now();
  const isValid = tokenCache.expires_at > now;

  let expiresIn = "";
  if (isValid) {
    const diffMs = tokenCache.expires_at - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    expiresIn = `${hours}h ${minutes}m`;
  }

  return {
    authenticated: true,
    tokenValid: isValid,
    tokenExpiresIn: expiresIn,
  };
}
