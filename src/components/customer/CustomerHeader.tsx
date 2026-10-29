import React from "react";
import { Utensils, Clock } from "lucide-react";
import { Logo } from "../common/Logo";

interface CustomerHeaderProps {
  tableNumber?: string | null;
  activeOrderCount?: number;
  onOpenOrderTracker?: () => void;
  brandName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  tableNumber,
  activeOrderCount = 0,
  onOpenOrderTracker,
  brandName,
  logoUrl,
  primaryColor = "#0A0A0A",
  accentColor = "#E8B64F",
}) => {
  const isTeaTime =
    !brandName ||
    brandName.toLowerCase() === "tea time" ||
    brandName.toLowerCase() === "teatime";

  return (
    <header
      className="sticky top-0 z-30 text-[#FFFCF6] shadow-warm-md border-b border-white/10"
      style={{ backgroundColor: isTeaTime ? "#0A0A0A" : primaryColor }}
    >
      <div className="max-w-md md:max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-2 md:py-3 flex items-center justify-between gap-2">
        {/* Left: Brand Logo */}
        {isTeaTime ? (
          <Logo size="md" theme="dark" />
        ) : (
          <div className="flex items-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName || "Logo"}
                className="h-11 sm:h-12 md:h-[52px] w-auto object-contain select-none"
              />
            ) : (
              <div className="font-extrabold text-lg sm:text-xl tracking-tight text-white uppercase">
                {brandName}
              </div>
            )}
          </div>
        )}

        {/* Right: Equal-sized rectangular Orders & Table buttons aligned with the TEA TIME logo baseline */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 translate-y-1.5 md:translate-y-2">
          {activeOrderCount > 0 && onOpenOrderTracker && (
            <button
              type="button"
              onClick={onOpenOrderTracker}
              className="inline-flex items-center justify-center gap-1.5 h-8 md:h-9 w-[100px] sm:w-[108px] md:w-[122px] lg:w-[130px] px-2.5 md:px-3.5 rounded-md md:rounded-lg text-xs md:text-[13px] font-extrabold leading-none shadow-warm hover:brightness-110 transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFCF6]"
              style={{
                backgroundColor: isTeaTime ? "#E8B64F" : accentColor,
                color: "#1A0F08",
                border: `1px solid ${isTeaTime ? "#E8B64F" : accentColor}`,
              }}
              title="Track live order status"
            >
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span>
                {activeOrderCount} {activeOrderCount === 1 ? "Order" : "Orders"}
              </span>
            </button>
          )}

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
