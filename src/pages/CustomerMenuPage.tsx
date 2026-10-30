import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { collection, query, where, getDoc, getDocs, onSnapshot, doc } from "firebase/firestore";
import { Search, AlertTriangle, Globe, Star } from "lucide-react";
import { db } from "../lib/firebase";
import { MenuItem, Category, TableItem, CafeSettings, SocialLinkItem } from "../types";
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
import { platformApi } from "../lib/apiClient";

export const CustomerMenuPage: React.FC = () => {
  const { businessSlug: rawSlug } = useParams<{ businessSlug?: string }>();
  const businessSlug = rawSlug ? rawSlug.toLowerCase().trim() : "teatime";

  const [searchParams, setSearchParams] = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";
  const rawTableToken = searchParams.get("table") || localStorage.getItem("teatime_table_token") || "tbl_07_k8j3m";

  const [tenantBusiness, setTenantBusiness] = useState<any | null>(null);
  const [isTenantUnavailable, setIsTenantUnavailable] = useState(false);

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
  const [cafeSettings, setCafeSettings] = useState<CafeSettings | null>(null);

  const isTeaTime = !businessSlug || businessSlug === "teatime" || tenantBusiness?.slug === "teatime";

  // Real-time listener for cafe settings or multi-tenant business settings
  useEffect(() => {
    if (isTeaTime) {
      const unsub = onSnapshot(
        doc(db, "settings", "cafe"),
        (snap) => {
          if (snap.exists()) {
            setCafeSettings(snap.data() as CafeSettings);
          }
        },
        (err) => {
          console.warn("Cafe settings listener fallback:", err);
        }
      );
      return () => unsub();
    } else {
      const targetBId = tenantBusiness?.id || businessSlug;
      const unsub = onSnapshot(
        doc(db, "businesses", targetBId),
        (snap) => {
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as any;
            setTenantBusiness((prev: any) => ({
              ...prev,
              ...data,
              isAvailable: data.status === "ACTIVE" && !data.isOrderingPaused,
            }));
          }
        },
        (err) => {
          console.warn("Tenant business listener fallback:", err);
        }
      );
      return () => unsub();
    }
  }, [isTeaTime, businessSlug, tenantBusiness?.id]);

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

  // Resolve tenant and table from Platform API
  useEffect(() => {
    let isMounted = true;
    const fetchTenant = async () => {
      try {
        const res = await platformApi.resolvePublicMenuTenant({
          businessSlug,
          tableToken: rawTableToken,
        });

        if (!isMounted) return;

        if (res.business) {
          setTenantBusiness(res.business);
          if (!res.business.isAvailable) {
            setIsTenantUnavailable(true);
            return;
          } else {
            setIsTenantUnavailable(false);
          }
        }

        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
        if (res.products && res.products.length > 0) {
          setMenuItems(res.products);
        }
        if (res.table) {
          setCurrentTable({
            id: res.table.id,
            number: res.table.tableNumber,
            token: res.table.token,
            active: true,
          });
        }
      } catch (err: any) {
        console.warn("Tenant resolution notice:", err);
      }
    };

    fetchTenant();
    return () => {
      isMounted = false;
    };
  }, [businessSlug, rawTableToken, setCurrentTable]);

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

      // 1. Multi-tenant business table resolution
      if (!isTeaTime) {
        try {
          if (tenantBusiness?.id) {
            const tokenSnap = await getDoc(
              doc(db, "businesses", tenantBusiness.id, "tableTokens", rawTableToken.trim())
            );
            if (tokenSnap.exists()) {
              const tData = tokenSnap.data();
              if (isMounted) {
                setCurrentTable({
                  id: tData.tableId || tData.id || "tbl",
                  number: tData.tableNumber || tData.number || "Table",
                  token: rawTableToken.trim(),
                  active: tData.active !== false,
                });
                setTableLoading(false);
                return;
              }
            }

            const q = query(
              collection(db, "businesses", tenantBusiness.id, "tables"),
              where("token", "==", rawTableToken.trim())
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const d = snap.docs[0];
              const tData = d.data();
              if (isMounted) {
                setCurrentTable({
                  id: d.id,
                  number: tData.tableNumber || tData.number || "Table",
                  token: rawTableToken.trim(),
                  active: tData.active !== false,
                });
                setTableLoading(false);
                return;
              }
            }
          }

          if (currentTable?.token === rawTableToken.trim()) {
            if (isMounted) setTableLoading(false);
            return;
          }
        } catch (tenantTableErr) {
          console.warn("Tenant table lookup notice:", tenantTableErr);
        }
        if (isMounted) setTableLoading(false);
        return;
      }

      // 2. Tea Time table resolution
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
              const tableLabel = tableData.number.toLowerCase().startsWith("table ")
                ? tableData.number
                : `Table ${tableData.number}`;
              setTableError(`${tableLabel} is currently marked inactive by staff.`);
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
  }, [rawTableToken, isTeaTime, tenantBusiness?.id, setCurrentTable]);

  // Real-time listener for Menu Items
  useEffect(() => {
    if (!isTeaTime && tenantBusiness?.id) {
      const prodColl = collection(db, "businesses", tenantBusiness.id, "products");
      const unsub = onSnapshot(
        prodColl,
        (snap) => {
          if (!snap.empty) {
            const items = snap.docs.map((d) => {
              const data = d.data();
              const pRupees = data.priceRupees || (data.priceMinor ? Math.round(data.priceMinor / 100) : 0);
              return {
                id: d.id,
                name: data.name || "Product",
                category: data.category || data.categoryId || "General",
                categoryId: data.categoryId || data.category || "cat_general",
                priceMinor: data.priceMinor || (pRupees * 100),
                priceRupees: pRupees,
                price: pRupees,
                priceDisplay: `Rs. ${pRupees}`,
                description: data.description || "",
                imageUrl: data.imageUrl || data.image || null,
                image: data.imageUrl || data.image || null,
                isAvailable: data.isAvailable !== false,
                available: data.isAvailable !== false,
                displayOrder: data.displayOrder ?? 0,
                isArchived: !!data.archived,
                sugarSelection: data.sugarSelection,
              } as unknown as MenuItem;
            }).filter((i: any) => !i.isArchived && !i.archived);
            setMenuItems(items);
          }
        },
        (err) => {
          console.warn("Tenant products listener notice:", err);
        }
      );
      return () => unsub();
    }

    if (isTeaTime) {
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
    }
  }, [isTeaTime, tenantBusiness?.id]);

  // Real-time listener for Categories
  useEffect(() => {
    if (!isTeaTime && tenantBusiness?.id) {
      const catColl = collection(db, "businesses", tenantBusiness.id, "categories");
      const unsub = onSnapshot(
        catColl,
        (snap) => {
          if (!snap.empty) {
            const cats = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || "Category",
                sortOrder: data.sortOrder ?? 0,
                icon: data.icon || "🍽️",
              } as Category;
            }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            setCategories(cats);
          }
        },
        (err) => {
          console.warn("Tenant categories listener notice:", err);
        }
      );
      return () => unsub();
    }

    if (isTeaTime) {
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
    }
  }, [isTeaTime, tenantBusiness?.id]);

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

  if (isTenantUnavailable) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#121214] border border-[#27272a] rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Menu Temporarily Unavailable</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This menu is currently unavailable. Please ask a staff member for assistance.
          </p>
        </div>
      </div>
    );
  }

  const tenantTheme = {
    primary: isTeaTime
      ? "#2C190E"
      : (tenantBusiness?.branding?.primaryColor || "#7BBBFF"),
    accent: isTeaTime
      ? "#E8B64F"
      : (tenantBusiness?.branding?.accentColor || "#B8A9FF"),
    bg: isTeaTime
      ? "#FAF7F0"
      : (tenantBusiness?.branding?.backgroundColor || "#F2FDFF"),
    text: isTeaTime
      ? "#301C10"
      : (tenantBusiness?.branding?.textColor || "#050F2A"),
    headerBg: isTeaTime
      ? "#0A0A0A"
      : (tenantBusiness?.branding?.headerBackgroundColor || tenantBusiness?.branding?.primaryColor || "#050F2A"),
    headerText: isTeaTime
      ? "#FFFCF6"
      : (tenantBusiness?.branding?.headerTextColor || "#F2FDFF"),
    logoUrl: isTeaTime
      ? null
      : (tenantBusiness?.branding?.logoUrl || null),
  };

  // Active social & Google review links in real-time
  const socialLinksList = useMemo(() => {
    // 1. From real-time cafeSettings (Tea Time or custom settings)
    if (Array.isArray(cafeSettings?.socialLinks) && cafeSettings.socialLinks.length > 0) {
      return (cafeSettings.socialLinks as SocialLinkItem[]).filter(
        (l) => l.isActive !== false && l.url && l.url.trim().length > 0
      );
    }
    // 2. From tenantBusiness if multi-tenant
    const tenantItems = (tenantBusiness as any)?.socialLinkItems || (tenantBusiness?.socialLinks as any)?.items;
    if (Array.isArray(tenantItems) && tenantItems.length > 0) {
      return tenantItems.filter((l: SocialLinkItem) => l.isActive !== false && l.url && l.url.trim().length > 0);
    }
    // 3. Fallback: synthesize from googleReviewUrl / instagramUrl / facebookUrl / whatsapp
    const synth: SocialLinkItem[] = [];
    const gUrl = cafeSettings?.googleReviewUrl || tenantBusiness?.googleReviewUrl || (isTeaTime ? "https://maps.google.com/?q=Tea+Time+Vavuniya" : null);
    if (gUrl) {
      synth.push({ id: "g_rev", platform: "google", label: "Google Profile & Reviews", url: gUrl, isActive: true });
    }
    const igUrl = cafeSettings?.instagramUrl || tenantBusiness?.instagramUrl || (isTeaTime ? "https://www.instagram.com/teatime_vavuniya/" : null);
    if (igUrl) {
      synth.push({ id: "ig_prof", platform: "instagram", label: "Instagram", url: igUrl, isActive: true });
    }
    const fbUrl = cafeSettings?.facebookUrl || tenantBusiness?.facebookUrl || (isTeaTime ? "https://www.facebook.com/teatime.vavuniya/" : null);
    if (fbUrl) {
      synth.push({ id: "fb_prof", platform: "facebook", label: "Facebook", url: fbUrl, isActive: true });
    }
    const waPhone = cafeSettings?.whatsapp || tenantBusiness?.whatsapp || (isTeaTime ? "0764847081" : null);
    if (waPhone) {
      const cleanPhone = waPhone.replace(/[^0-9]/g, "");
      const fullPhone = cleanPhone.startsWith("94") ? cleanPhone : (cleanPhone.startsWith("0") ? "94" + cleanPhone.slice(1) : "94" + cleanPhone);
      synth.push({ id: "wa_chat", platform: "whatsapp", label: "WhatsApp", url: `https://wa.me/${fullPhone}`, isActive: true });
    }
    return synth;
  }, [cafeSettings, tenantBusiness, isTeaTime]);

  const formatSocialUrl = (url: string, platform: string) => {
    const trimmed = (url || "").trim();
    if (!trimmed) return "#";
    if (platform === "whatsapp" && !trimmed.startsWith("http")) {
      const digits = trimmed.replace(/[^0-9]/g, "");
      const intl = digits.startsWith("94") ? digits : (digits.startsWith("0") ? "94" + digits.slice(1) : "94" + digits);
      return `https://wa.me/${intl}`;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const renderSocialIcon = (platform: string) => {
    switch (platform) {
      case "google":
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />;
      case "instagram":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#E8B64F] shrink-0">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
          </svg>
        );
      case "facebook":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#E8B64F] shrink-0">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        );
      case "whatsapp":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#E8B64F] shrink-0">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        );
      case "tiktok":
        return <span className="text-xs">🎵</span>;
      case "youtube":
        return <span className="text-xs text-red-500 font-bold">▶</span>;
      default:
        return <Globe className="w-4 h-4 text-[#E8B64F] shrink-0" />;
    }
  };

  return (
    <div
      className="relative min-h-screen pb-24 overflow-x-hidden"
      style={{
        backgroundColor: tenantTheme.bg,
        color: tenantTheme.text,
        "--tenant-primary": tenantTheme.primary,
        "--tenant-accent": tenantTheme.accent,
        "--tenant-bg": tenantTheme.bg,
        "--tenant-text": tenantTheme.text,
        "--tenant-header-bg": tenantTheme.headerBg,
        "--tenant-header-text": tenantTheme.headerText,
      } as React.CSSProperties}
    >
      {/* Interactive Demo Mode Top Banner */}
      {isDemoMode && (
        <div className="bg-[#050F2A] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-[#7BBBFF]">Menyo Live Demo</span>
            <span className="text-white/70 hidden sm:inline">
              • Interactive preview. Orders here are simulated and will not be prepared by the kitchen.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white/90">
            Demo Safe
          </span>
        </div>
      )}

      {/* Welcome Screen (shown once per browser tab session until "Explore Our Menu" is clicked) */}
      {showWelcome && (
        <WelcomeScreen
          onExplore={handleDismissWelcome}
          tableNumber={welcomeTableLabel}
        />
      )}

      {/* Dedicated Viewport-Fixed Background Layer */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
        style={{ backgroundColor: tenantTheme.bg }}
      >
        {isTeaTime ? (
          <div
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('/assets/menu-bg.webp'), url('/assets/menu-bg.jpg'), url('/assets/menu-bg.png')",
            }}
          />
        ) : null}
      </div>

      {/* Customer Header */}
      <CustomerHeader
        brandName={isTeaTime ? (cafeSettings?.cafeName || "TEA TIME") : (tenantBusiness?.name || "Menu")}
        logoUrl={tenantTheme.logoUrl}
        primaryColor={tenantTheme.headerBg}
        accentColor={tenantTheme.accent}
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
        {/* Ordering Paused Banner */}
        {cafeSettings?.isOrderingPaused && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-2xl p-4 shadow-warm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-xs text-amber-950">
                New Orders Temporarily Paused
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {cafeSettings.pauseMessage || "The café is temporarily pausing new orders. You can still browse the menu!"}
              </p>
            </div>
          </div>
        )}
        {/* Table Token Alert if invalid or missing */}
        {tableError && (
          <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-2xl p-4 shadow-warm text-xs md:text-sm text-[#301C10] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#301C10]">
              <AlertTriangle className="w-4 h-4 text-[#E8B64F]" />
              <span>Table Verification Notice</span>
            </div>
            <p className="text-[#8A6A53]">{tableError}</p>
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

          {/* Dynamic Real-time Social Media & Google Profile links */}
          <div className="flex items-center justify-center gap-2.5 w-full flex-wrap">
            {socialLinksList.map((link) => (
              <a
                key={link.id}
                href={formatSocialUrl(link.url, link.platform)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0A0A0A] hover:bg-[#23140B] text-[#FFFCF6] border text-xs font-extrabold shadow-warm transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                style={{
                  borderColor: isTeaTime ? "#E8B64F66" : `${tenantTheme.accent}66`,
                }}
              >
                {renderSocialIcon(link.platform)}
                <span>{link.label}</span>
              </a>
            ))}
          </div>

          {/* Kitchen & Staff Access */}
          <div className="pt-4 border-t border-[#DFC9AC]/30 text-center">
            <Link
              to={isTeaTime ? "/admin" : `/${tenantBusiness?.slug || businessSlug}/admin`}
              className="text-[11px] text-[#8A6A53] hover:text-[#301C10] font-semibold transition"
            >
              Kitchen & Staff Portal &bull; Live Orders
            </Link>
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
        businessSlug={businessSlug}
        isDemo={isDemoMode}
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
