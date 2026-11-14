import { db, doc, getDoc, setDoc, serverTimestamp } from "./supabaseStore";

export interface CustomerRewardRecord {
  phone: string;
  name: string;
  points: number;
  totalSpentRupees: number;
  totalOrders: number;
  claimedOrdersCount?: number;
  lastOrderAtMs: number;
  createdAtMs: number;
  updatedAtMs: number;
}

/**
 * Normalize phone number to digits-only for consistent lookup across tables.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "").trim();
}

/**
 * Calculate reward points earned: Rs. 1,000 spent = 20 points.
 */
export function calculateEarnedPoints(amountRupees: number, pointsPer100 = 2): number {
  if (!amountRupees || amountRupees <= 0) return 0;
  return Math.floor((amountRupees / 100) * pointsPer100);
}

/**
 * Calculate discount in Rupees for a given number of points (configurable, default 1 point = Rs. 5).
 */
export function pointsToRupeesDiscount(points: number, rupeePerPoint: number = 5): number {
  if (!points || points <= 0) return 0;
  return points * (rupeePerPoint > 0 ? rupeePerPoint : 5);
}

function getCustomerDocRef(businessId: string | null | undefined, phoneDigits: string) {
  if (businessId && businessId !== "teatime") {
    return doc(db, "businesses", businessId, "customers", phoneDigits);
  }
  return doc(db, "customers", phoneDigits);
}

export async function getCustomerRewardByPhone(
  businessId: string | null | undefined,
  rawPhone: string
): Promise<CustomerRewardRecord | null> {
  const phoneDigits = normalizePhone(rawPhone);
  if (phoneDigits.length < 7) return null;

  try {
    const snap = await getDoc(getCustomerDocRef(businessId, phoneDigits));
    if (snap.exists()) {
      return snap.data() as CustomerRewardRecord;
    }
  } catch (err) {
    console.warn("Reward lookup error:", err);
  }
  return null;
}

export async function saveCustomerRewardPoints(params: {
  businessId: string | null | undefined;
  phone: string;
  name: string;
  orderAmountRupees: number;
  pointsRedeemed?: number;
  rupeePerPoint?: number;
}): Promise<{ record: CustomerRewardRecord; earnedPoints: number }> {
  const phoneDigits = normalizePhone(params.phone);
  if (phoneDigits.length < 7) {
    throw new Error("Please enter a valid mobile number.");
  }

  const ref = getCustomerDocRef(params.businessId, phoneDigits);
  const nowMs = Date.now();
  let existing: CustomerRewardRecord | null = null;

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existing = snap.data() as CustomerRewardRecord;
    }
  } catch {}

  const redeemed = Math.max(0, params.pointsRedeemed || 0);
  const netSpent = Math.max(
    0,
    params.orderAmountRupees - pointsToRupeesDiscount(redeemed, params.rupeePerPoint ?? 5)
  );
  let pointsPer100 = 2;
  if (typeof window !== "undefined") {
    const rawRate = localStorage.getItem(`menyo_reward_earn_rate_${params.businessId}`);
    if (rawRate && Number(rawRate) > 0) pointsPer100 = Number(rawRate);
  }
  const earnedPoints = calculateEarnedPoints(netSpent, pointsPer100);
  const welcomeBonus = existing ? 0 : 20;
  const totalAddedPoints = earnedPoints + welcomeBonus;
  const currentPoints = Math.max(0, (existing?.points || 0) - redeemed + totalAddedPoints);

  const record: CustomerRewardRecord = {
    phone: phoneDigits,
    name: params.name.trim() || existing?.name || "Guest",
    points: currentPoints,
    totalSpentRupees: (existing?.totalSpentRupees || 0) + netSpent,
    totalOrders: (existing?.totalOrders || 0) + 1,
    claimedOrdersCount: (existing?.claimedOrdersCount || 0) + (redeemed > 0 ? 1 : 0),
    lastOrderAtMs: nowMs,
    createdAtMs: existing?.createdAtMs || nowMs,
    updatedAtMs: nowMs,
  };

  await setDoc(
    ref,
    {
      ...record,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { record, earnedPoints };
}

