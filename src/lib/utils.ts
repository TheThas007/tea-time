import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MenuItem, Category } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns 1 to 3 valid product image URLs for a MenuItem
 */
export function getProductImages(product?: Partial<MenuItem> | null): string[] {
  if (!product) return [];
  const rawList: string[] = [];
  if (Array.isArray(product.imageUrls)) {
    for (const url of product.imageUrls) {
      if (typeof url === "string" && url.trim()) {
        rawList.push(url.trim());
      }
    }
  }
  const primaryCandidates = [product.image, product.imageUrl];
  for (const candidate of primaryCandidates) {
    if (candidate && typeof candidate === "string" && candidate.trim()) {
      const trimmed = candidate.trim();
      if (!rawList.includes(trimmed)) {
        rawList.unshift(trimmed);
      }
    }
  }
  return rawList.slice(0, 3);
}

/**
 * Checks if a menu item belongs to a given category name (case-insensitive)
 */
export function productMatchesCategory(
  product: Partial<MenuItem>,
  categoryName: string
): boolean {
  const target = categoryName.trim().toLowerCase();
  if (!target || target === "all") return true;
  if (product.category && product.category.trim().toLowerCase() === target) {
    return true;
  }
  if (Array.isArray(product.categories)) {
    return product.categories.some((c) => c.trim().toLowerCase() === target);
  }
  return false;
}

export const SUGAR_SPOON_OPTIONS = [
  { value: 0, pill: "No", label: "No sugar" },
  { value: 1, pill: "1 tsp", label: "1 tea spoon sugar" },
  { value: 2, pill: "2 tsp", label: "2 spoons sugar" },
  { value: 3, pill: "3 tsp", label: "3 spoons sugar" },
  { value: 4, pill: "4 tsp", label: "4 spoons sugar" },
  { value: 5, pill: "5 tsp", label: "5 spoons sugar" },
] as const;

/**
 * Returns true if the menu item belongs to Coffee & Milk Tea or Non-Milk Tea
 */
export function supportsSugarSelection(product?: Partial<MenuItem> | null): boolean {
  if (!product) return false;
  return (
    productMatchesCategory(product, "Coffee & Milk Tea") ||
    productMatchesCategory(product, "Non-Milk Tea")
  );
}

/**
 * Formats a sugar spoon count (0..5) into a readable café instruction
 */
export function formatSugarLabel(spoons?: number | null): string {
  if (typeof spoons !== "number" || isNaN(spoons)) return "";
  if (spoons === 0) return "No sugar";
  if (spoons === 1) return "1 tea spoon sugar";
  return `${spoons} spoons sugar`;
}

const LEGACY_DEMO_CATEGORY_IDS = new Set([
  "cat_tea",
  "cat_coffee",
  "cat_snacks",
  "cat_desserts",
]);

/**
 * Merges live Firestore menu documents with canonical seed items without duplicates or legacy demo items.
 */
export function mergeMenuWithSeed(
  firestoreDocs: MenuItem[],
  seedItems: MenuItem[]
): MenuItem[] {
  const seedIds = new Set(seedItems.map((s) => s.id));
  const fsMap = new Map<string, MenuItem>();

  for (const docItem of firestoreDocs) {
    if (!docItem || !docItem.id) continue;
    // Ignore obsolete pre-integration demo records
    if (docItem.id.startsWith("prod_") && !seedIds.has(docItem.id)) continue;
    if (
      typeof docItem.imageUrl === "string" &&
      docItem.imageUrl.includes("images.unsplash.com") &&
      !seedIds.has(docItem.id)
    ) {
      continue;
    }
    fsMap.set(docItem.id, docItem);
  }

  const merged: MenuItem[] = [];
  for (const seed of seedItems) {
    const override = fsMap.get(seed.id) as (MenuItem & { isDeleted?: boolean }) | undefined;
    if (override) {
      fsMap.delete(seed.id);
      if (override.isDeleted) continue;
      const seedImgs = seed.imageUrls || [];
      const ovImgs = Array.isArray(override.imageUrls) ? override.imageUrls.filter(Boolean) : [];
      const isSubsetOfSeed =
        ovImgs.length < seedImgs.length && ovImgs.every((u) => seedImgs.includes(u));
      const resolvedImage = override.image?.trim() ? override.image : seed.image;
      const resolvedImageUrl = override.imageUrl?.trim() ? override.imageUrl : seed.imageUrl;
      merged.push({
        ...seed,
        ...override,
        image: resolvedImage,
        imageUrl: resolvedImageUrl,
        imageUrls: isSubsetOfSeed ? seedImgs : ovImgs.length > 0 ? ovImgs : seedImgs,
        imageMatchStatus:
          override.image?.trim() || override.imageUrl?.trim()
            ? override.imageMatchStatus
            : seed.imageMatchStatus,
      });
    } else {
      merged.push(seed);
    }
  }

  for (const extra of fsMap.values()) {
    if ((extra as MenuItem & { isDeleted?: boolean }).isDeleted) continue;
    merged.push(extra);
  }

  merged.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  return merged;
}

/**
 * Merges live Firestore category documents with the 15 official categories, ignoring legacy demo categories.
 */
export function mergeCategoriesWithSeed(
  firestoreCats: Category[],
  seedCats: Category[]
): Category[] {
  const seedIdSet = new Set(seedCats.map((c) => c.id));
  const byId = new Map<string, Category>();
  const byName = new Map<string, Category>();

  for (const cat of firestoreCats) {
    if (!cat || !cat.name) continue;
    if (LEGACY_DEMO_CATEGORY_IDS.has(cat.id) && !seedIdSet.has(cat.id)) continue;
    const cleanedIcon =
      typeof cat.iconUrl === "string" && cat.iconUrl.includes("images.unsplash.com")
        ? ""
        : cat.iconUrl;
    const cleaned = { ...cat, iconUrl: cleanedIcon };
    if (cleaned.id) byId.set(cleaned.id, cleaned);
    byName.set(cleaned.name.trim().toLowerCase(), cleaned);
  }

  const usedNames = new Set<string>();
  const merged: Category[] = [];

  for (const seed of seedCats) {
    const lower = seed.name.trim().toLowerCase();
    const override = (byId.get(seed.id) || byName.get(lower)) as
      | (Category & { isDeleted?: boolean })
      | undefined;
    usedNames.add(lower);
    if (override) {
      if (override.isDeleted) continue;
      merged.push({
        ...seed,
        ...override,
        iconUrl: override.iconUrl?.trim() ? override.iconUrl : seed.iconUrl,
      });
    } else {
      merged.push(seed);
    }
  }

  for (const extra of firestoreCats) {
    if (!extra || !extra.name) continue;
    if (LEGACY_DEMO_CATEGORY_IDS.has(extra.id) && !seedIdSet.has(extra.id)) continue;
    const lower = extra.name.trim().toLowerCase();
    if (usedNames.has(lower)) continue;
    if ((extra as Category & { isDeleted?: boolean }).isDeleted) continue;
    usedNames.add(lower);
    merged.push(extra);
  }

  merged.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  return merged;
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

