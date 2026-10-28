import React from "react";
import { Plus, Check, Images } from "lucide-react";
import { MenuItem } from "../../types";
import { formatRupees, getProductImages } from "../../lib/utils";

interface ProductCardProps {
  product: MenuItem;
  onAdd: (product: MenuItem) => void;
  onSelect?: (product: MenuItem) => void;
  cartQuantity?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAdd,
  onSelect,
  cartQuantity = 0,
}) => {
  const isAvailable = product.isAvailable !== false;
  const images = getProductImages(product);
  const primaryImage = images[0] || product.imageUrl;

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
      aria-label={`View details for ${product.name}, ${formatRupees(product.priceMinor)}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="bg-[#FFFCF6] rounded-2xl border border-[#DFC9AC] overflow-hidden shadow-warm hover:shadow-warm-md hover:border-[#C99532]/60 transition flex flex-col justify-between group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
    >
      {/* Square (1:1) Larger Product Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#FAF7F0]">
        <img
          src={primaryImage}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition duration-300 group-hover:scale-105 ${!isAvailable ? "grayscale opacity-50" : ""
            }`}
        />

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
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-[#2C190E]/80 backdrop-blur-sm text-[#FFFCF6] border border-[#DFC9AC]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-warm">
            <Images className="w-2.5 h-2.5 text-[#E8B64F]" />
            <span>{images.length}</span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-3 md:p-4 flex flex-col justify-between flex-grow">
        <div>
          <h3 className="font-semibold text-[#301C10] text-sm md:text-base line-clamp-1 leading-snug group-hover:text-[#4A290F] transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[#8A6A53] text-[11px] md:text-xs line-clamp-1 md:line-clamp-2 mt-0.5 md:mt-1">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-2.5 md:mt-3.5 pt-1.5 md:pt-2.5 flex items-center justify-between gap-2 border-t border-[#DFC9AC]/60">
          <span className="font-bold text-[#301C10] text-xs sm:text-sm md:text-base">
            {formatRupees(product.priceMinor)}
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
            className={`flex items-center justify-center gap-1 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-[13px] font-extrabold transition active:scale-95 shadow-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${isAvailable
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
