import React, { useState } from "react";
import { X, Trash2, Minus, Plus, Send, Loader2, AlertCircle, Utensils, Gift, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { db, addDoc, collection, doc, getDoc, serverTimestamp } from "../../lib/supabaseStore";
import { auth, signInAnonymously } from "../../lib/supabase";
import { useCart } from "../../context/CartContext";
import {
  formatRupees,
  generateIdempotencyKey,
  getProductImages,
  supportsSugarSelection,
  SUGAR_SPOON_OPTIONS,
  formatSugarLabel,
} from "../../lib/utils";
import { platformApi } from "../../lib/apiClient";
import {
  CustomerRewardRecord,
  getCustomerRewardByPhone,
  pointsToRupeesDiscount,
  saveCustomerRewardPoints,
  calculateEarnedPoints,
} from "../../lib/rewards";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced: (order: {
    orderId: string;
    orderNumber: number;
    orderNumberDisplay: string;
    tableNumber: string;
  }) => void;
  businessSlug?: string;
  businessId?: string;
  isDemo?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onOrderPlaced,
  businessSlug = "teatime",
  businessId,
  isDemo = false,
}) => {
  const {
    items,
    specialInstructions,
    setSpecialInstructions,
    updateQuantity,
    updateItemSugar,
    removeItem,
    clearCart,
    totalMinor,
    totalItems,
    tableToken,
    currentTable,
    addCustomerOrderId,
  } = useCart();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reward Card / Points Claim State
  const [customerName, setCustomerName] = useState("");
  const [customerDob, setCustomerDob] = useState("");
  const [rewardPhone, setRewardPhone] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("menyo_customer_phone") || "" : ""
  );
  const [rewardRecord, setRewardRecord] = useState<CustomerRewardRecord | null>(null);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardChecked, setRewardChecked] = useState(false);
  const [applyReward, setApplyReward] = useState(false);

  const rupeePerPoint = React.useMemo(() => {
    if (typeof window === "undefined") return 5;
    const raw = localStorage.getItem(`menyo_reward_rate_${businessSlug}`);
    const parsed = raw ? Number(raw) : 5;
    return parsed > 0 ? parsed : 5;
  }, [businessSlug]);

  if (!isOpen) return null;

  const sugarEligibleItems = items.filter((i) => supportsSugarSelection(i.product));

  const totalRupees = Math.round(totalMinor / 100);
  const maxRedeemableDiscount = rewardRecord ? pointsToRupeesDiscount(rewardRecord.points, rupeePerPoint) : 0;
  const appliedDiscountRupees = applyReward && rewardRecord ? Math.min(totalRupees, maxRedeemableDiscount) : 0;
  const pointsToRedeem = appliedDiscountRupees > 0 ? Math.ceil(appliedDiscountRupees / rupeePerPoint) : 0;
  const finalTotalMinor = Math.max(0, totalMinor - appliedDiscountRupees * 100);

  const handleCheckRewards = async () => {
    if (!rewardPhone.trim()) return;
    setRewardLoading(true);
    setRewardChecked(false);
    try {
      const rec = await getCustomerRewardByPhone(businessId || businessSlug, rewardPhone.trim());
      setRewardRecord(rec);
      setRewardChecked(true);
      if (rec && rec.points > 0) {
        localStorage.setItem("menyo_customer_phone", rewardPhone.trim());
      }
    } catch {
      setRewardRecord(null);
      setRewardChecked(true);
    } finally {
      setRewardLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (!tableToken) {
      setErrorMessage("No active table detected. Please scan your table QR code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Generate unique idempotency key for this order attempt
    const idempotencyKey = generateIdempotencyKey();

    // Ensure user session exists
    let currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      } catch (authErr) {
        console.warn("Silent anonymous sign in notice:", authErr);
      }
    }

    const sugarInstructionParts = items
      .filter((i) => supportsSugarSelection(i.product) && typeof i.sugarSpoons === "number")
      .map((i) => `${i.product.name}: ${formatSugarLabel(i.sugarSpoons)}`);

    const combinedSpecialInstructions = [
      ...sugarInstructionParts,
      specialInstructions.trim(),
    ]
      .filter(Boolean)
      .join(" • ")
      .slice(0, 300);

    let orderId = "";
    let orderNum = 1000 + Math.floor(Math.random() * 900);
    let orderNumDisplay = `#${orderNum}`;
    let resolvedTableNumber = currentTable?.number || "Table 07";

    // DEMO SAFEGUARD: When testing in Demo mode, DO NOT pollute real client's kitchen order queue!
    if (isDemo) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const demoNum = 1000 + Math.floor(Math.random() * 900);
      const demoId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const demoDisplay = `#DEMO-${demoNum}`;

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#7BBBFF", "#B8A9FF", "#050F2A"],
        });
      } catch {
        // Non-critical
      }

      clearCart();
      setSpecialInstructions("");
      onClose();
      onOrderPlaced({
        orderId: demoId,
        orderNumber: demoNum,
        orderNumberDisplay: demoDisplay,
        tableNumber: resolvedTableNumber + " (Demo)",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Attempt via Platform Engine API (server-authoritative)
      try {
        const tenantRes = await platformApi.createTenantOrder({
          businessSlug,
          tableToken: tableToken.trim(),
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            sugarSpoons: typeof i.sugarSpoons === "number" ? i.sugarSpoons : undefined,
          })),
          specialInstructions: combinedSpecialInstructions,
          idempotencyKey,
        });

        if (tenantRes && tenantRes.success) {
          orderId = tenantRes.orderId;
          orderNum = typeof tenantRes.orderNumber === "number"
            ? tenantRes.orderNumber
            : parseInt(String(tenantRes.orderNumber || "").replace(/\D/g, ""), 10) || 1001;
          orderNumDisplay = tenantRes.orderNumberDisplay || String(tenantRes.orderNumber || `#${orderNum}`);
          resolvedTableNumber = tenantRes.tableNumber || resolvedTableNumber;
        }
      } catch (tenantErr: any) {
        if (tenantErr?.code === "failed-precondition" || tenantErr?.code === "resource-exhausted") {
          throw tenantErr;
        }

        console.warn("Falling back to direct Supabase order placement:", tenantErr);

        let tenantBizId: string | null = businessId || null;
        if (!tenantBizId && businessSlug) {
          try {
            const slugDoc = await getDoc(doc(db, "businessSlugs", businessSlug.toLowerCase().trim()));
            if (slugDoc.exists()) {
              tenantBizId = slugDoc.data()?.businessId || null;
            }
          } catch {}
        }

        const currentUid = currentUser?.uid || "guest_" + Math.random().toString(36).substring(2, 9);
        const orderData = {
          orderNumber: orderNum,
          orderNumberDisplay: orderNumDisplay,
          tableNumber: resolvedTableNumber,
          tableToken: tableToken.trim(),
          customerId: currentUid,
          status: tenantBizId ? "PENDING" : "new",
          items: items.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            category: i.product.category || "General",
            priceMinor: i.product.priceMinor,
            quantity: i.quantity,
            subtotalMinor: i.product.priceMinor * i.quantity,
            imageUrl: i.product.imageUrl || null,
            sugarNote:
              supportsSugarSelection(i.product) && typeof i.sugarSpoons === "number"
                ? formatSugarLabel(i.sugarSpoons)
                : null,
          })),
          itemCount: totalItems,
          totalMinor: finalTotalMinor,
          originalTotalMinor: totalMinor,
          rewardPhone: pointsToRedeem > 0 ? rewardPhone.trim() : null,
          rewardPointsClaimed: pointsToRedeem,
          rewardDiscountRupees: appliedDiscountRupees,
          currency: "LKR",
          specialInstructions: combinedSpecialInstructions,
          idempotencyKey,
          paymentStatus: "pay_at_counter",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (tenantBizId) {
          const docRef = await addDoc(collection(db, "businesses", tenantBizId, "orders"), orderData);
          orderId = docRef.id;
        } else {
          const docRef = await addDoc(collection(db, "orders"), orderData);
          orderId = docRef.id;
        }
      }

      if (orderId) {
        if (rewardPhone.trim()) {
          try {
            await saveCustomerRewardPoints({
              businessId: businessId || businessSlug,
              phone: rewardPhone.trim(),
              name: customerName.trim() || rewardRecord?.name || "Guest",
              birthday: customerDob.trim() || undefined,
              orderAmountRupees: totalRupees,
              pointsRedeemed: pointsToRedeem,
              rupeePerPoint,
            });
          } catch (e) {
            console.warn("Reward points save notice:", e);
          }
        }
        // Trigger celebratory confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#E8B64F", "#4A290F", "#C99532"],
          });
        } catch {
          // Non-critical visual effect
        }

        addCustomerOrderId(orderId);
        if (rewardPhone.trim()) {
          localStorage.setItem(`menyo_order_phone_${orderId}`, rewardPhone.trim());
          localStorage.setItem("menyo_customer_phone", rewardPhone.trim());
        }
        clearCart();
        onClose();
        onOrderPlaced({
          orderId,
          orderNumber: orderNum,
          orderNumberDisplay: orderNumDisplay,
          tableNumber: resolvedTableNumber,
        });
      } else {
        throw new Error("Unable to complete order.");
      }
    } catch (err: any) {
      console.error("Order submission failure:", err);
      const friendlyMessage =
        err?.message ||
        err?.details?.message ||
        "Could not place your order. Please check your network or consult staff.";
      setErrorMessage(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/45 backdrop-blur-xl flex justify-center md:items-center md:p-6 animate-fadeIn">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white/95 backdrop-blur-2xl h-full md:h-auto md:max-h-[88vh] rounded-t-[28px] md:rounded-[28px] ring-1 ring-black/10 overflow-hidden flex flex-col justify-between shadow-[0_32px_80px_-12px_rgba(0,0,0,0.45)] relative">
        {/* Top Header */}
        <div className="shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] px-5 md:px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#050F2A]">Your order</h2>
            <p className="text-xs text-[#050F2A]/55 mt-0.5">
              Review your items before placing the order
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center text-[#050F2A]/70 hover:text-[#050F2A] transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#050F2A]/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Order Items List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-8 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#E8B64F]/20 border border-[#DFC9AC] mx-auto flex items-center justify-center text-[#4A290F]">
                <Send className="w-8 h-8 rotate-45" />
              </div>
              <h3 className="text-base font-bold text-[#301C10]">Your cart is empty</h3>
              <p className="text-xs text-[#8A6A53] max-w-xs mx-auto">
                Explore our fine teas, coffees, and snacks to add items to your table order.
              </p>
            </div>
          ) : (
            <>
              {items.map(({ product, quantity, sugarSpoons }) => {
                const itemTotalMinor = product.priceMinor * quantity;
                const thumbUrl = getProductImages(product)[0] || "";
                const itemSugarText =
                  supportsSugarSelection(product) && typeof sugarSpoons === "number"
                    ? formatSugarLabel(sugarSpoons)
                    : "";
                return (
                  <div
                    key={product.id}
                    className="bg-[#FFFCF6] rounded-2xl p-3 border border-[#DFC9AC] shadow-warm flex items-center gap-3"
                  >
                    {/* Item Thumbnail */}
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={product.name}
                        className="w-16 h-16 rounded-xl object-contain shrink-0 bg-[#FAF7F0] border border-[#DFC9AC]/50"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl shrink-0 bg-[#FAF7F0] border border-[#DFC9AC]/50 flex items-center justify-center">
                        <Utensils className="w-5 h-5 text-[#8A6A53]" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#301C10] text-sm leading-snug break-words">
                        {quantity} × {product.name}
                      </h4>
                      <p className="text-xs text-[#301C10] font-medium whitespace-nowrap">
                        {formatRupees(itemTotalMinor)}{" "}
                        <span className="text-[11px] text-[#8A6A53]">
                          ({formatRupees(product.priceMinor)} each)
                        </span>
                      </p>
                      {itemSugarText && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#DFC9AC] text-[10px] font-bold text-[#4A290F]">
                          {itemSugarText}
                        </span>
                      )}
                    </div>

                    {/* Stepper Controls & Delete */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#DFC9AC] rounded-lg overflow-hidden bg-[#FAF7F0]">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-[#301C10] hover:bg-[#4A290F] hover:text-[#FFFCF6] active:scale-95 transition"
                          title="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#301C10]">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#301C10] hover:bg-[#4A290F] hover:text-[#FFFCF6] active:scale-95 transition"
                          title="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-[#8A6A53] hover:text-red-700 transition p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Special instructions (with minimal Sugar selector for Coffee & Non-Milk Tea) */}
              <div className="pt-2 space-y-2.5">
                <label className="block text-xs font-bold text-[#301C10]">
                  Special instructions (optional)
                </label>

                {sugarEligibleItems.length > 0 && (
                  <div className="bg-[#FFFCF6] rounded-xl p-3 border border-[#DFC9AC] shadow-warm space-y-2.5">
                    {sugarEligibleItems.map(({ product, sugarSpoons }) => {
                      const currentSpoons =
                        typeof sugarSpoons === "number" ? sugarSpoons : null;
                      return (
                        <div key={product.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-[#301C10] truncate">
                              Sugar · {product.name}
                            </span>
                            <span className="text-[10px] font-bold text-[#8A6A53] shrink-0">
                              {currentSpoons !== null
                                ? formatSugarLabel(currentSpoons)
                                : "Select spoons"}
                            </span>
                          </div>

                          <div className="grid grid-cols-6 gap-1.5">
                            {SUGAR_SPOON_OPTIONS.map((opt) => {
                              const selected = currentSpoons === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() =>
                                    updateItemSugar(
                                      product.id,
                                      currentSpoons === opt.value ? null : opt.value
                                    )
                                  }
                                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
                                    selected
                                      ? "bg-[#E8B64F] text-[#1A0F08] border border-[#C99532] shadow-warm"
                                      : "bg-[#FAF7F0] text-[#301C10] border border-[#DFC9AC] hover:border-[#C99532]"
                                  }`}
                                >
                                  {opt.pill}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    maxLength={300}
                    placeholder="e.g. Extra hot, less milk, no ice..."
                    rows={2}
                    className="w-full text-xs p-3 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] placeholder-[#8A6A53] focus:outline-none focus:ring-2 focus:ring-[#C99532] focus:border-transparent resize-none shadow-warm transition"
                  />
                  <div className="text-right text-[10px] text-[#8A6A53] mt-0.5">
                    {specialInstructions.length}/300
                  </div>
                </div>
              </div>

              {/* Reward Card / Claim Points Section */}
              <div className="bg-gradient-to-br from-[#FFFCF6] via-[#FFF9EC] to-[#FFF4DC] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      style={{ backgroundColor: "var(--tenant-primary, #E8B64F)", color: "#FFFFFF" }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5"
                    >
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#301C10] leading-snug">
                        Earn Reward Points &amp; Gifts
                      </p>
                      <p className="text-[11px] text-[#8A6A53] mt-0.5 leading-relaxed">
                        Enter your name and mobile number to collect loyalty points on every order and unlock exclusive gifts &amp; discounts!
                      </p>
                    </div>
                  </div>
                  {rewardRecord && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8B64F]/25 text-[#9A6B12] shrink-0">
                      {rewardRecord.points} pts (Rs. {pointsToRupeesDiscount(rewardRecord.points)})
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name (Optional)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#DFC9AC] text-xs text-[#301C10] placeholder-[#8A6A53]/70 focus:outline-none focus:ring-2 focus:ring-[#C99532]"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        onFocus={(e) => (e.target.type = "date")}
                        onBlur={(e) => {
                          if (!e.target.value) e.target.type = "text";
                        }}
                        value={customerDob}
                        onChange={(e) => setCustomerDob(e.target.value)}
                        placeholder="Birthday (Optional - for gifts!)"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#DFC9AC] text-xs text-[#301C10] placeholder-[#8A6A53]/70 focus:outline-none focus:ring-2 focus:ring-[#C99532]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={rewardPhone}
                      onChange={(e) => {
                        setRewardPhone(e.target.value);
                        setRewardChecked(false);
                        setApplyReward(false);
                      }}
                      placeholder="Mobile number (e.g. 0771234567)..."
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#DFC9AC] text-xs text-[#301C10] placeholder-[#8A6A53]/70 focus:outline-none focus:ring-2 focus:ring-[#C99532]"
                    />
                    <button
                      type="button"
                      onClick={handleCheckRewards}
                      disabled={rewardLoading || !rewardPhone.trim()}
                      className="px-4 py-2 rounded-xl bg-[#050F2A] hover:bg-[#0b1739] text-white text-xs font-bold transition disabled:opacity-50 shadow-sm"
                    >
                      {rewardLoading ? "..." : "Check"}
                    </button>
                  </div>
                </div>

                {rewardChecked && !rewardRecord && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Ready! You&apos;ll earn <strong>+{calculateEarnedPoints(totalRupees)} pts</strong> on this order toward your next reward &amp; gift.
                  </p>
                )}

                {rewardRecord && rewardRecord.points > 0 && (
                  (() => {
                    const rawMin = typeof window !== "undefined" ? localStorage.getItem(`menyo_reward_min_claim_${businessId || businessSlug}`) : null;
                    const minClaimPts = rawMin && Number(rawMin) > 0 ? Number(rawMin) : 1000;
                    const canClaim = rewardRecord.points >= minClaimPts;
                    return (
                      <div className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-[#DFC9AC]">
                        <div className="text-[11px]">
                          <p className="font-bold text-[#301C10]">
                            Hi {rewardRecord.name}! {rewardRecord.points} pts available
                          </p>
                          <p className="text-[#8A6A53]">
                            {canClaim
                              ? `Save Rs. ${Math.min(totalRupees, maxRedeemableDiscount)} on this order`
                              : `Need ${minClaimPts} pts to claim (${minClaimPts - rewardRecord.points} more needed)`}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!canClaim}
                          onClick={() => setApplyReward((prev) => !prev)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 disabled:opacity-45 disabled:cursor-not-allowed ${
                            applyReward
                              ? "bg-emerald-600 text-white"
                              : "bg-[#E8B64F] text-[#1A0F08] hover:bg-[#d9a53d]"
                          }`}
                        >
                          {applyReward && <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{applyReward ? "Claimed" : "Claim"}</span>
                        </button>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Error message banner */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Total & Place Order Button */}
        {items.length > 0 && (
          <div className="shrink-0 bg-[#FFFCF6] border-t border-[#DFC9AC] p-4 space-y-3 shadow-warm-lg z-20">
            {appliedDiscountRupees > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <span>Reward Discount ({pointsToRedeem} pts)</span>
                <span>- Rs. {appliedDiscountRupees.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#301C10]">Total</span>
                <span className="block text-[11px] text-[#8A6A53]">Pay at counter</span>
              </div>
              <span className="text-2xl font-black text-[#301C10] tracking-tight">
                {formatRupees(finalTotalMinor)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              style={{ backgroundColor: "var(--tenant-primary, #E8B64F)", color: "#FFFFFF" }}
              className="w-full hover:opacity-90 disabled:opacity-60 font-extrabold py-3.5 px-4 rounded-xl shadow-warm-md transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending to kitchen...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#1A0F08]" />
                  <span>Place order</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
