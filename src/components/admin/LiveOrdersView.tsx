import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  Bell, 
  ChefHat, 
  CheckCircle2, 
  Check, 
  Ban, 
  History
} from "lucide-react";
import { db, callUpdateOrderStatus } from "../../lib/firebase";
import { Order, OrderStatus } from "../../types";
import { formatRupees, formatTimeAgo } from "../../lib/utils";
import { soundManager } from "../../lib/audio";

export const LiveOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const previousNewOrdersCount = useRef<number | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Order));

        const currentNewCount = list.filter((o) => o.status === "new").length;

        if (
          previousNewOrdersCount.current !== null &&
          currentNewCount > previousNewOrdersCount.current
        ) {
          soundManager.playNewOrderChime();
        }

        previousNewOrdersCount.current = currentNewCount;
        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Orders live listener fallback:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setActionLoadingId(orderId);
    try {
      await callUpdateOrderStatus({ orderId, status: nextStatus });
    } catch (functionErr) {
      console.warn("Cloud function update fallback to direct Firestore admin update:", functionErr);
      try {
        const orderRef = doc(db, "orders", orderId);
        const payload: Record<string, any> = {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        };
        if (nextStatus === "served") {
          payload.servedAt = serverTimestamp();
        }
        await updateDoc(orderRef, payload);
      } catch (directErr) {
        console.error("Direct update failure:", directErr);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = window.prompt("Reason for cancelling order (optional):", "Customer request / item unavailable");
    if (reason === null) return;

    setActionLoadingId(orderId);
    try {
      await callUpdateOrderStatus({
        orderId,
        status: "cancelled",
        cancelReason: reason || "Cancelled by staff",
      });
    } catch {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "cancelled",
        cancelReason: reason || "Cancelled by staff",
        updatedAt: serverTimestamp(),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const historyOrders = orders.filter((o) => o.status === "served" || o.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DFC9AC] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#301C10] tracking-tight">
              Live orders
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8B64F] animate-pulse" />
          </div>
          <p className="text-xs text-[#8A6A53] font-medium mt-0.5">
            New orders from your cafe, in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
              showHistory
                ? "bg-[#4A290F] text-[#FFFCF6]"
                : "bg-[#FFFCF6] border border-[#DFC9AC] text-[#301C10] hover:bg-[#623B1B] hover:text-[#FFFCF6] hover:border-[#623B1B]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{showHistory ? "Show Live Kanban" : "Order History"}</span>
          </button>
        </div>
      </div>

      {!showHistory ? (
        <>
          {/* Top 3 Stat Summary Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* New Stat Card */}
            <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#E8B64F]/20 border border-[#E8B64F]/50 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-[#4A290F]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A6A53]">New</span>
                <p className="text-2xl sm:text-3xl font-black text-[#301C10] leading-none mt-0.5">
                  {newOrders.length}
                </p>
              </div>
            </div>

            {/* Preparing Stat Card */}
            <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#FAF7F0] border border-[#DFC9AC] flex items-center justify-center shrink-0">
                <ChefHat className="w-6 h-6 text-[#4A290F]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A6A53]">Preparing</span>
                <p className="text-2xl sm:text-3xl font-black text-[#301C10] leading-none mt-0.5">
                  {preparingOrders.length}
                </p>
              </div>
            </div>

            {/* Ready Stat Card */}
            <div className="bg-[#FFFCF6] rounded-2xl p-4 border border-[#DFC9AC] shadow-warm flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#4A290F] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-[#E8B64F]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#8A6A53]">Ready</span>
                <p className="text-2xl sm:text-3xl font-black text-[#301C10] leading-none mt-0.5">
                  {readyOrders.length}
                </p>
              </div>
            </div>
          </div>

          {/* 3-Column Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Column 1: New */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    New ({newOrders.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {newOrders.length === 0 ? (
                  <div className="bg-[#FFFCF6]/70 rounded-2xl border border-dashed border-[#DFC9AC] p-8 text-center text-xs text-[#8A6A53]">
                    No new orders waiting
                  </div>
                ) : (
                  newOrders.map((order) => (
                    <OrderKanbanCard
                      key={order.id}
                      order={order}
                      column="new"
                      loading={actionLoadingId === order.id}
                      onPrimaryAction={() => handleUpdateStatus(order.id, "preparing")}
                      onCancel={() => handleCancelOrder(order.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Preparing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8A6A53]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Preparing ({preparingOrders.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {preparingOrders.length === 0 ? (
                  <div className="bg-[#FFFCF6]/70 rounded-2xl border border-dashed border-[#DFC9AC] p-8 text-center text-xs text-[#8A6A53]">
                    No orders being prepared
                  </div>
                ) : (
                  preparingOrders.map((order) => (
                    <OrderKanbanCard
                      key={order.id}
                      order={order}
                      column="preparing"
                      loading={actionLoadingId === order.id}
                      onPrimaryAction={() => handleUpdateStatus(order.id, "ready")}
                      onCancel={() => handleCancelOrder(order.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Ready */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A290F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Ready ({readyOrders.length})
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {readyOrders.length === 0 ? (
                  <div className="bg-[#FFFCF6]/70 rounded-2xl border border-dashed border-[#DFC9AC] p-8 text-center text-xs text-[#8A6A53]">
                    No orders awaiting pickup
                  </div>
                ) : (
                  readyOrders.map((order) => (
                    <OrderKanbanCard
                      key={order.id}
                      order={order}
                      column="ready"
                      loading={actionLoadingId === order.id}
                      onPrimaryAction={() => handleUpdateStatus(order.id, "served")}
                      onCancel={() => handleCancelOrder(order.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Order History View */
        <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DFC9AC]/60 pb-3">
            <h3 className="font-extrabold text-sm text-[#301C10]">
              Completed & Cancelled Orders ({historyOrders.length})
            </h3>
          </div>

          {historyOrders.length === 0 ? (
            <p className="text-xs text-[#8A6A53] py-6 text-center">
              No completed order history yet.
            </p>
          ) : (
            <div className="divide-y divide-[#DFC9AC]/50">
              {historyOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#301C10]">
                        {order.orderNumberDisplay || `#${order.orderNumber}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DFC9AC] text-[#301C10] font-semibold text-[11px]">
                        {order.tableNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === "served"
                            ? "bg-[#E8B64F]/30 text-[#301C10]"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p className="text-[#8A6A53] text-[11px]">
                      {order.items?.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-[#301C10] text-sm block">
                      {formatRupees(order.totalMinor)}
                    </span>
                    <span className="text-[11px] text-[#8A6A53]">
                      {formatTimeAgo(order.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface OrderKanbanCardProps {
  order: Order;
  column: "new" | "preparing" | "ready";
  loading: boolean;
  onPrimaryAction: () => void;
  onCancel: () => void;
}

const OrderKanbanCard: React.FC<OrderKanbanCardProps> = ({
  order,
  column,
  loading,
  onPrimaryAction,
  onCancel,
}) => {
  return (
    <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-4 shadow-warm hover:shadow-warm-md transition space-y-3">
      {/* Top row: Order Number & Time ago */}
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-sm text-[#301C10]">
          Order {order.orderNumberDisplay || `#${order.orderNumber}`}
        </span>
        <span className="text-[11px] font-medium text-[#8A6A53] bg-[#FAF7F0] px-2 py-0.5 rounded-md border border-[#DFC9AC]">
          {formatTimeAgo(order.createdAt)}
        </span>
      </div>

      {/* Table Pill */}
      <div>
        <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#E8B64F]/25 border border-[#E8B64F]/50 text-[#301C10] text-xs font-bold">
          {order.tableNumber}
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-1.5 text-xs text-[#301C10] border-y border-[#DFC9AC]/60 py-2">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start gap-2 font-medium">
            <div>
              <span>
                {item.quantity} × {item.name}
              </span>
              {item.sugarNote && (
                <span className="block text-[10px] font-bold text-[#623B1B]">
                  {item.sugarNote}
                </span>
              )}
            </div>
            <span className="text-[#8A6A53] text-[11px] whitespace-nowrap">
              {formatRupees(item.subtotalMinor)}
            </span>
          </div>
        ))}
      </div>

      {/* Special instructions if any */}
      {order.specialInstructions && (
        <div className="text-[11px] text-[#301C10] bg-[#FAF7F0] p-2 rounded-lg border border-[#DFC9AC] font-medium">
          <span className="font-bold text-[#4A290F]">Instructions:</span> {order.specialInstructions}
        </div>
      )}

      {/* Total & Action Button */}
      <div className="pt-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8A6A53] font-semibold">Total</span>
          <span className="text-base font-extrabold text-[#301C10]">
            {formatRupees(order.totalMinor)}
          </span>
        </div>

        {/* Primary Action Button */}
        {column === "new" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrimaryAction}
              disabled={loading}
              className="flex-1 bg-[#E8B64F] hover:bg-[#d9a53d] disabled:opacity-60 text-[#1A0F08] font-extrabold py-2.5 px-3 rounded-xl text-xs shadow-warm transition active:scale-[0.98] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-[#1A0F08]" />
              <span>Accept order</span>
            </button>

            <button
              onClick={onCancel}
              disabled={loading}
              title="Cancel order"
              className="p-2.5 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#8A6A53] hover:text-red-700 hover:border-red-300 transition"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {column === "preparing" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrimaryAction}
              disabled={loading}
              className="flex-1 bg-[#E8B64F] hover:bg-[#d9a53d] disabled:opacity-60 text-[#1A0F08] font-extrabold py-2.5 px-3 rounded-xl text-xs shadow-warm transition active:scale-[0.98] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#1A0F08]" />
              <span>Mark ready</span>
            </button>

            <button
              onClick={onCancel}
              disabled={loading}
              title="Cancel order"
              className="p-2.5 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#8A6A53] hover:text-red-700 hover:border-red-300 transition"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {column === "ready" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrimaryAction}
              disabled={loading}
              className="flex-1 bg-[#E8B64F] hover:bg-[#d9a53d] disabled:opacity-60 text-[#1A0F08] font-extrabold py-2.5 px-3 rounded-xl text-xs shadow-warm transition active:scale-[0.98] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1A0F08]" />
              <span>Complete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
