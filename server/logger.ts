import { Log } from "./lib/types";

const logs: Log[] = [];

export function addLog(
  level: "INFO" | "ERROR" | "WARN",
  message: string,
): void {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

  const timestamp = `${date} ${hours}:${minutes}:${seconds}`;

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

export function getLogs(): Log[] {
  return [...logs];
}
