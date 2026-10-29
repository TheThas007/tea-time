import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, collection } from "firebase/firestore";
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
  Loader2
} from "lucide-react";
import { db } from "../../lib/firebase";
import { CafeSettings } from "../../types";
import { 
  INITIAL_SETTINGS, 
  INITIAL_CATEGORIES, 
  INITIAL_MENU_ITEMS, 
  INITIAL_TABLES 
} from "../../data/seedData";

export const CafeSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<CafeSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const docRef = doc(db, "settings", "cafe");
      await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setErrorMessage("Failed to save café settings.");
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

      // Remove legacy demo categories & Unsplash sample items if present
      const legacyCategoryIds = ["cat_tea", "cat_coffee", "cat_snacks", "cat_desserts"];
      for (const oldCatId of legacyCategoryIds) {
        batch.delete(doc(db, "categories", oldCatId));
      }
      const legacyMenuIds = [
        "prod_ceylon_milk_tea",
        "prod_masala_chai",
        "prod_iced_lemon_tea",
        "prod_chocolate_cake",
        "prod_cappuccino",
        "prod_iced_caramel_latte",
        "prod_vegetable_roti",
        "prod_fish_cutlets",
        "prod_butter_cake",
      ];
      for (const oldProdId of legacyMenuIds) {
        batch.delete(doc(db, "menu", oldProdId));
      }

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* View Header */}
      <div className="border-b border-[#DFC9AC] pb-4">
        <h1 className="text-2xl font-black text-[#301C10] tracking-tight">
          Café Settings
        </h1>
        <p className="text-xs text-[#8A6A53] font-medium mt-0.5">
          General café information, operating hours, order pause status, and data management.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Café settings saved successfully!</span>
        </div>
      )}

      {seedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Sample menu items, tables, and settings seeded into Firestore!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Pause Ordering Section */}
        <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm text-[#301C10] flex items-center gap-2">
                {settings.isOrderingPaused ? (
                  <PauseCircle className="w-4 h-4 text-[#E8B64F]" />
                ) : (
                  <PlayCircle className="w-4 h-4 text-emerald-600" />
                )}
                <span>Ordering Availability</span>
              </h3>
              <p className="text-xs text-[#8A6A53]">
                Pause new incoming orders while allowing customers to still browse the menu.
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
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                settings.isOrderingPaused
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.isOrderingPaused ? "bg-amber-600" : "bg-emerald-600"
                }`}
              />
              <span>{settings.isOrderingPaused ? "Ordering Paused" : "Active & Accepting Orders"}</span>
            </button>
          </div>

          {settings.isOrderingPaused && (
            <div className="pt-2">
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
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
              />
            </div>
          )}
        </div>

        {/* General Café Details */}
        <div className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] p-5 shadow-warm space-y-4 text-xs">
          <h3 className="font-extrabold text-sm text-[#301C10] flex items-center gap-2 border-b border-[#DFC9AC]/70 pb-2">
            <Store className="w-4 h-4 text-[#E8B64F]" />
            <span>Café Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#301C10] mb-1">Café Name</label>
              <input
                type="text"
                value={settings.cafeName}
                onChange={(e) =>
                  setSettings({ ...settings, cafeName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
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
                className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
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
                className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
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
                className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-warm flex items-center gap-2 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#1A0F08]" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Database Seeding Utility */}
      <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-2xl p-5 space-y-3 text-xs shadow-warm">
        <div className="flex items-center gap-2 text-[#301C10] font-extrabold">
          <Database className="w-4 h-4 text-[#E8B64F]" />
          <span>Database & Seed Utilities</span>
        </div>
        <p className="text-[#8A6A53]">
          Populate Firestore with sample authentic Ceylon teas, artisan coffees, snacks, desserts,
          and Table 01–Table 11.
        </p>

        <button
          type="button"
          onClick={handleSeedSampleData}
          disabled={seeding}
          className="bg-[#2C190E] hover:bg-[#623B1B] text-[#FFFCF6] font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition active:scale-95 shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
        >
          {seeding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Seeding Firestore...</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-[#E8B64F]" />
              <span>Seed Sample Menu & Tables</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

