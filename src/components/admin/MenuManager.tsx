import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  Tag,
  AlertCircle,
  Layers,
  Link as LinkIcon,
  Check,
  Utensils
} from "lucide-react";
import { db, storage } from "../../lib/firebase";
import { MenuItem, Category } from "../../types";
import { formatRupees, getProductImages } from "../../lib/utils";
import { INITIAL_CATEGORIES, DEFAULT_CATEGORY_ICONS } from "../../data/seedData";

export const MenuManager: React.FC = () => {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // Edit / Create Product modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);

  // Category Manager modal & inline states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIconUrl, setNewCategoryIconUrl] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatIconUrl, setEditingCatIconUrl] = useState("");

  // Inline category state inside Product Modal
  const [isAddingInlineCategory, setIsAddingInlineCategory] = useState(false);
  const [inlineCategoryInput, setInlineCategoryInput] = useState("");
  const [inlineCategoryIconInput, setInlineCategoryIconInput] = useState("");
  const [isEditingSelectedCatIcon, setIsEditingSelectedCatIcon] = useState(false);

  // Product Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tea");
  const [priceRupees, setPriceRupees] = useState<number>(250);
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [uploadingSlotIndex, setUploadingSlotIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Real-time Firestore listener for menu products
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menu"), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
      items.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener for categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
        list.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
        setCategories(list);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }
    });
    return () => unsub();
  }, []);

  const getCategoryIcon = (catName: string): string => {
    const found = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    if (found?.iconUrl) return found.iconUrl;
    return DEFAULT_CATEGORY_ICONS[catName.toLowerCase()] || "";
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setCategory(categories[0]?.name || "Tea");
    setPriceRupees(250);
    setDescription("");
    setImageUrls([
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    ]);
    setIsAvailable(true);
    setIsAddingInlineCategory(false);
    setIsEditingSelectedCatIcon(false);
    setInlineCategoryInput("");
    setInlineCategoryIconInput("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: MenuItem) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category || "Tea");
    setPriceRupees(Math.round(prod.priceMinor / 100));
    setDescription(prod.description || "");
    const existingImages = getProductImages(prod);
    setImageUrls(existingImages.length > 0 ? existingImages : [""]);
    setIsAvailable(prod.isAvailable !== false);
    setIsAddingInlineCategory(false);
    setIsEditingSelectedCatIcon(false);
    setInlineCategoryInput("");
    setInlineCategoryIconInput("");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Category Operations: Add with Icon Link
  const handleAddCategory = async (catName: string, iconLink: string = "") => {
    const trimmed = catName.trim();
    if (!trimmed) return;

    // Check duplicate
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setFormError(`Category "${trimmed}" already exists.`);
      return;
    }

    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const docId = `cat_${slug}_${Date.now().toString(36)}`;
    const resolvedIcon =
      iconLink.trim() ||
      DEFAULT_CATEGORY_ICONS[trimmed.toLowerCase()] ||
      "";

    const newCat: Category = {
      id: docId,
      name: trimmed,
      slug: slug,
      displayOrder: categories.length + 1,
      iconUrl: resolvedIcon,
    };

    try {
      await setDoc(doc(db, "categories", docId), newCat, { merge: true });
      setCategory(trimmed);
      setNewCategoryName("");
      setNewCategoryIconUrl("");
      setInlineCategoryInput("");
      setInlineCategoryIconInput("");
      setIsAddingInlineCategory(false);
    } catch (err) {
      console.error("Add category error:", err);
      setCategories((prev) => [...prev, newCat]);
      setCategory(trimmed);
      setIsAddingInlineCategory(false);
    }
  };

  // Category Operations: Update Icon URL for an existing category
  const handleUpdateCategoryIcon = async (cat: Category, newIconLink: string) => {
    const trimmedUrl = newIconLink.trim();
    const docId = cat.id || `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

    const updatedCat: Category = {
      ...cat,
      id: docId,
      iconUrl: trimmedUrl,
    };

    try {
      await setDoc(doc(db, "categories", docId), updatedCat, { merge: true });
      setCategories((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === cat.name.toLowerCase() ? updatedCat : c
        )
      );
      setEditingCatId(null);
      setIsEditingSelectedCatIcon(false);
    } catch (err) {
      console.error("Update category icon error:", err);
      setCategories((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === cat.name.toLowerCase() ? updatedCat : c
        )
      );
      setEditingCatId(null);
      setIsEditingSelectedCatIcon(false);
    }
  };

  // Category Operations: Delete
  const handleDeleteCategory = async (catId: string, catName: string) => {
    const count = products.filter((p) => p.category?.toLowerCase() === catName.toLowerCase()).length;
    let message = `Are you sure you want to delete the category "${catName}"?`;
    if (count > 0) {
      message = `Warning: ${count} menu item(s) are currently in "${catName}". Deleting this category will not delete the products. Proceed?`;
    }

    if (!window.confirm(message)) return;

    try {
      if (catId) {
        await deleteDoc(doc(db, "categories", catId));
      }
      setCategories((prev) => prev.filter((c) => c.name.toLowerCase() !== catName.toLowerCase()));
      if (category.toLowerCase() === catName.toLowerCase()) {
        const next = categories.find((c) => c.name.toLowerCase() !== catName.toLowerCase())?.name || "Tea";
        setCategory(next);
      }
    } catch (err) {
      console.error("Delete category error:", err);
      setCategories((prev) => prev.filter((c) => c.name.toLowerCase() !== catName.toLowerCase()));
    }
  };

  const handleImageSlotChange = (index: number, value: string) => {
    setImageUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddImageSlot = () => {
    setImageUrls((prev) => (prev.length < 3 ? [...prev, ""] : prev));
  };

  const handleRemoveImageSlot = (index: number) => {
    setImageUrls((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const handleImageFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image file size must be less than 5 MB.");
      return;
    }

    setUploadingSlotIndex(index);
    setFormError(null);

    try {
      const storageRef = ref(storage, `products/${Date.now()}_${index}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      handleImageSlotChange(index, downloadUrl);
    } catch (err: any) {
      console.warn("Storage upload fallback:", err);
      handleImageSlotChange(index, URL.createObjectURL(file));
    } finally {
      setUploadingSlotIndex(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    const priceMinor = Math.round(Number(priceRupees) * 100);
    if (isNaN(priceMinor) || priceMinor <= 0) {
      setFormError("Please enter a valid price in rupees.");
      return;
    }

    const cleanedUrls = imageUrls
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
      .slice(0, 3);

    const primaryImageUrl =
      cleanedUrls[0] ||
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80";

    const finalImageUrls = cleanedUrls.length > 0 ? cleanedUrls : [primaryImageUrl];

    const payload = {
      name: name.trim(),
      category: category.trim(),
      priceMinor,
      priceDisplay: Math.round(Number(priceRupees)),
      description: description.trim(),
      imageUrl: primaryImageUrl,
      imageUrls: finalImageUrls,
      isAvailable,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, "menu", editingProduct.id), payload);
      } else {
        await addDoc(collection(db, "menu"), {
          ...payload,
          displayOrder: products.length + 1,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save product error:", err);
      setFormError("Failed to save product to database.");
    }
  };

  const handleToggleAvailability = async (product: MenuItem) => {
    try {
      await updateDoc(doc(db, "menu", product.id), {
        isAvailable: !product.isAvailable,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Toggle availability error:", err);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" from the menu?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "menu", productId));
    } catch (err) {
      console.error("Delete product error:", err);
    }
  };

  const selectedCategoryObj = categories.find(
    (c) => c.name.toLowerCase() === category.toLowerCase()
  ) || {
    id: `cat_${category.toLowerCase()}`,
    name: category,
    slug: category.toLowerCase(),
    displayOrder: 99,
    iconUrl: getCategoryIcon(category),
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DFC9AC] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#301C10] tracking-tight">
            Menu Management
          </h1>
          <p className="text-xs text-[#8A6A53] font-medium mt-0.5">
            Add, update items, adjust pricing, categories & round icons, or mark sold out.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Manage Categories Button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-[#FFFCF6] border border-[#DFC9AC] hover:bg-[#FAF7F0] text-[#301C10] font-bold px-3.5 py-2 rounded-xl text-xs shadow-warm flex items-center gap-1.5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
          >
            <Layers className="w-4 h-4 text-[#E8B64F]" />
            <span>Categories & Icons ({categories.length})</span>
          </button>

          {/* Add Menu Item Button */}
          <button
            onClick={openCreateModal}
            className="bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-extrabold px-4 py-2 rounded-xl text-xs shadow-warm flex items-center gap-1.5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF7F0] border-b border-[#DFC9AC] text-[11px] font-bold text-[#8A6A53] uppercase tracking-wider">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFC9AC]/60 text-xs">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#8A6A53]">
                    No menu items in database. Click "Add Menu Item" or seed demo data in Settings.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const catIcon = getCategoryIcon(product.category);
                  const prodImages = getProductImages(product);
                  return (
                    <tr key={product.id} className="hover:bg-[#FAF7F0]/70 transition">
                      {/* Item */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 aspect-square rounded-xl overflow-hidden bg-[#FAF7F0] border border-[#DFC9AC] shrink-0 shadow-warm">
                            <img
                              src={prodImages[0] || product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            {prodImages.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-[#2C190E]/85 text-[#E8B64F] text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                                {prodImages.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#301C10]">{product.name}</p>
                            <p className="text-[11px] text-[#8A6A53] line-clamp-1 max-w-xs">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category with Round Icon */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F0] border border-[#DFC9AC] text-[#301C10] font-semibold text-[11px]">
                          {catIcon ? (
                            <img
                              src={catIcon}
                              alt={product.category}
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-[#DFC9AC]"
                            />
                          ) : null}
                          <span>{product.category}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-bold text-[#301C10]">
                        {formatRupees(product.priceMinor)}
                      </td>

                      {/* Availability Toggle */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                            product.isAvailable !== false
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.isAvailable !== false ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          <span>{product.isAvailable !== false ? "In Stock" : "Sold Out"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1.5 rounded-lg text-[#8A6A53] hover:text-[#301C10] hover:bg-[#FAF7F0] transition"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="p-1.5 rounded-lg text-[#8A6A53] hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#2C190E]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF7F0] rounded-3xl shadow-warm-xl max-w-md w-full overflow-hidden border border-[#DFC9AC] max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#2C190E] text-[#FFFCF6] p-4 flex items-center justify-between shrink-0 border-b border-[#4A290F]">
              <h3 className="font-extrabold text-sm">
                {editingProduct ? "Edit Menu Item" : "Create New Menu Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8A6A53] hover:text-[#FFFCF6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block font-bold text-[#301C10] mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ceylon Milk Tea"
                  className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#301C10]">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingInlineCategory(!isAddingInlineCategory);
                        setIsEditingSelectedCatIcon(false);
                      }}
                      className="text-[11px] font-bold text-[#4A290F] hover:text-[#623B1B] flex items-center gap-0.5"
                      title="Add a new category with round icon"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>{isAddingInlineCategory ? "Cancel" : "New"}</span>
                    </button>
                  </div>

                  {/* Inline New Category + Round Icon Link Input Box */}
                  {isAddingInlineCategory ? (
                    <div className="mb-2.5 p-2.5 bg-[#FFFCF6] border border-[#DFC9AC] rounded-xl space-y-2 animate-fadeIn shadow-warm">
                      <input
                        type="text"
                        autoFocus
                        value={inlineCategoryInput}
                        onChange={(e) => setInlineCategoryInput(e.target.value)}
                        placeholder="Category name (e.g. Juices)"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DFC9AC] focus:outline-none focus:ring-2 focus:ring-[#C99532]/40 bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#FAF7F0] border border-[#DFC9AC] shrink-0 flex items-center justify-center">
                          {inlineCategoryIconInput.trim() ? (
                            <img
                              src={inlineCategoryIconInput.trim()}
                              alt="Icon preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <LinkIcon className="w-3 h-3 text-[#E8B64F]" />
                          )}
                        </div>
                        <input
                          type="url"
                          value={inlineCategoryIconInput}
                          onChange={(e) => setInlineCategoryIconInput(e.target.value)}
                          placeholder="Round icon image link (https://...)"
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#DFC9AC] focus:outline-none focus:ring-2 focus:ring-[#C99532]/40 bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCategory(inlineCategoryInput, inlineCategoryIconInput);
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-1.5 justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => setIsAddingInlineCategory(false)}
                          className="px-2 py-1 text-[10px] text-[#8A6A53] hover:text-[#301C10] font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddCategory(inlineCategoryInput, inlineCategoryIconInput)
                          }
                          className="px-3 py-1 bg-[#4A290F] text-[#FFFCF6] text-[10px] font-bold rounded-lg hover:bg-[#623B1B] shadow-warm"
                        >
                          Add Category
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Category Dropdown with Round Icon Preview, Icon Edit & Delete button */}
                  <div className="flex items-center gap-1.5">
                    {/* Round Icon Preview of selected category */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatIconUrl(getCategoryIcon(category));
                        setIsEditingSelectedCatIcon(!isEditingSelectedCatIcon);
                        setIsAddingInlineCategory(false);
                      }}
                      title="Click to change category round icon link"
                      className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#E8B64F] bg-[#FFFCF6] shrink-0 flex items-center justify-center relative group shadow-warm"
                    >
                      {getCategoryIcon(category) ? (
                        <img
                          src={getCategoryIcon(category)}
                          alt={category}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Utensils className="w-4 h-4 text-[#8A6A53]" />
                      )}
                      <span className="absolute inset-0 bg-[#2C190E]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <LinkIcon className="w-3.5 h-3.5 text-[#FFFCF6]" />
                      </span>
                    </button>

                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setIsEditingSelectedCatIcon(false);
                      }}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-[#DFC9AC] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none bg-[#FFFCF6] text-[#301C10] font-medium min-w-0"
                    >
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    {/* Delete currently selected category button */}
                    <button
                      type="button"
                      onClick={() => {
                        const target = categories.find(
                          (c) => c.name.toLowerCase() === category.toLowerCase()
                        );
                        if (target) {
                          handleDeleteCategory(target.id, target.name);
                        } else {
                          handleDeleteCategory("", category);
                        }
                      }}
                      className="p-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#8A6A53] hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition shrink-0"
                      title={`Delete category "${category}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Edit Icon Link for currently selected category */}
                  {isEditingSelectedCatIcon && (
                    <div className="mt-2 p-2 bg-[#FFFCF6] border border-[#DFC9AC] rounded-xl space-y-1.5 animate-fadeIn">
                      <label className="block text-[10px] font-bold text-[#301C10]">
                        Icon Link for "{category}"
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          value={editingCatIconUrl}
                          onChange={(e) => setEditingCatIconUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-[#DFC9AC] focus:outline-none focus:ring-2 focus:ring-[#C99532]/40 bg-[#FAF7F0] text-[#301C10]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCategoryIcon(selectedCategoryObj, editingCatIconUrl)
                          }
                          className="px-2.5 py-1 bg-[#4A290F] text-[#FFFCF6] text-[10px] font-bold rounded-lg hover:bg-[#623B1B]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">
                    Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#301C10] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Flavor profile, brew style, ingredients..."
                  className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none resize-none"
                />
              </div>

              {/* 1 to 3 Product Photos (Square Preview + URL or File Upload) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#301C10]">
                    Product Photos (1 to 3 Square Images)
                  </label>
                  {imageUrls.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddImageSlot}
                      className="text-[11px] font-bold text-[#4A290F] hover:text-[#623B1B] flex items-center gap-1 bg-[#FFFCF6] border border-[#DFC9AC] px-2.5 py-1 rounded-lg shadow-warm transition"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Add Image ({imageUrls.length}/3)</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-[#FFFCF6] border border-[#DFC9AC] flex items-center gap-3 shadow-warm"
                    >
                      {/* Square 1:1 Image Preview */}
                      <div className="w-14 h-14 aspect-square rounded-xl overflow-hidden bg-[#FAF7F0] border border-[#DFC9AC] shrink-0 flex items-center justify-center relative">
                        {url.trim() ? (
                          <img
                            src={url.trim()}
                            alt={`Product photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-[#8A6A53]">
                            #{idx + 1}
                          </span>
                        )}
                        <span className="absolute top-1 left-1 bg-[#2C190E]/80 text-[#E8B64F] text-[9px] font-extrabold px-1.5 rounded">
                          {idx === 0 ? "Main" : `#${idx + 1}`}
                        </span>
                      </div>

                      {/* URL Input + Upload & Remove Actions */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => handleImageSlotChange(idx, e.target.value)}
                          placeholder={`Photo ${idx + 1} URL (https://...)`}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none text-xs"
                        />

                        <div className="flex items-center justify-between gap-2">
                          <label className="cursor-pointer bg-[#FAF7F0] border border-[#DFC9AC] hover:bg-[#DFC9AC]/30 text-[#301C10] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition text-[11px]">
                            <Upload className="w-3 h-3 text-[#4A290F]" />
                            <span>
                              {uploadingSlotIndex === idx
                                ? "Uploading..."
                                : `Upload Photo ${idx + 1}`}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileUpload(idx, e)}
                              className="hidden"
                            />
                          </label>

                          {imageUrls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImageSlot(idx)}
                              className="text-[11px] font-semibold text-[#8A6A53] hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition flex items-center gap-1"
                              title="Remove this image"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In stock toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="availToggle"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 accent-[#4A290F] rounded focus:ring-[#C99532]"
                />
                <label htmlFor="availToggle" className="font-semibold text-[#301C10] cursor-pointer">
                  Available in stock for ordering
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-[#DFC9AC] flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] hover:bg-[#DFC9AC]/30 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-extrabold shadow-warm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                >
                  {editingProduct ? "Save Changes" : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category & Round Icons Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#2C190E]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF7F0] rounded-3xl shadow-warm-xl max-w-md w-full overflow-hidden border border-[#DFC9AC]">
            {/* Header */}
            <div className="bg-[#2C190E] text-[#FFFCF6] p-4 flex items-center justify-between border-b border-[#4A290F]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#E8B64F]" />
                <h3 className="font-extrabold text-sm">Manage Categories & Round Icons</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[#8A6A53] hover:text-[#FFFCF6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Add New Category with Icon Link */}
              <div className="bg-[#FFFCF6] p-3.5 rounded-2xl border border-[#DFC9AC] space-y-2.5 shadow-warm">
                <label className="block font-bold text-[#301C10]">
                  Add New Category
                </label>

                <div className="flex items-center gap-2.5">
                  {/* Live Circular Icon Preview */}
                  <div className="w-11 h-11 rounded-full border-2 border-[#E8B64F] bg-[#FAF7F0] overflow-hidden shrink-0 flex items-center justify-center shadow-warm">
                    {newCategoryIconUrl.trim() ? (
                      <img
                        src={newCategoryIconUrl.trim()}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-4 h-4 text-[#8A6A53]" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category Name (e.g. Milkshakes, Juices)"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#DFC9AC] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53]"
                    />
                    <input
                      type="url"
                      value={newCategoryIconUrl}
                      onChange={(e) => setNewCategoryIconUrl(e.target.value)}
                      placeholder="Round Icon Image Link (https://...)"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#DFC9AC] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory(newCategoryName, newCategoryIconUrl);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleAddCategory(newCategoryName, newCategoryIconUrl)}
                    className="bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold px-4 py-1.5 rounded-xl transition flex items-center gap-1 shadow-warm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {/* Existing Categories List */}
              <div className="pt-1">
                <label className="block font-bold text-[#301C10] mb-1.5">
                  Current Categories ({categories.length})
                </label>
                <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] divide-y divide-[#DFC9AC]/70 max-h-64 overflow-y-auto shadow-warm">
                  {categories.map((cat) => {
                    const itemCount = products.filter(
                      (p) => p.category?.toLowerCase() === cat.name.toLowerCase()
                    ).length;
                    const resolvedIcon =
                      cat.iconUrl || DEFAULT_CATEGORY_ICONS[cat.name.toLowerCase()] || "";
                    const isEditingThis = editingCatId === (cat.id || cat.name);

                    return (
                      <div
                        key={cat.id || cat.name}
                        className="p-3 space-y-2 hover:bg-[#FAF7F0] transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Round Category Icon */}
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#DFC9AC] bg-[#FAF7F0] shrink-0 flex items-center justify-center shadow-warm">
                              {resolvedIcon ? (
                                <img
                                  src={resolvedIcon}
                                  alt={cat.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Utensils className="w-4 h-4 text-[#8A6A53]" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-[#301C10] block truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-[#8A6A53] font-medium">
                                {itemCount} {itemCount === 1 ? "item" : "items"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThis) {
                                  setEditingCatId(null);
                                } else {
                                  setEditingCatId(cat.id || cat.name);
                                  setEditingCatIconUrl(resolvedIcon);
                                }
                              }}
                              className="px-2 py-1 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] hover:bg-[#DFC9AC]/40 text-[10px] font-bold flex items-center gap-1 transition"
                              title="Add or change round icon link"
                            >
                              <LinkIcon className="w-3 h-3 text-[#E8B64F]" />
                              <span>Icon Link</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 rounded-lg text-[#8A6A53] hover:text-red-600 hover:bg-red-50 transition"
                              title={`Delete ${cat.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Icon Link Editor for this category */}
                        {isEditingThis && (
                          <div className="flex items-center gap-1.5 pt-1 animate-fadeIn">
                            <input
                              type="url"
                              autoFocus
                              value={editingCatIconUrl}
                              onChange={(e) => setEditingCatIconUrl(e.target.value)}
                              placeholder="Paste round icon image link (https://...)"
                              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] text-xs focus:outline-none focus:ring-2 focus:ring-[#C99532]/40"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleUpdateCategoryIcon(cat, editingCatIconUrl);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCategoryIcon(cat, editingCatIconUrl)}
                              className="px-3 py-1.5 rounded-lg bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold text-[11px] flex items-center gap-1 shrink-0"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Save</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#DFC9AC] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#4A290F] text-[#FFFCF6] font-bold hover:bg-[#623B1B] transition text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
