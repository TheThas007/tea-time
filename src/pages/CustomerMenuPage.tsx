import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Search, AlertTriangle } from "lucide-react";
import { db } from "../lib/firebase";
import { MenuItem, Category, TableItem } from "../types";
import { useCart } from "../context/CartContext";
import { CustomerHeader } from "../components/customer/CustomerHeader";
import { CategoryTabs } from "../components/customer/CategoryTabs";
import { ProductCard } from "../components/customer/ProductCard";
import { ProductDetailModal } from "../components/customer/ProductDetailModal";
import { StickyCartBar } from "../components/customer/StickyCartBar";
import { CartDrawer } from "../components/customer/CartDrawer";
import { LiveOrderTracker } from "../components/customer/LiveOrderTracker";
import { WelcomeScreen } from "../components/customer/WelcomeScreen";
import { INITIAL_CATEGORIES, INITIAL_MENU_ITEMS, INITIAL_TABLES } from "../data/seedData";
import {
  getProductImages,
  productMatchesCategory,
  mergeMenuWithSeed,
  mergeCategoriesWithSeed,
} from "../lib/utils";

export const CustomerMenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTableToken = searchParams.get("table") || localStorage.getItem("teatime_table_token") || "tbl_07_k8j3m";

  const {
    items: cartItems,
    addItem,
    totalItems,
    totalMinor,
    isCartOpen,
    setIsCartOpen,
    tableToken,
    setTableToken,
    currentTable,
    setCurrentTable,
    customerOrderIds,
  } = useCart();

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // Tracking & Selected Product state
  const [activeTrackerOrderId, setActiveTrackerOrderId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  // Welcome screen state: shown once per browser tab session
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("teatime_welcome_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  const handleDismissWelcome = () => {
    try {
      sessionStorage.setItem("teatime_welcome_dismissed", "true");
    } catch {
      // ignore storage errors
    }
    setShowWelcome(false);
  };

  // Immediate table label resolution from currentTable or URL/session token
  const welcomeTableLabel = useMemo(() => {
    if (currentTable?.number) return currentTable.number;
    if (rawTableToken) {
      const matched = INITIAL_TABLES.find((t) => t.token === rawTableToken.trim());
      if (matched) return matched.number;
      const numMatch = rawTableToken.match(/tbl_(\d+)/i);
      if (numMatch) return `Table ${numMatch[1].padStart(2, "0")}`;
    }
    return "Table 07";
  }, [currentTable, rawTableToken]);

  // Set table token in context
  useEffect(() => {
    if (rawTableToken && rawTableToken !== tableToken) {
      setTableToken(rawTableToken);
    }
  }, [rawTableToken, tableToken, setTableToken]);

  // Resolve table token from Firestore
  useEffect(() => {
    let isMounted = true;
    const resolveTable = async () => {
      if (!rawTableToken) {
        if (isMounted) {
          setTableLoading(false);
          setTableError("Please scan your table QR code to view the menu.");
        }
        return;
      }

      setTableLoading(true);
      setTableError(null);

      try {
        const q = query(
          collection(db, "tables"),
          where("token", "==", rawTableToken.trim())
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const doc = snap.docs[0];
          const tableData = { id: doc.id, ...doc.data() } as TableItem;

          if (!tableData.active) {
            if (isMounted) {
              setTableError(`Table ${tableData.number} is currently marked inactive by staff.`);
              setCurrentTable(null);
            }
          } else {
            if (isMounted) {
              setCurrentTable(tableData);
            }
          }
        } else {
          // Check fallback seed tables if running without populated Firestore
          const fallback = INITIAL_TABLES.find((t) => t.token === rawTableToken);
          if (fallback && fallback.active) {
            if (isMounted) setCurrentTable(fallback);
          } else {
            if (isMounted) {
              setTableError("Invalid table QR code. Please ask café staff or scan your table code again.");
              setCurrentTable(null);
            }
          }
        }
      } catch (err) {
        console.warn("Table resolution Firestore fallback:", err);
        const fallback = INITIAL_TABLES.find((t) => t.token === rawTableToken) || INITIAL_TABLES[6];
        if (isMounted) setCurrentTable(fallback);
      } finally {
        if (isMounted) setTableLoading(false);
      }
    };

    resolveTable();

    return () => {
      isMounted = false;
    };
  }, [rawTableToken, setCurrentTable]);

  // Real-time listener for Menu Items (merged idempotently with official catalog)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "menu"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MenuItem));
        setMenuItems(mergeMenuWithSeed(docs, INITIAL_MENU_ITEMS));
      },
      (err) => {
        console.warn("Firestore menu listener fallback to initial seed:", err);
        setMenuItems(INITIAL_MENU_ITEMS);
      }
    );

    return () => unsub();
  }, []);

  // Real-time listener for Categories (merged idempotently with official 15 categories)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "categories"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
        setCategories(mergeCategoriesWithSeed(docs, INITIAL_CATEGORIES));
      },
      (err) => {
        console.warn("Firestore categories listener fallback:", err);
        setCategories(INITIAL_CATEGORIES);
      }
    );

    return () => unsub();
  }, []);

  // Filtered & deduplicated menu items based on category and case-insensitive search
  const filteredProducts = useMemo(() => {
    const queryLower = searchQuery.trim().toLowerCase();
    const seenIds = new Set<string>();
    const result: MenuItem[] = [];

    for (const item of menuItems) {
      if (seenIds.has(item.id)) continue;

      const matchesCategory = productMatchesCategory(item, activeCategory);
      if (!matchesCategory) continue;

      const matchesSearch =
        !queryLower ||
        item.name.toLowerCase().includes(queryLower) ||
        (item.category && item.category.toLowerCase().includes(queryLower)) ||
        (Array.isArray(item.categories) &&
          item.categories.some((c) => c.toLowerCase().includes(queryLower)));

      if (matchesSearch) {
        seenIds.add(item.id);
        result.push(item);
      }
    }

    return result;
  }, [menuItems, activeCategory, searchQuery]);

  // Quantity mapping from cart
  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((ci) => map.set(ci.product.id, ci.quantity));
    return map;
  }, [cartItems]);

  const categoryTabItems = useMemo(() => {
    const iconMap = new Map<string, string>();
    iconMap.set("all", "/assets/favicon.png");

    menuItems.forEach((m) => {
      const primaryImg = getProductImages(m)[0];
      if (!primaryImg) return;
      const itemCats = [m.category, ...(m.categories || [])].filter(Boolean);
      for (const catName of itemCats) {
        const key = catName.toLowerCase();
        if (!iconMap.has(key)) {
          iconMap.set(key, primaryImg);
        }
      }
    });

    categories.forEach((c) => {
      if (c.name && c.iconUrl && c.iconUrl.trim()) {
        iconMap.set(c.name.toLowerCase(), c.iconUrl.trim());
      }
    });

    const sortedCats = [...categories].sort(
      (a, b) => (a.displayOrder || 999) - (b.displayOrder || 999)
    );
    const fromCats = sortedCats.map((c) => c.name);
    const fromItems = menuItems
      .flatMap((m) => [m.category, ...(m.categories || [])])
      .filter(Boolean);

    const seenLower = new Set<string>();
    const uniqueNames: string[] = [];
    for (const rawName of ["All", ...fromCats, ...fromItems]) {
      const trimmed = rawName?.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        uniqueNames.push(trimmed);
      }
    }

    return uniqueNames.map((name) => ({
      name,
      iconUrl: iconMap.get(name.toLowerCase()),
    }));
  }, [categories, menuItems]);

  return (
    <div className="relative min-h-screen pb-24 text-[#301C10] selection:bg-[#E8B64F]/30 overflow-x-hidden">
      {/* Welcome Screen (shown once per browser tab session until "Explore Our Menu" is clicked) */}
      {showWelcome && (
        <WelcomeScreen
          onExplore={handleDismissWelcome}
          tableNumber={welcomeTableLabel}
        />
      )}

      {/* Dedicated Viewport-Fixed Background Layer (Non-interactive, centred cover, no repeat) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#FAF7F0]"
      >
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/menu-bg.webp'), url('/assets/menu-bg.jpg'), url('/assets/menu-bg.png')" }}
        />
      </div>

      {/* Customer Header */}
      <CustomerHeader
        tableNumber={currentTable?.number || (tableLoading ? "Loading..." : "Table ---")}
        activeOrderCount={customerOrderIds.length}
        onOpenOrderTracker={() => {
          if (customerOrderIds.length > 0) {
            setActiveTrackerOrderId(customerOrderIds[0]);
          }
        }}
      />

      {/* Main Container */}
      <main className="relative z-10 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 space-y-4 md:space-y-6">
        {/* Table Token Alert if invalid or missing */}
        {tableError && (
          <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-2xl p-4 shadow-warm text-xs md:text-sm text-[#301C10] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#301C10]">
              <AlertTriangle className="w-4 h-4 text-[#E8B64F]" />
              <span>Table Verification Notice</span>
            </div>
            <p className="text-[#8A6A53]">{tableError}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSearchParams({ table: "tbl_07_k8j3m" });
                  setTableToken("tbl_07_k8j3m");
                }}
                className="px-3 py-1.5 rounded-lg bg-[#E8B64F] text-[#1A0F08] font-extrabold hover:bg-[#d9a53d] transition shadow-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
              >
                Use Table 07 (Demo)
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 md:w-5 md:h-5 absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-[#8A6A53]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items or categories..."
            className="w-full bg-[#FFFCF6] rounded-xl md:rounded-2xl border border-[#DFC9AC] pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 text-xs md:text-sm text-[#301C10] placeholder-[#8A6A53] shadow-warm focus:outline-none focus:ring-2 focus:ring-[#C99532] focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-[#8A6A53] hover:text-[#301C10] font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          categories={categoryTabItems}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => setActiveCategory(cat)}
        />

        {/* Product Cards Grid: 2 columns on mobile (untouched), 3 on iPad, 4 on Laptop */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 md:py-16 bg-[#FFFCF6] rounded-2xl border border-dashed border-[#DFC9AC] p-6 space-y-2 shadow-warm">
            <p className="text-sm md:text-base font-bold text-[#301C10]">No items found</p>
            <p className="text-xs md:text-sm text-[#8A6A53]">
              Try searching for something else or browse another category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="mt-2 px-4 py-1.5 md:px-5 md:py-2 rounded-lg bg-[#E8B64F] text-[#1A0F08] hover:bg-[#d9a53d] text-xs md:text-sm font-extrabold transition shadow-warm"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 lg:gap-6 pt-1">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={(p) => addItem(p, 1)}
                onSelect={(p) => setSelectedProduct(p)}
                cartQuantity={cartQuantityMap.get(product.id) || 0}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Connect With Us Footer */}
      <footer className="relative z-10 max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-4">
        <div className="bg-[#FFFCF6]/95 backdrop-blur-sm rounded-2xl border border-[#DFC9AC] p-4 md:p-5 shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8A6A53]">
              Connect with us
            </span>
            <p className="text-xs font-semibold text-[#301C10] mt-0.5">
              Follow TEA TIME for daily specials & updates
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <a
              href="https://www.instagram.com/teatime_vavuniya/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0A0A0A] hover:bg-[#23140B] text-[#FFFCF6] border border-[#E8B64F]/40 text-xs font-extrabold shadow-warm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[#E8B64F] shrink-0"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>Instagram</span>
            </a>

            <a
              href="https://www.facebook.com/teatime.vavuniya/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0A0A0A] hover:bg-[#23140B] text-[#FFFCF6] border border-[#E8B64F]/40 text-xs font-extrabold shadow-warm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[#E8B64F] shrink-0"
                aria-hidden="true"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Product Detail Bottom Sheet (mobile) / Centred Modal (desktop) */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToOrder={(product, quantity, sugarSpoons) =>
          addItem(product, quantity, sugarSpoons)
        }
        cartQuantity={selectedProduct ? cartQuantityMap.get(selectedProduct.id) || 0 : 0}
        initialSugarSpoons={
          selectedProduct
            ? cartItems.find((ci) => ci.product.id === selectedProduct.id)?.sugarSpoons ?? null
            : null
        }
      />

      {/* Sticky Bottom Cart Bar */}
      <StickyCartBar
        itemCount={totalItems}
        totalMinor={totalMinor}
        onClick={() => setIsCartOpen(true)}
      />

      {/* Cart Review Sheet */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderPlaced={(orderInfo) => {
          setActiveTrackerOrderId(orderInfo.orderId);
        }}
      />

      {/* Real-time Live Order Tracker */}
      {activeTrackerOrderId && (
        <LiveOrderTracker
          orderId={activeTrackerOrderId}
          onClose={() => setActiveTrackerOrderId(null)}
          onOrderMore={() => {
            setActiveTrackerOrderId(null);
          }}
        />
      )}
    </div>
  );
};
