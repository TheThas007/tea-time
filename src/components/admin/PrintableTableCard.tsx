import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, Scan, List, UtensilsCrossed, Edit3, Download } from "lucide-react";
import { TableItem } from "../../types";

interface SingleProps {
  businessName: string;
  businessSlug: string;
  table: TableItem;
  primaryColor?: string;
  accentColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  cardBgColor?: string;
  cardTextColor?: string;
  logoUrl?: string | null;
  qrLogoUrl?: string | null;
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  qrLogoSize?: number | "small" | "medium" | "large" | "xlarge" | "huge" | string;
  onClose: () => void;
}

export function getQrLogoHeight(size?: number | string): number {
  if (typeof size === "number") return Math.min(Math.max(size, 40), 280);
  if (!size) return 60;
  if (size === "small" || size === "compact") return 45;
  if (size === "medium" || size === "default") return 60;
  if (size === "large" || size === "big") return 80;
  if (size === "xlarge" || size === "extrabig") return 110;
  if (size === "huge" || size === "max") return 150;
  const parsed = parseInt(String(size), 10);
  return isNaN(parsed) ? 60 : Math.min(Math.max(parsed, 40), 280);
}

// 4 Corner brackets surrounding the QR code matching user reference image
export const QrCornerBrackets: React.FC<{ color?: string }> = ({ color = "#050F2A" }) => (
  <div className="absolute inset-0 pointer-events-none -m-3">
    {/* Top Left */}
    <span
      className="absolute top-0 left-0 w-4 h-4 border-t-[2.5px] border-l-[2.5px] rounded-tl-sm"
      style={{ borderColor: color }}
    />
    {/* Top Right */}
    <span
      className="absolute top-0 right-0 w-4 h-4 border-t-[2.5px] border-r-[2.5px] rounded-tr-sm"
      style={{ borderColor: color }}
    />
    {/* Bottom Left */}
    <span
      className="absolute bottom-0 left-0 w-4 h-4 border-b-[2.5px] border-l-[2.5px] rounded-bl-sm"
      style={{ borderColor: color }}
    />
    {/* Bottom Right */}
    <span
      className="absolute bottom-0 right-0 w-4 h-4 border-b-[2.5px] border-r-[2.5px] rounded-br-sm"
      style={{ borderColor: color }}
    />
  </div>
);

// 3-step action row: Scan • Choose • Enjoy
export const QrActionGuide: React.FC<{ textColor?: string }> = ({ textColor = "#050F2A" }) => (
  <div className="flex items-center justify-center gap-4 pt-1 pb-1 select-none">
    {/* Scan */}
    <div className="flex flex-col items-center">
      <div className="w-6 h-6 flex items-center justify-center mb-0.5">
        <Scan className="w-4 h-4" style={{ color: textColor }} />
      </div>
      <span className="text-[10px] font-semibold tracking-tight" style={{ color: textColor }}>
        Scan
      </span>
    </div>

    <span className="text-zinc-300 font-bold text-xs select-none">•</span>

    {/* Choose */}
    <div className="flex flex-col items-center">
      <div className="w-6 h-6 flex items-center justify-center mb-0.5">
        <List className="w-4 h-4" style={{ color: textColor }} />
      </div>
      <span className="text-[10px] font-semibold tracking-tight" style={{ color: textColor }}>
        Choose
      </span>
    </div>

    <span className="text-zinc-300 font-bold text-xs select-none">•</span>

    {/* Enjoy */}
    <div className="flex flex-col items-center">
      <div className="w-6 h-6 flex items-center justify-center mb-0.5">
        <UtensilsCrossed className="w-4 h-4" style={{ color: textColor }} />
      </div>
      <span className="text-[10px] font-semibold tracking-tight" style={{ color: textColor }}>
        Enjoy
      </span>
    </div>
  </div>
);

/**
 * Format table number into clean display (e.g. "7" -> "TABLE 07", "Table 07" -> "TABLE 07")
 */
export const formatTableBadgeText = (raw?: string): string => {
  if (!raw) return "TABLE";
  const upper = raw.trim().toUpperCase();
  if (upper.startsWith("TABLE")) return upper;
  const num = parseInt(raw.replace(/\D/g, ""), 10);
  if (!isNaN(num)) {
    return `TABLE ${num < 10 ? "0" + num : num}`;
  }
  return `TABLE ${raw.trim()}`;
};

