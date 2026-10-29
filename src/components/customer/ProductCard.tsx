import React, { useState, useEffect } from "react";
import {
  Plus,
  Check,
  Images,
  Coffee,
  CupSoda,
  IceCreamCone,
  GlassWater,
  Utensils,
} from "lucide-react";
import { MenuItem } from "../../types";
import { formatRupees, getProductImages } from "../../lib/utils";

interface ProductCardProps {
  product: MenuItem;
  onAdd: (product: MenuItem) => void;
  onSelect?: (product: MenuItem) => void;
  cartQuantity?: number;
}

function renderCategoryEmblem(categoryName: string) {
  const lower = (categoryName || "").toLowerCase();
  const iconClass = "w-7 h-7 md:w-8 md:h-8 text-[#C99532]";

  if (lower.includes("ice cream")) return <IceCreamCone className={iconClass} />;
  if (lower.includes("bubble") || lower.includes("milkshake")) return <CupSoda className={iconClass} />;
  if (lower.includes("mojito") || lower.includes("juice") || lower.includes("falooda") || lower.includes("lassi")) {
    return <GlassWater className={iconClass} />;
  }
  if (lower.includes("coffee") || lower.includes("tea")) return <Coffee className={iconClass} />;
  return <Utensils className={iconClass} />;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAdd,
  onSelect,
  cartQuantity = 0,
}) => {
  const isAvailable = product.isAvailable !== false && product.available !== false;
  const images = getProductImages(product);
  const primaryImage = images[0] || "";
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [primaryImage]);

  const showPhoto = Boolean(primaryImage) && !imgFailed;
  const resolvedPriceMinor =
    typeof product.priceMinor === "number"
      ? product.priceMinor
      : Math.round((product.price || 0) * 100);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onSelect) {
        onSelect(product);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${product.name}, ${formatRupees(resolvedPriceMinor)}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] overflow-hidden shadow-warm hover:shadow-warm-md hover:border-[#C99532]/60 transition flex flex-col justify-between group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
    >
      {/* Square (1:1) Product Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#FAF7F0] flex items-center justify-center">
        {showPhoto ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className={`w-full h-full object-contain transition duration-300 group-hover:scale-105 ${
              !isAvailable ? "grayscale opacity-50" : ""
            }`}
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#FFFCF6] to-[#F3ECE0] select-none ${
              !isAvailable ? "grayscale opacity-50" : ""
            }`}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFFCF6] border border-[#DFC9AC] shadow-warm flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-105">
              {renderCategoryEmblem(product.category)}
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8A6A53]">
              TEA TIME
            </span>
          </div>
        )}

        {/* Special Availability Badge (e.g. Wednesday Special) */}
        {product.badge && (
          <div className="absolute top-2.5 left-2.5 bg-[#2C190E]/90 backdrop-blur-sm text-[#E8B64F] border border-[#E8B64F]/45 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-warm tracking-wide">
            {product.badge}
          </div>
        )}

        {/* Sold Out Badge */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-[#2C190E]/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-[#2C190E] text-[#FFFCF6] border border-[#DFC9AC]/40 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-warm">
              Sold Out
            </span>
          </div>
        )}

        {/* In-cart indicator badge */}
        {cartQuantity > 0 && isAvailable && (
          <div className="absolute top-2.5 right-2.5 bg-[#E8B64F] text-[#301C10] text-[11px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-warm-md">
            <Check className="w-3 h-3 text-[#301C10] stroke-[3]" />
            <span>{cartQuantity}</span>
          </div>
        )}

        {/* Multi-image indicator badge when product has 2 or 3 photos */}
        {images.length > 1 && showPhoto && (
          <div className="absolute bottom-2 right-2 bg-[#2C190E]/80 backdrop-blur-sm text-[#FFFCF6] border border-[#DFC9AC]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-warm">
            <Images className="w-2.5 h-2.5 text-[#E8B64F]" />
            <span>{images.length}</span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-3 md:p-4 flex flex-col justify-between flex-grow">
        <div>
          {product.category && (
            <span className="block text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#8A6A53] mb-0.5 truncate">
              {product.category}
            </span>
          )}
          <h3 className="font-semibold text-[#301C10] text-sm md:text-base leading-snug break-words group-hover:text-[#4A290F] transition-colors">
            {product.name}
          </h3>
          {product.availabilityNote && (
            <p className="text-[10px] md:text-[11px] font-bold text-[#9A6817] mt-0.5 leading-snug">
              {product.availabilityNote}
            </p>
          )}
          {product.description && !product.availabilityNote && (
            <p className="text-[#8A6A53] text-[11px] md:text-xs line-clamp-1 md:line-clamp-2 mt-0.5 md:mt-1">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 md:mt-3.5 pt-1.5 md:pt-2.5 flex items-center justify-between gap-2 border-t border-[#DFC9AC]/60">
          <span className="font-bold text-[#301C10] text-xs sm:text-sm md:text-base whitespace-nowrap shrink-0">
            {formatRupees(resolvedPriceMinor)}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            disabled={!isAvailable}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-[13px] font-extrabold transition active:scale-95 shadow-warm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
              isAvailable
                ? "bg-[#E8B64F] text-[#1A0F08] hover:bg-[#d9a53d]"
                : "bg-[#DFC9AC]/50 text-[#8A6A53] cursor-not-allowed"
            }`}
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
