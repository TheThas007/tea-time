import { db, doc, getDoc, setDoc, serverTimestamp } from "./supabaseStore";
import { platformApi } from "./apiClient";

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

function resolveCanonicalBusinessId(businessId: string | null | undefined): string {
  const trimmed = (businessId || "").trim();
  if (!trimmed || trimmed === "teatime" || trimmed === "biz_teatime") return "teatime";
  return trimmed;
}

function updateLocalRewardsCache(bId: string, record: CustomerRewardRecord) {
  if (typeof window === "undefined" || !bId || !record?.phone) return;
  try {
    const key = `menyo_rewards_${bId}`;
    const raw = localStorage.getItem(key);
    let list: CustomerRewardRecord[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    }
    const idx = list.findIndex((c) => c.phone === record.phone);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    localStorage.setItem(key, JSON.stringify(list));
    // Dispatch custom and storage event so any active admin dashboard tab updates instantly
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("menyo_rewards_updated", { detail: { businessId: bId, record } }));
  } catch (err) {
    console.warn("Failed to update local rewards cache:", err);
  }
}

function getLocalRewardByPhone(bId: string, phoneDigits: string): CustomerRewardRecord | null {
  if (typeof window === "undefined" || !bId) return null;
  try {
    const raw = localStorage.getItem(`menyo_rewards_${bId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const list: CustomerRewardRecord[] = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    const found = list.find((c) => c && c.phone === phoneDigits);
    return found || null;
  } catch {
    return null;
  }
}

export async function getCustomerRewardByPhone(
  businessId: string | null | undefined,
  rawPhone: string
): Promise<CustomerRewardRecord | null> {
  const phoneDigits = normalizePhone(rawPhone);
  if (phoneDigits.length < 7) return null;

  const canonicalBizId = resolveCanonicalBusinessId(businessId);

  // 1. Try secure Server RPC (service role - bypasses client RLS restrictions safely)
  try {
    const res = await platformApi.getCustomerReward({
      businessId: canonicalBizId,
      phone: phoneDigits,
    });
    if (res?.record) {
      const record = res.record as CustomerRewardRecord;
      updateLocalRewardsCache(canonicalBizId, record);
      return record;
    }
  } catch (rpcErr) {
    console.warn("RPC customer reward lookup notice:", rpcErr);
  }

  // 2. Direct client store fallback
  try {
    const directRef = doc(db, "businesses", canonicalBizId, "customers", phoneDigits);
    const snap = await getDoc(directRef);
    if (snap.exists()) {
      const record = snap.data() as CustomerRewardRecord;
      updateLocalRewardsCache(canonicalBizId, record);
      return record;
    }
  } catch {}

  if (canonicalBizId === "teatime") {
    try {
      const rootSnap = await getDoc(doc(db, "customers", phoneDigits));
      if (rootSnap.exists()) {
        const record = rootSnap.data() as CustomerRewardRecord;
        updateLocalRewardsCache(canonicalBizId, record);
        return record;
      }
    } catch {}
  }

  // 3. Instant local storage cache fallback
  const localRec = getLocalRewardByPhone(canonicalBizId, phoneDigits);
  if (localRec) return localRec;

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

  const canonicalBizId = resolveCanonicalBusinessId(params.businessId);

  // 1. Try secure Server RPC
  try {
    const res = await platformApi.saveCustomerReward({
      businessId: canonicalBizId,
      phone: phoneDigits,
      name: params.name,
      orderAmountRupees: params.orderAmountRupees,
      pointsRedeemed: params.pointsRedeemed,
      rupeePerPoint: params.rupeePerPoint,
    });
    if (res?.record) {
      const record = res.record as CustomerRewardRecord;
      updateLocalRewardsCache(canonicalBizId, record);
      return { record, earnedPoints: res.earnedPoints ?? 0 };
    }
  } catch (rpcErr) {
    console.warn("RPC customer reward save fallback:", rpcErr);
  }

  // 2. Client store direct write fallback
  const directRef = doc(db, "businesses", canonicalBizId, "customers", phoneDigits);
  const nowMs = Date.now();
  let existing: CustomerRewardRecord | null = null;

  try {
    const snap = await getDoc(directRef);
    if (snap.exists()) {
      existing = snap.data() as CustomerRewardRecord;
    }
  } catch {}
  if (!existing) {
    existing = getLocalRewardByPhone(canonicalBizId, phoneDigits);
  }

  const redeemed = Math.max(0, params.pointsRedeemed || 0);
  const netSpent = Math.max(
    0,
    params.orderAmountRupees - pointsToRupeesDiscount(redeemed, params.rupeePerPoint ?? 5)
  );
  let pointsPer100 = 2;
  if (typeof window !== "undefined") {
    const rawRate = localStorage.getItem(`menyo_reward_earn_rate_${canonicalBizId}`);
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

  try {
    await setDoc(
      directRef,
      {
        ...record,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (writeErr) {
    console.warn("Direct customer save write notice:", writeErr);
  }

  updateLocalRewardsCache(canonicalBizId, record);

  return { record, earnedPoints };
}
