import React, { useState } from "react";
import { X, Trash2, Minus, Plus, Send, Loader2, AlertCircle, Utensils } from "lucide-react";
import confetti from "canvas-confetti";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { useCart } from "../../context/CartContext";
import {
  formatRupees,
  generateIdempotencyKey,
  getProductImages,
  supportsSugarSelection,
  SUGAR_SPOON_OPTIONS,
  formatSugarLabel,
} from "../../lib/utils";
import { auth, db, callCreateOrder } from "../../lib/firebase";
import { platformApi } from "../../lib/apiClient";

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
  isDemo?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onOrderPlaced,
  businessSlug = "teatime",
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

  if (!isOpen) return null;

  const sugarEligibleItems = items.filter((i) => supportsSugarSelection(i.product));

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

    const payload = {
      tableToken: tableToken.trim(),
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      specialInstructions: combinedSpecialInstructions,
      idempotencyKey,
    };

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
          orderNum = parseInt(tenantRes.orderNumber.replace(/\D/g, ""), 10) || 1001;
          orderNumDisplay = tenantRes.orderNumber;
        }
      } catch (tenantErr: any) {
        if (tenantErr?.code === "failed-precondition" || tenantErr?.code === "resource-exhausted") {
          throw tenantErr;
        }

        // Fallback to legacy Cloud function if platform API route is unreachable
        try {
          const response = await callCreateOrder(payload);
          const data = response.data;
          if (data && data.success) {
            orderId = data.orderId;
            orderNum = data.orderNumber;
            orderNumDisplay = data.orderNumberDisplay;
            resolvedTableNumber = data.tableNumber || resolvedTableNumber;
          }
        } catch (cloudFnErr: any) {
          console.warn("Falling back to direct Firestore order placement:", cloudFnErr);

          // 2. Direct Firestore fallback (works immediately even without Cloud Functions deployed)
          const currentUid = currentUser?.uid || "guest_" + Math.random().toString(36).substring(2, 9);
          const orderData = {
            orderNumber: orderNum,
            orderNumberDisplay: orderNumDisplay,
            tableNumber: resolvedTableNumber,
            tableToken: tableToken.trim(),
            customerId: currentUid,
            status: "new",
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
            totalMinor: totalMinor,
            currency: "LKR",
            specialInstructions: combinedSpecialInstructions,
            idempotencyKey,
            paymentStatus: "pay_at_counter",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, "orders"), orderData);
          orderId = docRef.id;
        }
      }

      if (orderId) {
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2C190E]/60 backdrop-blur-sm flex justify-center md:items-center md:p-6 animate-fadeIn">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-[#FAF7F0] min-h-screen md:min-h-0 md:max-h-[88vh] md:rounded-3xl md:border md:border-[#DFC9AC] md:overflow-hidden flex flex-col justify-between shadow-warm-xl relative">
        {/* Top Header */}
        <div className="sticky top-0 bg-[#FAF7F0]/95 backdrop-blur border-b border-[#DFC9AC] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-extrabold text-[#301C10]">Your order</h2>
            <p className="text-xs text-[#8A6A53]">
              Review your items before placing the order.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFFCF6] border border-[#DFC9AC] hover:bg-[#4A290F] hover:text-[#FFFCF6] flex items-center justify-center text-[#301C10] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Order Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
          <div className="sticky bottom-0 bg-[#FFFCF6] border-t border-[#DFC9AC] p-4 space-y-3 shadow-warm-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#301C10]">Total</span>
                <span className="block text-[11px] text-[#8A6A53]">Pay at counter</span>
              </div>
              <span className="text-2xl font-black text-[#301C10] tracking-tight">
                {formatRupees(totalMinor)}
              </span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full bg-[#E8B64F] hover:bg-[#d9a53d] disabled:opacity-60 text-[#1A0F08] font-extrabold py-3.5 px-4 rounded-xl shadow-warm-md transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1A0F08]" />
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
