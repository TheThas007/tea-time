import React, { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import {
  Save,
  PauseCircle,
  PlayCircle,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Store,
  DollarSign,
  Loader2,
  Palette,
  Image as ImageIcon,
  QrCode,
  Sparkles,
  Smartphone,
  Printer,
  Upload,
  RotateCcw,
  Eye,
  EyeOff,
  Check,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Share2,
  Globe,
  Trash2,
  Plus,
  Phone,
  MessageCircle
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../../lib/firebase";
import { CafeSettings, SocialLinkItem, SocialPlatform } from "../../types";
import {
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_TABLES
} from "../../data/seedData";
import { Logo } from "../common/Logo";
import { getQrLogoHeight } from "./PrintableTableCard";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "espresso-gold",
    name: "Espresso Gold",
    description: "Classic Ceylon tea & warm coffee lounge",
    emoji: "☕",
    headerBackgroundColor: "#2C190E",
    headerTextColor: "#FAF7F0",
    primaryColor: "#2C190E",
    accentColor: "#E8B64F",
    backgroundColor: "#FAF7F0",
    textColor: "#301C10",
  },
  {
    id: "modern-navy",
    name: "Modern Sky Navy",
    description: "Menyo signature tech blue & clean bistro",
    emoji: "🌊",
    headerBackgroundColor: "#050F2A",
    headerTextColor: "#F2FDFF",
    primaryColor: "#050F2A",
    accentColor: "#7BBBFF",
    backgroundColor: "#F2FDFF",
    textColor: "#050F2A",
  },
  {
    id: "emerald-matcha",
    name: "Emerald Matcha",
    description: "Fresh green tea, healthy juices & salads",
    emoji: "🍵",
    headerBackgroundColor: "#064E3B",
    headerTextColor: "#F0FDF4",
    primaryColor: "#064E3B",
    accentColor: "#10B981",
    backgroundColor: "#F0FDF4",
    textColor: "#064E3B",
  },
  {
    id: "sunset-crimson",
    name: "Sunset Crimson",
    description: "Bold burger bar, steakhouse & pizzeria",
    emoji: "🍷",
    headerBackgroundColor: "#4C0519",
    headerTextColor: "#FFF1F2",
    primaryColor: "#4C0519",
    accentColor: "#F43F5E",
    backgroundColor: "#FFF1F2",
    textColor: "#4C0519",
  },
  {
    id: "midnight-noir",
    name: "Midnight Noir",
    description: "Upscale luxury lounge & evening dining",
    emoji: "🖤",
    headerBackgroundColor: "#09090B",
    headerTextColor: "#FFFFFF",
    primaryColor: "#18181B",
    accentColor: "#A855F7",
    backgroundColor: "#09090B",
    textColor: "#F4F4F5",
  },
  {
    id: "tuscan-amber",
    name: "Tuscan Amber",
    description: "Artisan bakery, patisserie & warm brunch",
    emoji: "🥐",
    headerBackgroundColor: "#78350F",
    headerTextColor: "#FFFBEB",
    primaryColor: "#78350F",
    accentColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
    textColor: "#78350F",
  },
  {
    id: "royal-violet",
    name: "Royal Violet",
    description: "Gourmet desserts, bubble tea & gelateria",
    emoji: "👑",
    headerBackgroundColor: "#3B0764",
    headerTextColor: "#FAF5FF",
    primaryColor: "#3B0764",
    accentColor: "#C084FC",
    backgroundColor: "#FAF5FF",
    textColor: "#3B0764",
  },
];

export const SAMPLE_LOGOS = [
  { label: "Original Tea Time", url: "/assets/logo.png" },
  { label: "Horizontal Wordmark", url: "/assets/logo-horizontal.png?v=3" },
  { label: "Menyo Badge", url: "/assets/favicon.png" },
  { label: "Artisan Coffee", url: "/images/menu/coffee/milk-coffee.png" },
];

type SettingsSection = "branding" | "colors" | "logo" | "qr" | "social" | "store" | "system";

