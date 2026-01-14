import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a string for accent-insensitive search
 * Converts "café" to "cafe", "Élève" to "Eleve", etc.
 */
export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Check if a string matches a search query (accent-insensitive)
 */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return normalizeString(text).includes(normalizeString(query));
}
