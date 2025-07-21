import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates initials from a user's name
 * @param name - The user's full name
 * @returns Formatted initials (e.g., "JD" for "John Doe", "JO" for "John")
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return '';
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    // Single word: return first two characters if available, otherwise first character
    return words[0].substring(0, 2).toUpperCase();
  }
  
  // Multiple words: return first character of first and last word
  const firstInitial = words[0].charAt(0);
  const lastInitial = words[words.length - 1].charAt(0);
  return `${firstInitial}${lastInitial}`.toUpperCase();
}