export const CafeSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<CafeSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<SettingsSection>("branding");

  // Live preview mode in the right mockup column
  const [previewMode, setPreviewMode] = useState<"mobile" | "qr">("mobile");

  // Fetch settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "cafe");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSettings({ ...INITIAL_SETTINGS, ...snap.data() } as CafeSettings);
        }
      } catch (err) {
        console.warn("Settings fetch fallback:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleApplyPreset = (preset: ThemePreset) => {
    setSettings((prev) => ({
      ...prev,
      headerBackgroundColor: preset.headerBackgroundColor,
      headerTextColor: preset.headerTextColor,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo image size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSettings((prev) => ({
          ...prev,
          logoUrl: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Current active social and Google links
  const currentSocialLinks: SocialLinkItem[] = Array.isArray(settings.socialLinks)
    ? (settings.socialLinks as SocialLinkItem[])
    : (INITIAL_SETTINGS.socialLinks as SocialLinkItem[]) || [];

  const handleAddSocialLink = (platform: SocialPlatform = "google") => {
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
      google: "https://maps.google.com/?q=Tea+Time+Vavuniya",
      instagram: "https://www.instagram.com/teatime_vavuniya/",
      facebook: "https://www.facebook.com/teatime.vavuniya/",
      whatsapp: "https://wa.me/94764847081",
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

    setSettings((prev) => ({
      ...prev,
      socialLinks: [...(Array.isArray(prev.socialLinks) ? (prev.socialLinks as SocialLinkItem[]) : currentSocialLinks), newLink],
    }));
  };

  const handleUpdateSocialLink = (id: string, updates: Partial<SocialLinkItem>) => {
    const nextLinks = currentSocialLinks.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    setSettings((prev) => ({
      ...prev,
      socialLinks: nextLinks,
    }));
  };

  const handleDeleteSocialLink = (id: string) => {
    const nextLinks = currentSocialLinks.filter((item) => item.id !== id);
    setSettings((prev) => ({
      ...prev,
      socialLinks: nextLinks,
    }));
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const gLink = currentSocialLinks.find((l) => l.platform === "google" && l.isActive);
      const igLink = currentSocialLinks.find((l) => l.platform === "instagram" && l.isActive);
      const fbLink = currentSocialLinks.find((l) => l.platform === "facebook" && l.isActive);

      // 1. Save to primary cafe settings document
      const docRef = doc(db, "settings", "cafe");
      await setDoc(docRef, {
        ...settings,
        socialLinks: currentSocialLinks,
        googleReviewUrl: gLink?.url || settings.googleReviewUrl || "",
        instagramUrl: igLink?.url || settings.instagramUrl || "",
        facebookUrl: fbLink?.url || settings.facebookUrl || "",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Also sync to businesses/teatime so customer menu reads it seamlessly
      try {
        const bizRef = doc(db, "businesses", "teatime");
        await setDoc(bizRef, {
          name: settings.cafeName,
          tagline: settings.tagline,
          logoUrl: settings.logoUrl || null,
          phone: settings.phone || "0764847081",
          whatsapp: settings.whatsapp || "0764847081",
          address: settings.address || "123 Main Street, Colombo",
          openingHours: settings.openingHours,
          currencySymbol: settings.currencySymbol || "Rs.",
          isOrderingPaused: settings.isOrderingPaused,
          pauseMessage: settings.pauseMessage,
          socialLinks: currentSocialLinks,
          googleReviewUrl: gLink?.url || settings.googleReviewUrl || "",
          instagramUrl: igLink?.url || settings.instagramUrl || "",
          facebookUrl: fbLink?.url || settings.facebookUrl || "",
          branding: {
            logoUrl: settings.logoUrl || null,
            primaryColor: settings.primaryColor || "#2C190E",
            accentColor: settings.accentColor || "#E8B64F",
            backgroundColor: settings.backgroundColor || "#FAF7F0",
            textColor: settings.textColor || "#301C10",
            headerBackgroundColor: settings.headerBackgroundColor || settings.primaryColor || "#2C190E",
            headerTextColor: settings.headerTextColor || "#FAF7F0",
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (bizErr) {
        console.warn("Could not sync to businesses/teatime:", bizErr);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setErrorMessage("Failed to save settings: " + (err?.message || "Please check Firestore connection."));
    } finally {
      setSaving(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (!window.confirm("Sync all 15 official TEA TIME categories, 107 menu items, and tables into Firestore? Existing items with matching IDs will be updated without affecting orders.")) {
      return;
    }

    setSeeding(true);
    setSeedSuccess(false);
    setErrorMessage(null);

    try {
      const batch = writeBatch(db);

      // Categories (15 official categories)
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(db, "categories", cat.id), cat, { merge: true });
      }

      // Menu (107 unique official products)
      for (const item of INITIAL_MENU_ITEMS) {
        batch.set(doc(db, "menu", item.id), {
          ...item,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // Tables
      for (const tbl of INITIAL_TABLES) {
        batch.set(doc(db, "tables", tbl.id), {
          ...tbl,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // Initialize counter only if it doesn't exist yet
      const counterRef = doc(db, "counters", "orders");
      const counterSnap = await getDoc(counterRef);
      if (!counterSnap.exists()) {
        batch.set(counterRef, {
          lastOrderNumber: 1041,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err: any) {
      console.error("Seeding error:", err);
      setErrorMessage("Seeding failed: " + (err?.message || "Check Firestore permissions"));
    } finally {
      setSeeding(false);
    }
  };

  // Resolved dynamic colors for preview
  const previewColors = {
    headerBg: settings.headerBackgroundColor || settings.primaryColor || "#2C190E",
    headerText: settings.headerTextColor || "#FAF7F0",
    primary: settings.primaryColor || "#2C190E",
    accent: settings.accentColor || "#E8B64F",
    bg: settings.backgroundColor || "#FAF7F0",
    text: settings.textColor || "#301C10",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* View Header with Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DFC9AC] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#E8B64F]/20 text-[#2C190E]">
              <Palette className="w-5 h-5 text-[#E8B64F]" />
            </span>
            <h1 className="text-2xl font-black text-[#301C10] tracking-tight">
              Restaurant Branding & Café Settings
            </h1>
          </div>
          <p className="text-xs text-[#8A6A53] font-medium mt-1">
            Customize your customer menu theme, navbar colors, brand logo, table QR cards, and operating hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={saving}
            className="bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-black px-5 py-2.5 rounded-xl text-xs shadow-warm flex items-center gap-2 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C99532]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1A0F08]" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#1A0F08]" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="block font-black">All branding and café settings saved successfully!</span>
            <span className="text-[11px] font-normal text-emerald-700">
              Customer menu and printable QR tent cards are now updated with your custom theme.
            </span>
          </div>
        </div>
      )}

      {seedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Official menu items, categories, and tables seeded into Firestore!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#DFC9AC]/60">
        {[
          { id: "branding", label: "Theme Templates", icon: Sparkles },
          { id: "colors", label: "App & Navbar Colors", icon: Palette },
          { id: "logo", label: "Logo & Icon", icon: ImageIcon },
          { id: "qr", label: "Table QR Cards", icon: QrCode },
          { id: "social", label: "Social & Google Profile", icon: Globe },
          { id: "store", label: "Store & Hours", icon: Store },
          { id: "system", label: "Data Utilities", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as SettingsSection)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${isActive
                  ? "bg-[#2C190E] text-[#FFFCF6] shadow-warm"
                  : "bg-[#FFFCF6] text-[#8A6A53] hover:text-[#301C10] hover:bg-[#DFC9AC]/30 border border-[#DFC9AC]"
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#E8B64F]" : "text-[#8A6A53]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Responsive Layout: Left = Editor, Right = Interactive Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Controls & Settings Form */}
        <div className="lg:col-span-7 space-y-6">

          {/* SECTION 1: THEME TEMPLATES */}
          {(activeSection === "branding" || activeSection === "colors") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    1-Click Theme Templates
                  </h3>
                </div>
                <span className="text-[11px] text-[#8A6A53] font-semibold">
                  Click to instant-apply
                </span>
              </div>

              <p className="text-xs text-[#8A6A53] leading-relaxed">
                Choose a pre-designed harmonious color palette tailored for dining, beverage, and café brands.
                You can fine-tune any individual color below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {THEME_PRESETS.map((preset) => {
                  const isCurrent =
                    settings.headerBackgroundColor === preset.headerBackgroundColor &&
                    settings.accentColor === preset.accentColor &&
                    settings.backgroundColor === preset.backgroundColor;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 relative ${isCurrent
                          ? "border-[#E8B64F] bg-[#FAF7F0] ring-2 ring-[#E8B64F]/40 shadow-warm"
                          : "border-[#DFC9AC] bg-white hover:border-[#8A6A53] hover:shadow-sm"
                        }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{preset.emoji}</span>
                          <div>
                            <span className="font-black text-xs text-[#301C10] block">
                              {preset.name}
                            </span>
                            <span className="text-[10px] text-[#8A6A53] line-clamp-1">
                              {preset.description}
                            </span>
                          </div>
                        </div>

                        {isCurrent && (
                          <span className="w-5 h-5 rounded-full bg-[#E8B64F] text-[#1A0F08] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* 4-Color Swatch Preview Strip */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.headerBackgroundColor }}
                          title={`Navbar: ${preset.headerBackgroundColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.accentColor }}
                          title={`Accent: ${preset.accentColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.backgroundColor }}
                          title={`Page Bg: ${preset.backgroundColor}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-black/10 shadow-xs"
                          style={{ backgroundColor: preset.textColor }}
                          title={`Text: ${preset.textColor}`}
                        />
                        <span className="text-[10px] font-mono text-[#8A6A53] ml-auto">
                          {preset.accentColor}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: 6 APP & NAVBAR COLOR PICKERS */}
          {(activeSection === "colors" || activeSection === "branding") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Individual Color Customization (6 Palette Controls)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(THEME_PRESETS[0])}
                  className="text-[11px] text-[#8A6A53] hover:text-[#301C10] flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Navbar / Header Background */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      Navbar Background
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Top Header</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.headerBackgroundColor || "#2C190E"}
                      onChange={(e) =>
                        setSettings({ ...settings, headerBackgroundColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.headerBackgroundColor || "#2C190E"}
                      onChange={(e) =>
                        setSettings({ ...settings, headerBackgroundColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Navbar / Header Text Color */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      Navbar Text & Icons
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Header Title</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.headerTextColor || "#FAF7F0"}
                      onChange={(e) =>
                        setSettings({ ...settings, headerTextColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.headerTextColor || "#FAF7F0"}
                      onChange={(e) =>
                        setSettings({ ...settings, headerTextColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>

                {/* 3. Primary Brand Color */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      Primary Brand Color
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Cart & Buttons</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor || "#2C190E"}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor || "#2C190E"}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>

                {/* 4. Accent Highlight Color */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      Accent Highlight Color
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Tabs & Badges</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accentColor || "#E8B64F"}
                      onChange={(e) =>
                        setSettings({ ...settings, accentColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.accentColor || "#E8B64F"}
                      onChange={(e) =>
                        setSettings({ ...settings, accentColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>

                {/* 5. Page Background Color */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      App Background Color
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Menu Page Bg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.backgroundColor || "#FAF7F0"}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor || "#FAF7F0"}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>

                {/* 6. Body & Heading Text Color */}
                <div className="p-3.5 bg-white border border-[#DFC9AC] rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#301C10]">
                      Body & Title Text Color
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Headings & Desc</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.textColor || "#301C10"}
                      onChange={(e) =>
                        setSettings({ ...settings, textColor: e.target.value })
                      }
                      className="w-9 h-9 rounded-lg border border-[#DFC9AC] cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.textColor || "#301C10"}
                      onChange={(e) =>
                        setSettings({ ...settings, textColor: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] font-mono text-xs text-[#301C10] uppercase focus:border-[#C99532] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: LOGO & ICON */}
          {(activeSection === "logo" || activeSection === "branding") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Restaurant Logo & Branding
                  </h3>
                </div>
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, logoUrl: "" })}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Remove Logo (Use Text)
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#301C10]">
                  Logo Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.logoUrl || ""}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://... or /assets/logo.png"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] outline-none"
                  />
                  <label className="bg-[#2C190E] hover:bg-[#4A290F] text-[#FFFCF6] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition active:scale-95 shadow-warm">
                    <Upload className="w-3.5 h-3.5 text-[#E8B64F]" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-[#8A6A53]">
                  PNG or SVG with transparent background works best. Max file size: 2MB.
                </p>

                {/* Quick Sample Logos */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-[#301C10] block mb-2">
                    Quick Sample Logos:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_LOGOS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSettings({ ...settings, logoUrl: sample.url })}
                        className="px-2.5 py-1.5 rounded-lg border border-[#DFC9AC] bg-white hover:bg-[#FAF7F0] text-[11px] font-medium text-[#301C10] flex items-center gap-1.5 transition"
                      >
                        <img src={sample.url} alt="" className="w-4 h-4 object-contain" />
                        <span>{sample.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Logo Preview Box */}
                <div className="pt-3">
                  <span className="text-xs font-bold text-[#301C10] block mb-1.5">
                    Logo Preview:
                  </span>
                  <div className="p-4 rounded-xl border border-dashed border-[#DFC9AC] flex items-center justify-center gap-6 bg-white">
                    <div
                      className="p-3 rounded-lg border flex items-center justify-center min-w-[140px] h-16 shadow-xs"
                      style={{ backgroundColor: previewColors.headerBg }}
                    >
                      {settings.logoUrl ? (
                        <img
                          src={settings.logoUrl}
                          alt="Logo Preview"
                          className="max-h-11 max-w-[130px] object-contain"
                        />
                      ) : (
                        <span className="font-black text-sm tracking-wide" style={{ color: previewColors.headerText }}>
                          {settings.cafeName || "TEA TIME"}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#8A6A53] space-y-0.5">
                      <p className="font-bold text-[#301C10]">Live on Navbar:</p>
                      <p className="text-[11px]">
                        Rendered on your chosen Navbar Background ({previewColors.headerBg})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: TABLE QR CODE CARD DESIGN */}
          {(activeSection === "qr" || activeSection === "branding") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Printable Table QR Card Customization
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewMode("qr")}
                  className="text-[11px] text-[#E8B64F] hover:text-[#C99532] font-black flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Card Preview</span>
                </button>
              </div>

              <p className="text-xs text-[#8A6A53] leading-relaxed">
                Customize the texts printed on tent cards placed on dining tables.
                Guests scan this code with their smartphone camera to open the menu.
              </p>

              <div className="space-y-4">
                {/* QR Header Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#301C10]">
                      QR Card Header Title
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Top brand line</span>
                  </div>
                  <input
                    type="text"
                    value={settings.qrHeaderTitle || ""}
                    onChange={(e) => setSettings({ ...settings, qrHeaderTitle: e.target.value })}
                    placeholder="e.g. Scan to Order • TEA TIME"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {["SCAN TO ORDER • TEA TIME", "WELCOME TO TEA TIME", "DINE IN & ORDER ONLINE"].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSettings({ ...settings, qrHeaderTitle: preset })}
                        className="text-[10px] text-[#8A6A53] hover:text-[#301C10] px-2 py-0.5 rounded bg-white border border-[#DFC9AC]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Instruction Subtitle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#301C10]">
                      Instruction Subtitle
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Under table number</span>
                  </div>
                  <input
                    type="text"
                    value={settings.qrSubtitle || ""}
                    onChange={(e) => setSettings({ ...settings, qrSubtitle: e.target.value })}
                    placeholder="e.g. SCAN TO ORDER"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {["SCAN TO ORDER", "Point camera to view menu & order", "Scan QR to place table order"].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSettings({ ...settings, qrSubtitle: preset })}
                        className="text-[10px] text-[#8A6A53] hover:text-[#301C10] px-2 py-0.5 rounded bg-white border border-[#DFC9AC]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Footer Slogan / Assistance */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#301C10]">
                      Footer Note / Slogan / Phone
                    </label>
                    <span className="text-[10px] text-[#8A6A53]">Bottom line</span>
                  </div>
                  <input
                    type="text"
                    value={
                      !settings.qrFooterNote || settings.qrFooterNote.includes("Good tea brings people together")
                        ? "It's time for you!"
                        : settings.qrFooterNote
                    }
                    onChange={(e) => setSettings({ ...settings, qrFooterNote: e.target.value })}
                    placeholder="e.g. It's time for you!"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["It's time for you!", "Need help? Call: 076 484 1111", "Enjoy your visit!"].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSettings({ ...settings, qrFooterNote: preset })}
                        className="text-[10px] text-[#8A6A53] hover:text-[#301C10] px-2 py-0.5 rounded bg-white border border-[#DFC9AC]"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table QR Logo Size Slider & Presets (Admin requested option) */}
                <div className="pt-2 border-t border-[#DFC9AC]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#301C10] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#E8B64F]" />
                      <span>Table QR Logo Size</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-[#C99532] bg-[#FAF7F0] px-2 py-0.5 rounded-md border border-[#DFC9AC]">
                      {getQrLogoHeight(settings.qrLogoSize)}px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#8A6A53] font-bold">60px</span>
                    <input
                      type="range"
                      min="60"
                      max="200"
                      step="4"
                      value={getQrLogoHeight(settings.qrLogoSize)}
                      onChange={(e) => setSettings({ ...settings, qrLogoSize: Number(e.target.value) })}
                      className="flex-1 h-2 bg-[#DFC9AC]/40 rounded-lg appearance-none cursor-pointer accent-[#C99532]"
                    />
                    <span className="text-[10px] text-[#8A6A53] font-bold">200px</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-2">
                    {[
                      { label: "Compact (80px)", val: 80 },
                      { label: "Standard (112px)", val: 112 },
                      { label: "Big (140px)", val: 140 },
                      { label: "Extra Big (165px)", val: 165 },
                      { label: "Maximum (195px)", val: 195 },
                    ].map((preset) => {
                      const current = getQrLogoHeight(settings.qrLogoSize);
                      const isSelected = Math.abs(current - preset.val) <= 4;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setSettings({ ...settings, qrLogoSize: preset.val })}
                          className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all text-center ${
                            isSelected
                              ? "bg-[#2C190E] text-[#FFFCF6] border-[#2C190E] shadow-sm"
                              : "bg-white text-[#8A6A53] hover:text-[#301C10] border-[#DFC9AC]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-[#8A6A53] mt-1.5">
                    Make your café logo bigger or smaller on the printed table QR stand cards. Preview updates live on the right.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: STORE PROFILE & OPERATIONAL HOURS */}
          {(activeSection === "store" || activeSection === "branding") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#E8B64F]" />
                  <h3 className="font-extrabold text-sm text-[#301C10]">
                    Café Profile & Operations
                  </h3>
                </div>
              </div>

              {/* Pause Ordering Control */}
              <div className="p-4 bg-white rounded-xl border border-[#DFC9AC] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-[#301C10] flex items-center gap-1.5">
                      {settings.isOrderingPaused ? (
                        <PauseCircle className="w-4 h-4 text-[#E8B64F]" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>Ordering Availability</span>
                    </h4>
                    <p className="text-[11px] text-[#8A6A53] mt-0.5">
                      Pause incoming guest orders while allowing customers to still browse the menu.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        isOrderingPaused: !settings.isOrderingPaused,
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${settings.isOrderingPaused
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${settings.isOrderingPaused ? "bg-amber-600" : "bg-emerald-600"
                        }`}
                    />
                    <span>{settings.isOrderingPaused ? "Ordering Paused" : "Active & Accepting"}</span>
                  </button>
                </div>

                {settings.isOrderingPaused && (
                  <div className="pt-2 border-t border-[#DFC9AC]/60">
                    <label className="block text-xs font-bold text-[#301C10] mb-1">
                      Custom Pause Notice for Customers
                    </label>
                    <input
                      type="text"
                      value={settings.pauseMessage}
                      onChange={(e) =>
                        setSettings({ ...settings, pauseMessage: e.target.value })
                      }
                      placeholder="e.g. New orders temporarily paused for 15 minutes."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Profile fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-[#301C10] mb-1">Café Name</label>
                  <input
                    type="text"
                    value={settings.cafeName}
                    onChange={(e) =>
                      setSettings({ ...settings, cafeName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) =>
                      setSettings({ ...settings, tagline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">Opening Hours</label>
                  <input
                    type="text"
                    value={settings.openingHours}
                    onChange={(e) =>
                      setSettings({ ...settings, openingHours: e.target.value })
                    }
                    placeholder="e.g. 7:30 AM – 10:30 PM"
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) =>
                      setSettings({ ...settings, currencySymbol: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={settings.phone || "076 484 7081"}
                    onChange={(e) =>
                      setSettings({ ...settings, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#301C10] mb-1">WhatsApp Order Support</label>
                  <input
                    type="text"
                    value={settings.whatsapp || "076 484 7081"}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5.5: SOCIAL MEDIA & GOOGLE PROFILE MANAGER */}
          {(activeSection === "social" || activeSection === "branding" || activeSection === "store") && (
            <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 sm:p-6 shadow-warm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DFC9AC]/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8B64F]/20 border border-[#E8B64F]/40 flex items-center justify-center text-[#301C10]">
                    <Globe className="w-5 h-5 text-[#C99532]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#301C10] flex items-center gap-2">
                      <span>Social Media & Google Profile Links</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Real-time
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#8A6A53]">
                      Add, edit, or delete customer links. Real-time updates appear immediately on the customer menu.
                    </p>
                  </div>
                </div>

                {/* Add Link Button */}
                <button
                  type="button"
                  onClick={() => handleAddSocialLink("google")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2C190E] hover:bg-[#4A290F] text-[#FFFCF6] text-xs font-bold transition shadow-warm active:scale-95"
                >
                  <Plus className="w-4 h-4 text-[#E8B64F]" />
                  <span>Add Link</span>
                </button>
              </div>

              {/* Quick Add Presets Bar */}
              <div className="bg-[#FAF7F0] rounded-xl p-3 border border-[#DFC9AC]/60 space-y-2">
                <span className="text-[10px] font-bold text-[#8A6A53] uppercase tracking-wider block">
                  Quick Add Profile Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { platform: "google" as SocialPlatform, label: "Google Review / Profile", icon: "⭐" },
                    { platform: "instagram" as SocialPlatform, label: "Instagram", icon: "📸" },
                    { platform: "facebook" as SocialPlatform, label: "Facebook", icon: "📘" },
                    { platform: "whatsapp" as SocialPlatform, label: "WhatsApp Chat", icon: "💬" },
                    { platform: "tiktok" as SocialPlatform, label: "TikTok", icon: "🎵" },
                    { platform: "youtube" as SocialPlatform, label: "YouTube", icon: "▶️" },
                    { platform: "website" as SocialPlatform, label: "Custom Website", icon: "🔗" },
                  ].map((preset) => (
                    <button
                      key={preset.platform}
                      type="button"
                      onClick={() => handleAddSocialLink(preset.platform)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFFCF6] text-[#301C10] text-[11px] font-bold border border-[#DFC9AC] transition shadow-xs active:scale-95"
                    >
                      <span>{preset.icon}</span>
                      <span>+ {preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Links List */}
              <div className="space-y-3">
                {currentSocialLinks.map((link, idx) => (
                  <div
                    key={link.id || idx}
                    className={`p-3.5 rounded-xl border transition-all ${link.isActive
                        ? "bg-white border-[#DFC9AC] shadow-xs"
                        : "bg-zinc-50 border-zinc-200 opacity-60"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Platform selector */}
                      <div className="w-full sm:w-44 shrink-0">
                        <label className="block text-[10px] font-bold text-[#8A6A53] mb-1">
                          Platform
                        </label>
                        <select
                          value={link.platform}
                          onChange={(e) =>
                            handleUpdateSocialLink(link.id, {
                              platform: e.target.value as SocialPlatform,
                            })
                          }
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] font-bold focus:border-[#C99532] outline-none"
                        >
                          <option value="google">🌐 Google Profile / Review</option>
                          <option value="instagram">📸 Instagram</option>
                          <option value="facebook">📘 Facebook</option>
                          <option value="whatsapp">💬 WhatsApp</option>
                          <option value="tiktok">🎵 TikTok</option>
                          <option value="youtube">▶️ YouTube</option>
                          <option value="x">✖️ X (Twitter)</option>
                          <option value="website">🔗 Website</option>
                          <option value="other">🌐 Other</option>
                        </select>
                      </div>

                      {/* Display Label */}
                      <div className="w-full sm:w-48 shrink-0">
                        <label className="block text-[10px] font-bold text-[#8A6A53] mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            handleUpdateSocialLink(link.id, { label: e.target.value })
                          }
                          placeholder="Label e.g. Google Reviews"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] font-bold focus:border-[#C99532] outline-none"
                        />
                      </div>

                      {/* URL input */}
                      <div className="flex-1 w-full min-w-0">
                        <label className="block text-[10px] font-bold text-[#8A6A53] mb-1">
                          Target URL / Profile Link
                        </label>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) =>
                            handleUpdateSocialLink(link.id, { url: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] outline-none font-mono"
                        />
                      </div>

                      {/* Actions: Test, Toggle visibility, Delete */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center mt-2 sm:mt-4 shrink-0">
                        {/* Test URL in new tab */}
                        {link.url && (
                          <a
                            href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Test open profile in new tab"
                            className="p-1.5 rounded-lg text-[#8A6A53] hover:text-[#301C10] hover:bg-[#FAF7F0] border border-transparent hover:border-[#DFC9AC] transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Toggle active / hidden */}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSocialLink(link.id, { isActive: !link.isActive })
                          }
                          title={link.isActive ? "Hide on customer menu" : "Show on customer menu"}
                          className={`p-1.5 rounded-lg transition border ${link.isActive
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                              : "text-zinc-400 bg-zinc-100 border-zinc-300 hover:bg-zinc-200"
                            }`}
                        >
                          {link.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>

                        {/* Delete Link button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSocialLink(link.id)}
                          title="Delete this link"
                          className="p-1.5 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {currentSocialLinks.length === 0 && (
                  <div className="p-8 text-center bg-[#FAF7F0] rounded-xl border border-dashed border-[#DFC9AC] space-y-2">
                    <Globe className="w-8 h-8 text-[#C99532]/60 mx-auto" />
                    <p className="text-xs font-bold text-[#301C10]">No Social or Google Profiles Added</p>
                    <p className="text-[11px] text-[#8A6A53]">
                      Click any of the Quick Add buttons above to add Google Reviews, Instagram, Facebook, or WhatsApp.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: DATABASE UTILITIES */}
          {(activeSection === "system" || activeSection === "store") && (
            <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-2xl p-5 space-y-3 text-xs shadow-warm">
              <div className="flex items-center gap-2 text-[#301C10] font-extrabold">
                <Database className="w-4 h-4 text-[#E8B64F]" />
                <span>Database & Menu Sync Utilities</span>
              </div>
              <p className="text-[#8A6A53]">
                Sync official authentic Ceylon teas, artisan coffees, snacks, desserts,
                and Table 01–Table 11 directly into Firestore.
              </p>

              <button
                type="button"
                onClick={handleSeedSampleData}
                disabled={seeding}
                className="bg-[#2C190E] hover:bg-[#4A290F] text-[#FFFCF6] font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition active:scale-95 shadow-warm"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#E8B64F]" />
                    <span>Seeding Firestore Database...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-[#E8B64F]" />
                    <span>Sync 107 Menu Items & 11 Tables</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Bottom Save Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={saving}
              className="bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-black px-6 py-3 rounded-xl text-sm shadow-warm flex items-center gap-2 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#C99532]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1A0F08]" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#1A0F08]" />
                  <span>Save All Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Real-time Visual Preview */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="bg-[#FFFCF6] rounded-3xl border border-[#DFC9AC] p-5 shadow-warm-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFC9AC]/70 pb-3">
              <div>
                <span className="font-extrabold text-sm text-[#301C10] block">
                  Interactive Live Preview
                </span>
                <span className="text-[11px] text-[#8A6A53]">
                  Updates instantly as you edit colors & text
                </span>
              </div>

              {/* Toggle Preview: Phone vs QR Card */}
              <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border border-[#DFC9AC]">
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${previewMode === "mobile"
                      ? "bg-[#2C190E] text-[#FFFCF6] shadow-xs"
                      : "text-[#8A6A53] hover:text-[#301C10]"
                    }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Menu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("qr")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${previewMode === "qr"
                      ? "bg-[#2C190E] text-[#FFFCF6] shadow-xs"
                      : "text-[#8A6A53] hover:text-[#301C10]"
                    }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>QR Card</span>
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex justify-center py-2">
              {previewMode === "mobile" ? (
                /* SMARTPHONE MOCKUP */
                <div className="w-[300px] sm:w-[320px] rounded-[36px] p-3 bg-[#0A0A0A] shadow-2xl border-4 border-zinc-800 relative select-none">
                  {/* Phone Notch */}
                  <div className="w-28 h-4 bg-zinc-900 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                    <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                  </div>

                  {/* Inside Screen */}
                  <div
                    className="rounded-[24px] overflow-hidden min-h-[460px] flex flex-col border border-black/10 transition-colors"
                    style={{
                      backgroundColor: previewColors.bg,
                      color: previewColors.text,
                    }}
                  >
                    {/* CUSTOM NAVBAR */}
                    <div
                      className="px-3.5 py-2.5 flex items-center justify-between border-b border-black/10 transition-colors shadow-xs"
                      style={{
                        backgroundColor: previewColors.headerBg,
                        color: previewColors.headerText,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {settings.logoUrl ? (
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="h-7 w-auto object-contain"
                          />
                        ) : (
                          <span className="font-black text-xs uppercase tracking-tight">
                            {settings.cafeName || "TEA TIME"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/20"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.25)",
                            color: previewColors.headerText,
                          }}
                        >
                          Table 07
                        </span>
                      </div>
                    </div>

                    {/* Inside Menu Content */}
                    <div className="p-3 space-y-3 flex-1 flex flex-col">
                      {/* Search Mockup */}
                      <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-black/10 text-[10px] text-zinc-500 flex items-center justify-between">
                        <span>Search milk tea, coffee, burgers...</span>
                        <span>🔍</span>
                      </div>

                      {/* Category Pills */}
                      <div className="flex items-center gap-1.5 overflow-hidden text-[10px] font-bold">
                        <span
                          className="px-2.5 py-1 rounded-full shadow-xs text-black"
                          style={{ backgroundColor: previewColors.accent }}
                        >
                          ☕ All Items
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/70 border border-black/10 text-zinc-600">
                          Special
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/70 border border-black/10 text-zinc-600">
                          Teas
                        </span>
                      </div>

                      {/* Sample Product Cards */}
                      <div className="space-y-2 flex-1">
                        <div className="p-2.5 rounded-xl bg-white border border-black/10 shadow-xs flex items-center gap-2.5">
                          <img
                            src="/images/menu/special/ice-milo.png"
                            alt="Ice Milo"
                            className="w-12 h-12 rounded-lg object-cover bg-amber-50 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-xs block truncate" style={{ color: previewColors.text }}>
                              Signature Ice Milo
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Chilled malt chocolate milk
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-black text-xs" style={{ color: previewColors.accent }}>
                                {settings.currencySymbol || "Rs."} 400
                              </span>
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-md text-[10px] font-black text-white transition active:scale-95"
                                style={{ backgroundColor: previewColors.primary }}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-black/10 shadow-xs flex items-center gap-2.5">
                          <img
                            src="/images/menu/coffee/milk-coffee.png"
                            alt="Milk Coffee"
                            className="w-12 h-12 rounded-lg object-cover bg-amber-50 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-extrabold text-xs block truncate" style={{ color: previewColors.text }}>
                              Ceylon Milk Coffee
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Fresh roasted rich coffee
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-black text-xs" style={{ color: previewColors.accent }}>
                                {settings.currencySymbol || "Rs."} 300
                              </span>
                              <button
                                type="button"
                                className="px-2.5 py-1 rounded-md text-[10px] font-black text-white transition active:scale-95"
                                style={{ backgroundColor: previewColors.primary }}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Social & Google Reviews Preview in Smartphone */}
                      <div className="pt-2 pb-1 border-t border-black/10 text-center">
                        <span className="text-[9px] font-bold text-zinc-400 block mb-1">
                          Social & Reviews (Live Menu Footer)
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {currentSocialLinks.filter((l) => l.isActive).map((link) => (
                            <span
                              key={link.id}
                              className="px-2 py-0.5 rounded-md text-[9px] font-bold text-[#FFFCF6] bg-[#0A0A0A] border border-[#E8B64F]/50 flex items-center gap-1 shadow-xs"
                            >
                              <span>
                                {link.platform === "google"
                                  ? "⭐"
                                  : link.platform === "instagram"
                                    ? "📸"
                                    : link.platform === "facebook"
                                      ? "📘"
                                      : link.platform === "whatsapp"
                                        ? "💬"
                                        : link.platform === "tiktok"
                                          ? "🎵"
                                          : "🔗"}
                              </span>
                              <span className="truncate max-w-[80px]">{link.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Mockup Sticky Cart Bar */}
                      <div
                        className="p-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold text-white mt-auto"
                        style={{ backgroundColor: previewColors.primary }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px]">1</span>
                          <span>View Order</span>
                        </div>
                        <span className="font-black" style={{ color: previewColors.accent }}>
                          {settings.currencySymbol || "Rs."} 400 →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TABLE QR TENT CARD MOCKUP */
                <div
                  className="w-64 rounded-[28px] p-6 pt-6 pb-6 shadow-2xl flex flex-col items-center text-center space-y-3.5 border transition-all"
                  style={{
                    backgroundColor: previewColors.headerBg || "#2C190E",
                    color: "#FFFCF6",
                    borderColor: previewColors.accent || "#4A290F",
                  }}
                >
                  {/* Optional Top Header Text */}
                  {settings.qrHeaderTitle && settings.qrHeaderTitle.trim().length > 0 && (
                    <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[#FFFCF6]/90 select-none pt-0.5">
                      {settings.qrHeaderTitle}
                    </div>
                  )}

                  {/* Brand Logo - customizable size from admin panel */}
                  <div className="pt-1 pb-1 flex flex-col items-center justify-center">
                    {settings.logoUrl && !settings.logoUrl.includes("logo-horizontal") ? (
                      <img
                        src={settings.logoUrl}
                        alt={settings.cafeName || "Logo"}
                        style={{
                          height: `${getQrLogoHeight(settings.qrLogoSize)}px`,
                          maxHeight: `${getQrLogoHeight(settings.qrLogoSize) + 20}px`,
                        }}
                        className="max-w-[190px] w-auto object-contain select-none drop-shadow-md transition-all"
                      />
                    ) : (
                      <img
                        src="/assets/logo.png"
                        alt="TEA TIME"
                        style={{
                          height: `${getQrLogoHeight(settings.qrLogoSize)}px`,
                          maxHeight: `${getQrLogoHeight(settings.qrLogoSize) + 20}px`,
                        }}
                        className="max-w-[190px] w-auto object-contain select-none drop-shadow-md transition-all"
                      />
                    )}
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-[#FFFCF6] p-3 rounded-2xl shadow-xl border border-[#DFC9AC]/60">
                    <QRCodeSVG
                      value={`https://menyo.aevonix.lk/teatime/menu?table=tbl_07`}
                      size={136}
                      level="H"
                      includeMargin={false}
                      fgColor="#2C190E"
                      bgColor="#FFFCF6"
                    />
                  </div>

                  {/* Table details */}
                  <div className="space-y-0.5">
                    <h4 className="text-xl font-black tracking-wide text-white">
                      Table 07
                    </h4>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#E8B64F]">
                      {settings.qrSubtitle || "SCAN TO ORDER"}
                    </p>
                  </div>

                  {/* Slogan / Footer note */}
                  <div
                    className="pt-3 border-t border-[#E8B64F]/40 w-3/4 mx-auto text-[11px] italic leading-tight text-white/90"
                  >
                    <span>
                      {settings.qrFooterNote || "☕ Good tea brings people together."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Hint Box */}
            <div className="p-3 bg-white rounded-xl border border-[#DFC9AC] text-[11px] text-[#8A6A53] flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-[#E8B64F] shrink-0 mt-0.5" />
              <span>
                Changes previewed above update in real time on both customer smartphones and the printable table tent cards.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
