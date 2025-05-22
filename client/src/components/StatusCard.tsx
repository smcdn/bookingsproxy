import { Booking } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusCardProps {
  status: "now" | "upcoming" | "next" | "then" | "later";
  booking: Booking | null | undefined;
  isLoading: boolean;
}

export default function StatusCard({ status, booking, isLoading }: StatusCardProps) {
  // Status-specific configuration
  const statusConfig = {
    now: {
      color: "status-now",
      icon: "play_arrow",
      label: "NOW",
    },
    upcoming: {
      color: "status-upcoming",
      icon: "event_upcoming",
      label: "UPCOMING",
    },
    next: {
      color: "status-next",
      icon: "arrow_forward",
      label: "NEXT",
    },
    then: {
      color: "status-then",
      icon: "skip_next",
      label: "THEN",
    },
    later: {
      color: "status-later",
      icon: "more_time",
      label: "LATER",
    },
  };

  const config = statusConfig[status];
  
  if (isLoading) {
    return (
      <div className={`border rounded-lg p-4 flex bg-${config.color} bg-opacity-10 border-${config.color} relative`}>
        <div className="mr-3">
          <div className={`w-10 h-10 rounded-full bg-${config.color} flex items-center justify-center`}>
            <span className="material-icons text-white">{config.icon}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className={`text-xs font-medium text-${config.color} mb-1`}>{config.label}</div>
          <Skeleton className="h-5 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2 mb-1" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={`border rounded-lg p-4 flex bg-${config.color} bg-opacity-10 border-${config.color} relative`}>
        <div className="mr-3">
          <div className={`w-10 h-10 rounded-full bg-${config.color} flex items-center justify-center`}>
            <span className="material-icons text-white">{config.icon}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className={`text-xs font-medium text-${config.color} mb-1`}>{config.label}</div>
          <div className="text-sm font-medium mb-1">No bookings {status === "now" ? "currently" : status}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 flex bg-${config.color} bg-opacity-10 border-${config.color} relative`}>
      <div className="mr-3">
        <div className={`w-10 h-10 rounded-full bg-${config.color} flex items-center justify-center`}>
          <span className="material-icons text-white">{config.icon}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className={`text-xs font-medium text-${config.color} mb-1`}>{config.label}</div>
        <div className="text-sm font-medium mb-1">{booking.name}</div>
        <div className="text-xs text-neutral mb-1">
          <span className="material-icons text-xs mr-1">person</span>
          <span>{booking.creator}</span>
        </div>
        <div className="text-xs text-neutral">
          <span className="material-icons text-xs mr-1">schedule</span>
          <span>{booking.timeRange}</span>
        </div>
      </div>
    </div>
  );
}
