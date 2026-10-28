import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  theme?: "dark" | "light";
  orientation?: "horizontal" | "vertical";
}

export const Logo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showText = true,
  orientation = "horizontal",
}) => {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const horizontalLogoSizes = {
    sm: "h-9",
    md: "h-11 sm:h-12 md:h-[52px] lg:h-[56px]",
    lg: "h-14",
    xl: "h-20",
  };

  const verticalLogoSizes = {
    sm: "w-28",
    md: "w-36",
    lg: "w-44",
    xl: "w-56",
  };

  // Vertical mode renders the complete stacked logo asset
  if (orientation === "vertical" && showText) {
    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`}>
        <img
          src="/assets/logo.png"
          alt="TEA TIME"
          className={`${verticalLogoSizes[size]} h-auto object-contain select-none`}
        />
      </div>
    );
  }

  // Horizontal navbar mode renders the uploaded horizontal TEA TIME logo asset
  if (orientation === "horizontal" && showText) {
    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <img
          src="/assets/logo-horizontal.png?v=3"
          alt="TEA TIME"
          className={`${horizontalLogoSizes[size]} w-auto object-contain select-none`}
        />
      </div>
    );
  }

  // Icon-only mode
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${iconSizes[size]} ${className}`}>
      <img
        src="/assets/logo-icon.png?v=3"
        alt="TEA TIME"
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
};
