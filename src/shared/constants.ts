import { PackageId, SubscriptionPackage, PlatformPublicConfig } from "../types";

export const PLATFORM_NAME = "Menyo";
export const PLATFORM_OPERATOR = "AEVONIX";
export const PLATFORM_TITLE = "Menyo — by AEVONIX";
export const PLATFORM_TAGLINE = "Your Menu. One Scan.";
export const LEGACY_TEATIME_BUSINESS_ID = "biz_teatime";
export const LEGACY_TEATIME_SLUG = "teatime";

export const TEATIME_DEFAULT_THEME = {
  primaryColor: "#2C190E", // Espresso
  accentColor: "#E8B64F", // Gold
  backgroundColor: "#FAF7F0", // Cream
  textColor: "#301C10", // Dark Brown Text
  headerBackgroundColor: "#2C190E", // Dark Espresso Header
  headerTextColor: "#FAF7F0", // Cream Header Text
};

export const MENYO_DEFAULT_THEME = {
  primaryColor: "#7BBBFF", // Sky Blue
  accentColor: "#B8A9FF", // Lavender
  backgroundColor: "#F2FDFF", // Light Cyan/Blue Background
  textColor: "#050F2A", // Navy
  headerBackgroundColor: "#050F2A", // Navy Header
  headerTextColor: "#F2FDFF", // Light Header Text
};

/**
 * Reserved route & system identifiers that can NEVER be assigned as a business slug.
 */
export const RESERVED_BUSINESS_SLUGS = new Set<string>([
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "dashboard",
  "admin",
  "super-admin",
  "superadmin",
  "api",
  "rpc",
  "assets",
  "images",
  "static",
  "public",
  "menu",
  "orders",
  "tables",
  "categories",
  "products",
  "settings",
  "billing",
  "subscriptions",
  "payments",
  "bootstrap",
  "change-password",
  "reset-password",
  "support",
  "contact",
  "pricing",
  "terms",
  "privacy",
  "health",
  "status",
  "aevonix",
  "www",
  "app",
  "root",
  "null",
  "undefined",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: "2_days_trial",
    name: "2-Day Free Trial",
    durationMonths: null,
    isLifetime: false,
    priceMinor: 0,
    priceDisplay: 0,
    priceRupees: 0,
    priceUsdDisplay: "Free",
    currency: "LKR",
    description: "48-hour unrestricted free trial for new dining venues to explore Menyo.",
    scopeNote: "Applies to one business profile for 2 calendar days.",
    active: true,
    sortOrder: 0,
  },
  {
    id: "monthly",
    name: "Monthly",
    durationMonths: 1,
    isLifetime: false,
    priceMinor: 200_000, // Rs. 2,000
    priceDisplay: 2_000,
    priceRupees: 2_000,
    priceUsdDisplay: "$7 USD",
    currency: "LKR",
    description:
      "Flexible month-to-month plan. Perfect for new restaurants getting started.",
    scopeNote: "Applies to one business profile and one branch.",
    active: true,
    sortOrder: 1,
  },
  {
    id: "6_months",
    name: "6 Months",
    durationMonths: 6,
    isLifetime: false,
    priceMinor: 1_000_000, // Rs. 10,000
    priceDisplay: 10_000,
    priceRupees: 10_000,
    priceUsdDisplay: "$33 USD",
    currency: "LKR",
    description:
      "Save Rs. 2,000 compared to monthly billing. Most popular choice for growing cafés.",
    scopeNote: "Applies to one business profile and one branch.",
    isPopular: true,
    savingsDisplay: "Save Rs. 2,000",
    upfrontNote: "Rs. 10,000 paid upfront for 6 months (~Rs. 1,667/mo)",
    active: true,
    sortOrder: 2,
  },
  {
    id: "yearly",
    name: "Yearly",
    durationMonths: 12,
    isLifetime: false,
    priceMinor: 1_800_000, // Rs. 18,000
    priceDisplay: 18_000,
    priceRupees: 18_000,
    priceUsdDisplay: "$60 USD",
    currency: "LKR",
    description:
      "Save Rs. 6,000 compared to monthly billing. Best value for established restaurants.",
    scopeNote: "Applies to one business profile and one branch.",
    savingsDisplay: "Save Rs. 6,000",
    upfrontNote: "Rs. 18,000 paid upfront for 12 months (~Rs. 1,500/mo)",
    active: true,
    sortOrder: 3,
  },
  {
    id: "3_months",
    name: "3 Months (Legacy)",
    durationMonths: 3,
    isLifetime: false,
    priceMinor: 600_000, // Rs. 6,000
    priceDisplay: 6_000,
    priceRupees: 6_000,
    priceUsdDisplay: "$20 USD",
    currency: "LKR",
    description:
      "Legacy 3-month package. Maintained for existing customer records.",
    scopeNote: "Applies to one business profile and one branch.",
    isLegacy: true,
    active: false,
    sortOrder: 98,
  },
  {
    id: "lifetime",
    name: "Lifetime (Legacy)",
    durationMonths: null,
    isLifetime: true,
    priceMinor: 3_000_000, // Rs. 30,000
    priceDisplay: 30_000,
    priceRupees: 30_000,
    priceUsdDisplay: "$100 USD",
    currency: "LKR",
    description:
      "Legacy single-branch lifetime access. Preserved with full lifetime entitlement.",
    scopeNote: "Applies to one business profile and one branch.",
    isLegacy: true,
    active: false,
    sortOrder: 99,
  },
];

