import React from "react";

interface MenyoIconProps {
  size?: number;
  className?: string;
}

/**
 * Approved Menyo platform icon:
 * A crisp round navy (#050F2A) emblem enclosing modern stylized spoon & fork
 * with smooth swoosh border curves.
 */
export const MenyoIcon: React.FC<MenyoIconProps> = ({ size = 36, className = "" }) => {
  return (
    <img
      src="/assets/menyo-icon.png"
      alt="Menyo Icon"
      width={size}
      height={size}
      className={`shrink-0 rounded-full select-none object-contain ${className}`}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
};

interface MenyoWordmarkProps {
  variant?: "dark" | "light"; // "dark" = navy text for light bg; "light" = white text for navy bg
  height?: number;
  className?: string;
}

/**
 * Approved Menyo brand wordmark:
 * Custom typography with stylized negative-space fork in 'y' and plate crescent in 'o'.
 */
export const MenyoWordmark: React.FC<MenyoWordmarkProps> = ({
  variant = "dark",
  height = 24,
  className = "",
}) => {
  const isLight = variant === "light";
  const src = isLight ? "/assets/menyo-wordmark-light.png" : "/assets/menyo-wordmark.png";
  // Aspect ratio is 683 / 205 ≈ 3.33
  const width = Math.round(height * (683 / 205));

  return (
    <img
      src={src}
      alt="Menyo"
      width={width}
      height={height}
      className={`object-contain select-none block shrink-0 ${className}`}
      style={{ height: `${height}px`, width: `${width}px` }}
      loading="eager"
    />
  );
};

interface MenyoLogoProps {
  variant?: "dark" | "light"; // "dark" = for light background; "light" = for navy background
  size?: "sm" | "md" | "lg" | "xl";
  showAttribution?: boolean;
  showTagline?: boolean;
  className?: string;
}

/**
 * Menyo — by AEVONIX
 * The official platform wordmark with round icon and attribution.
 */
export const MenyoLogo: React.FC<MenyoLogoProps> = ({
  variant = "dark",
  size = "md",
  showAttribution = true,
  showTagline = false,
  className = "",
}) => {
  const isLight = variant === "light";
  const attrColor = isLight ? "text-[#7BBBFF]" : "text-[#050F2A]/60";

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 52,
  };

  const wordmarkHeights = {
    sm: 18,
    md: 24,
    lg: 30,
    xl: 38,
  };

  const attrSizes = {
    sm: "text-[9px] tracking-[0.14em]",
    md: "text-[11px] tracking-[0.16em]",
    lg: "text-xs tracking-[0.18em]",
    xl: "text-sm tracking-[0.2em]",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <MenyoIcon size={iconSizes[size]} />
      <div className="flex flex-col leading-none">
        <MenyoWordmark variant={variant} height={wordmarkHeights[size]} />
        {showAttribution && (
          <div className={`font-semibold uppercase ${attrSizes[size]} ${attrColor} mt-1.5`}>
            by AEVONIX
          </div>
        )}
        {showTagline && (
          <div className="text-xs font-medium text-[#7BBBFF] mt-1 tracking-wide">
            Your Menu. One Scan.
          </div>
        )}
      </div>
    </div>
  );
};
