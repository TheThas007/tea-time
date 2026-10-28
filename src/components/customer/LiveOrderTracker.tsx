import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  BellRing, 
  CheckCheck, 
  X, 
  Utensils
} from "lucide-react";
import { db } from "../../lib/firebase";
import { Order, OrderStatus } from "../../types";
import { formatRupees, formatTimeAgo } from "../../lib/utils";

interface LiveOrderTrackerProps {
  orderId: string;
  onClose: () => void;
  onOrderMore?: () => void;
}

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({
  orderId,
  onClose,
  onOrderMore,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Real-time Firestore document listener
    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() } as Order);
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Real-time order listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  const stages: { key: OrderStatus; label: string; icon: any; desc: string }[] = [
    { key: "new", label: "Received", icon: Clock, desc: "Sent to the kitchen." },
    { key: "preparing", label: "Preparing", icon: ChefHat, desc: "Our team is brewing and baking." },
    { key: "ready", label: "Ready", icon: BellRing, desc: "Ready for pickup or serving!" },
    { key: "served", label: "Served", icon: CheckCheck, desc: "Enjoy your tea time!" },
  ];

  const getStageIndex = (status?: OrderStatus) => {
    switch (status) {
      case "new": return 0;
      case "preparing": return 1;
      case "ready": return 2;
      case "served": return 3;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(order?.status);

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
                Order {order?.orderNumberDisplay || `#${order?.orderNumber || "---"}`} received
              </h4>
              <p className="text-xs text-[#8A6A53] mt-0.5">
                Sent to the kitchen. We'll notify you when it's ready.
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
                        className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors duration-300 ${
                          idx < currentStageIndex ? "bg-[#E8B64F]" : "bg-[#DFC9AC]"
                        }`}
                      />
                    )}

                    {/* Stage icon circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 z-10 ${
                        isCurrent
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
                          className={`text-xs font-bold ${
                            isCurrent
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
                  <div key={i} className="py-1.5 flex justify-between items-center text-xs">
                    <span className="text-[#301C10] font-medium">
                      {item.quantity} × {item.name}
                    </span>
                    <span className="text-[#301C10] font-bold">
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
