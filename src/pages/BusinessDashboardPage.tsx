import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
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
  MessageCircle,
  Smartphone,
  Monitor,
  RotateCcw,
  Upload,
  Globe,
  Star,
  EyeOff,
} from "lucide-react";
import { platformApi } from "../lib/apiClient";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
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
import { CategoryUpsertModal, ArchiveCategoryModal } from "../components/admin/CategoryModal";
import { ProductModal } from "../components/admin/ProductModal";
import { TableModal } from "../components/admin/TableModal";
import { MenyoIcon, MenyoWordmark } from "../components/common/MenyoLogo";
import { AdminDashboardPage } from "./AdminDashboardPage";

type DashboardTab = "overview" | "orders" | "menu" | "categories" | "tables" | "settings";

export const BusinessDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { businessSlug } = useParams<{ businessSlug?: string }>();

  // If URL explicitly asks for teatime admin, render Tea Time's admin dashboard directly
  if (businessSlug === "teatime") {
    return <AdminDashboardPage />;
  }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session context
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Real-time collections for this tenant
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
    primaryColor: "#7BBBFF",
    accentColor: "#B8A9FF",
    backgroundColor: "#F2FDFF",
    textColor: "#050F2A",
    headerBackgroundColor: "#050F2A",
    headerTextColor: "#F2FDFF",
    qrHeaderTitle: "",
    qrSubtitle: "SCAN TO ORDER",
    qrFooterNote: "☕ Good tea brings people together.",
    qrLogoSize: 112 as number | string,
    socialLinks: [] as SocialLinkItem[],
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  // Copied token state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await platformApi.getSessionContext();
      if (session.claims.role === "SUPER_ADMIN" && !businessSlug) {
        navigate("/super-admin");
        return;
      }
      if (!session.business && !businessSlug) {
        throw new Error("No business profile assigned to your account.");
      }

      let b = session.business;

      // If URL slug param is present (e.g. /ffgfgffg/admin), resolve that specific business
      if (businessSlug && businessSlug !== "teatime") {
        try {
          const { getDoc, doc: fsDoc, collection: fsCol, query: fsQ, where: fsWhere, getDocs: fsGetDocs } = await import("firebase/firestore");
          let targetBId = businessSlug;
          const slugSnap = await getDoc(fsDoc(db, "businessSlugs", businessSlug)).catch(() => null);
          if (slugSnap && slugSnap.exists()) {
            targetBId = slugSnap.data().businessId || businessSlug;
          }
          const bSnap = await getDoc(fsDoc(db, "businesses", targetBId)).catch(() => null);
          if (bSnap && bSnap.exists()) {
            b = { id: bSnap.id, ...(bSnap.data() as any) } as any;
          } else {
            const qSlug = fsQ(fsCol(db, "businesses"), fsWhere("slug", "==", businessSlug));
            const sSlug = await fsGetDocs(qSlug).catch(() => null);
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

      if (!b) {
        throw new Error(`Business "${businessSlug}" could not be found.`);
      }

      setCurrentUser(session.user);
      setBusiness(b);

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
        primaryColor: b.branding?.primaryColor || (isTeaTime ? "#2C190E" : "#7BBBFF"),
        accentColor: b.branding?.accentColor || (isTeaTime ? "#E8B64F" : "#B8A9FF"),
        backgroundColor: b.branding?.backgroundColor || (isTeaTime ? "#FAF7F0" : "#F2FDFF"),
        textColor: b.branding?.textColor || (isTeaTime ? "#301C10" : "#050F2A"),
        headerBackgroundColor: b.branding?.headerBackgroundColor || (isTeaTime ? "#2C190E" : "#050F2A"),
        headerTextColor: b.branding?.headerTextColor || (isTeaTime ? "#FAF7F0" : "#F2FDFF"),
        qrHeaderTitle: b.branding?.qrHeaderTitle ?? "",
        qrSubtitle: b.branding?.qrSubtitle ?? "SCAN TO ORDER",
        qrFooterNote: b.branding?.qrFooterNote ?? (isTeaTime ? "☕ Good tea brings people together." : "Enjoy your visit!"),
        qrLogoSize: b.branding?.qrLogoSize ?? 112,
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

    const unsubCategories = onSnapshot(
      query(collection(db, `businesses/${bId}/categories`), orderBy("sortOrder", "asc")),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Category));
        setCategories(list);
      },
      () => {}
    );

    const unsubProducts = onSnapshot(
      query(collection(db, `businesses/${bId}/products`), orderBy("sortOrder", "asc")),
      (snap) => {
        const list: MenuItem[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as MenuItem));
        setProducts(list);
      },
      () => {}
    );

    const unsubTables = onSnapshot(
      query(collection(db, `businesses/${bId}/tables`), orderBy("tableNumber", "asc")),
      (snap) => {
        const list: TableItem[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as TableItem));
        setTables(list);
      },
      () => {}
    );

    const unsubOrders = onSnapshot(
      query(collection(db, `businesses/${bId}/orders`), orderBy("createdAt", "desc")),
      (snap) => {
        const list: Order[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Order));
        // Filter out any demo orders so the live café kitchen queue remains 100% genuine
        setOrders(list.filter((o) => !(o as any).isDemo && !o.id.startsWith("demo_")));
      },
      () => {}
    );

    return () => {
      unsubCategories();
      unsubProducts();
      unsubTables();
      unsubOrders();
    };
  }, [business?.id]);

  const handleLogout = async () => {
    localStorage.removeItem("menyo_auth_role");
    localStorage.removeItem("menyo_auth_email");
    await signOut(auth).catch(() => {});
    navigate("/login");
  };

  const handleOrderStatusUpdate = async (orderId: string, status: OrderStatus) => {
    try {
      await platformApi.ownerUpdateOrderStatus(orderId, status);
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
          backgroundColor: res.branding.backgroundColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF"),
          textColor: res.branding.textColor || (business.slug === "teatime" ? "#301C10" : "#050F2A"),
          headerBackgroundColor: res.branding.headerBackgroundColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A"),
          headerTextColor: res.branding.headerTextColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF"),
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

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettingsForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const copyTableLink = (tableToken: string) => {
    const origin = window.location.origin;
    const url = `${origin}/${business.slug}/menu?table=${tableToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(tableToken);
    setTimeout(() => setCopiedToken(null), 2500);
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
      <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#7BBBFF]" />
        <span className="text-xs text-[#050F2A]/60 uppercase tracking-widest font-bold">
          Loading Workspace...
        </span>
      </div>
    );
  }

  // Dedicated dashboard view for TEA TIME client (Live orders board, sound alerts, operations)
  if (business?.slug === "teatime" || currentUser?.email === "admin@teatime.lk") {
    return <AdminDashboardPage />;
  }

  // Handle Suspended accounts
  const subStatus = business?.subscription?.effectiveStatus || business?.status;

  if (business && subStatus === "SUSPENDED") {
    return (
      <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white border border-[#050F2A]/10 rounded-3xl max-w-md w-full p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#050F2A] mb-2">Workspace Suspended</h1>
          <p className="text-sm text-[#050F2A]/70 mb-6 leading-relaxed">
            Your restaurant workspace has been temporarily suspended by Menyo platform administration.
          </p>
          <div className="p-4 bg-[#F2FDFF] rounded-2xl border border-[#050F2A]/10 text-xs text-[#050F2A]/80 mb-6 space-y-1">
            <p>Please contact Menyo support to resolve account status:</p>
            <p className="font-bold text-[#050F2A]">support@aevonix.lk / WhatsApp: +94 76 000 0000</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-full bg-[#050F2A] text-white font-bold text-xs uppercase tracking-wider transition-all"
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
      <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white border border-[#050F2A]/10 rounded-3xl max-w-lg w-full p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#050F2A] mb-2">
            {isTrial ? "2-Day Free Trial Concluded" : "Subscription Expired"}
          </h1>
          <p className="text-sm text-[#050F2A]/70 mb-6 leading-relaxed">
            {isTrial
              ? `Your 48-hour free trial for "${business.name}" has completed. Contact our team on WhatsApp to activate your official subscription key.`
              : "Your Menyo menu subscription has ended. Customer ordering has been temporarily paused."}
          </p>

          <div className="p-4 bg-[#F2FDFF] rounded-2xl border border-[#050F2A]/10 text-xs text-[#050F2A]/80 mb-6 space-y-2 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#050F2A]/10">
              <span className="text-[#050F2A]/60">Your Login Email:</span>
              <span className="font-bold text-[#050F2A] font-mono">{currentUser?.email || business.ownerEmail || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#050F2A]/10">
              <span className="text-[#050F2A]/60">Select Plan:</span>
              <span className="font-bold text-[#050F2A]">Monthly (Rs. 2k) / 6 Mo (Rs. 10k) / 1 Yr (Rs. 18k)</span>
            </div>
            <p className="text-[#050F2A]/60 text-[11px] pt-1">
              💬 When you contact our support team on WhatsApp, our Super Admin will look up your email and activate your subscription key instantly.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={`https://wa.me/94764847081?text=Hi%20Menyo,%20my%20trial%20for%20${encodeURIComponent(
                business.name
              )}%20(Email:%20${encodeURIComponent(
                currentUser?.email || business.ownerEmail || ""
              )})%20has%20ended.%20I%20would%20like%20to%20pay%20and%20activate%20my%20subscription%20key.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact to Pay & Activate via WhatsApp (076 484 7081)</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]/70 hover:text-[#050F2A] font-bold text-xs transition-all"
            >
              Sign Out
            </button>
          </div>
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

  return (
    <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col font-sans selection:bg-[#7BBBFF]/40 selection:text-[#050F2A]">
      {/* 1. TOP FLOATING INSET PILL NAVBAR */}
      <div className="sticky top-4 z-40 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <header className="bg-white/95 backdrop-blur-md border border-[#050F2A]/10 rounded-full px-5 py-3 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2" title="Menyo Platform">
              <MenyoIcon size={26} />
              <MenyoWordmark variant="dark" height={16} className="hidden sm:block" />
            </Link>

            <span className="text-[#050F2A]/20">/</span>

            {/* Business Logo & Name */}
            <div className="flex items-center gap-2.5">
              {business?.branding?.logoUrl ? (
                <img
                  src={business.branding.logoUrl}
                  alt={business.name}
                  className="w-8 h-8 rounded-full object-cover border border-[#050F2A]/10"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm"
                  style={{ backgroundColor: business?.branding?.primaryColor || "#050F2A" }}
                >
                  {business?.name?.charAt(0) || "B"}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-[#050F2A]">
                    {business?.name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    business?.isTrial || business?.subscription?.packageId === "2_days_trial"
                      ? "bg-amber-500/15 text-amber-800 border border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-800"
                  }`}>
                    {business?.subscription?.isLifetime
                      ? "Lifetime"
                      : business?.isTrial || business?.subscription?.packageId === "2_days_trial"
                      ? `Trial: ${daysRemaining ?? 0}d left`
                      : `${daysRemaining ?? 0}d left`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={`/${business?.slug}/menu`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full bg-[#F2FDFF] hover:bg-[#7BBBFF]/20 border border-[#050F2A]/10 text-xs font-bold text-[#050F2A] flex items-center gap-1.5 transition-all"
            >
              <span>View Menu</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-[#050F2A]/60 hover:text-[#050F2A] hover:bg-[#F2FDFF] transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 2-Day Free Trial Active Notification Banner */}
        {(business?.isTrial || business?.subscription?.packageId === "2_days_trial") && (
          <div className="mt-3 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 border border-amber-300/70 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div>
                <span className="font-bold text-amber-950">
                  2-Day Free Trial Active ({daysRemaining ?? 0} {daysRemaining === 1 ? "day" : "days"} remaining)
                </span>
                <span className="text-amber-900/70 ml-1.5 hidden md:inline">
                  • Test out menus, tables, QR codes, and custom colors!
                </span>
              </div>
            </div>
            <a
              href={`https://wa.me/94764847081?text=Hi%20Menyo,%20I'm%20using%20the%202-day%20trial%20for%20${encodeURIComponent(
                business.name
              )}%20(Email:%20${encodeURIComponent(
                currentUser?.email || business.ownerEmail || ""
              )}).%20I%20would%20like%20to%20activate%20my%20full%20plan%20key.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp to Activate Key</span>
            </a>
          </div>
        )}

        {/* 2. PILL TAB BAR */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs font-semibold text-[#050F2A]/60">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-4 rounded-full transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "orders"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders ({orders.filter((o) => o.status === "PENDING" || o.status === "PREPARING").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "menu"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Menu Items ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "tables"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Tables & QRs ({tables.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-2 px-4 rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-[#050F2A] text-white font-bold shadow-sm"
                : "bg-white/80 hover:bg-white text-[#050F2A] border border-[#050F2A]/10"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings & Branding</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-6">
        {/* 7-Day Expiry Reminder Banner */}
        {isExpiringWithin7Days && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3 text-amber-900">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Subscription Expiring in {daysRemaining} Days</h4>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Your access ends on {business.subscription.expiryDateColombo}. Renew now to avoid any disruption to customer QR ordering.
                </p>
              </div>
            </div>
            <a
              href={`https://wa.me/94764847081?text=Hi%20Menyo,%20I'd%20like%20to%20renew%20the%20subscription%20for%20${encodeURIComponent(
                business.name
              )}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full bg-[#050F2A] text-white text-xs font-bold whitespace-nowrap hover:bg-[#0b1739] transition-all self-start sm:self-auto shadow-sm"
            >
              Renew via WhatsApp
            </a>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-[#050F2A]/10 shadow-sm">
                <span className="text-xs font-bold text-[#050F2A]/60 block mb-1">Total Products</span>
                <span className="text-3xl font-black text-[#050F2A]">{products.length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-[#050F2A]/10 shadow-sm">
                <span className="text-xs font-bold text-[#050F2A]/60 block mb-1">Categories</span>
                <span className="text-3xl font-black text-[#050F2A]">{categories.length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-[#050F2A]/10 shadow-sm">
                <span className="text-xs font-bold text-[#050F2A]/60 block mb-1">Active Dining Tables</span>
                <span className="text-3xl font-black text-[#050F2A]">{tables.length}</span>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-[#050F2A]/10 shadow-sm">
                <span className="text-xs font-bold text-[#050F2A]/60 block mb-1">Pending Orders</span>
                <span className="text-3xl font-black text-[#7BBBFF]">
                  {orders.filter((o) => o.status === "PENDING").length}
                </span>
              </div>
            </div>

            {/* Recent Orders in Overview */}
            <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#050F2A]">Recent Dining Orders</h2>
                  <p className="text-xs text-[#050F2A]/60">Real-time table orders feed</p>
                </div>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-bold text-[#050F2A] hover:text-[#7BBBFF] transition-colors"
                >
                  View All Orders &rarr;
                </button>
              </div>

              <div className="divide-y divide-[#050F2A]/10 border border-[#050F2A]/10 rounded-2xl overflow-hidden">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#050F2A]">
                          {order.orderNumberDisplay || order.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#050F2A] font-bold text-[10px]">
                          {order.tableNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#050F2A]/60 mt-1">
                        {order.items?.length || 0} items &bull; Rs. {(order.totalRupees || (order.totalMinor / 100)).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                        order.status === "PREPARING" ? "bg-blue-100 text-blue-800" :
                        order.status === "SERVED" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="p-8 text-center text-[#050F2A]/40 text-xs">
                    No orders placed yet. Scan a table QR code to test your customer flow.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE ORDERS FEED */}
        {activeTab === "orders" && (
          <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">Live Kitchen & Counter Feed</h2>
                <p className="text-xs text-[#050F2A]/60">Manage real-time order states</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-[#F2FDFF] border border-[#050F2A]/15 rounded-full px-4 py-2 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                >
                  <option value="ALL">All Order States</option>
                  <option value="PENDING">Pending</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="SERVED">Served</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-[#050F2A]/40 text-xs border border-dashed border-[#050F2A]/15 rounded-3xl">
                  No orders found matching the filter.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-3xl bg-[#F2FDFF]/50 border border-[#050F2A]/10 space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#050F2A]">
                          {order.orderNumberDisplay || order.orderNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#050F2A] text-white text-[10px] font-bold">
                          {order.tableNumber}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        order.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                        order.status === "PREPARING" ? "bg-blue-100 text-blue-800" :
                        order.status === "SERVED" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Order items */}
                    <div className="divide-y divide-[#050F2A]/10 py-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#050F2A]">{item.quantity}x</span>
                            <span className="text-[#050F2A]">{item.name}</span>
                          </div>
                          <span className="font-mono text-[#050F2A]/70">
                            Rs. {((item.subtotalRupees || (item.subtotalMinor / 100)) || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.specialInstructions && (
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold uppercase text-[9px] block text-amber-800">Special Request:</span>
                        {order.specialInstructions}
                      </div>
                    )}

                    <div className="pt-3 border-t border-[#050F2A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-sm font-black text-[#050F2A]">
                        Total: Rs. {(order.totalRupees || (order.totalMinor / 100)).toLocaleString()}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {order.status === "PENDING" && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, "PREPARING")}
                            className="px-4 py-1.5 rounded-full bg-[#7BBBFF] hover:bg-[#68a8f5] text-[#050F2A] font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Mark Preparing
                          </button>
                        )}
                        {order.status === "PREPARING" && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, "SERVED")}
                            className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Mark Served
                          </button>
                        )}
                        {order.status === "SERVED" && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, "COMPLETED")}
                            className="px-4 py-1.5 rounded-full bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Complete Order
                          </button>
                        )}
                        {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Cancel this order?")) {
                                handleOrderStatusUpdate(order.id, "CANCELLED");
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MENU PRODUCTS */}
        {activeTab === "menu" && (
          <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.isAvailable !== false
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

              <div className="flex items-center gap-2.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-[#F2FDFF]/50 border border-[#050F2A]/10 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-black text-[#050F2A] block">{t.number}</span>
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
          </div>
        )}

        {/* TAB 6: SETTINGS & INDEPENDENT BUSINESS BRANDING */}
        {activeTab === "settings" && (
          <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#050F2A]/10 pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
                  Restaurant Settings & Branding
                </h2>
                <p className="text-xs text-[#050F2A]/60">
                  Customise your café profile, logo, palette, and links. Scoped strictly to your business.
                </p>
              </div>

              {settingsSuccess && (
                <div className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Changes Saved Successfully!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-8">
              {/* SECTION 1: BUSINESS PROFILE */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] border-b border-[#050F2A]/10 pb-2">
                  1. Business Profile & Contact
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                      className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-4 py-2.5 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-4 py-2.5 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                      placeholder="0771234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                      WhatsApp Number (for customer queries)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.whatsapp}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                      className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-4 py-2.5 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                      placeholder="0771234567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-2xl px-4 py-2.5 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                      placeholder="e.g. 2nd Cross Street, Vavuniya"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: BRANDING & PALETTE (Independent Per-Business) */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between border-b border-[#050F2A]/10 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A]">
                    2. Branding, Logo & Colors
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetBranding}
                    className="text-xs font-bold text-[#050F2A] hover:text-rose-600 flex items-center gap-1 transition-colors"
                    title="Reset to default theme"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Default Theme</span>
                  </button>
                </div>

                {/* Logo Uploader / URL */}
                <div className="p-5 bg-[#F2FDFF]/60 rounded-3xl border border-[#050F2A]/10 space-y-4">
                  <span className="block text-xs font-bold text-[#050F2A]">
                    Restaurant Logo
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {settingsForm.logoUrl ? (
                      <div className="relative group">
                        <img
                          src={settingsForm.logoUrl}
                          alt="Logo Preview"
                          className="w-16 h-16 rounded-2xl object-cover border border-[#050F2A]/15 bg-white shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#050F2A]/20 flex items-center justify-center font-bold text-lg text-[#050F2A]/40">
                        {settingsForm.name.charAt(0) || "B"}
                      </div>
                    )}

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer px-4 py-2 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-xs font-bold text-[#050F2A] flex items-center gap-1.5 shadow-sm transition-all">
                          <Upload className="w-3.5 h-3.5 text-[#7BBBFF]" />
                          <span>Upload Image File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>

                        {settingsForm.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setSettingsForm({ ...settingsForm, logoUrl: "" })}
                            className="px-4 py-2 rounded-full bg-white hover:bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 transition-all shadow-sm"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={settingsForm.logoUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                        className="w-full bg-white border border-[#050F2A]/15 rounded-2xl px-4 py-2 text-xs text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF]"
                        placeholder="Or enter image URL: https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* 6 Theme Color Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Primary Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.primaryColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.primaryColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.accentColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, accentColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.accentColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, accentColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Page Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.backgroundColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.backgroundColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Text Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.textColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, textColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.textColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, textColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Header Background Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Header Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.headerBackgroundColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, headerBackgroundColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.headerBackgroundColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, headerBackgroundColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Header Text Color */}
                  <div className="p-4 bg-[#F2FDFF]/50 border border-[#050F2A]/10 rounded-2xl space-y-1.5">
                    <label className="block text-xs font-bold text-[#050F2A]/80">Header Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settingsForm.headerTextColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, headerTextColor: e.target.value })}
                        className="w-9 h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.headerTextColor}
                        onChange={(e) => setSettingsForm({ ...settingsForm, headerTextColor: e.target.value })}
                        className="flex-1 bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* LIVE INTERACTIVE PREVIEW WITH DESKTOP / MOBILE VIEWPORT TOGGLE */}
                <div className="p-6 bg-[#F2FDFF]/60 rounded-3xl border border-[#050F2A]/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#050F2A] block">
                        Live Guest Menu Preview
                      </span>
                      <span className="text-[11px] text-[#050F2A]/60">
                        Preview how your branding appears to dining guests
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-[#050F2A]/10 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("mobile")}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          previewMode === "mobile"
                            ? "bg-[#050F2A] text-white"
                            : "text-[#050F2A]/60 hover:text-[#050F2A]"
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("desktop")}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                          previewMode === "desktop"
                            ? "bg-[#050F2A] text-white"
                            : "text-[#050F2A]/60 hover:text-[#050F2A]"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop</span>
                      </button>
                    </div>
                  </div>

                  {/* Rendered Preview Container */}
                  <div className="flex justify-center py-4">
                    <div
                      className={`transition-all overflow-hidden rounded-3xl border border-black/10 shadow-lg ${
                        previewMode === "mobile" ? "w-[340px]" : "w-full"
                      }`}
                      style={{
                        backgroundColor: settingsForm.backgroundColor,
                        color: settingsForm.textColor,
                      }}
                    >
                      {/* Guest Header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between shadow-sm transition-colors"
                        style={{
                          backgroundColor: settingsForm.headerBackgroundColor,
                          color: settingsForm.headerTextColor,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {settingsForm.logoUrl ? (
                            <img
                              src={settingsForm.logoUrl}
                              alt="Logo"
                              className="w-7 h-7 rounded-lg object-contain bg-white/20"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                              {settingsForm.name.charAt(0) || "B"}
                            </div>
                          )}
                          <span className="font-extrabold text-sm">{settingsForm.name || "Restaurant Name"}</span>
                        </div>

                        <div
                          className="px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                          style={{
                            backgroundColor: settingsForm.accentColor,
                            color: "#050F2A",
                          }}
                        >
                          Table 07
                        </div>
                      </div>

                      {/* Guest Content */}
                      <div className="p-4 space-y-3">
                        {/* Sample category pill */}
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold shadow-sm"
                            style={{
                              backgroundColor: settingsForm.primaryColor,
                              color: settingsForm.headerTextColor,
                            }}
                          >
                            Popular
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/5">
                            Drinks
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/5">
                            Desserts
                          </span>
                        </div>

                        {/* Sample Product Card */}
                        <div className="p-3 rounded-2xl bg-white/90 border border-black/5 shadow-sm flex items-center justify-between gap-3">
                          <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center font-bold text-xs text-black/40">
                            ☕
                          </div>
                          <div className="flex-1">
                            <span className="font-bold text-xs block text-black">House Signature Blend</span>
                            <span className="text-[10px] text-black/60">Fresh roasted, notes of caramel</span>
                            <span className="text-xs font-mono font-bold block mt-0.5 text-black">Rs. 650</span>
                          </div>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-sm"
                            style={{
                              backgroundColor: settingsForm.accentColor,
                              color: "#050F2A",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: DYNAMIC SOCIAL & GOOGLE REVIEW LINKS */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#050F2A]/10 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] flex items-center gap-2">
                      <span>3. Social Media & Google Review Prompts</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Real-time
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#050F2A]/60 mt-0.5">
                      Add, change, or remove Google Reviews, Instagram, Facebook, and WhatsApp links shown on your menu footer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOwnerAddSocialLink("google")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#050F2A] text-white text-xs font-bold hover:bg-[#0b1739] transition self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>

                {/* Quick Add Presets Bar */}
                <div className="bg-[#F2FDFF] rounded-2xl p-3 border border-[#050F2A]/10 space-y-2">
                  <span className="text-[10px] font-bold text-[#050F2A]/60 uppercase tracking-wider block">
                    Quick Add Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { platform: "google" as SocialPlatform, label: "Google Review / Profile", icon: "⭐" },
                      { platform: "instagram" as SocialPlatform, label: "Instagram", icon: "📸" },
                      { platform: "facebook" as SocialPlatform, label: "Facebook", icon: "📘" },
                      { platform: "whatsapp" as SocialPlatform, label: "WhatsApp Chat", icon: "💬" },
                      { platform: "tiktok" as SocialPlatform, label: "TikTok", icon: "🎵" },
                      { platform: "website" as SocialPlatform, label: "Website", icon: "🔗" },
                    ].map((preset) => (
                      <button
                        key={preset.platform}
                        type="button"
                        onClick={() => handleOwnerAddSocialLink(preset.platform)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-white/80 text-[#050F2A] text-[11px] font-bold border border-[#050F2A]/10 transition shadow-2xs active:scale-95"
                      >
                        <span>{preset.icon}</span>
                        <span>+ {preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Links List */}
                <div className="space-y-2.5">
                  {settingsForm.socialLinks.map((link, idx) => (
                    <div
                      key={link.id || idx}
                      className={`p-3 rounded-2xl border transition-all ${
                        link.isActive ? "bg-white border-[#050F2A]/10" : "bg-[#F2FDFF]/60 border-[#050F2A]/5 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* Platform */}
                        <div className="w-full sm:w-40 shrink-0">
                          <label className="block text-[10px] font-bold text-[#050F2A]/60 mb-1">
                            Platform
                          </label>
                          <select
                            value={link.platform}
                            onChange={(e) =>
                              handleOwnerUpdateSocialLink(link.id, {
                                platform: e.target.value as SocialPlatform,
                              })
                            }
                            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-[#050F2A]/15 bg-[#F2FDFF]/30 text-[#050F2A] font-bold focus:outline-none focus:border-[#7BBBFF]"
                          >
                            <option value="google">🌐 Google Review / Profile</option>
                            <option value="instagram">📸 Instagram</option>
                            <option value="facebook">📘 Facebook</option>
                            <option value="whatsapp">💬 WhatsApp</option>
                            <option value="tiktok">🎵 TikTok</option>
                            <option value="youtube">▶️ YouTube</option>
                            <option value="website">🔗 Website</option>
                            <option value="other">🌐 Other</option>
                          </select>
                        </div>

                        {/* Label */}
                        <div className="w-full sm:w-44 shrink-0">
                          <label className="block text-[10px] font-bold text-[#050F2A]/60 mb-1">
                            Button Label
                          </label>
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) =>
                              handleOwnerUpdateSocialLink(link.id, { label: e.target.value })
                            }
                            placeholder="e.g. Google Reviews"
                            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-[#050F2A]/15 bg-[#F2FDFF]/30 text-[#050F2A] font-bold focus:outline-none focus:border-[#7BBBFF]"
                          />
                        </div>

                        {/* URL */}
                        <div className="flex-1 w-full min-w-0">
                          <label className="block text-[10px] font-bold text-[#050F2A]/60 mb-1">
                            Target Profile URL
                          </label>
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) =>
                              handleOwnerUpdateSocialLink(link.id, { url: e.target.value })
                            }
                            placeholder="https://..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-[#050F2A]/15 bg-[#F2FDFF]/30 text-[#050F2A] focus:outline-none focus:border-[#7BBBFF] font-mono"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center mt-2 sm:mt-4 shrink-0">
                          {link.url && (
                            <a
                              href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Test link"
                              className="p-1.5 rounded-lg text-[#050F2A]/60 hover:text-[#050F2A] hover:bg-[#F2FDFF] transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleOwnerUpdateSocialLink(link.id, { isActive: !link.isActive })
                            }
                            title={link.isActive ? "Hide on menu" : "Show on menu"}
                            className={`p-1.5 rounded-lg transition border ${
                              link.isActive
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                : "text-zinc-400 bg-zinc-100 border-zinc-200"
                            }`}
                          >
                            {link.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOwnerDeleteSocialLink(link.id)}
                            title="Delete this link"
                            className="p-1.5 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {settingsForm.socialLinks.length === 0 && (
                    <div className="p-6 text-center bg-[#F2FDFF]/50 rounded-2xl border border-dashed border-[#050F2A]/15 space-y-1">
                      <p className="text-xs font-bold text-[#050F2A]">No social or Google links added yet</p>
                      <p className="text-[11px] text-[#050F2A]/60">Use the Quick Add buttons above to add Google Reviews, Instagram, or WhatsApp.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: TABLE QR CARD CUSTOMIZATION & LOGO SIZE */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-[#050F2A]/10 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#7BBBFF]" />
                    <span>4. Printable Table QR Card Customization</span>
                  </h3>
                  <p className="text-[11px] text-[#050F2A]/60 mt-0.5">
                    Customize the text, slogan, and logo sizing printed on your 4×6" dining table tent cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* QR Header Title (Optional) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#050F2A]/80">
                      Top Header Banner (Optional)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.qrHeaderTitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, qrHeaderTitle: e.target.value })}
                      placeholder="Leave blank for clean logo at top"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#050F2A]/15 bg-white text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                    />
                    <span className="text-[10px] text-[#050F2A]/50">Leave empty to display your brand logo prominently at the top.</span>
                  </div>

                  {/* QR Subtitle */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#050F2A]/80">
                      Table Subtitle (Under Table Number)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.qrSubtitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, qrSubtitle: e.target.value })}
                      placeholder="SCAN TO ORDER"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#050F2A]/15 bg-white text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                    />
                  </div>
                </div>

                {/* Footer Slogan / Tagline */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#050F2A]/80">
                    Footer Note / Slogan / Phone
                  </label>
                  <input
                    type="text"
                    value={settingsForm.qrFooterNote}
                    onChange={(e) => setSettingsForm({ ...settingsForm, qrFooterNote: e.target.value })}
                    placeholder="e.g. ☕ Good tea brings people together. or Enjoy your visit!"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#050F2A]/15 bg-white text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["☕ Good tea brings people together.", "Enjoy your visit!", "Need help? Ask our friendly staff"].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, qrFooterNote: preset })}
                        className="text-[10px] text-[#050F2A]/70 hover:text-[#050F2A] px-2 py-0.5 rounded bg-white border border-[#050F2A]/15"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table QR Logo Size Slider & Presets */}
                <div className="p-4 bg-[#F2FDFF]/80 rounded-2xl border border-[#050F2A]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#050F2A] block">
                        Table QR Logo Size (Customizable & Big Logo Option)
                      </span>
                      <span className="text-[11px] text-[#050F2A]/60">
                        Adjust how large and prominent your logo prints on table QR tent cards
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-white border border-[#050F2A]/15 text-[#050F2A]">
                      {getQrLogoHeight(settingsForm.qrLogoSize)}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min={48}
                    max={160}
                    step={4}
                    value={getQrLogoHeight(settingsForm.qrLogoSize)}
                    onChange={(e) => setSettingsForm({ ...settingsForm, qrLogoSize: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-[#050F2A]/10 rounded-lg appearance-none cursor-pointer accent-[#7BBBFF]"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#050F2A]/60 mr-1 uppercase">Presets:</span>
                    {[
                      { label: "Compact (56px)", val: 56 },
                      { label: "Medium (76px)", val: 76 },
                      { label: "Big (108px)", val: 108 },
                      { label: "Extra Big (132px)", val: 132 },
                      { label: "Huge (156px)", val: 156 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, qrLogoSize: btn.val })}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          getQrLogoHeight(settingsForm.qrLogoSize) === btn.val
                            ? "bg-[#050F2A] text-white border-[#050F2A] shadow-xs"
                            : "bg-white text-[#050F2A]/80 border-[#050F2A]/15 hover:bg-[#F2FDFF]"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#050F2A]/10">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-8 py-3 rounded-full bg-[#050F2A] hover:bg-[#0b1739] active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                >
                  {savingSettings ? "Saving Settings..." : "Save Branding & Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {showCategoryModal && (
        <CategoryUpsertModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}

      {archivingCategory && (
        <ArchiveCategoryModal
          category={archivingCategory}
          categories={categories}
          products={products}
          onClose={() => setArchivingCategory(null)}
          onSuccess={() => setArchivingCategory(null)}
        />
      )}

      {showTableModal && (
        <TableModal
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
          primaryColor={business.branding?.primaryColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A")}
          accentColor={business.branding?.accentColor || (business.slug === "teatime" ? "#E8B64F" : "#7BBBFF")}
          headerBackgroundColor={business.branding?.headerBackgroundColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A")}
          headerTextColor={business.branding?.headerTextColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF")}
          logoUrl={business.branding?.logoUrl || null}
          qrHeaderTitle={business.branding?.qrHeaderTitle ?? ""}
          qrSubtitle={business.branding?.qrSubtitle || "SCAN TO ORDER"}
          qrFooterNote={business.branding?.qrFooterNote || (business.slug === "teatime" ? "☕ Good tea brings people together." : "Enjoy your visit!")}
          qrLogoSize={business.branding?.qrLogoSize || settingsForm.qrLogoSize || 112}
          onClose={() => setSinglePrintTable(null)}
        />
      )}

      {showBatchPrint && (
        <BatchTablesPrintModal
          tables={tables}
          businessSlug={business.slug}
          businessName={business.name}
          primaryColor={business.branding?.primaryColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A")}
          accentColor={business.branding?.accentColor || (business.slug === "teatime" ? "#E8B64F" : "#7BBBFF")}
          headerBackgroundColor={business.branding?.headerBackgroundColor || (business.slug === "teatime" ? "#2C190E" : "#050F2A")}
          headerTextColor={business.branding?.headerTextColor || (business.slug === "teatime" ? "#FAF7F0" : "#F2FDFF")}
          logoUrl={business.branding?.logoUrl || null}
          qrHeaderTitle={business.branding?.qrHeaderTitle ?? ""}
          qrSubtitle={business.branding?.qrSubtitle || "SCAN TO ORDER"}
          qrFooterNote={business.branding?.qrFooterNote || (business.slug === "teatime" ? "☕ Good tea brings people together." : "Enjoy your visit!")}
          qrLogoSize={business.branding?.qrLogoSize || settingsForm.qrLogoSize || 112}
          onClose={() => setShowBatchPrint(false)}
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
    </div>
  );
};
