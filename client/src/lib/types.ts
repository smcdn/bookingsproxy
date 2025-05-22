export interface Booking {
  id: string;
  name: string;
  creator: string;
  start_time: string;
  end_time: string;
  timeRange: string; // Formatted time range for display
  status: "now" | "upcoming" | "next" | "then" | "later";
}

export interface ApiStatus {
  authenticated: boolean;
  tokenValid: boolean;
  tokenExpiresIn?: string;
  lastFetched?: string;
}

export interface Log {
  timestamp: string;
  level: "INFO" | "ERROR" | "WARN";
  message: string;
}

export interface BookingData {
  bookings: Booking[];
  apiStatus: ApiStatus;
  logs: Log[];
}

export interface SystemStatus {
  color: string;
  text: string;
}

export interface SupabaseAuthResponse {
  access_token: string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  token_type: string;
}

export interface SupabaseBooking {
  uid: string;
  name: string;
  creator: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  all_day?: boolean | null;
  recurring?: string | null;
  created_at?: string;
  participants?: string;
  description?: string;
  creator_uid?: string;
  client?: string;
  type?: string;
}
