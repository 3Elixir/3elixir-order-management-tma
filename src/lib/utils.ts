import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { fromZonedTime } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escapes special characters in a string to make it safe for Telegram MarkdownV2.
 * @param text - The input string.
 * @returns The string with special characters escaped.
 */
export const escapeSpecialChars = (text: string) => {
  const specialChars = /[\]_*[()~`>#+-=|{}.!]/g;
  return text.replace(specialChars, (match) => `\\${match}`);
};

// Helper functions for Singapore timezone handling
const SINGAPORE_TIMEZONE = "Asia/Singapore";

export const createSingaporeDate = (date: Date | null | undefined): Date => {
  if (!date) return new Date();
  
  // Convert the input date to Singapore timezone, then back to UTC for storage
  // This ensures the date/time is treated as Singapore time regardless of user's timezone
  return fromZonedTime(date, SINGAPORE_TIMEZONE);
};