export const SingleTablePrintModal: React.FC<SingleProps> = ({
  businessName,
  businessSlug,
  table,
  primaryColor = "#050F2A",
  accentColor = "#050F2A",
  cardBgColor = "#FFFFFF",
  cardTextColor = "#050F2A",
  logoUrl,
  qrLogoUrl,
  qrHeaderTitle,
  qrSubtitle = "Scan to explore our menu",
  qrFooterNote = "Good food. One scan away.",
  qrLogoSize = 60,
  onClose,
}) => {
  const origin = window.location.origin;
  const qrUrl = `${origin}/${businessSlug}/menu?table=${table.token}`;
  const effectiveQrLogo = qrLogoUrl || logoUrl;

  const [downloading, setDownloading] = useState<boolean>(false);

  const handleDownloadQrPng = () => {
    try {
      setDownloading(true);
      const svg = document.getElementById(`qr-svg-${table.id || table.token}`);
      if (!svg) {
        alert("QR element could not be found.");
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = 600;
        canvas.height = 600;
        if (ctx) {
          ctx.fillStyle = bgCardColor || "#FFFFFF";
          ctx.fillRect(0, 0, 600, 600);
          ctx.drawImage(img, 40, 40, 520, 520);
        }
        const a = document.createElement("a");
        a.download = `${businessSlug}_${tableBadge.replace(/\s+/g, "_")}_QR.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
        setDownloading(false);
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error(e);
      setDownloading(false);
    }
  };

  // Live editable state for quick customization right before printing
  const [headline, setHeadline] = useState<string>(
    qrHeaderTitle && qrHeaderTitle.trim().length > 0
      ? qrHeaderTitle
      : qrFooterNote && qrFooterNote.trim().length > 0 && !qrFooterNote.includes("tea brings")
      ? qrFooterNote
      : "Good food. One scan away."
  );
  const [subtext, setSubtext] = useState<string>(
    qrSubtitle && qrSubtitle !== "SCAN TO ORDER"
      ? qrSubtitle
      : "Scan to explore our menu"
  );
  const [sweetMsg, setSweetMsg] = useState<string>("Enjoy your visit!");
  const [badgeColor, setBadgeColor] = useState<string>(primaryColor || "#050F2A");
  const [bgCardColor, setBgCardColor] = useState<string>(cardBgColor || "#FFFFFF");
  const [txtCardColor, setTxtCardColor] = useState<string>(cardTextColor || "#050F2A");
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const logoHeight = getQrLogoHeight(qrLogoSize);
  const tableBadge = formatTableBadgeText(table.tableNumber || table.number);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-page-wrapper {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card-exact {
            width: 3.8in !important;
            height: 5.75in !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-zinc-200 flex flex-col print:border-0 print:shadow-none print:w-full print:max-w-none print:bg-transparent print-page-wrapper">
        {/* Modal Header */}
        <div className="bg-[#050F2A] text-white px-5 py-3.5 flex items-center justify-between print-hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm tracking-tight text-white">
              Printable Table Stand: {tableBadge}
            </h3>
            <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/80 font-medium">
              Acrylic Stand 4×6"
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                showEditor ? "bg-white text-[#050F2A]" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
              title="Edit texts before print"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{showEditor ? "Hide Editor" : "Customize Text"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Quick In-Modal Editor */}
        {showEditor && (
          <div className="p-4 bg-zinc-50 border-b border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs print-hidden animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Headline Message
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Good food. One scan away."
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 text-xs focus:outline-none focus:border-[#050F2A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Subtext Instruction
              </label>
              <input
                type="text"
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                placeholder="Scan to explore our menu"
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 text-xs focus:outline-none focus:border-[#050F2A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Sweet Message (Greeting / Tagline)
              </label>
              <input
                type="text"
                value={sweetMsg}
                onChange={(e) => setSweetMsg(e.target.value)}
                placeholder="Enjoy your visit!"
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-zinc-900 text-xs focus:outline-none focus:border-[#050F2A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Table Badge Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={badgeColor}
                  onChange={(e) => setBadgeColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-300 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={badgeColor}
                  onChange={(e) => setBadgeColor(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Card Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgCardColor}
                  onChange={(e) => setBgCardColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-300 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={bgCardColor}
                  onChange={(e) => setBgCardColor(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Card Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={txtCardColor}
                  onChange={(e) => setTxtCardColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-300 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={txtCardColor}
                  onChange={(e) => setTxtCardColor(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Cardstock Container */}
        <div className="p-6 sm:p-8 bg-zinc-100/70 flex items-center justify-center print:p-0 print:m-0 print:bg-transparent">
          {/* Card: Exact Replica matching user reference image */}
          <div
            id="printable-tent-card"
            className="w-[280px] sm:w-[310px] rounded-[28px] p-6 pt-7 pb-6 shadow-2xl flex flex-col items-center text-center space-y-4 border transition-all select-none print-card-exact"
            style={{
              backgroundColor: bgCardColor,
              color: txtCardColor,
              borderColor: badgeColor,
            }}
          >
            {/* Prominent Brand Logo */}
            <div className="pt-1 pb-1 flex flex-col items-center justify-center">
              {effectiveQrLogo ? (
                <img
                  src={effectiveQrLogo}
                  alt={businessName}
                  style={{
                    height: `${logoHeight}px`,
                  }}
                  className="max-w-[220px] w-auto object-contain select-none drop-shadow-md transition-all"
                />
              ) : (
                <div
                  className="text-2xl font-black tracking-wider uppercase"
                  style={{ color: badgeColor }}
                >
                  {businessName}
                </div>
              )}
            </div>

            {/* QR Code in High-contrast Rounded Container */}
            <div className="p-3.5 rounded-2xl shadow-xl bg-white border border-black/10">
              <QRCodeSVG
                id={`qr-svg-${table.id || table.token}`}
                value={qrUrl}
                size={148}
                level="H"
                includeMargin={false}
                fgColor={bgCardColor === "#FFFFFF" ? "#050F2A" : (bgCardColor || "#2C190E")}
                bgColor="#FFFFFF"
              />
            </div>

            {/* Table Details */}
            <div className="space-y-0.5">
              <h4
                className="text-2xl font-black tracking-wide"
                style={{ color: txtCardColor }}
              >
                {tableBadge}
              </h4>
              <p
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: badgeColor }}
              >
                {subtext || "SCAN TO ORDER"}
              </p>
            </div>

            {/* Footer Slogan / Tagline with Gold Divider Line */}
            <div
              className="pt-2.5 border-t w-full text-[11px] italic leading-tight"
              style={{
                borderColor: `${txtCardColor}33`,
                color: `${txtCardColor}CC`,
              }}
            >
              <span>{sweetMsg || "☕ Good tea brings people together."}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-zinc-200 flex items-center justify-between text-xs print-hidden">
          <span className="text-zinc-500 font-medium text-[11px] sm:text-xs">
            Standard 4×6" cardstock / acrylic table stand
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadQrPng}
              disabled={downloading}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold px-4 py-2.5 rounded-full flex items-center gap-1.5 border border-zinc-300 transition active:scale-95"
              title="Download QR code PNG for printing"
            >
              <Download className="w-4 h-4 text-zinc-700" />
              <span>{downloading ? "Saving..." : "Download QR"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#7BBBFF]" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full border border-zinc-300 bg-white text-zinc-700 font-bold hover:bg-zinc-50 transition active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface BatchProps {
  businessName: string;
  businessSlug: string;
  tables: TableItem[];
  primaryColor?: string;
  accentColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  cardBgColor?: string;
  cardTextColor?: string;
  logoUrl?: string | null;
  qrLogoUrl?: string | null;
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  qrLogoSize?: number | "small" | "medium" | "large" | "xlarge" | "huge" | string;
  onClose: () => void;
}

export const BatchTablesPrintModal: React.FC<BatchProps> = ({
  businessName,
  businessSlug,
  tables,
  primaryColor = "#050F2A",
  cardBgColor = "#2C190E",
  cardTextColor = "#FFFCF6",
  logoUrl,
  qrLogoUrl,
  qrHeaderTitle,
  qrSubtitle = "Scan to explore our menu",
  qrFooterNote = "Good food. One scan away.",
  qrLogoSize = 60,
  onClose,
}) => {
  const origin = window.location.origin;
  const effectiveQrLogo = qrLogoUrl || logoUrl;

  // Live editable state
  const [headline, setHeadline] = useState<string>(
    qrHeaderTitle && qrHeaderTitle.trim().length > 0
      ? qrHeaderTitle
      : qrFooterNote && qrFooterNote.trim().length > 0 && !qrFooterNote.includes("tea brings")
      ? qrFooterNote
      : "Good food. One scan away."
  );
  const [subtext, setSubtext] = useState<string>(
    qrSubtitle && qrSubtitle !== "SCAN TO ORDER"
      ? qrSubtitle
      : "Scan to explore our menu"
  );
  const [sweetMsg, setSweetMsg] = useState<string>("Enjoy your visit!");
  const [badgeColor, setBadgeColor] = useState<string>(primaryColor || "#050F2A");
  const [bgCardColor, setBgCardColor] = useState<string>(cardBgColor || "#2C190E");
  const [txtCardColor, setTxtCardColor] = useState<string>(cardTextColor || "#FFFCF6");
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const logoHeight = getQrLogoHeight(qrLogoSize);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-6 sm:p-8 border border-zinc-200 text-zinc-900 flex flex-col print:border-0 print:shadow-none print:p-0 print:bg-transparent">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 print-hidden">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Batch Table QR Cards ({tables.length} Tables)
            </h2>
            <p className="text-xs text-zinc-500">
              Modern white acrylic stand cards formatted for 4×6" cardstock / A4 sheet printing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                showEditor ? "bg-[#050F2A] text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{showEditor ? "Hide Editor" : "Customize Text"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Text Editor */}
        {showEditor && (
          <div className="my-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs print-hidden animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Subtext</label>
              <input
                type="text"
                value={subtext}
                onChange={(e) => setSubtext(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Sweet Message</label>
              <input
                type="text"
                value={sweetMsg}
                onChange={(e) => setSweetMsg(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Badge Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={badgeColor}
                  onChange={(e) => setBadgeColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-300 cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={badgeColor}
                  onChange={(e) => setBadgeColor(e.target.value)}
                  className="flex-1 bg-white border border-zinc-300 rounded-xl px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Printable Grid */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-6 print:my-0">
          {tables.map((table) => {
            const qrUrl = `${origin}/${businessSlug}/menu?table=${table.token}`;
            const tableBadge = formatTableBadgeText(table.tableNumber || table.number);

            return (
              <div
                key={table.id}
                className="w-full rounded-[24px] p-5 shadow-lg flex flex-col items-center text-center space-y-3.5 border print:break-inside-avoid select-none"
                style={{
                  backgroundColor: bgCardColor,
                  color: txtCardColor,
                  borderColor: badgeColor,
                }}
              >
                {/* Logo */}
                <div className="pt-1 flex flex-col items-center justify-center">
                  {effectiveQrLogo ? (
                    <img
                      src={effectiveQrLogo}
                      alt={businessName}
                      style={{
                        height: `${Math.round(logoHeight * 0.85)}px`,
                      }}
                      className="max-w-[170px] w-auto object-contain select-none drop-shadow"
                    />
                  ) : (
                    <div
                      className="text-lg font-black tracking-wider uppercase"
                      style={{ color: badgeColor }}
                    >
                      {businessName}
                    </div>
                  )}
                </div>

                {/* QR Code in Container */}
                <div className="bg-white p-3 rounded-2xl shadow-md border border-black/10">
                  <QRCodeSVG
                    value={qrUrl}
                    size={130}
                    level="H"
                    includeMargin={false}
                    fgColor={bgCardColor === "#FFFFFF" ? "#050F2A" : (bgCardColor || "#2C190E")}
                    bgColor="#FFFFFF"
                  />
                </div>

                {/* Table Details */}
                <div className="space-y-0.5">
                  <h4
                    className="text-xl font-black tracking-wide"
                    style={{ color: txtCardColor }}
                  >
                    {tableBadge}
                  </h4>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: badgeColor }}
                  >
                    {subtext || "SCAN TO ORDER"}
                  </p>
                </div>

                {/* Footer Quote */}
                <div
                  className="pt-2 border-t w-full text-[10px] italic leading-tight"
                  style={{
                    borderColor: `${txtCardColor}33`,
                    color: `${txtCardColor}CC`,
                  }}
                >
                  <span>{sweetMsg || "☕ Good tea brings people together."}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 print-hidden">
          <span className="text-zinc-500 font-medium text-xs">
            Print on standard A4 or 4×6" sheets
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#050F2A] hover:bg-[#0b1739] text-white font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#7BBBFF]" />
              <span>Print All Cards</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full border border-zinc-300 bg-white text-zinc-700 font-bold hover:bg-zinc-50 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
