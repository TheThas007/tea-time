import React, { useState } from "react";
import { X, Layers, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { Category, MenuItem } from "../../types";
import { platformApi } from "../../lib/apiClient";

interface UpsertProps {
  category?: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryUpsertModal: React.FC<UpsertProps> = ({ category, onClose, onSuccess }) => {
  const [name, setName] = useState(category?.name || "");
  const [sortOrder, setSortOrder] = useState<number>(category?.sortOrder ?? 0);
  const [icon, setIcon] = useState(category?.icon || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setLoading(true);
    try {
      await platformApi.ownerUpsertCategory({
        id: category?.id,
        name: name.trim(),
        sortOrder,
        icon: icon.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to save category.");
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
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {category ? "Edit Category" : "Add Menu Category"}
            </h2>
            <p className="text-xs text-zinc-400">Group your products for easy customer discovery</p>
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
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
              placeholder="e.g. Coffee & Milk Tea"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Display Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Emoji / Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                placeholder="☕"
              />
            </div>
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
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20"
            >
              {loading ? "Saving..." : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ArchiveProps {
  category: Category;
  categories: Category[];
  products: MenuItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ArchiveCategoryModal: React.FC<ArchiveProps> = ({
  category,
  categories,
  products,
  onClose,
  onSuccess,
}) => {
  const affectedProducts = products.filter(
    (p) => p.categoryId === category.id || (p as any).category === category.id || (p as any).category === category.name
  );

  const availableTargetCategories = categories.filter((c) => c.id !== category.id);
  const [reassignTo, setReassignTo] = useState<string>(
    availableTargetCategories.length > 0 ? availableTargetCategories[0].id : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    setError(null);
    if (affectedProducts.length > 0 && !reassignTo) {
      setError("Please select a target category to safely reassign existing products.");
      return;
    }

    setLoading(true);
    try {
      await platformApi.ownerArchiveCategory(category.id, reassignTo || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to remove category.");
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
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Archive Category</h2>
            <p className="text-xs text-zinc-400">"{category.name}"</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-xs text-zinc-300">
          {affectedProducts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  This category contains {affectedProducts.length} product(s). To prevent orphaned items, select where to move them:
                </span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Reassign products to:
                </label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  {availableTargetCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p>
              Are you sure you want to archive this category? It currently has no assigned products.
            </p>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={loading || (affectedProducts.length > 0 && !reassignTo)}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
            >
              {loading ? "Archiving..." : "Archive Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

