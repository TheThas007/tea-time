import React, { useState, useRef } from "react";
import { X, UtensilsCrossed, AlertCircle, Trash2, Upload, Loader2, Image as ImageIcon, Plus, Check } from "lucide-react";
import { Category, MenuItem } from "../../types";
import { platformApi } from "../../lib/apiClient";
import { storage, ref, uploadBytes, getDownloadURL } from "../../lib/supabase";

interface Props {
  businessId?: string;
  product?: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: (savedProduct?: any) => void;
}

export const ProductModal: React.FC<Props> = ({
  businessId,
  product,
  categories,
  onClose,
  onSuccess,
}) => {
  const availableCategories =
    categories && categories.length > 0
      ? categories
      : [{ id: "cat_general", name: "General" } as Category];

  const [name, setName] = useState(product?.name || "");
  const [supportsSugar, setSupportsSugar] = useState<boolean>(() => {
    if ((product as any)?.supportsSugar) return true;
    if (product?.id && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`menyo_sugar_products_${businessId}`);
        if (raw) return Boolean(JSON.parse(raw)[product.id]);
      } catch {}
    }
    return false;
  });
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || (product as any)?.category || availableCategories[0]?.id || "cat_general"
  );
  const initialPriceRupees =
    typeof product?.priceRupees === "number"
      ? product.priceRupees
      : typeof product?.priceMinor === "number"
      ? Math.round(product.priceMinor / 100)
      : (product as any)?.price || 100;

  const initialImages: string[] = (() => {
    const list: string[] = [];
    if (Array.isArray(product?.imageUrls)) {
      list.push(...product.imageUrls.filter((u) => Boolean(u && typeof u === "string")));
    }
    const single = product?.imageUrl || (product as any)?.image;
    if (single && typeof single === "string" && !list.includes(single)) {
      list.unshift(single);
    }
    return list.slice(0, 3);
  })();

  const [priceRupees, setPriceRupees] = useState<number>(initialPriceRupees);
  const [description, setDescription] = useState(product?.description || "");
  const [images, setImages] = useState<string[]>(initialImages);
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(product?.isAvailable ?? true);
  const [isVeg, setIsVeg] = useState<boolean>(product?.isVeg ?? false);
  const [isPopular, setIsPopular] = useState<boolean>(product?.isPopular ?? false);
  const [sortOrder, setSortOrder] = useState<number>(product?.sortOrder ?? 0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<Category[]>(availableCategories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [uploadingCategoryIcon, setUploadingCategoryIcon] = useState(false);
  const categoryIconInputRef = useRef<HTMLInputElement>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // Quick Direct Category Icon Upload (Supabase Storage)
  const handleCategoryIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file for category icon.");
      return;
    }

    setUploadingCategoryIcon(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const bId = businessId || "teatime";
      const fileName = `categories/${bId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setNewCategoryIcon(downloadUrl);
    } catch (err: any) {
      console.error("Direct category icon upload error:", err);
      setError("Failed to upload category icon.");
    } finally {
      setUploadingCategoryIcon(false);
      if (categoryIconInputRef.current) categoryIconInputRef.current.value = "";
    }
  };

  // Quick Inline Category Creation
  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    setError(null);
    try {
      const res = await platformApi.ownerUpsertCategory({
        businessId,
        name: newCategoryName.trim(),
        sortOrder: categoriesList.length,
        icon: newCategoryIcon.trim() || undefined,
        iconUrl: newCategoryIcon.trim() || undefined,
      });

      const createdCat: Category = {
        id: (res as any)?.id || `cat_${Date.now()}`,
        name: newCategoryName.trim(),
        slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, "-"),
        displayOrder: categoriesList.length,
        icon: newCategoryIcon.trim() || undefined,
        iconUrl: newCategoryIcon.trim() || undefined,
      };

      setCategoriesList((prev) => [...prev, createdCat]);
      setCategoryId(createdCat.id);
      setNewCategoryName("");
      setNewCategoryIcon("");
      setIsAddingCategory(false);
    } catch (err: any) {
      console.warn("Category creation fallback to local:", err);
      const fallbackCat: Category = {
        id: `cat_${Date.now()}`,
        name: newCategoryName.trim(),
        slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, "-"),
        displayOrder: categoriesList.length,
        icon: newCategoryIcon.trim() || undefined,
        iconUrl: newCategoryIcon.trim() || undefined,
      };
      setCategoriesList((prev) => [...prev, fallbackCat]);
      setCategoryId(fallbackCat.id);
      setNewCategoryName("");
      setNewCategoryIcon("");
      setIsAddingCategory(false);
    } finally {
      setSavingCategory(false);
    }
  };

  // Direct Image File Upload Handler (Supabase Storage)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const bId = businessId || "teatime";
      const fileName = `products/${bId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setImages((prev) => {
        if (prev.length >= 3) {
          setError("Maximum 3 photos per product allowed.");
          return prev;
        }
        return [...prev, downloadUrl];
      });
    } catch (err: any) {
      console.error("Direct image upload error:", err);
      setError(err?.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (images.length >= 3) {
      setError("Maximum 3 photos per product allowed.");
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setNewImageUrl("");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    const effectiveCategoryId = categoryId || categoriesList[0]?.id || availableCategories[0]?.id || "cat_general";
    const chosenCat =
      categoriesList.find((c) => c.id === effectiveCategoryId) ||
      availableCategories.find((c) => c.id === effectiveCategoryId);
    const catName = chosenCat?.name || "General";

    if (priceRupees < 0) {
      setError("Price cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      const validImages = images.filter((u) => Boolean(u && u.trim())).slice(0, 3);
      const primaryUrl = validImages[0] || null;

      const saved = await platformApi.ownerUpsertProduct({
        businessId,
        id: product?.id,
        name: name.trim(),
        categoryId: effectiveCategoryId,
        category: catName,
        priceRupees,
        description: description.trim() || undefined,
        imageUrl: primaryUrl,
        imageUrls: validImages,
        isAvailable,
        isVeg,
        isPopular,
        sortOrder,
      });
      if (saved?.id && typeof window !== "undefined") {
        try {
          const key = `menyo_sugar_products_${businessId}`;
          const raw = localStorage.getItem(key);
          const map: Record<string, boolean> = raw ? JSON.parse(raw) : {};
          map[saved.id] = supportsSugar;
          localStorage.setItem(key, JSON.stringify(map));
        } catch {}
      }
      onSuccess({ ...saved, supportsSugar } as any);
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
      await platformApi.ownerArchiveProduct({ productId: product.id, businessId });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to remove product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050F2A]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl w-full max-w-xl my-8 p-6 sm:p-8 shadow-xl text-[#050F2A] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#64748B] hover:text-[#050F2A] hover:bg-[#F8F9FA] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#7BBBFF]/20 border border-[#7BBBFF]/40 flex items-center justify-center text-[#050F2A]">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#050F2A]">
              {product ? "Edit Product" : "Add Menu Item"}
            </h2>
            <p className="text-xs text-[#64748B]">Configure item details, pricing, and availability</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#050F2A] mb-1">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#64748B]/50 text-sm focus:outline-none focus:border-[#7BBBFF]"
                placeholder="e.g. Special Burger"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#050F2A]">Category *</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-xs font-bold text-[#7BBBFF] hover:text-[#050F2A] flex items-center gap-1 transition"
                  title="Add new category"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingCategory ? "Cancel" : "Add New"}</span>
                </button>
              </div>

              {isAddingCategory && (
                <div className="mb-2 p-2.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl space-y-2 animate-fadeIn shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name (e.g. Burgers)..."
                      className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddCategory}
                      disabled={savingCategory || !newCategoryName.trim()}
                      className="px-2.5 py-1 rounded-lg bg-[#050F2A] hover:bg-[#050F2A]/90 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition shadow-sm"
                    >
                      {savingCategory ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Optional Category Icon upload / emoji */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]/40">
                    <input
                      type="file"
                      ref={categoryIconInputRef}
                      onChange={handleCategoryIconUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />

                    <div className="w-7 h-7 rounded-full border border-[#E2E8F0] bg-[#F8F9FA] shrink-0 flex items-center justify-center overflow-hidden">
                      {newCategoryIcon ? (
                        newCategoryIcon.startsWith("http") || newCategoryIcon.startsWith("/") ? (
                          <img src={newCategoryIcon} alt="Cat Icon" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs">{newCategoryIcon}</span>
                        )
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-[#64748B]" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => categoryIconInputRef.current?.click()}
                      disabled={uploadingCategoryIcon}
                      className="px-2 py-0.5 rounded-md border border-[#E2E8F0] hover:bg-[#F8F9FA] text-[10px] font-bold text-[#050F2A] flex items-center gap-1 transition"
                    >
                      {uploadingCategoryIcon ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      <span>Upload Icon</span>
                    </button>

                    <input
                      type="text"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      placeholder="Icon URL or Emoji (optional)"
                      className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-md px-2 py-0.5 text-[11px] text-[#050F2A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#7BBBFF]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  required
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#7BBBFF]/20 border border-[#E2E8F0] text-[#050F2A] transition shrink-0"
                  title="Add new category"
                >
                  <Plus className="w-4 h-4 text-[#7BBBFF]" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#050F2A] mb-1">Price (LKR) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B]">
                  Rs.
                </span>
                <input
                  type="number"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(Number(e.target.value))}
                  className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF] font-mono font-bold"
                  required
                  min={0}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#050F2A] mb-1">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
              />
            </div>
          </div>

          {/* Food Item Image: Support 1 to 3 images with Preview, Upload, and Delete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#050F2A]">
                Product Photos ({images.length}/3)
              </label>
              <span className="text-[11px] text-[#64748B]">
                First image will be the primary cover photo
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {/* Gallery of Uploaded Images */}
            {images.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-xl border-2 border-[#E2E8F0] overflow-hidden group bg-[#F8F9FA] shrink-0 shadow-xs"
                  >
                    <img
                      src={imgSrc}
                      alt={`Product ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => ((e.target as any).src = "/assets/favicon.png")}
                    />
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-[#050F2A]/80 text-[9px] font-bold text-white text-center py-0.5 uppercase tracking-wider">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Remove this photo"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-sm transition active:scale-95"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload or Add URL (if less than 3) */}
            {images.length < 3 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3.5 py-2 rounded-xl bg-[#050F2A] hover:bg-[#0A1840] text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm disabled:opacity-50 shrink-0"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7BBBFF]" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#7BBBFF]" />
                      <span>+ Upload Photo ({images.length + 1}/3)</span>
                    </>
                  )}
                </button>

                <div className="flex-1 w-full flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddUrlImage();
                      }
                    }}
                    className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-[#050F2A] placeholder-[#64748B]/50 text-xs focus:outline-none focus:border-[#7BBBFF]"
                    placeholder="Or paste photo URL..."
                  />
                  {newImageUrl.trim() && (
                    <button
                      type="button"
                      onClick={handleAddUrlImage}
                      className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-xs font-bold text-[#050F2A]"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#64748B]">
              Add up to 3 high-quality photos. Customers can swipe and view the full gallery in the menu detail popup.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#050F2A] mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#64748B]/50 text-sm focus:outline-none focus:border-[#7BBBFF]"
              placeholder="Crisp chicken patty with homemade spicy sauce..."
            />
          </div>

          <div className="pt-4 flex items-center justify-between gap-3 border-t border-[#E2E8F0]">
            {product?.id ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
            ) : <div />}

            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#050F2A] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={supportsSugar}
                  onChange={(e) => setSupportsSugar(e.target.checked)}
                  className="rounded border-slate-300 text-[#050F2A] focus:ring-[#050F2A]"
                />
                <span>Sugar Option (Low / Normal / High)</span>
              </label>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#64748B] hover:text-[#050F2A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#050F2A] hover:bg-[#0A1840] active:scale-95 disabled:opacity-50 text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                {loading ? "Saving..." : "Save Product"}
              </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

