import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatGameTime = (dateString: string | undefined): string => {
  if (!dateString) return "TBD";
  
  const date = new Date(dateString);
  
  // Check if the date is today
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear();
  
  // Check if the date is tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.getDate() === tomorrow.getDate() && 
                      date.getMonth() === tomorrow.getMonth() && 
                      date.getFullYear() === tomorrow.getFullYear();
  
  // Format the time
  const timeString = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format the date based on whether it's today, tomorrow, or another day
  if (isToday) {
    return `Today, ${timeString}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${timeString}`;
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
};

export const formatOdds = (odds: number | undefined): string => {
  if (odds === undefined) return "N/A";
  
  // Format American odds with +/- sign
  if (odds > 0) {
    return `+${odds}`;
  } else {
    return `${odds}`;
  }
};

export const calculateRefreshInterval = (gameTime: Date): number => {
  const now = new Date();
  const msUntilGame = gameTime.getTime() - now.getTime();
  
  // If next game is more than 12 hours away, check every 4 hours
  if (msUntilGame > 12 * 60 * 60 * 1000) {
    return 4 * 60 * 60 * 1000; // 4 hours
  }
  // If next game is 6-12 hours away, check every 2 hours
  else if (msUntilGame > 6 * 60 * 60 * 1000) {
    return 2 * 60 * 60 * 1000; // 2 hours
  }
  // If next game is 1-6 hours away, check every hour
  else if (msUntilGame > 60 * 60 * 1000) {
    return 60 * 60 * 1000; // 1 hour
  }
  // If next game is less than 1 hour away, check every 15 minutes
  else {
    return 15 * 60 * 1000; // 15 minutes
  }
};

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
} 