export const DEFAULT_PLATFORM_PUBLIC_CONFIG: PlatformPublicConfig = {
  platformName: "Menyo",
  productTitle: "Menyo — by AEVONIX",
  tagline: "Your Menu. One Scan.",
  supportEmail: "support@aevonix.lk",
  supportPhone: "076 484 7081",
  supportWhatsApp: "94764847081",
  packages: DEFAULT_PACKAGES,
};

export function isValidPackageId(id: string): id is PackageId {
  return (
    id === "monthly" ||
    id === "6_months" ||
    id === "yearly" ||
    id === "3_months" ||
    id === "lifetime"
  );
}

/**
 * Normalizes a candidate business slug into lowercase alphanumeric + single hyphens.
 */
export function normalizeBusinessSlug(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateBusinessSlug(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeBusinessSlug(raw);
  if (!normalized) {
    return { valid: false, normalized, error: "Business slug is required." };
  }
  if (normalized.length < 3 || normalized.length > 40) {
    return {
      valid: false,
      normalized,
      error: "Business slug must be between 3 and 40 characters.",
    };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Slug may only contain lowercase letters, numbers, and single hyphens.",
    };
  }
  if (RESERVED_BUSINESS_SLUGS.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `"${normalized}" is a reserved platform route name and cannot be used.`,
    };
  }
  return { valid: true, normalized };
}

/**
 * Normalizes an account username (lowercase letters, digits, dots, underscores, hyphens).
 */
export function normalizeUsername(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

export function validateUsername(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { valid: false, normalized, error: "Username is required." };
  }
  if (normalized.length < 3 || normalized.length > 32) {
    return {
      valid: false,
      normalized,
      error: "Username must be between 3 and 32 characters.",
    };
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error:
        "Username may only use lowercase letters, numbers, dots, underscores, or hyphens.",
    };
  }
  if (normalized.includes("@")) {
    return {
      valid: false,
      normalized,
      error: "Username cannot contain '@'.",
    };
  }
  return { valid: true, normalized };
}

export function validateEmailAddress(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = (raw || "").trim().toLowerCase();
  if (!normalized || normalized.length > 160) {
    return { valid: false, normalized, error: "Valid email address is required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return { valid: false, normalized, error: "Invalid email format." };
  }
  return { valid: true, normalized };
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (typeof password !== "string" || password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  if (password.length > 128) {
    return {
      valid: false,
      error: "Password must not exceed 128 characters.",
    };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must include at least one letter and one number.",
    };
  }
  return { valid: true };
}

export function validateHexColor(
  raw: string,
  fallback: string = "#0A0A0A"
): { valid: boolean; normalized: string; error?: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { valid: true, normalized: fallback };
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return {
      valid: false,
      normalized: fallback,
      error: "Color must be a 6-digit hex code such as #0A0A0A.",
    };
  }
  return { valid: true, normalized: trimmed.toUpperCase() };
}

/**
 * Computes perceived luminance of a #RRGGBB hex color and returns a high-contrast foreground color.
 */
export function getReadableForegroundHex(bgHex: string): "#111111" | "#FFFCF6" {
  const clean = (bgHex || "").replace("#", "");
  if (clean.length !== 6) return "#FFFCF6";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return lum > 0.36 ? "#111111" : "#FFFCF6";
}

export function validateLkrPriceRupees(priceRupees: number, allowZero: boolean = false): {
  valid: boolean;
  priceMinor: number;
  priceDisplay: number;
  error?: string;
} {
  const num = Number(priceRupees);
  if (allowZero && num === 0) {
    return { valid: true, priceMinor: 0, priceDisplay: 0 };
  }
  if (!Number.isFinite(num) || num <= 0 || num > 500_000) {
    return {
      valid: false,
      priceMinor: 0,
      priceDisplay: 0,
      error: "Price must be between Rs. 1 and Rs. 500,000.",
    };
  }
  const priceMinor = Math.round(num * 100);
  const priceDisplay = Math.round((priceMinor / 100) * 100) / 100;
  return { valid: true, priceMinor, priceDisplay };
}

