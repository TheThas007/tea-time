import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MenuItem } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns 1 to 3 valid product image URLs for a MenuItem
 */
export function getProductImages(product?: MenuItem | null): string[] {
  if (!product) return [];
  const rawList: string[] = [];
  if (Array.isArray(product.imageUrls)) {
    for (const url of product.imageUrls) {
      if (typeof url === "string" && url.trim()) {
        rawList.push(url.trim());
      }
    }
  }
  if (product.imageUrl && typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    const primary = product.imageUrl.trim();
    if (!rawList.includes(primary)) {
      rawList.unshift(primary);
    }
  }
  return rawList.slice(0, 3);
}

/**
 * Formats integer minor units (Sri Lankan cents: 1 LKR = 100 cents) into Sri Lankan Rupees (Rs.)
 * Example: 25000 -> "Rs. 250"
 */
export function formatRupees(amountMinor: number): string {
  if (typeof amountMinor !== "number" || isNaN(amountMinor)) {
    return "Rs. 0";
  }
  const rupees = Math.round(amountMinor / 100);
  return `Rs. ${rupees.toLocaleString("en-LK")}`;
}

/**
 * Formats time difference like "Just now", "2 min ago", "18 min ago"
 * Matching the exact visual style in the UI mockup.
 */
export function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return "Just now";

  let date: Date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 45) return "Just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  return date.toLocaleDateString();
}

/**
 * Formats an order date like "Mon, 28 Apr 2025 10:24 AM"
 */
export function formatOrderDateTime(date: Date = new Date()): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Generates an idempotency key using standard crypto
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "idem_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

