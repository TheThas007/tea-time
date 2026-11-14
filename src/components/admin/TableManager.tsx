import React, { useState, useEffect } from "react";
import {
  db,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "../../lib/supabaseStore";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  RefreshCw,
  Printer,
  Eye,
  Check,
  X,
  Power,
  ExternalLink,
  Download
} from "lucide-react";
import { TableItem, CafeSettings } from "../../types";
import { Logo } from "../common/Logo";
import { INITIAL_TABLES, INITIAL_SETTINGS } from "../../data/seedData";
import { SingleTablePrintModal } from "./PrintableTableCard";

export const TableManager: React.FC = () => {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CafeSettings>(INITIAL_SETTINGS);

  // Selected table for printable tent card preview
  const [previewTable, setPreviewTable] = useState<TableItem | null>(null);

  // Create table modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");

  // Real-time Firestore listener for cafe settings (branding & custom QR text)
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "cafe"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({ ...INITIAL_SETTINGS, ...data } as CafeSettings);
        }
      },
      (err) => {
        console.warn("Settings listener fallback:", err);
      }
    );
    return () => unsub();
  }, []);

  // Real-time Firestore listener for tables
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tables"),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TableItem));
          list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
          setTables(list);
        } else {
          setTables(INITIAL_TABLES);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Tables Firestore listener fallback:", err);
        setTables(INITIAL_TABLES);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const generateRandomToken = (prefix: string = "tbl") => {
    return `${prefix}_${Math.random().toString(36).substring(2, 8)}`;
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    const formattedNumber = newTableNumber.trim().startsWith("Table ")
      ? newTableNumber.trim()
      : `Table ${newTableNumber.trim()}`;

    const token = generateRandomToken("tbl");

    try {
      await addDoc(collection(db, "tables"), {
        number: formattedNumber,
        token: token,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewTableNumber("");
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Create table error:", err);
    }
  };

  const handleToggleTableActive = async (table: TableItem) => {
    try {
      await updateDoc(doc(db, "tables", table.id), {
        active: !table.active,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Toggle table error:", err);
    }
  };

  const handleRotateToken = async (table: TableItem) => {
    if (!window.confirm(`Rotate QR code token for ${table.number}? Existing physical printed codes for this table will stop working.`)) {
      return;
    }

    const newToken = generateRandomToken("tbl");
    try {
      await updateDoc(doc(db, "tables", table.id), {
        token: newToken,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Rotate token error:", err);
    }
  };

  const getTableMenuUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://teatime.lk";
    return `${origin}/menu?table=${token}`;
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#DFC9AC] pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#301C10] tracking-tight">
            Table Management
          </h1>
          <p className="text-xs text-[#8A6A53] font-medium mt-0.5">
            Configure dining tables, generate QR codes, and print tent cards.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] font-extrabold px-4 py-2 rounded-xl text-xs shadow-warm flex items-center gap-1.5 transition active:scale-95 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Table</span>
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const menuUrl = getTableMenuUrl(table.token);

          return (
            <div
              key={table.id}
              className={`bg-[#FFFCF6] rounded-2xl border p-4 shadow-warm transition hover:shadow-warm-md space-y-4 ${table.active ? "border-[#DFC9AC]" : "border-red-200 bg-red-50/20"
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#301C10]">
                    {table.number}
                  </h3>
                  <span className="text-[11px] font-mono text-[#8A6A53]">
                    Token: {table.token}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleTableActive(table)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${table.active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                    }`}
                  title={table.active ? "Click to deactivate table" : "Click to activate table"}
                >
                  <Power className="w-3 h-3" />
                  <span>{table.active ? "Active" : "Inactive"}</span>
                </button>
              </div>

              {/* QR Preview Thumbnail */}
              <div className="flex items-center gap-4 bg-[#FAF7F0] p-3 rounded-xl border border-[#DFC9AC]">
                <div className="bg-[#FFFCF6] p-2 rounded-lg border border-[#DFC9AC] shadow-warm shrink-0">
                  <QRCodeSVG value={menuUrl} size={64} level="M" fgColor="#301C10" bgColor="#FFFCF6" />
                </div>

                <div className="flex-1 min-w-0 text-xs space-y-1">
                  <p className="font-semibold text-[#301C10]">QR Ordering Link</p>
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4A290F] font-bold hover:text-[#623B1B] hover:underline truncate block flex items-center gap-1 text-[11px]"
                  >
                    <span>Open customer menu</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-[#E8B64F]" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  onClick={() => setPreviewTable(table)}
                  className="bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-[11px] shadow-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                >
                  <Printer className="w-3.5 h-3.5 text-[#E8B64F]" />
                  <span>Print QR Card</span>
                </button>

                <button
                  onClick={() => handleRotateToken(table)}
                  className="text-[#8A6A53] hover:text-[#301C10] font-semibold px-2 py-1.5 rounded-lg hover:bg-[#FAF7F0] transition flex items-center gap-1 text-[11px]"
                  title="Rotate table security token"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rotate token</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Table Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#2C190E]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF7F0] rounded-3xl shadow-warm-xl max-w-sm w-full overflow-hidden border border-[#DFC9AC]">
            <div className="bg-[#2C190E] text-[#FFFCF6] p-4 flex items-center justify-between border-b border-[#4A290F]">
              <h3 className="font-extrabold text-sm">Add New Table</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#8A6A53] hover:text-[#FFFCF6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#301C10] mb-1">
                  Table Number or Label *
                </label>
                <input
                  type="text"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. Table 12 or Patio 01"
                  className="w-full px-3 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] placeholder-[#8A6A53] focus:border-[#C99532] focus:ring-2 focus:ring-[#C99532]/30 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFC9AC] bg-[#FFFCF6] text-[#301C10] font-bold hover:bg-[#DFC9AC]/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold shadow-warm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Tent Card Modal - Using SingleTablePrintModal */}
      {previewTable && (
        <SingleTablePrintModal
          table={previewTable}
          businessSlug="teatime"
          businessName={settings.cafeName || "Tea Time"}
          primaryColor={settings.primaryColor || "#050F2A"}
          accentColor={settings.accentColor || "#050F2A"}
          headerBackgroundColor={settings.headerBackgroundColor || "#050F2A"}
          headerTextColor={settings.headerTextColor || "#FFFFFF"}
          logoUrl={settings.logoUrl || null}
          qrHeaderTitle={settings.qrHeaderTitle ?? ""}
          qrSubtitle={settings.qrSubtitle || "Scan to explore our menu"}
          qrFooterNote={settings.qrFooterNote || "Good food. One scan away."}
          qrLogoSize={settings.qrLogoSize || 60}
          onClose={() => setPreviewTable(null)}
        />
      )}
    </div>
  );
};

