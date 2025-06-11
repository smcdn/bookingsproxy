export interface SupabaseAuthResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  expires_at?: number;
}

export interface SupabaseBooking {
  uid: string;
  name: string;
  creator: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
}

export interface Log {
  timestamp: string;
  level: "INFO" | "ERROR" | "WARN";
  message: string;
}

// Determine the status of each booking
export type BookingData = {
  room: { name: string; id: number | null };
  bookings: any[];
  apiStatus: any;
  logs: any[];
};
