import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
