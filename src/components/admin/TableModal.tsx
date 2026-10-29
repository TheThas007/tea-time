import React, { useState } from "react";
import { X, QrCode, AlertCircle } from "lucide-react";
import { TableItem } from "../../types";
import { platformApi } from "../../lib/apiClient";

interface Props {
  table?: TableItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TableModal: React.FC<Props> = ({ table, onClose, onSuccess }) => {
  const [tableNumber, setTableNumber] = useState(table?.tableNumber || "");
  const [capacity, setCapacity] = useState<number>(table?.capacity || 4);
  const [notes, setNotes] = useState(table?.notes || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tableNumber.trim()) {
      setError("Table number/name is required.");
      return;
    }

    setLoading(true);
    try {
      await platformApi.ownerUpsertTable({
        id: table?.id,
        tableNumber: tableNumber.trim(),
        capacity: Number(capacity) || 4,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to save table.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#27272a] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {table ? "Edit Table" : "Add Dining Table"}
            </h2>
            <p className="text-xs text-zinc-400">Generates unique secure QR token for order placement</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Table Name / Number *
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
              placeholder="e.g. Table 01 or Balcony 3"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Seating Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              min={1}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Internal Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              placeholder="e.g. Near corner window"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !tableNumber.trim()}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20"
            >
              {loading ? "Saving..." : "Save Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

