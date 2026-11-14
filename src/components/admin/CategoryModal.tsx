import React, { useState, useRef } from "react";
import { X, Layers, AlertCircle, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Category, MenuItem } from "../../types";
import { platformApi } from "../../lib/apiClient";
import { storage, ref, uploadBytes, getDownloadURL } from "../../lib/supabase";

interface UpsertProps {
  businessId?: string;
  category?: Category | null;
  onClose: () => void;
  onSuccess: (savedCategory?: any) => void;
}

export const CategoryUpsertModal: React.FC<UpsertProps> = ({
  businessId,
  category,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(category?.name || "");
  const [sortOrder, setSortOrder] = useState<number>(category?.sortOrder ?? 0);
  const [icon, setIcon] = useState(category?.icon || (category as any)?.iconUrl || "");
  const [loading, setLoading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Category icon size must be less than 5 MB.");
      return;
    }

    setUploadingIcon(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const bId = businessId || "teatime";
      const fileName = `categories/${bId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setIcon(downloadUrl);
    } catch (err: any) {
      console.error("Direct category icon upload error:", err);
      setError(err?.message || "Failed to upload category icon. Please try again.");
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setLoading(true);
    try {
      const saved = await platformApi.ownerUpsertCategory({
        businessId,
        id: category?.id,
        name: name.trim(),
        sortOrder,
        icon: icon.trim() || undefined,
        iconUrl: icon.trim() || undefined,
      });
      onSuccess(saved);
    } catch (err: any) {
      setError(err?.message || "Failed to save category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050F2A]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#050F2A]/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-[#050F2A] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-[#050F2A] hover:bg-gray-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#7BBBFF]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
              {category ? "Edit Category" : "Add Menu Category"}
            </h2>
            <p className="text-xs text-gray-500">Group your products for easy customer discovery</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#050F2A] mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-gray-200 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-gray-400 text-sm focus:outline-none focus:border-[#7BBBFF]"
              placeholder="e.g. Coffee & Milk Tea"
              required
            />
          </div>

          {/* Category Icon / Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#050F2A] mb-1.5">
              Category Icon / Image
            </label>
            
            <div className="flex items-center gap-3">
              {/* Circular Preview */}
              <div className="w-14 h-14 rounded-full border-2 border-gray-200 bg-[#F8F9FA] overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative group">
                {icon ? (
                  icon.startsWith("http") || icon.startsWith("/") || icon.startsWith("data:") ? (
                    <img src={icon} alt="Category icon" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{icon}</span>
                  )
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                )}
                {uploadingIcon && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={iconInputRef}
                    onChange={handleIconUpload}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={uploadingIcon}
                    className="px-3 py-1.5 rounded-xl bg-[#050F2A] hover:bg-[#050F2A]/90 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                  >
                    {uploadingIcon ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload Image</span>
                  </button>

                  {icon && (
                    <button
                      type="button"
                      onClick={() => setIcon("")}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-500 text-xs font-semibold transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Or paste image URL or Emoji (☕)"
                    className="w-full bg-[#F8F9FA] border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-[#050F2A] placeholder-gray-400 focus:outline-none focus:border-[#7BBBFF]"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Displayed on top customer tabs.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#050F2A] mb-1">Display Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full bg-[#F8F9FA] border border-gray-200 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-[#050F2A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#050F2A] hover:bg-[#050F2A]/90 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
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
  businessId?: string;
  category: Category;
  categories: Category[];
  products: MenuItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ArchiveCategoryModal: React.FC<ArchiveProps> = ({
  businessId,
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
      await platformApi.ownerArchiveCategory(category.id, reassignTo || undefined, businessId);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to remove category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2C190E]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF7F0] border border-[#DFC9AC] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-[#2C190E] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#8A6A53] hover:text-[#2C190E] hover:bg-[#DFC9AC]/30 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#2C190E]">Archive Category</h2>
            <p className="text-xs text-[#8A6A53]">"{category.name}"</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-xs text-[#623B1B]">
          {affectedProducts.length > 0 ? (
            <div className="space-y-3">
              <p className="text-amber-800 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  This category contains {affectedProducts.length} product(s). To prevent orphaned items, select where to move them:
                </span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#623B1B] mb-1">
                  Reassign products to:
                </label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full bg-[#FFFCF6] border border-[#DFC9AC] rounded-xl px-3.5 py-2.5 text-[#2C190E] text-sm focus:outline-none focus:border-[#C99532]"
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
            <p className="text-[#8A6A53]">
              Are you sure you want to archive this category? It currently has no assigned products.
            </p>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#DFC9AC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#8A6A53] hover:text-[#2C190E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={loading || (affectedProducts.length > 0 && !reassignTo)}
              className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
            >
              {loading ? "Archiving..." : "Archive Category"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
