import React from "react";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { formatRupees } from "../../lib/utils";

interface StickyCartBarProps {
  itemCount: number;
  totalMinor: number;
  onClick: () => void;
}

export const StickyCartBar: React.FC<StickyCartBarProps> = ({
  itemCount,
  totalMinor,
  onClick,
}) => {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 md:bottom-6 inset-x-0 z-40 px-4 max-w-md md:max-w-lg lg:max-w-xl mx-auto pointer-events-none">
      <button
        onClick={onClick}
        className="pointer-events-auto w-full bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08] p-3.5 md:p-4 px-4 md:px-5 rounded-2xl shadow-warm-xl border border-[#C99532]/50 flex items-center justify-between transition-all duration-300 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-[#E8B64F] flex items-center justify-center font-bold text-xs shadow-warm">
            <ShoppingBag className="w-4 h-4 text-[#E8B64F]" />
          </div>
          <span className="font-extrabold text-sm text-[#1A0F08]">
            View order • {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#1A0F08] font-black text-sm">
          <span>{formatRupees(totalMinor)}</span>
          <ChevronRight className="w-4 h-4 text-[#1A0F08] group-hover:translate-x-0.5 transition" />
        </div>
      </button>
    </div>
  );
};
