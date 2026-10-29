import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X } from "lucide-react";
import { TableItem } from "../../types";
import { Logo } from "../common/Logo";

interface SingleProps {
  businessName: string;
  businessSlug: string;
  table: TableItem;
  primaryColor?: string;
  accentColor?: string;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  logoUrl?: string | null;
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  onClose: () => void;
}

export const SingleTablePrintModal: React.FC<SingleProps> = ({
  businessName,
  businessSlug,
  table,
  primaryColor = "#2C190E",
  accentColor = "#E8B64F",
  headerBackgroundColor = "#2C190E",
  headerTextColor = "#FFFCF6",
  logoUrl,
  qrHeaderTitle,
  qrSubtitle = "SCAN TO ORDER",
  qrFooterNote = "It's time for you!",
  onClose,
}) => {
  const origin = window.location.origin;
  const qrUrl = `${origin}/${businessSlug}/menu?table=${table.token}`;

  const handlePrint = () => {
    window.print();
  };

  const isTeaTime = businessSlug === "teatime";
  const cardBg = isTeaTime ? "#2C190E" : (headerBackgroundColor || primaryColor || "#050F2A");
  const cardTextColor = isTeaTime ? "#FFFCF6" : (headerTextColor || "#FFFCF6");
  const cardAccent = isTeaTime ? "#E8B64F" : (accentColor || "#7BBBFF");

  return (
    <div className="fixed inset-0 z-50 bg-[#2C190E]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: 4in 6in;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card-exact {
            width: 3.8in !important;
            height: 5.75in !important;
            border-radius: 24px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-[#FAF7F0] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-[#DFC9AC] flex flex-col print:border-0 print:shadow-none print:w-full print:max-w-none print:bg-transparent print-page-wrapper">
        {/* Modal Header */}
        <div className="bg-[#2C190E] text-[#FFFCF6] px-5 py-3.5 flex items-center justify-between border-b border-[#4A290F] print-hidden">
          <h3 className="font-extrabold text-sm tracking-tight text-[#FFFCF6]">
            Printable Table QR Card: {table.tableNumber}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8A6A53] hover:text-[#FFFCF6] hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Preview Container - exact 4x6" cardstock size */}
        <div className="p-6 sm:p-8 bg-[#FAF7F0] flex items-center justify-center print:p-0 print:m-0 print:bg-transparent">
          {/* Cardstock Tent Card */}
          <div
            id="printable-tent-card"
            className="w-64 sm:w-72 rounded-[28px] p-6 pt-7 pb-6 shadow-2xl flex flex-col items-center text-center space-y-4 border transition-transform print-card-exact"
            style={{
              backgroundColor: cardBg,
              color: cardTextColor,
              borderColor: cardAccent,
            }}
          >
            {/* Large Stacked Brand Logo */}
            <div className="pt-1 pb-1 flex flex-col items-center justify-center">
              {logoUrl && !logoUrl.includes("logo-horizontal") ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="h-28 sm:h-32 max-h-36 max-w-[210px] w-auto object-contain select-none drop-shadow-md"
                />
              ) : isTeaTime ? (
                <img
                  src="/assets/logo.png"
                  alt="TEA TIME"
                  className="w-48 sm:w-52 h-auto object-contain select-none drop-shadow-md"
                />
              ) : (
                <div
                  className="text-2xl font-black tracking-wider uppercase"
                  style={{ color: cardAccent }}
                >
                  {businessName}
                </div>
              )}
            </div>

            {/* QR Code in Soft Ivory Container */}
            <div className="bg-[#FFFCF6] p-3.5 rounded-2xl shadow-xl border border-[#DFC9AC]/60">
              <QRCodeSVG
                value={qrUrl}
                size={148}
                level="H"
                includeMargin={false}
                fgColor={isTeaTime ? "#2C190E" : (primaryColor || "#2C190E")}
                bgColor="#FFFCF6"
              />
            </div>

            {/* Table Details */}
            <div className="space-y-0.5">
              <h4
                className="text-2xl font-black tracking-wide"
                style={{ color: cardTextColor }}
              >
                {table.tableNumber}
              </h4>
              <p
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: cardAccent }}
              >
                {qrSubtitle || "SCAN TO ORDER"}
              </p>
            </div>

            {/* Footer Slogan / Tagline with Divider Line */}
            <div
              className="pt-3 border-t border-[#E8B64F]/50 w-full text-xs italic tracking-wide"
              style={{
                color: `${cardTextColor}EE`,
              }}
            >
              <span>
                {!qrFooterNote || qrFooterNote.includes("Good tea brings people together")
                  ? (isTeaTime ? "It's time for you!" : (qrFooterNote || "Enjoy your visit!"))
                  : qrFooterNote}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#FFFCF6] border-t border-[#DFC9AC] flex items-center justify-between text-xs print-hidden">
          <span className="text-[#8A6A53] font-medium text-[11px] sm:text-xs">
            Print on 4×6" cardstock or table stand
          </span>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-warm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <Printer className="w-4 h-4 text-[#E8B64F]" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] font-bold hover:bg-[#DFC9AC]/30 transition active:scale-95"
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
  logoUrl?: string | null;
  qrHeaderTitle?: string;
  qrSubtitle?: string;
  qrFooterNote?: string;
  onClose: () => void;
}

