import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import StatusCard from "@/components/StatusCard";
import BookingTimeline from "@/components/BookingTimeline";
import SystemMonitoring from "@/components/SystemMonitoring";
import { BookingData, SystemStatus } from "@/lib/types";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    color: "bg-success",
    text: "System Online",
  });

  // Fetch booking data
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery<BookingData>({
    queryKey: ["/api/bookings"],
  });

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      setCurrentTime(now.toLocaleString('en-NZ', options) + ' NZST');
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Update system status if error occurs
  useEffect(() => {
    if (error) {
      setSystemStatus({
        color: "bg-error",
        text: "System Error",
      });
    } else {
      setSystemStatus({
        color: "bg-success",
        text: "System Online",
      });
    }
  }, [error]);

  // Calculate time since last update
  const getLastUpdated = () => {
    if (!dataUpdatedAt) return "Never";
    
    const now = new Date();
    const updated = new Date(dataUpdatedAt);
    const diffInMinutes = Math.floor((now.getTime() - updated.getTime()) / 60000);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    return `${diffInMinutes} minutes ago`;
  };

  const getStatusData = (status: string) => {
    if (!data?.bookings) return null;
    return data.bookings.find(booking => booking.status === status);
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="material-icons text-primary mr-2">meeting_room</span>
            <h1 className="text-xl font-medium">Small Tutorial Room - API Status</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className={`inline-block w-3 h-3 rounded-full ${systemStatus.color} mr-2`}></span>
              <span className="text-sm">{systemStatus.text}</span>
            </div>
            
            <div className="flex items-center">
              <span className="material-icons text-neutral mr-1 text-sm">schedule</span>
              <span className="text-sm text-neutral">{currentTime}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Room Booking Status</h2>
              <div className="flex items-center">
                <span className="material-icons text-neutral mr-1 text-sm">update</span>
                <span className="text-sm text-neutral">Last updated: {getLastUpdated()}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard 
                status="now" 
                booking={getStatusData("now")} 
                isLoading={isLoading} 
              />
              <StatusCard 
                status={data?.bookings.some(b => b.status === "now") ? "next" : "upcoming"} 
                booking={getStatusData(data?.bookings.some(b => b.status === "now") ? "next" : "upcoming")} 
                isLoading={isLoading} 
              />
              <StatusCard 
                status="later" 
                booking={getStatusData("later")} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        </div>
        
        <BookingTimeline 
          bookings={data?.bookings || []} 
          isLoading={isLoading} 
        />
        
        <SystemMonitoring 
          apiStatus={data?.apiStatus} 
          isLoading={isLoading} 
          logs={data?.logs || []} 
          onRefreshToken={() => refetch()} 
        />
      </main>
      
      <footer className="bg-white border-t mt-10 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-neutral">
          Small Tutorial Room Booking API Status • Current Time: {currentTime}
        </div>
      </footer>
    </div>
  );
}
