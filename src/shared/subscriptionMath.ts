import {
  BusinessAccessRecord,
  EffectiveAccessEvaluation,
  PackageId,
} from "../types";

/**
 * Sri Lanka Standard Time (Asia/Colombo) is permanently UTC+05:30 (330 minutes, no DST).
 */
export const COLOMBO_OFFSET_MINUTES = 330;
export const COLOMBO_OFFSET_MS = COLOMBO_OFFSET_MINUTES * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ColomboDateTimeParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
  millisecond: number; // 0..999
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInCalendarMonth(year: number, month1To12: number): number {
  if (month1To12 < 1 || month1To12 > 12) {
    throw new Error(`Invalid month: ${month1To12}`);
  }
  switch (month1To12) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

export function toColomboParts(epochMs: number): ColomboDateTimeParts {
  if (!Number.isFinite(epochMs)) {
    throw new Error("Invalid timestamp provided.");
  }
  const shifted = new Date(epochMs + COLOMBO_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

export function fromColomboParts(parts: ColomboDateTimeParts): number {
  const maxDay = getDaysInCalendarMonth(parts.year, parts.month);
  if (parts.day < 1 || parts.day > maxDay) {
    throw new Error(
      `Invalid calendar date ${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
        parts.day
      ).padStart(2, "0")} in Asia/Colombo.`
    );
  }
  const utcEquivalent = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );
  return utcEquivalent - COLOMBO_OFFSET_MS;
}

/**
 * Parses a strict YYYY-MM-DD calendar date in Asia/Colombo into the start of that day (00:00:00.000 +05:30).
 * Rejects impossible calendar dates such as 2026-02-29 or 2026-04-31.
 */
export function parseColomboCalendarDateStartMs(dateStr: string): number {
  const trimmed = (dateStr || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 2020 || year > 2100) {
    throw new Error(`Date year ${year} is out of supported range (2020–2100).`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid calendar month ${month} in "${dateStr}".`);
  }
  const maxDay = getDaysInCalendarMonth(year, month);
  if (day < 1 || day > maxDay) {
    throw new Error(`Invalid calendar day ${day} for ${year}-${String(month).padStart(2, "0")}.`);
  }

  return fromColomboParts({
    year,
    month,
    day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

export function getColomboDateString(epochMs: number = Date.now()): string {
  const p = toColomboParts(epochMs);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function getColomboYearMonth(epochMs: number = Date.now()): string {
  const p = toColomboParts(epochMs);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

/**
 * Adds exact calendar months in Asia/Colombo, clamping end-of-month dates accurately.
 * Examples:
 * - 2026-01-31 + 3 months -> 2026-04-30 (same Colombo time-of-day)
 * - 2026-08-31 + 6 months -> 2027-02-28
 * - 2027-08-31 + 6 months -> 2028-02-29 (leap year)
 */
export function addCalendarMonthsColombo(baseMs: number, monthsToAdd: number): number {
  if (!Number.isInteger(monthsToAdd) || monthsToAdd <= 0 || monthsToAdd > 120) {
    throw new Error(`Invalid months duration: ${monthsToAdd}`);
  }
  const p = toColomboParts(baseMs);
  const totalZeroBasedMonth = p.year * 12 + (p.month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalZeroBasedMonth / 12);
  const targetMonth = (totalZeroBasedMonth % 12) + 1;
  const maxDay = getDaysInCalendarMonth(targetYear, targetMonth);
  const clampedDay = Math.min(p.day, maxDay);

  return fromColomboParts({
    year: targetYear,
    month: targetMonth,
    day: clampedDay,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
    millisecond: p.millisecond,
  });
}

export function getDurationMonthsForPackage(packageId: PackageId): number | null {
  switch (packageId) {
    case "trial":
    case "2_days_trial":
      return null;
    case "monthly":
      return 1;
    case "3_months":
      return 3;
    case "6_months":
      return 6;
    case "yearly":
      return 12;
    case "lifetime":
      return null;
    default:
      throw new Error(`Unsupported package ID: ${String(packageId)}`);
  }
}

/**
 * Computes initial subscription window for a newly onboarded business.
 * - `activationDateColombo`: YYYY-MM-DD in Asia/Colombo.
 *   Starts at 00:00:00.000 Asia/Colombo on that date so if activated for today's Colombo date,
 *   the business is active immediately (`startsAtMs <= serverNowMs`), and expires at the exact
 *   exclusive instant `00:00:00.000 Asia/Colombo` after N calendar months.
 */
export function computeInitialSubscriptionWindow(
  paramsOrPackageId:
    | {
        packageId: PackageId;
        activationDateColombo: string;
        serverNowMs?: number;
      }
    | PackageId,
  maybeDate?: string
): {
  isLifetime: boolean;
  activatedAtMs: number;
  startsAtMs: number;
  expiresAtMs: number | null;
  expiryDateColombo: string | null;
} {
  const packageId =
    typeof paramsOrPackageId === "object" ? paramsOrPackageId.packageId : paramsOrPackageId;
  const activationDateColombo =
    typeof paramsOrPackageId === "object"
      ? paramsOrPackageId.activationDateColombo
      : maybeDate || getColomboDateString();
  const serverNowMs =
    typeof paramsOrPackageId === "object" ? paramsOrPackageId.serverNowMs : undefined;

  const nowMs = serverNowMs ?? Date.now();
  const startsAtMs = parseColomboCalendarDateStartMs(activationDateColombo);

  // Reject activation dates more than 60 days in the future or before year 2020
  if (startsAtMs > nowMs + 60 * ONE_DAY_MS) {
    throw new Error("Activation date cannot be more than 60 days in the future.");
  }

  // 2-Day Free Trial: exactly 48 hours from activation
  if (packageId === "trial" || packageId === "2_days_trial") {
    const expiresAtMs = nowMs + 2 * ONE_DAY_MS;
    return {
      isLifetime: false,
      activatedAtMs: nowMs,
      startsAtMs: nowMs,
      expiresAtMs,
      expiryDateColombo: getColomboDateString(expiresAtMs),
    };
  }

  const durationMonths = getDurationMonthsForPackage(packageId);
  if (durationMonths === null) {
    return {
      isLifetime: true,
      activatedAtMs: nowMs,
      startsAtMs,
      expiresAtMs: null,
      expiryDateColombo: null,
    };
  }

  const expiresAtMs = addCalendarMonthsColombo(startsAtMs, durationMonths);
  return {
    isLifetime: false,
    activatedAtMs: nowMs,
    startsAtMs,
    expiresAtMs,
    expiryDateColombo: getColomboDateString(expiresAtMs),
  };
}

/**
 * Computes subscription renewal or package change window:
 * - Lifetime subscriptions cannot be renewed again or downgraded to a time-limited package.
 * - Upgrading an active or expired fixed-term subscription to Lifetime sets `expiresAtMs = null`.
 * - Renewing an ACTIVE fixed-term subscription (`currentExpiresAtMs > renewalInstantMs`) extends from `currentExpiresAtMs`.
 * - Renewing an EXPIRED fixed-term subscription (`currentExpiresAtMs <= renewalInstantMs`) starts from `renewalInstantMs`.
 */
export function computeRenewalSubscriptionWindow(
  paramsOrPackageId:
    | {
        currentIsLifetime: boolean;
        currentExpiresAtMs: number | null;
        newPackageId: PackageId;
        serverNowMs: number;
        explicitActivationDateColombo?: string;
      }
    | PackageId,
  maybeCurrentExpiry?: string | null,
  maybeStartDate?: string
): {
  isLifetime: boolean;
  actionType: "renewal" | "package_change";
  activatedAtMs: number;
  startsAtMs: number;
  expiresAtMs: number | null;
  expiryDateColombo: string | null;
} {
  let currentIsLifetime = false;
  let currentExpiresAtMs: number | null = null;
  let newPackageId: PackageId = "3_months";
  let serverNowMs = Date.now();
  let explicitActivationDateColombo: string | undefined = undefined;

  if (typeof paramsOrPackageId === "object") {
    currentIsLifetime = paramsOrPackageId.currentIsLifetime;
    currentExpiresAtMs = paramsOrPackageId.currentExpiresAtMs;
    newPackageId = paramsOrPackageId.newPackageId;
    serverNowMs = paramsOrPackageId.serverNowMs;
    explicitActivationDateColombo = paramsOrPackageId.explicitActivationDateColombo;
  } else {
    newPackageId = paramsOrPackageId;
    if (maybeCurrentExpiry) {
      currentExpiresAtMs = parseColomboCalendarDateStartMs(maybeCurrentExpiry);
    }
    explicitActivationDateColombo = maybeStartDate;
  }

  if (!Number.isFinite(serverNowMs)) {
    throw new Error("Trusted server timestamp is required for renewal calculation.");
  }

  if (currentIsLifetime) {
    if (newPackageId === "lifetime") {
      throw new Error("This business already holds an active Lifetime subscription.");
    }
    throw new Error(
      "Ambiguous package change: cannot downgrade a Lifetime subscription to a time-limited package."
    );
  }

  if (currentExpiresAtMs !== null && !Number.isFinite(currentExpiresAtMs)) {
    throw new Error("Corrupted existing expiry timestamp.");
  }

  const isCurrentlyActive =
    currentExpiresAtMs !== null && serverNowMs < currentExpiresAtMs;

  if (isCurrentlyActive && explicitActivationDateColombo) {
    const requestedStart = parseColomboCalendarDateStartMs(
      explicitActivationDateColombo
    );
    const todayStart = parseColomboCalendarDateStartMs(getColomboDateString(serverNowMs));
    if (requestedStart > todayStart) {
      throw new Error(
        "Active subscriptions extend directly from their existing expiry timestamp; custom future start dates are not permitted."
      );
    }
  }

  const newMonths = getDurationMonthsForPackage(newPackageId);
  if (newMonths === null) {
    // Upgrade to Lifetime
    return {
      isLifetime: true,
      actionType: "package_change",
      activatedAtMs: serverNowMs,
      startsAtMs: serverNowMs,
      expiresAtMs: null,
      expiryDateColombo: null,
    };
  }

  // Time-limited renewal
  let periodBaseMs: number;
  if (isCurrentlyActive && currentExpiresAtMs !== null) {
    // Extend seamlessly from existing exclusive expiry timestamp
    periodBaseMs = currentExpiresAtMs;
  } else if (explicitActivationDateColombo) {
    const explicitStartMs = parseColomboCalendarDateStartMs(
      explicitActivationDateColombo
    );
    if (explicitStartMs > serverNowMs + 30 * ONE_DAY_MS) {
      throw new Error("Renewal activation date cannot be more than 30 days in the future.");
    }
    // If today's Colombo date was chosen for an expired business, start immediately from serverNowMs
    const isTodayColombo =
      explicitActivationDateColombo.trim() === getColomboDateString(serverNowMs);
    periodBaseMs = isTodayColombo ? serverNowMs : explicitStartMs;
  } else {
    periodBaseMs = serverNowMs;
  }

  const newExpiresAtMs = addCalendarMonthsColombo(periodBaseMs, newMonths);

  return {
    isLifetime: false,
    actionType: "renewal",
    activatedAtMs: serverNowMs,
    startsAtMs: periodBaseMs,
    expiresAtMs: newExpiresAtMs,
    expiryDateColombo: getColomboDateString(newExpiresAtMs),
  };
}

/**
 * Evaluates operational status AND subscription validity as strictly independent concerns.
 * - Access is valid strictly BEFORE `expiresAtMs` (`nowMs < expiresAtMs`), and expires AT `expiresAtMs`.
 * - A Lifetime business (`isLifetime === true`, `expiresAtMs === null`) can still be suspended or archived!
 */
export function evaluateBusinessAccess(
  access: Pick<
    BusinessAccessRecord,
    "operationalStatus" | "isLifetime" | "startsAtMs" | "expiresAtMs"
  >,
  nowMs: number = Date.now()
): EffectiveAccessEvaluation {
  const notStartedYet =
    typeof access.startsAtMs === "number" && nowMs < access.startsAtMs;

  const subscriptionValidNow =
    !notStartedYet &&
    (access.isLifetime === true ||
      (typeof access.expiresAtMs === "number" && nowMs < access.expiresAtMs));

  const msRemaining =
    access.isLifetime || access.expiresAtMs === null
      ? null
      : access.expiresAtMs - nowMs;

  const daysRemaining =
    msRemaining === null ? null : Math.max(0, Math.ceil(msRemaining / ONE_DAY_MS));

  const expiringWithin7Days =
    !access.isLifetime &&
    msRemaining !== null &&
    msRemaining > 0 &&
    msRemaining <= SEVEN_DAYS_MS;

  const opStatus = (access.operationalStatus || "").toLowerCase();

  if (opStatus === "archived") {
    return {
      allowed: false,
      subscriptionValidNow,
      effectiveStatus: "archived",
      expiringWithin7Days: false,
      daysRemaining,
      reason: "ARCHIVED",
    };
  }

  if (opStatus === "suspended") {
    return {
      allowed: false,
      subscriptionValidNow,
      effectiveStatus: "suspended",
      expiringWithin7Days,
      daysRemaining,
      reason: "SUSPENDED",
    };
  }

  if (notStartedYet) {
    return {
      allowed: false,
      subscriptionValidNow: false,
      effectiveStatus: "scheduled",
      expiringWithin7Days: false,
      daysRemaining,
      reason: "NOT_STARTED_YET",
    };
  }

  if (!subscriptionValidNow) {
    return {
      allowed: false,
      subscriptionValidNow: false,
      effectiveStatus: "expired",
      expiringWithin7Days: false,
      daysRemaining: 0,
      reason: "EXPIRED",
    };
  }

  return {
    allowed: true,
    subscriptionValidNow: true,
    effectiveStatus: expiringWithin7Days ? "expiring_soon" : "active",
    expiringWithin7Days,
    daysRemaining,
    reason: "OK",
  };
}

/**
 * Formats an epoch millisecond timestamp in Asia/Colombo (e.g., "29 Jan 2027, 12:00 AM IST").
 */
export function formatColomboDateTime(epochMs: number | null | undefined): string {
  if (epochMs === null || epochMs === undefined || !Number.isFinite(epochMs)) {
    return "No expiry (Lifetime)";
  }
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(epochMs)) + " (Asia/Colombo)"
  );
}

/**
 * Formats an epoch millisecond timestamp as a short calendar date in Asia/Colombo (e.g., "29 Jan 2027").
 */
export function formatColomboDateOnly(epochMs: number | null | undefined): string {
  if (epochMs === null || epochMs === undefined || !Number.isFinite(epochMs)) {
    return "Lifetime";
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(epochMs));
}

/**
 * Returns the last inclusive calendar day in Asia/Colombo before an exclusive expiry instant
 * (i.e. `expiresAtMs - 1` formatted in Asia/Colombo) so administrators can see both clearly.
 */
export function formatInclusiveLastServiceDayColombo(
  expiresAtMs: number | null | undefined
): string {
  if (expiresAtMs === null || expiresAtMs === undefined || !Number.isFinite(expiresAtMs)) {
    return "No expiry";
  }
  return formatColomboDateOnly(expiresAtMs - 1);
}

