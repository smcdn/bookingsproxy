import { useState } from "react";
import { ApiStatus, Log } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface SystemMonitoringProps {
  apiStatus?: ApiStatus;
  logs: Log[];
  isLoading: boolean;
  onRefreshToken: () => void;
}

export default function SystemMonitoring({ apiStatus, logs, isLoading, onRefreshToken }: SystemMonitoringProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  
  const formatDate = (date: string) => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* API Status & Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">API Configuration</h2>
        
        {isLoading ? (
          <>
            <div className="mb-4">
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-full" />
            </div>
            <Skeleton className="h-24 w-full mb-4" />
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className={`material-icons text-${apiStatus?.authenticated ? 'success' : 'error'} mr-2`}>
                  {apiStatus?.authenticated ? 'check_circle' : 'error'}
                </span>
                <span className="font-medium">Authentication Status:</span>
                <span className={`ml-2 text-${apiStatus?.authenticated ? 'success' : 'error'}`}>
                  {apiStatus?.authenticated ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
              <div className="flex items-center mb-2">
                <span className={`material-icons text-${apiStatus?.tokenValid ? 'success' : 'error'} mr-2`}>
                  {apiStatus?.tokenValid ? 'check_circle' : 'error'}
                </span>
                <span className="font-medium">Token Status:</span>
                <span className={`ml-2 text-${apiStatus?.tokenValid ? 'success' : 'error'}`}>
                  {apiStatus?.tokenValid 
                    ? `Valid (expires in ${apiStatus.tokenExpiresIn})` 
                    : 'Invalid or Expired'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="material-icons text-success mr-2">check_circle</span>
                <span className="font-medium">Room Filter:</span>
                <span className="ml-2">Small Tutorial Room</span>
              </div>
            </div>
            
            <div className="bg-light-gray rounded p-3 mb-4">
              <div className="font-medium mb-2 text-sm">Endpoint URL</div>
              <div className="code-block text-xs break-all text-dark-gray">
                {`https://atjmvjmbygrkwxchfxzl.supabase.co/rest/v1/bookings?select=*&order=start_time.asc&date=like.${formatDate(new Date().toISOString())}&room=eq.Small Tutorial Room`}
              </div>
            </div>
          </>
        )}
        
        <div className="flex justify-end">
          <Button
            className="px-4 py-2 bg-primary text-white rounded text-sm flex items-center"
            onClick={onRefreshToken}
            disabled={isLoading}
          >
            <span className="material-icons text-sm mr-1">refresh</span>
            Refresh Token
          </Button>
        </div>
      </div>
      
      {/* System Logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">System Logs</h2>
        
        <div className="bg-dark-gray rounded-lg p-4 h-64 overflow-y-auto">
          <div className="code-block text-xs text-white leading-relaxed">
            {isLoading ? (
              Array(8).fill(null).map((_, i) => (
                <div key={i} className="mb-2">
                  <Skeleton className="h-4 w-full bg-gray-700" />
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="text-gray-400">No logs to display</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2">
                  <span className="text-green-400">[{log.timestamp}]</span>{" "}
                  <span className={`text-${log.level === 'INFO' ? 'blue-300' : log.level === 'ERROR' ? 'red-400' : 'yellow-300'}`}>
                    {log.level}
                  </span>{" "}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <div className="text-xs text-neutral">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={() => setAutoScroll(!autoScroll)} 
                className="mr-2"
              />
              Auto-scrolling enabled
            </label>
          </div>
          <button className="text-xs text-primary flex items-center">
            <span className="material-icons text-sm mr-1">clear_all</span>
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}
