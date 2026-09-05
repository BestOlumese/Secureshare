import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pulls a message off an unknown thrown value.
 *
 * `catch (e: any)` compiles but lies: a thrown value can be anything, and
 * reading `.message` off a string or null is how a handler turns one failure
 * into two.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
