import React, { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  CheckCheck,
  X,
  Utensils,
  Star,
  ExternalLink
} from "lucide-react";
import { db } from "../../lib/firebase";
import { Order, OrderStatus } from "../../types";
import { formatRupees, formatTimeAgo } from "../../lib/utils";

const GOOGLE_REVIEW_URL =
  "https://www.google.com/maps/place/TeaTime/@8.7505273,80.5002708,1075m/data=!3m1!1e3!4m8!3m7!1s0x3afc150061716423:0xd3dafef0e97cac0d!8m2!3d8.7505273!4d80.5028457!9m1!1b1!16s%2Fg%2F11x038s1mv?entry=ttu&g_ep=EgoyMDI2MTAyMC4wIKXMDSoASAFQAw%3D%3D";
const INSTAGRAM_URL = "https://www.instagram.com/teatime_vavuniya/";
const FACEBOOK_URL = "https://www.facebook.com/teatime.vavuniya/";

interface LiveOrderTrackerProps {
  orderId: string;
  businessSlug?: string;
  businessId?: string;
  onClose: () => void;
  onOrderMore?: () => void;
}

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({
  orderId,
  businessSlug,
  businessId,
  onClose,
  onOrderMore,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Simulated Demo Order Handling (Zero Firestore Pollution)
    if (orderId.startsWith("demo_")) {
      const demoNum = parseInt(orderId.replace(/\D/g, "").slice(-4), 10) || 1042;
      setOrder({
        id: orderId,
        orderNumber: demoNum,
        orderNumberDisplay: `#DEMO-${demoNum}`,
        tableNumber: "Table 07 (Demo)",
        status: "preparing",
        items: [
          {
            productId: "demo_item_1",
            name: "Masala Chai (Demo)",
            category: "Hot Teas",
            priceMinor: 25000,
            quantity: 1,
            subtotalMinor: 25000,
            imageUrl: null,
          },
          {
            productId: "demo_item_2",
            name: "Classic Milk Tea (Demo)",
            category: "Milk Teas",
            priceMinor: 30000,
            quantity: 1,
            subtotalMinor: 30000,
            imageUrl: null,
          },
        ],
        itemCount: 2,
        totalMinor: 55000,
        currency: "LKR",
        createdAt: { seconds: Math.floor(Date.now() / 1000) } as any,
        updatedAt: { seconds: Math.floor(Date.now() / 1000) } as any,
      } as Order);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let unsubRoot: (() => void) | null = null;
    let unsubTenant: (() => void) | null = null;

    const handleSnapshot = (snap: any) => {
      if (snap.exists() && isMounted) {
        setOrder((prev) => ({
          ...(prev || {}),
          id: snap.id,
          ...snap.data(),
        } as Order));
        setLoading(false);
      }
    };

    // 1. Primary listener on root orders/{orderId}
    unsubRoot = onSnapshot(
      doc(db, "orders", orderId),
      handleSnapshot,
      (error) => {
        console.warn("Root order tracker listener notice:", error);
      }
    );

    // 2. Multi-tenant subcollection listener on businesses/{bId}/orders/{orderId}
    const attachTenantListener = async () => {
      let targetBizId = businessId;
      if (!targetBizId && businessSlug && businessSlug !== "teatime") {
        try {
          const sSnap = await getDoc(doc(db, "businessSlugs", businessSlug.toLowerCase().trim()));
          if (sSnap.exists()) {
            targetBizId = sSnap.data()?.businessId;
          }
        } catch {}
      }

      if (targetBizId && isMounted) {
        unsubTenant = onSnapshot(
          doc(db, "businesses", targetBizId, "orders", orderId),
          handleSnapshot,
          (error) => {
            console.warn("Tenant order tracker listener notice:", error);
          }
        );
      }
    };

    attachTenantListener();

    return () => {
      isMounted = false;
      if (unsubRoot) unsubRoot();
      if (unsubTenant) unsubTenant();
    };
  }, [orderId, businessId, businessSlug]);

  const stages: { key: string; label: string; icon: any; desc: string }[] = [
    { key: "new", label: "Received", icon: Clock, desc: "Sent to the kitchen." },
    { key: "preparing", label: "Preparing", icon: ChefHat, desc: "Our team is brewing and baking." },
    { key: "ready", label: "Ready", icon: BellRing, desc: "Ready for pickup or serving!" },
    { key: "served", label: "Served", icon: CheckCheck, desc: "Enjoy your tea time!" },
  ];

  const getStageIndex = (rawStatus?: string): number => {
    const s = (rawStatus || "").toLowerCase().trim();
    if (s === "preparing" || s === "accepted" || s === "cooking" || s === "brewing") return 1;
    if (s === "ready" || s === "ready_for_pickup") return 2;
    if (s === "served" || s === "completed" || s === "done") return 3;
    return 0;
  };

  const currentStageIndex = getStageIndex(order?.status as string);

  return (
    <div className="fixed inset-0 z-50 bg-[#2C190E]/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-[#FAF7F0] rounded-t-3xl sm:rounded-3xl shadow-warm-xl overflow-hidden flex flex-col max-h-[90vh] border border-[#DFC9AC]">
        {/* Header */}
        <div className="bg-[#0A0A0A] text-[#FFFCF6] p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8B64F] text-[#1A0F08] flex items-center justify-center font-bold shadow-warm">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide text-[#FFFCF6]">
                Live Order Tracker
              </h3>
              <p className="text-[11px] text-[#DFC9AC]">
                {order?.tableNumber || "Your Table"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] flex items-center justify-center text-[#FFFCF6] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Confirmation Banner */}
          <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-2xl p-4 flex items-start gap-3 shadow-warm">
            <div className="w-8 h-8 rounded-full bg-[#E8B64F] text-[#301C10] flex items-center justify-center shrink-0 shadow-warm mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#301C10] text-sm">
                Order {order?.orderNumberDisplay || `#${order?.orderNumber || "---"}`} {currentStageIndex === 0 ? "received" : currentStageIndex === 1 ? "is preparing" : currentStageIndex === 2 ? "is ready" : "is served"}
              </h4>
              <p className="text-xs text-[#8A6A53] mt-0.5">
                {stages[currentStageIndex]?.desc || "Sent to the kitchen. We'll notify you when it's ready."}
              </p>
            </div>
          </div>

          {/* Stepper Progression */}
          <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm">
            <h4 className="text-xs font-bold text-[#8A6A53] uppercase tracking-wider mb-4">
              Status Progression
            </h4>

            <div className="space-y-4">
              {stages.map((stage, idx) => {
                const IconComponent = stage.icon;
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stage.key} className="flex items-start gap-3 relative">
                    {/* Connecting vertical line */}
                    {idx < stages.length - 1 && (
                      <div
                        className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors duration-300 ${idx < currentStageIndex ? "bg-[#E8B64F]" : "bg-[#DFC9AC]"
                          }`}
                      />
                    )}

                    {/* Stage icon circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 z-10 ${isCurrent
                          ? "bg-[#4A290F] text-[#FFFCF6] ring-4 ring-[#E8B64F]/40 shadow-warm-md font-bold scale-110"
                          : isPassed
                            ? "bg-[#E8B64F] text-[#301C10]"
                            : "bg-[#FAF7F0] text-[#8A6A53] border border-[#DFC9AC]"
                        }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${isCurrent
                              ? "text-[#301C10] text-sm"
                              : isPassed
                                ? "text-[#301C10]"
                                : "text-[#8A6A53]"
                            }`}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8B64F] text-[#301C10]">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8A6A53] mt-0.5">
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ordered Items Summary */}
          {order && (
            <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm space-y-2">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/60 pb-2">
                <span className="text-xs font-bold text-[#301C10]">Order Items</span>
                <span className="text-xs text-[#8A6A53]">
                  {formatTimeAgo(order.createdAt)}
                </span>
              </div>

              <div className="divide-y divide-[#DFC9AC]/50">
                {order.items?.map((item, i) => (
                  <div key={i} className="py-1.5 flex justify-between items-start gap-2 text-xs">
                    <div>
                      <span className="text-[#301C10] font-medium">
                        {item.quantity} × {item.name}
                      </span>
                      {item.sugarNote && (
                        <span className="block text-[10px] font-bold text-[#623B1B]">
                          {item.sugarNote}
                        </span>
                      )}
                    </div>
                    <span className="text-[#301C10] font-bold whitespace-nowrap">
                      {formatRupees(item.subtotalMinor)}
                    </span>
                  </div>
                ))}
              </div>

              {order.specialInstructions && (
                <div className="pt-2 text-[11px] text-[#301C10] bg-[#FAF7F0] p-2 rounded-lg border border-[#DFC9AC]">
                  <span className="font-bold text-[#4A290F]">Note:</span> {order.specialInstructions}
                </div>
              )}

              <div className="pt-2 border-t border-[#DFC9AC]/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#301C10]">Total (Pay at counter)</span>
                </div>
                <span className="text-base font-extrabold text-[#301C10]">
                  {formatRupees(order.totalMinor)}
                </span>
              </div>
            </div>
          )}

          {/* Friendly Google Review Prompt */}
          <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm space-y-3 text-center">
            <div className="flex items-center justify-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((idx) => (
                <Star
                  key={idx}
                  className="w-4 h-4 fill-[#E8B64F] text-[#E8B64F]"
                />
              ))}
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-[#301C10]">
                How’s your experience at TEA TIME?
              </h4>
              <p className="text-xs text-[#8A6A53] leading-relaxed">
                We’d love to hear what you think about our shop! Your quick review helps us serve you even better.
              </p>
            </div>

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0A0A0A] hover:bg-[#23140B] text-[#FFFCF6] border border-[#E8B64F]/40 text-xs font-extrabold tracking-wide shadow-warm transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <Star className="w-3.5 h-3.5 fill-[#E8B64F] text-[#E8B64F] shrink-0" />
              <span>Leave a Google Review</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#E8B64F] shrink-0" />
            </a>
          </div>

          {/* Connect With Us — Social Media Profile Buttons */}
          <div className="bg-[#FFFCF6] rounded-2xl p-3.5 border border-[#DFC9AC] shadow-warm space-y-2.5 text-center">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8A6A53]">
              Connect with us
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#E8B64F]/25 text-[#301C10] border border-[#DFC9AC] hover:border-[#C99532] text-xs font-extrabold shadow-warm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-[#4A290F] shrink-0"
                  aria-hidden="true"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>

              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#E8B64F]/25 text-[#301C10] border border-[#DFC9AC] hover:border-[#C99532] text-xs font-extrabold shadow-warm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-[#4A290F] shrink-0"
                  aria-hidden="true"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#FFFCF6] border-t border-[#DFC9AC] p-4 flex gap-2">
          {onOrderMore && (
            <button
              onClick={() => {
                onClose();
                onOrderMore();
              }}
              className="flex-1 bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              Order more items
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] hover:bg-[#623B1B] hover:text-[#FFFCF6] hover:border-[#623B1B] font-bold text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
