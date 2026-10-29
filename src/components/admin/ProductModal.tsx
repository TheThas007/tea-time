import React, { useState } from "react";
import { X, UtensilsCrossed, AlertCircle, Trash2, Eye } from "lucide-react";
import { Category, MenuItem } from "../../types";
import { platformApi } from "../../lib/apiClient";

interface Props {
  product?: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductModal: React.FC<Props> = ({
  product,
  categories,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(product?.name || "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || (product as any)?.category || (categories[0]?.id || "")
  );
  const initialPriceRupees =
    typeof product?.priceRupees === "number"
      ? product.priceRupees
      : typeof product?.priceMinor === "number"
      ? Math.round(product.priceMinor / 100)
      : (product as any)?.price || 100;

  const [priceRupees, setPriceRupees] = useState<number>(initialPriceRupees);
  const [description, setDescription] = useState(product?.description || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [isAvailable, setIsAvailable] = useState<boolean>(product?.isAvailable ?? true);
  const [isVeg, setIsVeg] = useState<boolean>(product?.isVeg ?? false);
  const [isPopular, setIsPopular] = useState<boolean>(product?.isPopular ?? false);
  const [sortOrder, setSortOrder] = useState<number>(product?.sortOrder ?? 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!categoryId) {
      setError("Category selection is required.");
      return;
    }
    if (priceRupees < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      await platformApi.ownerUpsertProduct({
        id: product?.id,
        name: name.trim(),
        categoryId,
        priceRupees,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || null,
        isAvailable,
        isVeg,
        isPopular,
        sortOrder,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!product?.id) return;
    if (!window.confirm(`Are you sure you want to remove "${product.name}" from your active menu?`)) {
      return;
    }

    setLoading(true);
    try {
      await platformApi.ownerArchiveProduct(product.id);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to remove product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121214] border border-[#27272a] rounded-3xl w-full max-w-xl my-8 p-6 sm:p-8 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {product ? "Edit Product" : "Add Menu Item"}
            </h2>
            <p className="text-xs text-zinc-400">Configure item details, pricing, and availability</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
                placeholder="e.g. Special Burger"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Price (LKR) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
                  Rs.
                </span>
                <input
                  type="number"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(Number(e.target.value))}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                  required
                  min={0}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Image URL or Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
                placeholder="/images/menu/special/special-burger.png or https://..."
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-xl bg-black border border-[#27272a] overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => ((e.target as any).style.display = "none")}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
              placeholder="Crisp chicken patty with homemade spicy sauce..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2 p-3 bg-[#18181b] rounded-xl border border-[#27272a] cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="rounded accent-orange-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-zinc-300">Available</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-[#18181b] rounded-xl border border-[#27272a] cursor-pointer">
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-zinc-300">Vegetarian</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-[#18181b] rounded-xl border border-[#27272a] cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="rounded accent-orange-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-zinc-300">Popular</span>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-[#27272a]">
            {product?.id ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-white hover:bg-red-500/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
                {loading ? "Saving..." : "Save Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

