import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Camera,
  UtensilsCrossed,
  Layers,
  QrCode,
  ShoppingBag,
  Settings,
  Plus,
  ExternalLink,
  LogOut,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Search,
  Eye,
  Edit,
  Trash2,
  ShieldAlert,
  Sparkles,
  Phone,
  CreditCard,
  MessageCircle,
  Smartphone,
  Monitor,
  RotateCcw,
  Upload,
  Globe,
  Star,
  EyeOff,
  Bell,
  LayoutGrid,
  Volume2,
  VolumeX,
  User,
  ChevronDown,
  Power,
  Sparkle
} from "lucide-react";
import { soundManager } from "../lib/audio";
import { formatOrderDateTime, formatTimeAgo } from "../lib/utils";
import { platformApi } from "../lib/apiClient";
import { auth, signOut, storage, ref, uploadBytes, getDownloadURL } from "../lib/supabase";
import {
  db,
  doc as storeDoc,
  collection,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from "../lib/supabaseStore";
import {
  Category,
  MenuItem,
  Order,
  OrderStatus,
  TableItem,
  UserProfileRecord,
  SocialLinkItem,
  SocialPlatform,
} from "../types";
import { ForcePasswordChangeModal } from "../components/auth/ForcePasswordChangeModal";
import { SingleTablePrintModal, BatchTablesPrintModal, getQrLogoHeight } from "../components/admin/PrintableTableCard";
import { SubscriptionUpgradeModal } from "../components/admin/SubscriptionUpgradeModal";
import { QuickOnboardingChecklist } from "../components/admin/QuickOnboardingChecklist";
import { WORLD_COUNTRIES, getPhonePlaceholder } from "../lib/countries";
import { getSupabase } from "../lib/supabase";
import { BillingSystemTab } from "../components/admin/BillingSystemTab";
import { InstallAppBanner } from "../components/admin/InstallAppBanner";
import { CategoryUpsertModal, ArchiveCategoryModal } from "../components/admin/CategoryModal";
import { ProductModal } from "../components/admin/ProductModal";
import { TableModal } from "../components/admin/TableModal";
import { CafeSettingsView } from "../components/admin/CafeSettingsView";
import { MenyoIcon, MenyoWordmark } from "../components/common/MenyoLogo";
import { AdminDashboardPage } from "./AdminDashboardPage";

import { Gift } from "lucide-react";
import { CustomerRewardRecord } from "../lib/rewards";

type DashboardTab = "overview" | "orders" | "billing" | "menu" | "categories" | "tables" | "rewards" | "settings" | "memory" | "plan";

export const BusinessDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { businessSlug } = useParams<{ businessSlug?: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session context
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showBusinessSetupModal, setShowBusinessSetupModal] = useState(false);
  const [memoryLogoPos, setMemoryLogoPos] = useState<string>("bottom-right");
  const [memoryLogoUrl, setMemoryLogoUrl] = useState<string>("");
  const [setupBusinessName, setSetupBusinessName] = useState("");
  const [setupCountry, setSetupCountry] = useState("");
  const [setupCountryCode, setSetupCountryCode] = useState("+94");
  const [setupPhone, setSetupPhone] = useState("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);
  const [codeSearch, setCodeSearch] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Active Tab (defaults to live orders just like Tea Time's admin panel)
  const [activeTab, setActiveTab] = useState<DashboardTab>("orders");
  const [billingPreloadItems, setBillingPreloadItems] = useState<{ productId: string; name: string; price: number; qty: number }[] | null>(null);
  const [billingPreloadPhone, setBillingPreloadPhone] = useState<string | null>(null);
  const [billedOrderIds, setBilledOrderIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("menyo_billed_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const last1AmCutoffMs = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0);
    if (now.getTime() < cutoff.getTime()) {
      cutoff.setDate(cutoff.getDate() - 1);
    }
    return cutoff.getTime();
  }, []);

  // Real-time audio chime, clock, and staff dropdown (matching Tea Time AdminHeader)
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [currentTime, setCurrentTime] = useState(formatOrderDateTime());
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const previousNewOrdersCount = React.useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatOrderDateTime());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Real-time collections for this tenant
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerRewardRecord[]>([]);
  const [rewardPointValue, setRewardPointValue] = useState<number>(5);
  const [rewardPointsPer100, setRewardPointsPer100] = useState<number>(2);
  const [todaySpecial, setTodaySpecial] = useState<{
    enabled: boolean;
    productId: string;
    title: string;
    priceRupees: number;
    imageUrl: string;
  }>({ enabled: false, productId: "", title: "", priceRupees: 0, imageUrl: "" });
  const [rewardSearchQuery, setRewardSearchQuery] = useState<string>("");
  const [savingRewardRate, setSavingRewardRate] = useState(false);
  const [rewardRateSaved, setRewardRateSaved] = useState(false);

  useEffect(() => {
    const currentNewCount = orders.filter((o) => o.status === "PENDING" || o.status === "new").length;
    if (previousNewOrdersCount.current !== null && currentNewCount > previousNewOrdersCount.current) {
      soundManager.playNewOrderChime();
    }
    previousNewOrdersCount.current = currentNewCount;
  }, [orders]);

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playNewOrderChime();
    }
  };

  // Search & filter
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archivingCategory, setArchivingCategory] = useState<Category | null>(null);

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [singlePrintTable, setSinglePrintTable] = useState<TableItem | null>(null);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Settings form state (6 branding colors + logo + details + QR card settings)
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    address: "",
    googleReviewUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    logoUrl: "",
    primaryColor: "#050F2A",
    accentColor: "#7BBBFF",
    backgroundColor: "#F8F9FA",
    textColor: "#050F2A",
    headerBackgroundColor: "#050F2A",
    headerTextColor: "#F8F9FA",
    qrHeaderTitle: "",
    qrSubtitle: "SCAN TO ORDER",
    qrFooterNote: "Good food. One scan away.",
    qrLogoSize: 140,
    allCategoryIcon: "✨",
    socialLinks: [] as SocialLinkItem[],
  });

  // Real-time live settings for this tenant (reads localStorage fallback + business.branding)
  const effectiveLiveBranding = useMemo(() => {
    let localData: any = null;
    if (typeof window !== "undefined") {
      try {
        const bKey = business?.slug ? `menyo_settings_${business.slug}` : (businessSlug ? `menyo_settings_${businessSlug}` : null);
        const bKeyId = business?.id ? `menyo_settings_${business.id}` : null;
        const raw = (bKey && localStorage.getItem(bKey)) || (bKeyId && localStorage.getItem(bKeyId));
        if (raw) localData = JSON.parse(raw);
      } catch { }
    }
    const b = business?.branding || {};
    return {
      primaryColor: localData?.primaryColor || b.primaryColor || (business?.slug === "teatime" ? "#24140E" : "#050F2A"),
      accentColor: localData?.accentColor || b.accentColor || (business?.slug === "teatime" ? "#7BBBFF" : "#7BBBFF"),
      headerBackgroundColor: localData?.headerBackgroundColor || b.headerBackgroundColor || (business?.slug === "teatime" ? "#24140E" : "#050F2A"),
      headerTextColor: localData?.headerTextColor || b.headerTextColor || (business?.slug === "teatime" ? "#F8F9FA" : "#F2FDFF"),
      logoUrl: localData?.logoUrl !== undefined ? localData.logoUrl : (b.logoUrl || null),
      qrHeaderTitle: localData?.qrHeaderTitle !== undefined ? localData.qrHeaderTitle : (b.qrHeaderTitle ?? ""),
      qrSubtitle: localData?.qrSubtitle !== undefined ? localData.qrSubtitle : (b.qrSubtitle || "SCAN TO ORDER"),
      qrFooterNote: localData?.qrFooterNote !== undefined ? localData.qrFooterNote : (b.qrFooterNote || (business?.slug === "teatime" ? "☕ Good tea brings people together." : "Good food. One scan away.")),
      qrLogoSize: localData?.qrLogoSize !== undefined ? localData.qrLogoSize : (b.qrLogoSize || settingsForm.qrLogoSize || 140),
      cardBgColor: localData?.qrCardBgColor || b.qrCardBgColor || "#FFFFFF",
      cardTextColor: localData?.qrCardTextColor || b.qrCardTextColor || "#050F2A",
    };
  }, [business?.branding, business?.slug, business?.id, businessSlug, settingsForm.qrLogoSize]);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  // Copied token state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    try {
      // If returning from OAuth (e.g. Supabase sets hash #access_token=...), ensure session is hydrated
      if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
        try {
          const sb = getSupabase();
          await sb.auth.getSession();
        } catch { }
      }

      const session = await platformApi.getSessionContext();
      if (session.claims.role === "SUPER_ADMIN" && !businessSlug) {
        navigate("/super-admin", { replace: true });
        return;
      }
      if (!session.business && !businessSlug) {
        throw new Error("No business profile assigned to your account.");
      }

      let b = session.business;

      // If URL slug param is present (e.g. /ffgfgffg/admin), resolve that specific business
      if (session.business) {
        b = session.business;
      } else if (businessSlug && businessSlug !== "teatime") {
        try {
          let targetBId = businessSlug;
          const slugSnap = await getDoc(storeDoc(db, "businessSlugs", businessSlug)).catch(() => null);
          if (slugSnap && slugSnap.exists()) {
            targetBId = slugSnap.data().businessId || businessSlug;
          }
          const bSnap = await getDoc(storeDoc(db, "businesses", targetBId)).catch(() => null);
          if (bSnap && bSnap.exists()) {
            b = { id: bSnap.id, ...(bSnap.data() as any) } as any;
          } else {
            const qSlug = query(collection(db, "businesses"), where("slug", "==", businessSlug));
            const sSlug = await getDocs(qSlug).catch(() => null);
            if (sSlug && !sSlug.empty) {
              b = { id: sSlug.docs[0].id, ...(sSlug.docs[0].data() as any) } as any;
            }
          }
          if (b?.id && typeof window !== "undefined") {
            localStorage.setItem("menyo_auth_businessId", b.id);
          }
        } catch (e) {
          console.warn("Failed resolving business by slug param:", e);
        }
      }

      if (!b && session.business) {
        b = session.business;
      }
      if (!b) {
        throw new Error(`Business "${businessSlug}" could not be found.`);
      }

      // If user landed on /admin or /dashboard without a businessSlug in the URL, redirect to their tenant URL /:slug/admin
      if (!businessSlug && b.slug) {
        navigate(`/${b.slug}/admin`, { replace: true });
      }

      setCurrentUser(session.user);
      setBusiness(b);
      const isAlreadySetup = Boolean(
        (b as any).setupCompleted === true ||
        (b as any).isSetupCompleted === true ||
        ((b as any).country &&
          String((b as any).country).trim() !== "" &&
          b.phone &&
          String(b.phone).trim() !== "" &&
          b.phone !== "076 484 7081" &&
          (b as any).setupCompleted)
      );
      if (b.slug !== "teatime" && !isAlreadySetup) {
        setSetupBusinessName(b.name && b.name !== "My Business" && b.name !== "My Cafe" && b.name !== "My Restaurant" ? b.name : "");
        setSetupPhone(b.phone && b.phone !== "076 484 7081" ? b.phone : "");
        if ((b as any).country) setSetupCountry((b as any).country);
        setShowBusinessSetupModal(true);
      }
      if ((b as any).rewardPointValueRupees && Number((b as any).rewardPointValueRupees) > 0) {
        setRewardPointValue(Number((b as any).rewardPointValueRupees));
      }

      if (session.claims.mustChangePassword) {
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      // Populate settings form with business branding & defaults
      const isTeaTime = b.slug === "teatime";

      let initialSocialLinks: SocialLinkItem[] = [];
      if (Array.isArray(b.socialLinks) && b.socialLinks.length > 0) {
        initialSocialLinks = b.socialLinks;
      } else if (Array.isArray(b.branding?.socialLinks) && b.branding.socialLinks.length > 0) {
        initialSocialLinks = b.branding.socialLinks;
      } else {
        if (b.googleReviewUrl) {
          initialSocialLinks.push({ id: "sl_g", platform: "google", label: "Google Profile & Reviews", url: b.googleReviewUrl, isActive: true });
        }
        if (b.instagramUrl) {
          initialSocialLinks.push({ id: "sl_ig", platform: "instagram", label: "Instagram", url: b.instagramUrl, isActive: true });
        }
        if (b.facebookUrl) {
          initialSocialLinks.push({ id: "sl_fb", platform: "facebook", label: "Facebook", url: b.facebookUrl, isActive: true });
        }
      }

      setSettingsForm({
        name: b.name || "",
        phone: b.phone || "",
        whatsapp: b.whatsapp || "",
        address: b.address || "",
        googleReviewUrl: b.googleReviewUrl || "",
        instagramUrl: b.instagramUrl || "",
        facebookUrl: b.facebookUrl || "",
        logoUrl: b.branding?.logoUrl || "",
        primaryColor: b.branding?.primaryColor || (isTeaTime ? "#050F2A" : "#7BBBFF"),
        accentColor: b.branding?.accentColor || (isTeaTime ? "#7BBBFF" : "#B8A9FF"),
        backgroundColor: b.branding?.backgroundColor || (isTeaTime ? "#F8F9FA" : "#F2FDFF"),
        textColor: b.branding?.textColor || (isTeaTime ? "#050F2A" : "#050F2A"),
        headerBackgroundColor: b.branding?.headerBackgroundColor || (isTeaTime ? "#050F2A" : "#050F2A"),
        headerTextColor: b.branding?.headerTextColor || (isTeaTime ? "#F8F9FA" : "#F2FDFF"),
        qrHeaderTitle: b.branding?.qrHeaderTitle ?? "",
        qrSubtitle: b.branding?.qrSubtitle ?? "SCAN TO ORDER",
        qrFooterNote: b.branding?.qrFooterNote || (isTeaTime ? "☕ Good tea brings people together." : "Enjoy your visit!"),
        qrLogoSize: b.branding?.qrLogoSize ?? 140,
        allCategoryIcon: b.branding?.allCategoryIcon || "✨",
        socialLinks: initialSocialLinks,
      });
    } catch (err: any) {
      if (err?.code === "unauthenticated") {
        navigate("/login");
        return;
      }
      setError(err?.message || "Failed to load dashboard session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  // Real-time Firestore listeners for tenant's data
  useEffect(() => {
    if (!business?.id) return;

    const bId = business.id;

    // Load instant localStorage cache so newly added items never disappear on refresh
    try {
      const localCats = JSON.parse(localStorage.getItem(`menyo_categories_${bId}`) || "[]");
      if (Array.isArray(localCats) && localCats.length > 0) {
        setCategories(localCats);
      }
      const localProds = JSON.parse(localStorage.getItem(`menyo_products_${bId}`) || "[]");
      if (Array.isArray(localProds) && localProds.length > 0) {
        setProducts(localProds.filter((p: any) => !p.isArchived && !p.archived));
      }
    } catch {}

    const unsubCategories = onSnapshot(
      collection(db, `businesses/${bId}/categories`),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Category));
        try {
          const localCats: any[] = JSON.parse(localStorage.getItem(`menyo_categories_${bId}`) || "[]");
          const mergedMap = new Map<string, any>();
          list.forEach((c) => mergedMap.set(c.id, c));
          localCats.forEach((lc) => {
            const remote = mergedMap.get(lc.id);
            if (!remote || (lc.updatedAtMs || 0) > (remote.updatedAtMs || 0)) {
              mergedMap.set(lc.id, lc);
            }
          });
          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
          setCategories(merged);
          localStorage.setItem(`menyo_categories_${bId}`, JSON.stringify(merged));
        } catch {
          list.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
          setCategories(list);
        }
      },
      () => { }
    );

    const unsubProducts = onSnapshot(
      collection(db, `businesses/${bId}/products`),
      (snap) => {
        const list: MenuItem[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as MenuItem));
        try {
          const localProds: any[] = JSON.parse(localStorage.getItem(`menyo_products_${bId}`) || "[]");
          const mergedMap = new Map<string, any>();
          list.forEach((p) => mergedMap.set(p.id, p));
          localProds.forEach((lp) => {
            const remote = mergedMap.get(lp.id);
            if (!remote || (lp.updatedAtMs || 0) > (remote.updatedAtMs || 0)) {
              mergedMap.set(lp.id, lp);
            }
          });
          const merged = Array.from(mergedMap.values()).filter((p: any) => !p.isArchived && !p.archived);
          merged.sort((a, b) => ((a as any).sortOrder ?? 0) - ((b as any).sortOrder ?? 0));
          setProducts(merged);
          localStorage.setItem(`menyo_products_${bId}`, JSON.stringify(merged));
        } catch {
          list.sort((a, b) => ((a as any).sortOrder ?? 0) - ((b as any).sortOrder ?? 0));
          setProducts(list.filter((p: any) => !p.isArchived && !p.archived));
        }
      },
      () => { }
    );

    const unsubTables = onSnapshot(
      query(collection(db, `businesses/${bId}/tables`), orderBy("tableNumber", "asc")),
      (snap) => {
        const list: TableItem[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as TableItem));
        setTables(list);
      },
      () => { }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, `businesses/${bId}/orders`), orderBy("createdAt", "desc")),
      (snap) => {
        const list: Order[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Order));
        // Also fetch from root orders if teatime has legacy orders
        if (bId === "biz_teatime_nfue" || bId === "teatime") {
          try {
            getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"))).then((rootSnap) => {
              if (rootSnap && !rootSnap.empty) {
                const combinedMap = new Map<string, Order>();
                list.forEach((o) => combinedMap.set(o.id, o));
                rootSnap.docs.forEach((d) => {
                  const ord = { id: d.id, ...d.data() } as Order;
                  combinedMap.set(d.id, ord);
                });
                const combined = Array.from(combinedMap.values());
                combined.sort((a, b) => {
                  const tA = new Date(a.createdAt || 0).getTime() || (a as any).createdAtMs || 0;
                  const tB = new Date(b.createdAt || 0).getTime() || (b as any).createdAtMs || 0;
                  return tB - tA;
                });
                setOrders(combined.filter((o) => !(o as any).isDemo && !o.id.startsWith("demo_")));
              } else {
                setOrders(list.filter((o) => !(o as any).isDemo && !o.id.startsWith("demo_")));
              }
            }).catch(() => {
              setOrders(list.filter((o) => !(o as any).isDemo && !o.id.startsWith("demo_")));
            });
            return;
          } catch {}
        }
        // Filter out any demo orders so the live café kitchen queue remains 100% genuine
        setOrders(list.filter((o) => !(o as any).isDemo && !o.id.startsWith("demo_")));
      },
      () => { }
    );

    const loadLocalCustomers = (): CustomerRewardRecord[] => {
      try {
        const raw = localStorage.getItem(`menyo_rewards_${bId}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
      } catch {
        return [];
      }
    };
    const initialLocalCustomers = loadLocalCustomers();
    if (initialLocalCustomers.length > 0) {
      initialLocalCustomers.sort((a, b) => (b.lastOrderAtMs || 0) - (a.lastOrderAtMs || 0));
      setCustomers(initialLocalCustomers);
    }

    const unsubCustomers = onSnapshot(
      collection(db, `businesses/${bId}/customers`),
      (snap) => {
        const map = new Map<string, CustomerRewardRecord>();
        snap.forEach((doc) => {
          const d = doc.data() as CustomerRewardRecord;
          if (d && d.phone) map.set(d.phone, d);
        });
        for (const lc of loadLocalCustomers()) {
          if (lc && lc.phone) {
            const existing = map.get(lc.phone);
            if (!existing || (lc.lastOrderAtMs || 0) >= (existing.lastOrderAtMs || 0)) {
              map.set(lc.phone, lc);
            }
          }
        }
        const list = Array.from(map.values());
        list.sort((a, b) => (b.lastOrderAtMs || 0) - (a.lastOrderAtMs || 0));
        setCustomers(list);
      },
      () => { }
    );

    const handleStorageRewards = (ev?: StorageEvent | Event) => {
      if (!ev || (ev as StorageEvent).key === `menyo_rewards_${bId}` || (ev as StorageEvent).key === undefined) {
        const updated = loadLocalCustomers();
        updated.sort((a, b) => (b.lastOrderAtMs || 0) - (a.lastOrderAtMs || 0));
        setCustomers(updated);
      }
    };
    window.addEventListener("storage", handleStorageRewards);
    window.addEventListener("menyo_rewards_updated", handleStorageRewards);

    return () => {
      window.removeEventListener("storage", handleStorageRewards);
      window.removeEventListener("menyo_rewards_updated", handleStorageRewards);
      unsubCategories();
      unsubProducts();
      unsubTables();
      unsubOrders();
      unsubCustomers();
    };
  }, [business?.id]);

  const handleLogout = async () => {
    localStorage.removeItem("menyo_auth_role");
    localStorage.removeItem("menyo_auth_email");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) localStorage.removeItem(key);
    });
    await Promise.race([
      signOut(auth).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    window.location.replace("/login");
  };

  const handleOrderStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      await platformApi.ownerUpdateOrderStatus(orderId, status, business?.id);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update order status.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const gLink = settingsForm.socialLinks.find((l) => l.platform === "google" && l.isActive);
      const igLink = settingsForm.socialLinks.find((l) => l.platform === "instagram" && l.isActive);
      const fbLink = settingsForm.socialLinks.find((l) => l.platform === "facebook" && l.isActive);

      await platformApi.ownerUpdateSettings({
        businessId: business?.id,
        name: settingsForm.name.trim(),
        phone: settingsForm.phone.trim() || undefined,
        whatsapp: settingsForm.whatsapp.trim() || undefined,
        address: settingsForm.address.trim() || undefined,
        googleReviewUrl: gLink?.url || settingsForm.googleReviewUrl.trim() || undefined,
        instagramUrl: igLink?.url || settingsForm.instagramUrl.trim() || undefined,
        facebookUrl: fbLink?.url || settingsForm.facebookUrl.trim() || undefined,
        socialLinks: settingsForm.socialLinks,
        qrHeaderTitle: settingsForm.qrHeaderTitle,
        qrSubtitle: settingsForm.qrSubtitle,
        qrFooterNote: settingsForm.qrFooterNote,
        qrLogoSize: settingsForm.qrLogoSize,
        branding: {
          logoUrl: settingsForm.logoUrl.trim() || null,
          primaryColor: settingsForm.primaryColor,
          accentColor: settingsForm.accentColor,
          backgroundColor: settingsForm.backgroundColor,
          textColor: settingsForm.textColor,
          headerBackgroundColor: settingsForm.headerBackgroundColor,
          headerTextColor: settingsForm.headerTextColor,
          qrHeaderTitle: settingsForm.qrHeaderTitle,
          qrSubtitle: settingsForm.qrSubtitle,
          qrFooterNote: settingsForm.qrFooterNote,
          qrLogoSize: settingsForm.qrLogoSize,
        },
      });

      // Update local state immediately for instant real-time feedback
      setBusiness((prev: any) => ({
        ...prev,
        name: settingsForm.name.trim(),
        phone: settingsForm.phone.trim(),
        whatsapp: settingsForm.whatsapp.trim(),
        address: settingsForm.address.trim(),
        googleReviewUrl: gLink?.url || settingsForm.googleReviewUrl.trim(),
        instagramUrl: igLink?.url || settingsForm.instagramUrl.trim(),
        facebookUrl: fbLink?.url || settingsForm.facebookUrl.trim(),
        socialLinks: settingsForm.socialLinks,
        branding: {
          ...prev?.branding,
          logoUrl: settingsForm.logoUrl.trim() || null,
          primaryColor: settingsForm.primaryColor,
          accentColor: settingsForm.accentColor,
          backgroundColor: settingsForm.backgroundColor,
          textColor: settingsForm.textColor,
          headerBackgroundColor: settingsForm.headerBackgroundColor,
          headerTextColor: settingsForm.headerTextColor,
          qrHeaderTitle: settingsForm.qrHeaderTitle,
          qrSubtitle: settingsForm.qrSubtitle,
          qrFooterNote: settingsForm.qrFooterNote,
          qrLogoSize: settingsForm.qrLogoSize,
        },
      }));
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOwnerAddSocialLink = (platform: SocialPlatform = "google") => {
    const defaultLabels: Record<SocialPlatform, string> = {
      google: "Google Profile & Reviews",
      instagram: "Instagram",
      facebook: "Facebook",
      whatsapp: "WhatsApp Direct",
      tiktok: "TikTok",
      youtube: "YouTube Channel",
      x: "X (Twitter)",
      website: "Official Website",
      other: "Social Profile",
    };
    const defaultUrls: Record<SocialPlatform, string> = {
      google: "https://maps.google.com/?q=",
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
      whatsapp: "https://wa.me/",
      tiktok: "https://www.tiktok.com/@",
      youtube: "https://www.youtube.com/@",
      x: "https://x.com/",
      website: "https://",
      other: "https://",
    };

    const newLink: SocialLinkItem = {
      id: `sl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      platform,
      label: defaultLabels[platform] || "Social Link",
      url: defaultUrls[platform] || "https://",
      isActive: true,
    };

    setSettingsForm((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, newLink],
    }));
  };

  const handleOwnerUpdateSocialLink = (id: string, updates: Partial<SocialLinkItem>) => {
    setSettingsForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" from your menu?`)) {
      return;
    }
    const bId = business?.id;
    if (!bId) return;

    // Immediately update local state
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    // Update local cache
    try {
      const localProdsKey = `menyo_products_${bId}`;
      const localProds: any[] = JSON.parse(localStorage.getItem(localProdsKey) || "[]");
      const filtered = localProds.filter((p) => p.id !== productId);
      localStorage.setItem(localProdsKey, JSON.stringify(filtered));
    } catch {}

    try {
      await platformApi.ownerArchiveProduct({ productId, businessId: bId });
      // Hard delete from database if possible so it's completely gone
      await deleteDoc(storeDoc(db, `businesses/${bId}/products`, productId)).catch(() => {});
      if (bId === "teatime" || bId === "biz_teatime") {
        await deleteDoc(storeDoc(db, "menu", productId)).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  const handleOwnerDeleteSocialLink = (id: string) => {
    setSettingsForm((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((l) => l.id !== id),
    }));
  };

  const handleResetBranding = async () => {
    if (!window.confirm("Reset all branding and colors to this restaurant's default theme?")) {
      return;
    }
    setSavingSettings(true);
    try {
      const res = await platformApi.ownerResetBrandingSettings();
      if (res.branding) {
        setSettingsForm((prev) => ({
          ...prev,
          logoUrl: res.branding.logoUrl || "",
          primaryColor: res.branding.primaryColor,
          accentColor: res.branding.accentColor,
          backgroundColor: res.branding.backgroundColor || (business.slug === "teatime" ? "#F8F9FA" : "#F2FDFF"),
          textColor: res.branding.textColor || (business.slug === "teatime" ? "#050F2A" : "#050F2A"),
          headerBackgroundColor: res.branding.headerBackgroundColor || (business.slug === "teatime" ? "#050F2A" : "#050F2A"),
          headerTextColor: res.branding.headerTextColor || (business.slug === "teatime" ? "#F8F9FA" : "#F2FDFF"),
        }));
      }
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to reset branding.");
    } finally {
      setSavingSettings(false);
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const bId = business?.id || "business";
      const fileName = `logos/${bId}/${Date.now()}_logo.${ext}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setSettingsForm((prev) => ({ ...prev, logoUrl: downloadUrl }));
    } catch (err: any) {
      console.warn("Direct upload fallback to base64:", err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSettingsForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const copyTableLink = (tableToken: string) => {
    const origin = window.location.origin;
    const url = `${origin}/${business.slug}/menu?table=${tableToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(tableToken);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleToggleTableActive = async (table: TableItem) => {
    const nextActive = table.active === false ? true : false;
    try {
      await platformApi.ownerUpsertTable({
        businessId: business?.id,
        id: table.id,
        tableNumber: table.number,
        active: nextActive,
      });
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, active: nextActive } : t))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to update table status.");
    }
  };

  const [generatingTables, setGeneratingTables] = useState(false);
  const handleAutoGenerate15Tables = async () => {
    if (!window.confirm("Auto-generate 15 Dining Tables (Table 01 to Table 15) with instant QR codes for your restaurant?")) {
      return;
    }
    setGeneratingTables(true);
    try {
      for (let i = 1; i <= 15; i++) {
        const numStr = i < 10 ? `Table 0${i}` : `Table ${i}`;
        // Skip if already exists
        const exists = tables.some((t) => t.number.toLowerCase() === numStr.toLowerCase());
        if (!exists) {
          await platformApi.ownerUpsertTable({
            businessId: business?.id,
            tableNumber: numStr,
            capacity: 4,
            active: true,
          });
        }
      }
      alert("Successfully generated 15 QR Tables! You can now Batch Print QR cards.");
    } catch (err: any) {
      alert(err?.message || "Failed to auto-generate tables.");
    } finally {
      setGeneratingTables(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter((p) => {
    if (selectedCategoryFilter !== "ALL") {
      const matchCat =
        p.categoryId === selectedCategoryFilter ||
        (p as any).category === selectedCategoryFilter;
      if (!matchCat) return false;
    }
    if (productSearch.trim()) {
      return p.name.toLowerCase().includes(productSearch.toLowerCase());
    }
    return true;
  });

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#050F2A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#7BBBFF]" />
        <span className="text-xs text-[#050F2A]/60 tracking-wide font-bold">
          Verifying administrative workspace privileges...
        </span>
      </div>
    );
  }

  // Always render the full 10-tab Business Dashboard (never fall back to legacy 4-tab AdminDashboardPage)

  // Handle Suspended accounts
  const subStatus = business?.subscription?.effectiveStatus || business?.status;

  if (business && subStatus === "SUSPENDED") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#050F2A] flex flex-col items-center justify-center p-4">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl max-w-md w-full p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#050F2A] mb-2 tracking-tight">Workspace Suspended</h1>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            Your restaurant workspace has been temporarily suspended by platform administration.
          </p>
          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] text-xs text-[#050F2A] mb-6 space-y-1">
            <p className="text-[#64748B]">Please contact support to resolve account status:</p>
            <p className="font-bold text-[#050F2A]">support@aevonix.lk / WhatsApp: +94 76 484 7081</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-[#050F2A] hover:bg-[#0A1840] text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Handle Expired accounts (blocks operations and provides renewal view)
  if (business && subStatus === "EXPIRED") {
    const isTrial = business.isTrial || business.subscription?.packageId === "2_days_trial";
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#050F2A] flex flex-col items-center justify-center p-4">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl max-w-lg w-full p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#7BBBFF]/20 border border-[#7BBBFF]/50 flex items-center justify-center text-[#050F2A] mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#050F2A] mb-2 tracking-tight">
            {isTrial ? "2-Day Free Trial Concluded" : "Subscription Expired"}
          </h1>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            {isTrial
              ? `Your 48-hour free trial for "${business.name}" has completed. Contact our team on WhatsApp to activate your official subscription key.`
              : "Your menu subscription has ended. Customer ordering has been temporarily paused."}
          </p>

          <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] text-xs text-[#050F2A] mb-6 space-y-2 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Your Login Email:</span>
              <span className="font-bold text-[#050F2A] font-mono">{currentUser?.email || business.ownerEmail || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Available Plans:</span>
              <span className="font-bold text-[#050F2A]">Monthly (Rs. 2,000) / 6 Mo / 1 Yr</span>
            </div>
            <p className="text-[#64748B] text-[11px] pt-1">
              💬 When you contact our support team on WhatsApp, we will look up your email and activate your plan key instantly.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full py-3.5 rounded-xl bg-[#050F2A] hover:bg-[#0A1840] text-[#FFFFFF] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>View Plans & Pay (PayHere / Card)</span>
            </button>
            <a
              href={`https://wa.me/94764847081?text=Hi%20Menyo,%20my%20trial%20for%20${encodeURIComponent(
                business.name
              )}%20(Email:%20${encodeURIComponent(
                currentUser?.email || business.ownerEmail || ""
              )})%20has%20ended.%20I%20would%20like%20to%20pay%20and%20activate%20my%20subscription%20key.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>Contact to Pay & Activate via WhatsApp</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E2E8F0]/30 border border-[#E2E8F0] text-[#050F2A] font-bold text-xs transition-all"
            >
              Sign Out
            </button>
          </div>

          {showUpgradeModal && (
            <SubscriptionUpgradeModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              businessName={business.name}
              businessSlug={business.slug}
              ownerEmail={currentUser?.email || business.ownerEmail}
              currentDaysRemaining={0}
              isExpired={true}
            />
          )}
        </div>
      </div>
    );
  }

  // 7-Day Expiry Check
  const daysRemaining = business?.subscription?.daysRemaining ?? null;
  const isExpiringWithin7Days =
    !business?.subscription?.isLifetime &&
    daysRemaining !== null &&
    daysRemaining <= 7 &&
    daysRemaining >= 0;

  const navItems: { id: DashboardTab; label: string; icon: any; badge?: number }[] = [
    { id: "orders", label: "Live Orders", icon: Bell, badge: orders.filter((o) => o.status === "PENDING" || o.status === "PREPARING").length },
    { id: "billing", label: "Billing System", icon: CreditCard },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "categories", label: "Categories", icon: Layers },
    { id: "tables", label: "Tables & QRs", icon: QrCode },
    { id: "rewards", label: "Reward Points", icon: Gift },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "memory", label: "Memory Studio", icon: Camera },
    { id: "plan", label: "Plan & Payment", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-[#050F2A] selection:bg-[#7BBBFF]/30">
      {/* 1. TOP MENYO NAVY HEADER BAR */}
      <header className="bg-[#050F2A] text-white border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* Left: Brand Logo + / Admin */}
        <div className="flex items-center gap-2.5">
          {business?.branding?.logoUrl ? (
            <img
              src={business.branding.logoUrl}
              alt={business.name}
              className="w-8 h-8 rounded-full object-contain bg-white/10 p-0.5 border border-white/20"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm bg-[#7BBBFF]"
            >
              {business?.name?.charAt(0) || "B"}
            </div>
          )}
          <span className="font-extrabold text-sm text-white tracking-tight truncate max-w-[130px] sm:max-w-xs">
            {business?.name || "Restaurant"}
          </span>
          <span className="text-white/40 font-bold text-sm select-none translate-y-0.5">/</span>
          <span className="text-white/70 font-bold text-sm tracking-wide translate-y-0.5">
            Admin
          </span>
        </div>

        {/* Center: Live indicator & Real-time clock */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-[#7BBBFF]/40 text-[#7BBBFF] font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#7BBBFF] animate-ping" />
            <span>Live Orders Active</span>
          </div>

          <span className="text-white/70 font-medium font-mono">
            {currentTime}
          </span>
        </div>

        {/* Right: Sound toggle, View Menu, Staff account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Menu Button */}
          <a
            href={`/${business?.slug || businessSlug || business?.id || "teatime"}/menu`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white text-xs font-bold transition shadow-sm"
          >
            <span>View Menu</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#7BBBFF]" />
          </a>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? "Unmute order chime" : "Mute order chime"}
            className={`p-2 px-2.5 rounded-xl transition flex items-center gap-1.5 text-xs font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBBFF] ${isMuted
                ? "bg-white/10 text-white/70 hover:bg-white/20 border border-white/10"
                : "bg-[#7BBBFF] text-[#050F2A] hover:bg-[#68aaff] shadow-sm"
              }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden lg:inline text-[11px]">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="hidden lg:inline text-[11px]">Sound On</span>
              </>
            )}
          </button>

          {/* User Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBBFF]"
            >
              <div className="w-6 h-6 rounded-full bg-[#050F2A] flex items-center justify-center text-[#7BBBFF] border border-white/20">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="hidden md:inline truncate max-w-[120px]">
                {currentUser?.email?.split("@")[0] || business?.name || "Owner"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 text-xs text-[#050F2A] z-50 animate-fadeIn">
                <div className="px-3.5 py-2 border-b border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Signed in as</p>
                  <p className="font-bold truncate text-[#050F2A]">
                    {currentUser?.email || "Owner"}
                  </p>
                  <span className="inline-block mt-1 text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-100 text-[#050F2A]">
                    {business?.name}
                  </span>
                </div>
                <div className="p-1">
                  <a
                    href={`/${business?.slug}/menu`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 font-bold text-[#050F2A] transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#7BBBFF]" />
                    <span>Open Guest Menu</span>
                  </a>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. BODY: LEFT SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex">
        {/* Left Menyo Navy Sidebar */}
        <aside className="w-56 shrink-0 bg-[#050F2A] text-white flex flex-col justify-between p-4 border-r border-white/10 hidden md:flex min-h-[calc(100vh-61px)]">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-3 py-2">
              Operations
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBBFF] ${isActive
                      ? "bg-[#7BBBFF] text-[#050F2A] shadow-sm font-extrabold"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#050F2A]" : "text-white/70"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm ${isActive ? "bg-[#050F2A] text-[#7BBBFF]" : "bg-[#7BBBFF] text-[#050F2A]"
                        }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Footer brand info */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-white/70">
            <p className="font-bold text-white truncate">{business?.name || "Restaurant"} Kitchen</p>
            <p className="text-[10px] text-white/50 mt-0.5">Real-time Order System</p>
            {!Boolean(business?.packageId && !["2_days_trial", "free_trial", "trial", "free"].includes(String(business.packageId).toLowerCase())) &&
              (business?.isTrial || business?.subscription?.packageId === "2_days_trial") && (
              <span className="mt-1.5 inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Trial: {daysRemaining ?? 0}d left
              </span>
            )}
          </div>
        </aside>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#050F2A] border-t border-white/10 z-40 px-2 py-2 flex items-center justify-around shadow-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BBBFF] ${isActive
                    ? "text-[#7BBBFF]"
                    : "text-white/70 hover:text-white"
                  }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-[#7BBBFF] text-[#050F2A] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="truncate max-w-[50px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-20 md:pb-8 space-y-6">
          {/* Quick Launch Checklist for New Restaurant Onboarding */}
          {business && (
            <QuickOnboardingChecklist
              productsCount={products.length}
              tablesCount={tables.length}
              businessSlug={business.slug}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* 7-Day Expiry Reminder Banner - Premium Glassmorphic / Apple style */}
          {isExpiringWithin7Days && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#050F2A] via-[#0A1840] to-[#0D2359] border border-[#7BBBFF]/20 p-4 sm:p-5 text-white shadow-xl">
              {/* Subtle decorative background ambient glow */}
              <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#7BBBFF]/10 blur-2xl pointer-events-none" />
              <div className="absolute right-1/3 -bottom-10 w-36 h-36 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Modern Indicator Icon with glowing subtle pulse */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-amber-300 shadow-inner">
                      <Clock className="w-5 h-5 text-amber-300" />
                    </div>
                    {/* Subtle live indicator badge */}
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400 border-2 border-[#050F2A]" />
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                        <span>Subscription Expiring in {daysRemaining} {daysRemaining === 1 ? "Day" : "Days"}</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
                      Your access ends on <span className="text-white font-semibold">{business.subscription.expiryDateColombo}</span>. Renew your plan to ensure uninterrupted customer QR dining and kitchen orders.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 pt-1 md:pt-0">
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7BBBFF] to-[#99CDFF] text-[#050F2A] hover:brightness-105 active:scale-95 text-xs font-black tracking-wide whitespace-nowrap transition-all shadow-md shadow-[#7BBBFF]/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Renew / Upgrade</span>
                  </button>
                  <a
                    href={`https://wa.me/94764847081?text=Hi%20Menyo,%20I'd%20like%20to%20renew%20the%20subscription%20for%20${encodeURIComponent(
                      business.name
                    )}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/20 text-white text-xs font-bold whitespace-nowrap transition-all backdrop-blur-sm"
                  >
                    WhatsApp Support
                  </a>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB: PLAN & PAYMENT */}
          {activeTab === "plan" && (
            <div className="space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-bold uppercase tracking-wider">
                    Current Subscription
                  </span>
                  <h3 className="text-2xl font-black text-[#050F2A]">
                    {(() => {
                      const pkgId = String(business?.packageId || business?.subscription?.packageId || "").toLowerCase();
                      if (pkgId === "lifetime") return "Lifetime Pro Plan";
                      if (pkgId === "yearly" || pkgId === "annual") return "Yearly Pro Plan";
                      if (pkgId === "monthly" || pkgId === "pro") return "Monthly Pro Plan";
                      if (pkgId && !["2_days_trial", "free_trial", "trial", "free"].includes(pkgId)) {
                        return business?.packageName && !business.packageName.toLowerCase().includes("trial")
                          ? business.packageName
                          : pkgId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                      }
                      return business?.packageName || (business?.isTrial ? "2-Day Free Trial" : "Free Trial");
                    })()}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Status:{" "}
                    <span className="font-bold text-[#050F2A]">
                      {business?.effectiveStatus || "ACTIVE"}
                    </span>
                    {business?.expiresAt ? ` • Expires on ${new Date(business.expiresAt).toLocaleDateString()}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-6 py-3 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
                >
                  Upgrade / Switch Plan
                </button>
              </div>
            </div>
          )}

          {/* TAB: MEMORY STUDIO */}
          {activeTab === "memory" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm space-y-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#050F2A]">Memory Studio</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Customize how your shop logo appears on customer 1080×1350 memory photos.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#64748B] block mb-1">
                      Total Photos Captured by Customers
                    </span>
                    <span className="text-3xl font-black text-[#050F2A]">
                      {typeof window !== "undefined"
                        ? localStorage.getItem(`menyo_memory_count_${business?.id || "teatime"}`) || "0"
                        : "0"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#050F2A] block">
                      Overlay Logo (PNG / SVG / Image)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-[#050F2A] hover:bg-[#0B1736] text-white text-xs font-semibold cursor-pointer transition">
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const res = String(reader.result || "");
                              setMemoryLogoUrl(res);
                              const bId = business?.id || "teatime";
                              const bSlug = business?.slug || "";
                              localStorage.setItem(`menyo_memory_logo_url_${bId}`, res);
                              if (bSlug) {
                                localStorage.setItem(`menyo_memory_logo_url_${bSlug}`, res);
                              }
                              // Also sync to cloud business settings so all mobile customers see the logo!
                              try {
                                await platformApi.ownerUpdateSettings({
                                  businessId: bId,
                                  memoryLogoUrl: res,
                                  branding: {
                                    ...(business?.branding || {}),
                                    memoryLogoUrl: res,
                                    logoUrl: business?.branding?.logoUrl || res,
                                  },
                                } as any);
                              } catch (err) {
                                console.warn("Failed to sync memory logo to cloud:", err);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {(memoryLogoUrl || (typeof window !== "undefined" && localStorage.getItem(`menyo_memory_logo_url_${business?.id || "teatime"}`))) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMemoryLogoUrl("");
                            localStorage.removeItem(`menyo_memory_logo_url_${business?.id || "teatime"}`);
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#050F2A] block">
                      Logo Overlay Position (1080×1350)
                    </label>
                    <select
                      value={
                        typeof window !== "undefined"
                          ? localStorage.getItem(`menyo_memory_logo_pos_${business?.id || "teatime"}`) || memoryLogoPos
                          : memoryLogoPos
                      }
                      onChange={async (e) => {
                        const val = e.target.value;
                        setMemoryLogoPos(val);
                        const bId = business?.id || "teatime";
                        const bSlug = business?.slug || "";
                        localStorage.setItem(`menyo_memory_logo_pos_${bId}`, val);
                        if (bSlug) {
                          localStorage.setItem(`menyo_memory_logo_pos_${bSlug}`, val);
                        }
                        try {
                          await platformApi.ownerUpdateSettings({
                            businessId: bId,
                            memoryLogoPos: val,
                            branding: {
                              ...(business?.branding || {}),
                              memoryLogoPos: val,
                            },
                          } as any);
                        } catch (err) {
                          console.warn("Failed to sync memory logo pos:", err);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#050F2A] focus:outline-none"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                </div>

                {/* Live 4:5 (1080x1350) Preview */}
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-[#64748B]">
                    Live 1080×1350 Overlay Preview
                  </span>
                  <div className="relative w-56 aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1D1D1F] via-[#2C2C2E] to-[#050F2A] border border-[#E2E8F0] shadow-md flex items-center justify-center">
                    <span className="text-[11px] text-white/40 font-medium">Customer Photo</span>
                    {(() => {
                      const pos =
                        typeof window !== "undefined"
                          ? localStorage.getItem(`menyo_memory_logo_pos_${business?.id || "teatime"}`) || memoryLogoPos
                          : memoryLogoPos;
                      const posClass =
                        pos === "top-left"
                          ? "top-3 left-3"
                          : pos === "top-right"
                          ? "top-3 right-3"
                          : pos === "bottom-left"
                          ? "bottom-3 left-3"
                          : pos === "bottom-center"
                          ? "bottom-3 left-1/2 -translate-x-1/2"
                          : "bottom-3 right-3";
                      const activeOverlayLogo =
                        memoryLogoUrl ||
                        (typeof window !== "undefined"
                          ? localStorage.getItem(`menyo_memory_logo_url_${business?.id || "teatime"}`)
                          : null) ||
                        settingsForm.logoUrl;
                      return (
                        <div className={`absolute ${posClass} pointer-events-none`}>
                          {activeOverlayLogo ? (
                            <img
                              src={activeOverlayLogo}
                              alt="Overlay Logo"
                              className="max-w-[56px] max-h-[56px] object-contain drop-shadow-md"
                            />
                          ) : (
                            <span className="px-2 py-1 rounded bg-white/90 text-[9px] font-black text-[#050F2A]">
                              LOGO
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm">
                  <span className="text-xs font-bold text-[#64748B] block mb-1">Total Products</span>
                  <span className="text-3xl font-black text-[#050F2A]">{products.length}</span>
                </div>
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm">
                  <span className="text-xs font-bold text-[#64748B] block mb-1">Categories</span>
                  <span className="text-3xl font-black text-[#050F2A]">{categories.length}</span>
                </div>
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm">
                  <span className="text-xs font-bold text-[#64748B] block mb-1">Active Dining Tables</span>
                  <span className="text-3xl font-black text-[#050F2A]">{tables.length}</span>
                </div>
                <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-sm">
                  <span className="text-xs font-bold text-[#64748B] block mb-1">Pending Orders</span>
                  <span className="text-3xl font-black text-[#7BBBFF]">
                    {orders.filter((o) => o.status === "PENDING").length}
                  </span>
                </div>
              </div>

              {/* Recent Orders in Overview */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#050F2A]">Recent Dining Orders</h2>
                    <p className="text-xs text-[#64748B]">Real-time table orders feed</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-[#050F2A] hover:text-[#7BBBFF] transition-colors"
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                <div className="divide-y divide-[#E2E8F0]/60 border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="p-4 bg-[#FFFFFF] hover:bg-[#F8F9FA] flex items-center justify-between text-xs transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#050F2A]">
                            {order.orderNumberDisplay || order.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#050F2A] text-[#FFFFFF] font-bold text-[10px]">
                            {order.tableNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-1">
                          {order.items?.length || 0} items &bull; Rs. {(order.totalRupees || (order.totalMinor / 100)).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === "PENDING" ? "bg-amber-100 text-amber-900 border border-amber-300" :
                            order.status === "PREPARING" ? "bg-[#7BBBFF]/20 text-[#050F2A] border border-[#7BBBFF]/40" :
                              order.status === "SERVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-[#F8F9FA] text-[#64748B] border border-[#E2E8F0]"
                          }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="p-8 text-center text-[#64748B]/60 text-xs">
                      No orders placed yet. Scan a table QR code to test your customer flow.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE ORDERS FEED - EXACT 3-COLUMN MODERN LIVE KITCHEN KANBAN MATCHING UI */}
          {activeTab === "orders" && (() => {
            const newOrdersList = orders.filter((o) => o.status === "PENDING" || o.status === "new" || (o.status as string) === "pending");
            const preparingOrdersList = orders.filter((o) => o.status === "PREPARING" || (o.status as string) === "preparing");
            const completedOrdersList = orders.filter(
              (o) => !billedOrderIds.includes(o.id) && (o.status === "SERVED" || o.status === "COMPLETED" || (o.status as string) === "served" || (o.status as string) === "completed")
            );

            const handlePrintReceipt = (order: Order) => {
              const printWin = window.open("", "_blank", "width=380,height=600");
              if (!printWin) return;
              const itemsHtml = (order.items || [])
                .map(
                  (item) => `
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0;">
                <span>${item.quantity} × ${item.name}</span>
                <span style="font-weight: 700;">Rs. ${(item.subtotalRupees || (item.subtotalMinor / 100) || 0).toLocaleString()}</span>
              </div>
            `
                )
                .join("");

              printWin.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Bill #${order.orderNumberDisplay || order.orderNumber}</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #111; max-width: 320px; margin: 0 auto; }
                    .center { text-align: center; }
                    .dashed { border-top: 1px dashed #bbb; margin: 12px 0; }
                    .total { font-size: 16px; font-weight: 800; display: flex; justify-content: space-between; margin-top: 10px; }
                    @media print { button { display: none; } }
                  </style>
                </head>
                <body>
                  <div class="center">
                    <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">${business?.name || "RESTAURANT"}</h2>
                    <p style="margin: 3px 0 0; font-size: 11px; color: #666;">Guest Table Order Bill</p>
                  </div>
                  <div class="dashed"></div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: #555;">
                    <span>Order: #${order.orderNumberDisplay || order.orderNumber}</span>
                    <span style="font-weight: 700; color: #000;">${order.tableNumber}</span>
                  </div>
                  <div class="dashed"></div>
                  <div>${itemsHtml}</div>
                  <div class="dashed"></div>
                  <div class="total">
                    <span>TOTAL:</span>
                    <span>Rs. ${(order.totalRupees || (order.totalMinor / 100) || 0).toLocaleString()}</span>
                  </div>
                  ${order.specialInstructions ? `<p style="font-size: 11px; color: #666; margin-top: 10px;">Note: ${order.specialInstructions}</p>` : ""}
                  <div class="dashed"></div>
                  <div class="center" style="font-size: 10px; color: #888; margin-top: 15px;">
                    Thank you! Powered by menyo.org
                  </div>
                  <script>
                    window.onload = function() { window.print(); };
                  </script>
                </body>
              </html>
            `);
              printWin.document.close();
            };

            return (
              <div className="space-y-6">
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-black tracking-tight text-[#050F2A]">
                        Live Kitchen
                      </h1>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-extrabold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Live</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 font-medium">
                      Every order. One clear view.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-50 border border-[#E2E8F0] text-xs font-bold text-[#050F2A] flex items-center gap-2 shadow-xs transition"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Order History</span>
                    </button>
                  </div>
                </div>

                {/* 3-COLUMN KANBAN BOARD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                  {/* COLUMN 1: NEW ORDERS */}
                  <div className="bg-[#F8F9FA]/80 rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                      <span className="w-1.5 h-5 rounded-full bg-[#2563EB]" />
                      <h3 className="font-extrabold text-base text-[#050F2A]">
                        New Orders ({newOrdersList.length})
                      </h3>
                    </div>

                    <div className="space-y-3 min-h-[140px]">
                      {newOrdersList.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-[#CBD5E1] p-8 text-center text-xs text-[#64748B]">
                          No new orders right now
                        </div>
                      ) : (
                        newOrdersList.map((order) => (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                          >
                            {/* Card Header: #Number | Table | Time */}
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9]">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-[#050F2A]">
                                  #{order.orderNumberDisplay || order.orderNumber}
                                </span>
                                <span className="text-[#64748B]">|</span>
                                <span className="font-bold text-[#050F2A] flex items-center gap-1">
                                  <span>🪑</span>
                                  <span>{order.tableNumber}</span>
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748B] font-medium">
                                {formatTimeAgo(order.createdAt)}
                              </span>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-1">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="font-extrabold text-sm text-[#050F2A]">
                                  {item.quantity} × {item.name}
                                </div>
                              ))}
                            </div>

                            {(order as any).rewardPointsClaimed > 0 && (
                              <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between gap-2">
                                <span>🎁 Reward Claimed ({(order as any).rewardPointsClaimed} pts)</span>
                                <span>- Rs. {(order as any).rewardDiscountRupees || 0}</span>
                              </div>
                            )}

                            {/* Pill Tag: New order */}
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>New order</span>
                              </span>
                            </div>

                            {/* Primary CTA: Accept Order */}
                            <button
                              type="button"
                              onClick={() => handleOrderStatusUpdate(order.id, "PREPARING")}
                              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-sm shadow-blue-500/20 transition active:scale-98 flex items-center justify-center cursor-pointer"
                            >
                              <span>Accept Order</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2: PREPARING */}
                  <div className="bg-[#F8F9FA]/80 rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                      <span className="w-1.5 h-5 rounded-full bg-[#EA580C]" />
                      <h3 className="font-extrabold text-base text-[#050F2A]">
                        Preparing ({preparingOrdersList.length})
                      </h3>
                    </div>

                    <div className="space-y-3 min-h-[140px]">
                      {preparingOrdersList.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-[#CBD5E1] p-8 text-center text-xs text-[#64748B]">
                          No orders in preparation
                        </div>
                      ) : (
                        preparingOrdersList.map((order) => (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                          >
                            {/* Card Header: #Number | Table | Time */}
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9]">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-[#050F2A]">
                                  #{order.orderNumberDisplay || order.orderNumber}
                                </span>
                                <span className="text-[#64748B]">|</span>
                                <span className="font-bold text-[#050F2A] flex items-center gap-1">
                                  <span>🪑</span>
                                  <span>{order.tableNumber}</span>
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748B] font-medium">
                                {formatTimeAgo(order.createdAt)}
                              </span>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-1">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="font-extrabold text-sm text-[#050F2A]">
                                  {item.quantity} × {item.name}
                                </div>
                              ))}
                            </div>

                            {(order as any).rewardPointsClaimed > 0 && (
                              <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between gap-2">
                                <span>🎁 Reward Claimed ({(order as any).rewardPointsClaimed} pts)</span>
                                <span>- Rs. {(order as any).rewardDiscountRupees || 0}</span>
                              </div>
                            )}

                            {/* Pill Tag: Preparing */}
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-spin" />
                                <span>Preparing</span>
                              </span>
                            </div>

                            {/* Primary CTA: Mark Completed */}
                            <button
                              type="button"
                              onClick={() => handleOrderStatusUpdate(order.id, "COMPLETED")}
                              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-sm shadow-blue-500/20 transition active:scale-98 flex items-center justify-center cursor-pointer"
                            >
                              <span>Mark Completed</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 3: COMPLETED */}
                  <div className="bg-[#F8F9FA]/80 rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center gap-2 pb-1">
                      <span className="w-1.5 h-5 rounded-full bg-[#16A34A]" />
                      <h3 className="font-extrabold text-base text-[#050F2A]">
                        Completed ({completedOrdersList.length})
                      </h3>
                    </div>

                    <div className="space-y-3 min-h-[140px]">
                      {completedOrdersList.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-[#CBD5E1] p-8 text-center text-xs text-[#64748B]">
                          No completed orders
                        </div>
                      ) : (
                        completedOrdersList.slice(0, 10).map((order) => (
                          <div
                            key={order.id}
                            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                          >
                            {/* Card Header: #Number | Table | Time */}
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F5F9]">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-[#050F2A]">
                                  #{order.orderNumberDisplay || order.orderNumber}
                                </span>
                                <span className="text-[#64748B]">|</span>
                                <span className="font-bold text-[#050F2A] flex items-center gap-1">
                                  <span>🪑</span>
                                  <span>{order.tableNumber}</span>
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748B] font-medium">
                                {formatTimeAgo(order.createdAt)}
                              </span>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-1">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="font-extrabold text-sm text-[#050F2A]">
                                  {item.quantity} × {item.name}
                                </div>
                              ))}
                            </div>

                            {(order as any).rewardPointsClaimed > 0 && (
                              <div className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-between gap-2">
                                <span>🎁 Reward Claimed ({(order as any).rewardPointsClaimed} pts)</span>
                                <span>- Rs. {(order as any).rewardDiscountRupees || 0}</span>
                              </div>
                            )}

                            {/* Pill Tag: Completed */}
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            </div>

                            {/* Secondary CTA: Print Bill */}
                            <button
                              type="button"
                              onClick={() => {
                                const mapped = (order.items || []).map((it: any) => ({
                                  productId: it.productId || it.id || String(it.name),
                                  name: it.name || "Item",
                                  price: Math.round((it.unitPriceMinor ?? it.priceMinor ?? 0) / 100),
                                  qty: it.quantity || 1,
                                }));
                                setBilledOrderIds((prev) => {
                                  const next = prev.includes(order.id) ? prev : [...prev, order.id];
                                  localStorage.setItem("menyo_billed_orders", JSON.stringify(next));
                                  return next;
                                });
                                setBillingPreloadItems(mapped);
                                setBillingPreloadPhone(localStorage.getItem(`menyo_order_phone_${order.id}`) || null);
                                setActiveTab("billing");
                              }}
                              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-[#2563EB] text-[#2563EB] font-extrabold text-xs transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>Print Bill</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 3: MENU PRODUCTS */}
          {activeTab === "menu" && (
            <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              {/* Today's Special Toggle & Selector */}
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#050F2A]/10 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...todaySpecial, enabled: !todaySpecial.enabled };
                      setTodaySpecial(next);
                      if (business?.id) localStorage.setItem(`menyo_today_special_${business.id}`, JSON.stringify(next));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      todaySpecial.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {todaySpecial.enabled ? "Today's Special: ON" : "Today's Special: OFF"}
                  </button>
                  <input
                    type="text"
                    value={todaySpecial.title}
                    onChange={(e) => {
                      const next = { ...todaySpecial, productId: todaySpecial.productId || `special_${Date.now()}`, title: e.target.value };
                      setTodaySpecial(next);
                      if (business?.id) localStorage.setItem(`menyo_today_special_${business.id}`, JSON.stringify(next));
                    }}
                    placeholder="Special Title (e.g. Today's Combo)"
                    className="rounded-xl border border-[#050F2A]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#050F2A]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={todaySpecial.priceRupees || ""}
                    onChange={(e) => {
                      const next = { ...todaySpecial, productId: todaySpecial.productId || `special_${Date.now()}`, priceRupees: Number(e.target.value) || 0 };
                      setTodaySpecial(next);
                      if (business?.id) localStorage.setItem(`menyo_today_special_${business.id}`, JSON.stringify(next));
                    }}
                    placeholder="Price (Rs.)"
                    className="w-24 rounded-xl border border-[#050F2A]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#050F2A]"
                  />
                  <input
                    type="url"
                    value={todaySpecial.imageUrl}
                    onChange={(e) => {
                      const next = { ...todaySpecial, productId: todaySpecial.productId || `special_${Date.now()}`, imageUrl: e.target.value };
                      setTodaySpecial(next);
                      if (business?.id) localStorage.setItem(`menyo_today_special_${business.id}`, JSON.stringify(next));
                    }}
                    placeholder="Banner Image URL (1080×1350)"
                    className="w-48 rounded-xl border border-[#050F2A]/15 bg-white px-3 py-1.5 text-xs text-[#050F2A]"
                  />
                </div>
                <span className="text-[11px] text-[#050F2A]/55">
                  Instagram-size (1:1) Today&apos;s Special banner on customer menu
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">Menu Products</h2>
                  <p className="text-xs text-[#050F2A]/60">Manage dishes, drinks, prices, and availability</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#050F2A]/40" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search product..."
                      className="bg-[#F2FDFF] border border-[#050F2A]/15 rounded-full pl-9 pr-4 py-2 text-xs text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] w-44"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-[#F2FDFF] border border-[#050F2A]/15 rounded-full px-4 py-2 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setShowProductModal(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto border border-[#050F2A]/10 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F2FDFF] text-[#050F2A]/70 border-b border-[#050F2A]/10 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Price (LKR)</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#050F2A]/10 text-[#050F2A]">
                    {filteredProducts.map((p) => {
                      const price =
                        typeof p.priceRupees === "number"
                          ? p.priceRupees
                          : typeof p.priceMinor === "number"
                            ? p.priceMinor / 100
                            : (p as any).price || 0;

                      const catName =
                        categories.find((c) => c.id === p.categoryId)?.name ||
                        (p as any).category ||
                        "General";

                      return (
                        <tr key={p.id} className="hover:bg-[#F2FDFF]/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-xl object-contain bg-white border border-[#050F2A]/10"
                                  onError={(e) => ((e.target as any).style.display = "none")}
                                />
                              ) : null}
                              <div>
                                <span className="font-bold text-[#050F2A] block">{p.name}</span>
                                {p.description && (
                                  <span className="text-[11px] text-[#050F2A]/60 line-clamp-1 max-w-xs">
                                    {p.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 rounded-full bg-[#F2FDFF] border border-[#050F2A]/10 text-[10px] font-bold text-[#050F2A]">
                              {catName}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-[#050F2A]">
                            Rs. {price.toLocaleString()}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.isAvailable !== false
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-zinc-200 text-zinc-600"
                                }`}
                            >
                              {p.isAvailable !== false ? "Active" : "Hidden"}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setShowProductModal(true);
                                }}
                                className="p-1.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]/70 hover:text-[#050F2A]"
                                title="Edit item"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-1.5 rounded-full bg-white hover:bg-rose-50 border border-rose-200 text-rose-500 hover:text-rose-700"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#050F2A]/40">
                          No products found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CATEGORIES */}
          {activeTab === "categories" && (
            <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">Menu Categories</h2>
                  <p className="text-xs text-[#050F2A]/60">Organize items into guest browse tabs</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="px-4 py-2 rounded-full border border-[#050F2A]/15 hover:bg-[#F2FDFF] text-[#050F2A] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    title="Configure 'All Categories' Tab Icon"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#7BBBFF]" />
                    <span>"All" Icon Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setShowCategoryModal(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-3xl bg-[#F2FDFF]/50 border border-[#050F2A]/10 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {c.iconUrl ? (
                        <img src={c.iconUrl} alt={c.name} className="w-8 h-8 rounded-full object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#7BBBFF]/20 flex items-center justify-center font-bold text-xs text-[#050F2A]">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-sm text-[#050F2A] block">{c.name}</span>
                        <span className="text-[10px] text-[#050F2A]/50 font-mono">
                          {products.filter((p) => p.categoryId === c.id || (p as any).category === c.name).length} items
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(c);
                          setShowCategoryModal(true);
                        }}
                        className="p-1.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]/70 hover:text-[#050F2A]"
                        title="Edit Category"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setArchivingCategory(c)}
                        className="p-1.5 rounded-full bg-white hover:bg-rose-50 border border-[#050F2A]/15 text-rose-600"
                        title="Archive Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TABLES & QR CODES */}
          {activeTab === "tables" && (
            <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">Dining Tables & QR Codes</h2>
                  <p className="text-xs text-[#050F2A]/60">Generate and print high-resolution QR tent cards for every table</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAutoGenerate15Tables}
                    disabled={generatingTables}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Generate Table 01 to Table 15 automatically"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{generatingTables ? "Generating 15 QRs..." : "⚡ Auto-Generate 15 Tables"}</span>
                  </button>

                  <button
                    onClick={() => setShowBatchPrint(true)}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-[#7BBBFF]" />
                    <span>Batch Print QRs</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingTable(null);
                      setShowTableModal(true);
                    }}
                    className="px-5 py-2 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Table</span>
                  </button>
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="p-12 text-center bg-[#F8F9FA] rounded-3xl border border-dashed border-[#CBD5E1] space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-[#050F2A]">No Dining Tables Created Yet</h3>
                    <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                      Click the button below to generate 15 tables automatically, or add single tables one by one.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerate15Tables}
                    disabled={generatingTables}
                    className="px-6 py-2.5 rounded-full bg-[#050F2A] text-white font-extrabold text-xs shadow-md hover:bg-[#0A1840] transition active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4 text-[#7BBBFF]" />
                    <span>Auto-Create 15 Dining Tables Now</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between space-y-4 shadow-sm transition-all ${t.active !== false
                          ? "bg-[#FFFFFF] border-[#E2E8F0]"
                          : "bg-zinc-100/80 border-zinc-300 opacity-60"
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-[#050F2A] block">{t.number}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.active !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-zinc-200 text-zinc-600 border border-zinc-300"
                                }`}
                            >
                              {t.active !== false ? "Active" : "Disabled"}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#050F2A]/60">
                            {t.capacity ? `Seats ${t.capacity} guests` : "Standard Dining Table"}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded-2xl border border-[#050F2A]/10 shadow-sm">
                          <QrCode className="w-8 h-8 text-[#050F2A]" />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#050F2A]/10 flex items-center justify-between">
                        <button
                          onClick={() => copyTableLink(t.token)}
                          className="text-xs font-bold text-[#050F2A] hover:text-[#7BBBFF] flex items-center gap-1.5"
                        >
                          {copiedToken === t.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedToken === t.token ? "Copied Link" : "Copy URL"}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Enable / Disable Table QR Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTableActive(t)}
                            className={`p-2 rounded-full border transition ${t.active !== false
                                ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                : "bg-zinc-200 hover:bg-zinc-300 border-zinc-300 text-zinc-700"
                              }`}
                            title={t.active !== false ? "Disable this table QR (Disable ordering)" : "Enable this table QR (Activate ordering)"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSinglePrintTable(t)}
                            className="p-2 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]"
                            title="Print Tent Card"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTable(t);
                              setShowTableModal(true);
                            }}
                            className="p-2 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]"
                            title="Edit Table"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS & INDEPENDENT BUSINESS BRANDING (Minimal & User-Friendly matching /admin style) */}
          {/* REWARD POINTS & LOYALTY CUSTOMERS TAB */}
          {activeTab === "billing" && business && (
            <BillingSystemTab
              businessId={business.id}
              businessName={business.name}
              logoUrl={effectiveLiveBranding.logoUrl}
              existingMenuProducts={products}
              initialItems={billingPreloadItems}
              initialCustomerPhone={billingPreloadPhone}
              onInitialItemsConsumed={() => {
                setBillingPreloadItems(null);
                setBillingPreloadPhone(null);
              }}
            />
          )}

          {activeTab === "rewards" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-[#050F2A] flex items-center gap-2">
                    <Gift className="w-6 h-6 text-[#7BBBFF]" />
                    <span>Customer Reward Points</span>
                  </h2>
                  <p className="text-xs text-[#050F2A]/60 mt-1">
                    Customers who join after ordering earn 20 points per Rs. 1,000 spent (1 pt = Rs. {rewardPointValue} discount on next visit).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-[#050F2A]/10 rounded-2xl px-4 py-2 text-xs font-bold text-[#050F2A] shadow-sm">
                    Total VIPs: <span className="text-[#7BBBFF] font-black">{customers.length}</span>
                  </div>
                </div>
              </div>

              {/* Point Value Configuration Card */}
              <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#050F2A]">
                    1 Reward Point Value (Rs.)
                  </h3>
                  <p className="text-xs text-[#050F2A]/60 mt-0.5">
                    Choose how much discount 1 reward point gives your customers when they claim it.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRewardPointValue(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${rewardPointValue === val
                          ? "bg-[#050F2A] text-white border-[#050F2A]"
                          : "bg-[#F2FDFF] text-[#050F2A] border-[#050F2A]/15 hover:border-[#7BBBFF]"
                        }`}
                    >
                      Rs. {val}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-xs font-bold text-[#050F2A]/60">Custom:</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={rewardPointValue}
                      onChange={(e) => setRewardPointValue(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 px-2.5 py-1.5 rounded-xl border border-[#050F2A]/20 text-xs font-bold text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingRewardRate}
                    onClick={async () => {
                      if (!business?.id) return;
                      setSavingRewardRate(true);
                      setRewardRateSaved(false);
                      try {
                        await setDoc(
                          storeDoc(db, "businesses", business.id),
                          { rewardPointValueRupees: rewardPointValue },
                          { merge: true }
                        );
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            `menyo_reward_rate_${business.slug || business.id}`,
                            String(rewardPointValue)
                          );
                          localStorage.setItem(`menyo_reward_rate_${business.id}`, String(rewardPointValue));
                        }
                        setRewardRateSaved(true);
                        setTimeout(() => setRewardRateSaved(false), 2500);
                      } catch (err) {
                        console.warn("Failed to save reward rate:", err);
                      } finally {
                        setSavingRewardRate(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#7BBBFF] hover:bg-[#68aaff] text-[#050F2A] text-xs font-extrabold transition shadow-sm disabled:opacity-50"
                  >
                    {savingRewardRate ? "Saving..." : rewardRateSaved ? "Saved ✓" : "Save Rate"}
                  </button>
                  <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#050F2A]/15 rounded-xl px-2.5 py-1.5">
                    <span className="text-[11px] font-semibold text-[#050F2A]/70">Rs. 100 =</span>
                    <input
                      type="number"
                      min={1}
                      value={rewardPointsPer100}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setRewardPointsPer100(val);
                        if (business?.id) {
                          localStorage.setItem(`menyo_reward_earn_rate_${business.id}`, String(val));
                        }
                      }}
                      className="w-12 bg-white border border-[#050F2A]/15 rounded-lg px-1.5 py-0.5 text-xs font-bold text-[#050F2A] text-center"
                    />
                    <span className="text-[11px] font-semibold text-[#050F2A]/70">pts</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#050F2A]/10 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <div className="p-4 border-b border-[#050F2A]/10 flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
                    <div className="relative w-full max-w-sm">
                      <Search className="w-4 h-4 text-[#050F2A]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={rewardSearchQuery}
                        onChange={(e) => setRewardSearchQuery(e.target.value)}
                        placeholder="Search by mobile number or name..."
                        className="w-full rounded-xl border border-[#050F2A]/15 bg-white pl-9 pr-3.5 py-2 text-xs text-[#050F2A] focus:border-[#050F2A] focus:outline-none"
                      />
                    </div>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F2FDFF] text-[#050F2A]/70 border-b border-[#050F2A]/10 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="px-5 py-3.5">Customer Name</th>
                        <th className="px-5 py-3.5">Birthday</th>
                        <th className="px-5 py-3.5">Mobile Number</th>
                        <th className="px-5 py-3.5">Total Orders</th>
                        <th className="px-5 py-3.5">Claimed Orders</th>
                        <th className="px-5 py-3.5">Total Spent</th>
                        <th className="px-5 py-3.5">Reward Points</th>
                        <th className="px-5 py-3.5">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#050F2A]/10 text-[#050F2A]">
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-[#050F2A]/50">
                            No loyalty customers yet. When guests enter their name & mobile number after ordering, they will appear here automatically.
                          </td>
                        </tr>
                      ) : (
                        customers
                          .filter(
                            (c) =>
                              !rewardSearchQuery.trim() ||
                              c.phone.toLowerCase().includes(rewardSearchQuery.trim().toLowerCase()) ||
                              (c.name || "").toLowerCase().includes(rewardSearchQuery.trim().toLowerCase())
                          )
                          .map((c) => (
                          <tr key={c.phone} className="hover:bg-[#F2FDFF]/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-[#050F2A]">{c.name}</td>
                            <td className="px-5 py-3.5 text-[#050F2A]/75 text-[11px] font-medium">{c.birthday || "—"}</td>
                            <td className="px-5 py-3.5 font-mono text-[11px] text-[#050F2A]/80">{c.phone}</td>
                            <td className="px-5 py-3.5 font-semibold">{c.totalOrders || 1}</td>
                            <td className="px-5 py-3.5 font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-bold">
                                {c.claimedOrdersCount || 0} claimed
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-semibold">Rs. {(c.totalSpentRupees || 0).toLocaleString()}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 font-black text-[11px]">
                                {c.points} pts (Rs. {c.points * rewardPointValue})
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-[#050F2A]/60 text-[11px]">
                              {c.lastOrderAtMs ? new Date(c.lastOrderAtMs).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <CafeSettingsView businessId={business?.id} businessSlug={business?.slug} />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          businessId={business?.id}
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={(savedProduct) => {
            if (savedProduct && savedProduct.id) {
              setProducts((prev) => {
                const exists = prev.some((p) => p.id === savedProduct.id);
                if (exists) {
                  return prev.map((p) => (p.id === savedProduct.id ? { ...p, ...savedProduct } : p));
                }
                return [...prev, savedProduct];
              });
              if (savedProduct.categoryId && savedProduct.category) {
                setCategories((prev) => {
                  const catExists = prev.some(
                    (c) => c.id === savedProduct.categoryId || c.name.toLowerCase() === savedProduct.category.toLowerCase()
                  );
                  if (catExists) return prev;
                  return [
                    ...prev,
                    {
                      id: savedProduct.categoryId,
                      name: savedProduct.category,
                      slug: savedProduct.category.toLowerCase().replace(/\s+/g, "-"),
                      displayOrder: prev.length,
                      sortOrder: prev.length,
                      active: true,
                    } as Category,
                  ];
                });
              }
            } else if (editingProduct?.id) {
              // Product was archived/deleted via ProductModal
              const removedId = editingProduct.id;
              setProducts((prev) => prev.filter((p) => p.id !== removedId));
              const bId = business?.id;
              if (bId) {
                try {
                  const key = `menyo_products_${bId}`;
                  const localProds: any[] = JSON.parse(localStorage.getItem(key) || "[]");
                  localStorage.setItem(key, JSON.stringify(localProds.filter((p) => p.id !== removedId)));
                } catch {}
              }
            }
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryUpsertModal
          businessId={business?.id}
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSuccess={(savedCat) => {
            if (savedCat && savedCat.id) {
              setCategories((prev) => {
                const exists = prev.some((c) => c.id === savedCat.id);
                if (exists) {
                  return prev.map((c) => (c.id === savedCat.id ? { ...c, ...savedCat } : c));
                }
                return [...prev, savedCat];
              });
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {archivingCategory && (
        <ArchiveCategoryModal
          businessId={business?.id}
          category={archivingCategory}
          categories={categories}
          products={products}
          onClose={() => setArchivingCategory(null)}
          onSuccess={() => {
            const catId = archivingCategory.id;
            setCategories((prev) => prev.filter((c) => c.id !== catId));
            if (business?.id && typeof window !== "undefined") {
              try {
                const key = `menyo_categories_${business.id}`;
                const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]");
                localStorage.setItem(key, JSON.stringify(existing.filter((c) => c.id !== catId)));
              } catch {}
            }
            setArchivingCategory(null);
          }}
        />
      )}

      {showTableModal && (
        <TableModal
          businessId={business?.id}
          table={editingTable}
          onClose={() => {
            setShowTableModal(false);
            setEditingTable(null);
          }}
          onSuccess={() => {
            setShowTableModal(false);
            setEditingTable(null);
          }}
        />
      )}

      {singlePrintTable && (
        <SingleTablePrintModal
          table={singlePrintTable}
          businessSlug={business.slug}
          businessName={business.name}
          primaryColor={effectiveLiveBranding.primaryColor}
          accentColor={effectiveLiveBranding.accentColor}
          headerBackgroundColor={effectiveLiveBranding.headerBackgroundColor}
          headerTextColor={effectiveLiveBranding.headerTextColor}
          logoUrl={effectiveLiveBranding.logoUrl}
          qrHeaderTitle={effectiveLiveBranding.qrHeaderTitle}
          qrSubtitle={effectiveLiveBranding.qrSubtitle}
          qrFooterNote={effectiveLiveBranding.qrFooterNote}
          qrLogoSize={effectiveLiveBranding.qrLogoSize}
          cardBgColor={effectiveLiveBranding.cardBgColor}
          cardTextColor={effectiveLiveBranding.cardTextColor}
          onClose={() => setSinglePrintTable(null)}
        />
      )}

      {showBatchPrint && (
        <BatchTablesPrintModal
          tables={tables}
          businessSlug={business.slug}
          businessName={business.name}
          primaryColor={effectiveLiveBranding.primaryColor}
          accentColor={effectiveLiveBranding.accentColor}
          headerBackgroundColor={effectiveLiveBranding.headerBackgroundColor}
          headerTextColor={effectiveLiveBranding.headerTextColor}
          logoUrl={effectiveLiveBranding.logoUrl}
          qrHeaderTitle={effectiveLiveBranding.qrHeaderTitle}
          qrSubtitle={effectiveLiveBranding.qrSubtitle}
          qrFooterNote={effectiveLiveBranding.qrFooterNote}
          qrLogoSize={effectiveLiveBranding.qrLogoSize}
          cardBgColor={effectiveLiveBranding.cardBgColor}
          cardTextColor={effectiveLiveBranding.cardTextColor}
          onClose={() => setShowBatchPrint(false)}
        />
      )}

      {showUpgradeModal && business && (
        <SubscriptionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          businessName={business.name}
          businessSlug={business.slug}
          ownerEmail={currentUser?.email || business.ownerEmail}
          currentDaysRemaining={daysRemaining}
          isExpired={subStatus === "EXPIRED"}
        />
      )}

      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSuccess={() => {
            setMustChangePassword(false);
            loadSession();
          }}
          onLogout={handleLogout}
        />
      )}

      {showBusinessSetupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#050F2A]/80 backdrop-blur-xl p-4 sm:p-6">
          <div className="relative my-auto w-full max-w-[440px] rounded-[28px] bg-[#0B1736]/95 p-7 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/15">
            {/* Subtle Apple-style ambient top glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#7BBBFF]/20 blur-3xl" />

            <div className="relative mb-6 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center brightness-0 invert">
                <MenyoWordmark />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7BBBFF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7BBBFF] ring-1 ring-[#7BBBFF]/25">
                Menyo Studio Setup
              </span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Create Your Business
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300/80">
                Enter your business name and mobile number to launch your custom Menyo storefront.
              </p>
            </div>

            {setupError && (
              <div className="relative mb-5 rounded-2xl bg-rose-500/10 border border-rose-400/25 px-4 py-3 text-xs font-medium text-rose-200">
                {setupError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const cleanName = setupBusinessName.trim();
                const cleanPhone = setupPhone.trim();
                if (!cleanName || cleanName.length < 2) {
                  setSetupError("Please enter a valid business name.");
                  return;
                }
                if (!setupCountry) {
                  setSetupError("Please select your country.");
                  return;
                }
                if (!cleanPhone || cleanPhone.length < 6) {
                  setSetupError("Please enter a valid mobile number.");
                  return;
                }
                const fullPhone = `${setupCountryCode} ${cleanPhone}`;
                setSetupSaving(true);
                setSetupError(null);
                try {
                  let newSlug = cleanName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");
                  if (!newSlug || newSlug.length < 3) {
                    newSlug = `${newSlug || "shop"}-${Math.random().toString(36).substring(2, 6)}`;
                  }

                  // Auto-resolve unique slug if collision occurs (e.g. thascafe -> thascafe-2 or thascafe-xyz)
                  let finalSlug = newSlug;
                  let collisionCount = 1;
                  while (true) {
                    const existingSlugSnap = await getDocs(
                      query(collection(db, "businesses"), where("slug", "==", finalSlug))
                    ).catch(() => null);
                    const conflictDoc = existingSlugSnap?.docs.find((d) => d.id !== business.id);
                    if (!conflictDoc) {
                      break; // Available!
                    }
                    collisionCount++;
                    finalSlug = `${newSlug}-${collisionCount}`;
                    if (collisionCount > 5) {
                      finalSlug = `${newSlug}-${Math.random().toString(36).substring(2, 6)}`;
                      break;
                    }
                  }
                  newSlug = finalSlug;

                  // Persist to Supabase document store (updates name, slug, branding, and JSONB data with country, phone, setupCompleted)
                  await setDoc(
                    storeDoc(db, "businesses", business.id),
                    {
                      name: cleanName,
                      slug: newSlug,
                      country: setupCountry,
                      phone: fullPhone,
                      setupCompleted: true,
                      branding: {
                        ...(business.branding || {}),
                        phone: fullPhone,
                        country: setupCountry,
                      },
                    },
                    { merge: true }
                  );

                  await setDoc(
                    storeDoc(db, "businessSlugs", newSlug),
                    {
                      slug: newSlug,
                      businessId: business.id,
                      canonicalSlug: newSlug,
                    },
                    { merge: true }
                  ).catch(() => {});

                  localStorage.setItem(`menyo_setup_done_${business.id}`, "1");
                  localStorage.setItem("menyo_auth_businessId", business.id);
                  localStorage.setItem("menyo_auth_businessSlug", newSlug);

                  setBusiness((prev: any) => (prev ? { ...prev, name: cleanName, country: setupCountry, phone: fullPhone, slug: newSlug, setupCompleted: true } : prev));
                  setSettingsForm((prev) => ({ ...prev, name: cleanName, phone: fullPhone }));
                  setShowBusinessSetupModal(false);
                  navigate(`/${newSlug}/admin`, { replace: true });
                } catch (err: any) {
                  const rawMsg = err?.message || String(err || "");
                  if (rawMsg.toLowerCase().includes("row-level security")) {
                    setSetupError(
                      "Permission denied (RLS): Your account does not have permission to update this business row in Supabase. Please ensure your user is the owner of this business or check Supabase RLS policies."
                    );
                  } else if (rawMsg.toLowerCase().includes("duplicate") || rawMsg.toLowerCase().includes("unique")) {
                    setSetupError(
                      "This shop URL is already taken by another business. Please choose a different Business Name."
                    );
                  } else {
                    setSetupError(rawMsg || "Failed to save business details. Please try again.");
                  }
                } finally {
                  setSetupSaving(false);
                }
              }}
              className="relative space-y-4"
            >
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300/90 mb-2">
                  Business Name <span className="text-[#7BBBFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={setupBusinessName}
                  onChange={(e) => setSetupBusinessName(e.target.value)}
                  placeholder="e.g. Example Cafe"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-slate-400/60 transition focus:border-[#7BBBFF]/60 focus:bg-white/[0.09] focus:outline-none focus:ring-4 focus:ring-[#7BBBFF]/15"
                />
                {setupBusinessName.trim() && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2 ring-1 ring-white/10">
                    <span className="text-[11px] font-medium text-slate-400">Live URL</span>
                    <span className="font-mono text-xs font-medium text-[#7BBBFF]">
                      menyo.org/
                      {setupBusinessName
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "") || "your-shop"}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300/90 mb-2">
                  Country <span className="text-[#7BBBFF]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCountryDropdownOpen((o) => !o);
                    setCodeDropdownOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left text-sm text-white transition hover:bg-white/[0.09] focus:border-[#7BBBFF]/60 focus:outline-none focus:ring-4 focus:ring-[#7BBBFF]/15"
                >
                  <span className={setupCountry ? "text-white" : "text-slate-400/70"}>
                    {setupCountry
                      ? `${WORLD_COUNTRIES.find((c) => c.name === setupCountry)?.flag || ""} ${setupCountry}`
                      : "Select your country"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {countryDropdownOpen && (
                  <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/15 bg-[#0E1E45] shadow-2xl">
                    <div className="border-b border-white/10 p-2">
                      <input
                        type="text"
                        autoFocus
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country..."
                        className="w-full rounded-xl bg-white/[0.07] px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBBFF]/40"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {WORLD_COUNTRIES.filter(
                        (c) =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.code.includes(countrySearch)
                      ).map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            setSetupCountry(c.name);
                            setSetupCountryCode(c.code);
                            setCountryDropdownOpen(false);
                            setCountrySearch("");
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                            setupCountry === c.name
                              ? "bg-[#7BBBFF]/20 text-[#7BBBFF] font-semibold"
                              : "text-slate-200 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span>
                            {c.flag} {c.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300/90 mb-2">
                  Mobile Number <span className="text-[#7BBBFF]">*</span>
                </label>
                <div className="relative flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeDropdownOpen((o) => !o);
                      setCountryDropdownOpen(false);
                    }}
                    className="flex w-[112px] shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm font-medium text-white transition hover:bg-white/[0.09] focus:border-[#7BBBFF]/60 focus:outline-none focus:ring-4 focus:ring-[#7BBBFF]/15"
                  >
                    <span>
                      {WORLD_COUNTRIES.find((c) => c.code === setupCountryCode)?.flag || "🌐"}{" "}
                      {setupCountryCode}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                  {codeDropdownOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-white/15 bg-[#0E1E45] shadow-2xl">
                      <div className="border-b border-white/10 p-2">
                        <input
                          type="text"
                          autoFocus
                          value={codeSearch}
                          onChange={(e) => setCodeSearch(e.target.value)}
                          placeholder="Search country or +code..."
                          className="w-full rounded-xl bg-white/[0.07] px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7BBBFF]/40"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {WORLD_COUNTRIES.filter(
                          (c) =>
                            c.name.toLowerCase().includes(codeSearch.toLowerCase()) ||
                            c.code.includes(codeSearch)
                        ).map((c) => (
                          <button
                            key={`code-${c.name}`}
                            type="button"
                            onClick={() => {
                              setSetupCountryCode(c.code);
                              setCodeDropdownOpen(false);
                              setCodeSearch("");
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                              setupCountryCode === c.code
                                ? "bg-[#7BBBFF]/20 text-[#7BBBFF] font-semibold"
                                : "text-slate-200 hover:bg-white/[0.08]"
                            }`}
                          >
                            <span className="truncate pr-2">
                              {c.flag} {c.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <input
                    type="tel"
                    required
                    value={setupPhone}
                    onChange={(e) => setSetupPhone(e.target.value)}
                    placeholder={getPhonePlaceholder(setupCountryCode)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-slate-400/60 transition focus:border-[#7BBBFF]/60 focus:bg-white/[0.09] focus:outline-none focus:ring-4 focus:ring-[#7BBBFF]/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={setupSaving}
                className="mt-2 w-full rounded-2xl bg-[#7BBBFF] px-5 py-3.5 text-sm font-semibold text-[#050F2A] shadow-[0_8px_24px_-4px_rgba(123,187,255,0.45)] transition-all hover:bg-[#93C8FF] active:scale-[0.99] disabled:opacity-60"
              >
                {setupSaving ? "Creating Your Storefront..." : "Continue & Launch URL"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
