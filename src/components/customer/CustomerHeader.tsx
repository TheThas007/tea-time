import React from "react";
import { Utensils, Clock } from "lucide-react";
import { Logo } from "../common/Logo";
import { MenyoWordmark } from "../common/MenyoLogo";

interface CustomerHeaderProps {
  tableNumber?: string | null;
  activeOrderCount?: number;
  onOpenOrderTracker?: () => void;
  brandName?: string;
  logoUrl?: string | null;
  logoHeight?: number | string;
  primaryColor?: string;
  accentColor?: string;
  isDemo?: boolean;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  tableNumber,
  activeOrderCount = 0,
  onOpenOrderTracker,
  brandName,
  logoUrl,
  logoHeight,
  primaryColor = "#050F2A",
  accentColor = "#7BBBFF",
  isDemo = false,
}) => {
  const isTeaTime =
    !isDemo &&
    (!brandName ||
      brandName.toLowerCase() === "tea time" ||
      brandName.toLowerCase() === "teatime") && !logoUrl;

  const numericLogoH = typeof logoHeight === "number"
    ? logoHeight
    : (logoHeight ? parseInt(String(logoHeight), 10) : NaN);
  const logoScale = !isNaN(numericLogoH) && numericLogoH > 0
    ? Math.min(Math.max(numericLogoH / 36, 1.0), 4.5)
    : 2.0;

  return (
    <header
      className="sticky top-0 z-30 text-white shadow-md border-b border-white/10 overflow-hidden"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-between gap-2 h-16 md:h-[72px]">
        {/* Left: Brand Logo */}
        {logoUrl ? (
          <div className="flex items-center h-full">
            <img
              src={logoUrl}
              alt={brandName || "Logo"}
              style={{
                height: "60px",
                transform: `scale(${logoScale})`,
                transformOrigin: "left center",
              }}
              className="w-auto object-contain select-none transition-transform duration-200"
            />
          </div>
        ) : isDemo ? (
          <div className="flex items-center gap-2">
            <MenyoWordmark variant="light" height={22} />
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#7BBBFF] border border-[#7BBBFF]/40">
              DEMO
            </span>
          </div>
        ) : isTeaTime ? (
          <Logo size="md" theme="dark" />
        ) : (
          <div className="flex items-center">
            <div className="font-extrabold text-lg sm:text-xl tracking-tight text-white uppercase">
              {brandName}
            </div>
          </div>
        )}

        {/* Right: Table Number badge only (Orders button moved to footer for cleaner navigation) */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 translate-y-1.5 md:translate-y-2">
          <div className="inline-flex items-center justify-center gap-1.5 h-8 md:h-9 w-[100px] sm:w-[108px] md:w-[122px] lg:w-[130px] px-2.5 md:px-3.5 rounded-md md:rounded-lg bg-[#1A1A1A] border border-white/15 text-xs md:text-[13px] font-bold leading-none text-[#FFFCF6] whitespace-nowrap">
            <Utensils
              className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
              style={{ color: isTeaTime ? "#E8B64F" : accentColor }}
            />
            <span>{tableNumber || "Scanning..."}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
