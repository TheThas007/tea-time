import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, Scan, List, UtensilsCrossed, Edit3 } from "lucide-react";
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
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  qrLogoSize?: number | "small" | "medium" | "large" | "xlarge" | "huge" | string;
  onClose: () => void;
}

export function getQrLogoHeight(size?: number | string): number {
  if (typeof size === "number") return Math.min(Math.max(size, 40), 160);
  if (!size) return 60;
  if (size === "small" || size === "compact") return 45;
  if (size === "medium" || size === "default") return 60;
  if (size === "large" || size === "big") return 80;
  if (size === "xlarge" || size === "extrabig") return 100;
  if (size === "huge" || size === "max") return 130;
  const parsed = parseInt(String(size), 10);
  return isNaN(parsed) ? 60 : Math.min(Math.max(parsed, 40), 160);
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
  qrHeaderTitle,
  qrSubtitle = "Scan to explore our menu",
  qrFooterNote = "Good food. One scan away.",
  qrLogoSize = 60,
  onClose,
}) => {
  const origin = window.location.origin;
  const qrUrl = `${origin}/${businessSlug}/menu?table=${table.token}`;

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
          {/* Card: Exact Replica of uploaded Acrylic Stand photo */}
          <div
            id="printable-tent-card"
            className="w-[280px] sm:w-[310px] rounded-3xl p-6 pt-7 pb-6 shadow-xl flex flex-col items-center text-center space-y-4 border border-zinc-200/80 transition-all select-none print-card-exact"
            style={{
              backgroundColor: bgCardColor,
              color: txtCardColor,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif',
            }}
          >
            {/* Top Brand Logo & Subtitle */}
            <div className="flex flex-col items-center space-y-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  style={{
                    height: `${logoHeight}px`,
                    maxHeight: `${logoHeight + 15}px`,
                  }}
                  className="w-auto max-w-[200px] object-contain drop-shadow-xs"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#050F2A] text-white flex items-center justify-center font-black text-sm">
                    {businessName.charAt(0) || "M"}
                  </div>
                  <span className="font-extrabold text-lg text-[#050F2A] tracking-tight">
                    {businessName}
                  </span>
                </div>
              )}
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-zinc-500 pt-0.5">
                YOUR DIGITAL MENU
              </span>
            </div>

            {/* Headline & Subhead */}
            <div className="space-y-1 pt-1 max-w-[240px]">
              <h2 className="text-xl sm:text-[22px] font-black leading-tight tracking-tight" style={{ color: txtCardColor }}>
                {headline}
              </h2>
              <p className="text-xs font-medium opacity-80" style={{ color: txtCardColor }}>
                {subtext}
              </p>
            </div>

            {/* Center QR Code with 4 corner boundary brackets */}
            <div className="relative p-2 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgCardColor }}>
              <QrCornerBrackets color={badgeColor} />
              <div className="p-1 rounded-lg" style={{ backgroundColor: bgCardColor }}>
                <QRCodeSVG
                  value={qrUrl}
                  size={148}
                  level="H"
                  includeMargin={false}
                  fgColor={txtCardColor}
                  bgColor={bgCardColor}
                />
              </div>
            </div>

            {/* Action Row: Scan • Choose • Enjoy */}
            <QrActionGuide textColor={txtCardColor} />

            {/* Table Number Capsule / Pill Badge */}
            <div className="pt-1">
              <div
                className="px-8 py-2 rounded-full font-black text-xs sm:text-sm tracking-wider uppercase text-white shadow-md inline-block"
                style={{ backgroundColor: badgeColor }}
              >
                {tableBadge}
              </div>
            </div>

            {/* Optional Sweet Message (if set) */}
            {sweetMsg && sweetMsg.trim().length > 0 && (
              <div className="text-[11px] text-zinc-600 font-medium italic pt-0.5">
                {sweetMsg}
              </div>
            )}

            {/* Footer: Powered by menyo.org */}
            <div className="pt-1 text-[9.5px] font-medium text-zinc-400 tracking-wider">
              Powered by <span className="font-bold text-[#050F2A]">menyo.org</span>
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
  logoUrl,
  qrHeaderTitle,
  qrSubtitle = "Scan to explore our menu",
  qrFooterNote = "Good food. One scan away.",
  qrLogoSize = 60,
  onClose,
}) => {
  const origin = window.location.origin;

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
                className="w-full bg-white rounded-3xl p-6 shadow-md flex flex-col items-center text-center space-y-3.5 border border-zinc-200 select-none print:break-inside-avoid print:shadow-none"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Helvetica Neue", sans-serif',
                }}
              >
                {/* Logo & Subtitle */}
                <div className="flex flex-col items-center space-y-0.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      style={{
                        height: `${Math.round(logoHeight * 0.9)}px`,
                        maxHeight: `${Math.round(logoHeight * 0.9) + 10}px`,
                      }}
                      className="w-auto max-w-[170px] object-contain drop-shadow-xs"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-[#050F2A] text-white flex items-center justify-center font-black text-xs">
                        {businessName.charAt(0) || "M"}
                      </div>
                      <span className="font-extrabold text-base text-[#050F2A]">
                        {businessName}
                      </span>
                    </div>
                  )}
                  <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 pt-0.5">
                    YOUR DIGITAL MENU
                  </span>
                </div>

                {/* Headline & Subhead */}
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-[#050F2A] leading-tight">
                    {headline}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    {subtext}
                  </p>
                </div>

                {/* QR Code Container with Corner Brackets */}
                <div className="relative p-2 bg-white flex items-center justify-center">
                  <QrCornerBrackets color={badgeColor} />
                  <div className="p-1 bg-white">
                    <QRCodeSVG
                      value={qrUrl}
                      size={128}
                      level="H"
                      includeMargin={false}
                      fgColor="#050F2A"
                      bgColor="#FFFFFF"
                    />
                  </div>
                </div>

                {/* 3 Step Guide */}
                <QrActionGuide textColor="#050F2A" />

                {/* Table Badge */}
                <div className="pt-0.5">
                  <div
                    className="px-6 py-1.5 rounded-full font-black text-xs tracking-wider uppercase text-white shadow-sm inline-block"
                    style={{ backgroundColor: badgeColor }}
                  >
                    {tableBadge}
                  </div>
                </div>

                {/* Sweet Message */}
                {sweetMsg && (
                  <div className="text-[10px] text-zinc-500 italic">
                    {sweetMsg}
                  </div>
                )}

                {/* Footer: Powered by menyo.org */}
                <div className="text-[9px] text-zinc-400 tracking-wider">
                  Powered by <span className="font-semibold text-[#050F2A]">menyo.org</span>
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
