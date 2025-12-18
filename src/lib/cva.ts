import { cva as cvaFn, type VariantProps } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cva(...args: Parameters<typeof cvaFn>) {
  return cvaFn(...args);
}

export function cx(...inputs: ClassValue[]) {
  return cn(...inputs);
}

export type { VariantProps };

