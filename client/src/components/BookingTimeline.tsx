import { Booking } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingTimelineProps {
  bookings: Booking[];
  isLoading: boolean;
}

export default function BookingTimeline({ bookings, isLoading }: BookingTimelineProps) {
  // Status-specific configuration
  const statusConfig = {
    now: {
      color: "status-now",
      label: "NOW",
    },
    upcoming: {
      color: "status-upcoming",
      label: "UPCOMING",
    },
    next: {
      color: "status-next",
      label: "NEXT",
    },
    then: {
      color: "status-then",
      label: "THEN",
    },
    later: {
      color: "status-later",
      label: "LATER",
    },
  };

  const renderSkeletons = () => {
    return Array(3).fill(null).map((_, index) => (
      <div key={index} className="mb-6 pl-8 relative">
        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center z-10">
          <span className="status-dot bg-white"></span>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    ));
  };

  return (
    <div className="mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Today's Booking Timeline</h2>
        
        <div className="relative">
          <div className="timeline-connector"></div>
          
          {isLoading ? renderSkeletons() : (
            bookings.length === 0 ? (
              <div className="pl-8 py-4 text-center text-gray-500">
                No bookings scheduled for today
              </div>
            ) : (
              bookings.map((booking, index) => {
                const config = statusConfig[booking.status as keyof typeof statusConfig];
                
                return (
                  <div key={index} className={`mb-${index === bookings.length - 1 ? 0 : 6} pl-8 relative`}>
                    <div className={`absolute left-0 top-1 w-8 h-8 rounded-full bg-${config.color} flex items-center justify-center z-10`}>
                      <span className="status-dot bg-white"></span>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm font-medium">{booking.name}</div>
                          <div className="text-xs text-neutral">{booking.creator}</div>
                        </div>
                        <div className={`text-xs bg-${config.color} text-white px-2 py-1 rounded`}>
                          {config.label}
                        </div>
                      </div>
                      <div className="text-xs text-neutral">
                        <span className="material-icons text-xs mr-1">schedule</span>
                        {booking.timeRange}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
