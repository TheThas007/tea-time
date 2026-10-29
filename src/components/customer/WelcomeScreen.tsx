import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

interface WelcomeScreenProps {
  onExplore: () => void;
  tableNumber?: string | null;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onExplore,
  tableNumber,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  // Lock background scroll while welcome screen is active
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleExploreClick = () => {
    if (isLeaving) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      onExplore();
      return;
    }

    setIsLeaving(true);
    setTimeout(() => {
      onExplore();
    }, 340);
  };

  return (
    <div
      role="region"
      aria-label="Welcome to TEA TIME"
      className={`fixed inset-0 z-50 min-h-[100svh] bg-[#050404] flex flex-col items-center justify-center px-6 py-4 overflow-hidden select-none transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        isLeaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Single Vertically Centred Group */}
      <div className="w-full max-w-md md:max-w-lg mx-auto flex flex-col items-center justify-center text-center motion-safe:animate-welcomeFadeIn">
        {/* Trimmed Uncropped Original Logo (~30%+ larger visible artwork) */}
        <img
          src="/assets/welcome-logo.png?v=2"
          alt="TEA TIME"
          {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
          decoding="async"
          className="w-[235px] max-w-[74vw] max-h-[48svh] sm:w-[285px] md:w-[320px] lg:w-[350px] h-auto object-contain select-none pointer-events-none"
        />

        {/* 30px (within 28–32px) spacing between Logo and Explore Our Menu Button */}
        <button
          type="button"
          onClick={handleExploreClick}
          className="mt-[30px] md:mt-9 w-[232px] md:w-[252px] max-w-[82vw] min-h-[48px] md:min-h-[52px] px-6 py-3 rounded-2xl bg-[#E8B64F] hover:bg-[#dfb04c] active:bg-[#C99532] text-[#1A0F08] font-extrabold text-[15px] md:text-base leading-none tracking-wide shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-all duration-200 motion-reduce:transition-none active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFCF6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050404]"
        >
          <span>Explore Our Menu</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
        </button>

        {/* 15px (within 14–16px) below button: 12px Light Champagne Table Label */}
        {tableNumber && (
          <p className="mt-[15px] text-[12px] leading-none font-semibold tracking-[0.14em] uppercase text-[#DFC9AC]">
            {tableNumber}
          </p>
        )}
      </div>
    </div>
  );
};