export const BatchTablesPrintModal: React.FC<BatchProps> = ({
  businessName,
  businessSlug,
  tables,
  primaryColor = "#2C190E",
  accentColor = "#E8B64F",
  headerBackgroundColor = "#2C190E",
  headerTextColor = "#FFFCF6",
  logoUrl,
  qrHeaderTitle,
  qrSubtitle = "SCAN TO ORDER",
  qrFooterNote = "It's time for you!",
  onClose,
}) => {
  const origin = window.location.origin;

  const handlePrint = () => {
    window.print();
  };

  const isTeaTime = businessSlug === "teatime";
  const cardBg = headerBackgroundColor || primaryColor || (isTeaTime ? "#2C190E" : "#050F2A");
  const cardTextColor = headerTextColor || "#FFFCF6";
  const cardAccent = accentColor || (isTeaTime ? "#E8B64F" : "#7BBBFF");

  return (
    <div className="fixed inset-0 z-50 bg-[#2C190E]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-[#FAF7F0] rounded-3xl shadow-2xl max-w-5xl w-full p-6 sm:p-8 border border-[#DFC9AC] text-[#301C10] flex flex-col print:border-0 print:shadow-none print:p-0 print:bg-transparent">
        <div className="flex items-center justify-between pb-4 border-b border-[#DFC9AC] print-hidden">
          <div>
            <h2 className="text-lg font-bold text-[#301C10]">Batch Table QR Cards ({tables.length} Tables)</h2>
            <p className="text-xs text-[#8A6A53]">
              Print all {tables.length} table cards in 4×6" cardstock styling
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A6A53] hover:text-[#301C10] hover:bg-[#DFC9AC]/30 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Grid */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-6 print:my-0">
          {tables.map((table) => {
            const qrUrl = `${origin}/${businessSlug}/menu?table=${table.token}`;
            return (
              <div
                key={table.id}
                className="w-full rounded-[24px] p-5 shadow-lg flex flex-col items-center text-center space-y-3.5 border print:break-inside-avoid"
                style={{
                  backgroundColor: isTeaTime ? "#2C190E" : cardBg,
                  color: isTeaTime ? "#FFFCF6" : cardTextColor,
                  borderColor: isTeaTime ? "#E8B64F" : cardAccent,
                }}
              >
                <div className="pt-1 flex flex-col items-center justify-center">
                  {logoUrl && !logoUrl.includes("logo-horizontal") ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      className="h-20 w-auto max-w-[170px] object-contain select-none drop-shadow"
                    />
                  ) : isTeaTime ? (
                    <img
                      src="/assets/logo.png"
                      alt="TEA TIME"
                      className="w-36 sm:w-40 h-auto object-contain select-none drop-shadow"
                    />
                  ) : (
                    <div
                      className="text-lg font-black tracking-wider uppercase"
                      style={{ color: cardAccent }}
                    >
                      {businessName}
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFCF6] p-3 rounded-xl shadow-md border border-[#DFC9AC]/60">
                  <QRCodeSVG
                    value={qrUrl}
                    size={120}
                    level="H"
                    includeMargin={false}
                    fgColor={isTeaTime ? "#2C190E" : (primaryColor || "#2C190E")}
                    bgColor="#FFFCF6"
                  />
                </div>

                <div className="space-y-0.5">
                  <h4
                    className="text-xl font-black tracking-wide"
                    style={{ color: isTeaTime ? "#FFFCF6" : cardTextColor }}
                  >
                    {table.tableNumber}
                  </h4>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: isTeaTime ? "#E8B64F" : cardAccent }}
                  >
                    {qrSubtitle || "SCAN TO ORDER"}
                  </p>
                </div>

                <div
                  className="pt-2.5 border-t border-[#E8B64F]/50 w-full text-[11px] italic leading-tight text-white/90"
                >
                  <span>
                    {!qrFooterNote || qrFooterNote.includes("Good tea brings people together")
                      ? (isTeaTime ? "It's time for you!" : (qrFooterNote || "Enjoy your visit!"))
                      : qrFooterNote}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#DFC9AC] print-hidden">
          <span className="text-[#8A6A53] font-medium text-xs">
            Print on standard A4 or 4×6" sheets
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-warm transition active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#E8B64F]" />
              <span>Print All Cards</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DFC9AC] bg-[#FAF7F0] text-[#301C10] font-bold hover:bg-[#DFC9AC]/30 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
