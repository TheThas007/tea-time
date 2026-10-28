import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Minus,
  Plus,
  Check,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MenuItem } from "../../types";
import { formatRupees, getProductImages } from "../../lib/utils";

interface ProductDetailModalProps {
  product: MenuItem | null;
  onClose: () => void;
  onAddToOrder: (product: MenuItem, quantity: number) => void;
  cartQuantity?: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToOrder,
  cartQuantity = 0,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  const images = getProductImages(product);

  // Reset quantity to 1 and active image to 0 whenever a new product is opened
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setActiveImageIdx(0);
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [product]);

  // Handle Escape and Left/Right arrow keys, and lock background scrolling while open
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        e.preventDefault();
        setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        e.preventDefault();
        setActiveImageIdx((prev) => (prev + 1) % images.length);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [product, onClose, images.length]);

  if (!product) return null;

  const isAvailable = product.isAvailable !== false;
  const totalPriceMinor = product.priceMinor * quantity;
  const currentImage = images[activeImageIdx] || images[0] || product.imageUrl;

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(50, prev + 1));
  };

  const handleConfirmAdd = () => {
    if (!isAvailable) return;
    onAddToOrder(product, quantity);
    onClose();
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || images.length <= 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        setActiveImageIdx((prev) => (prev + 1) % images.length);
      } else {
        setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2C190E]/75 backdrop-blur-[3px] flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      {/* Mobile-First Bottom Sheet (untouched on <768px) / iPad & Laptop 2-Column Modal (md:+) */}
      <div
        className="relative w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-[#FAF7F0] rounded-t-[28px] sm:rounded-[28px] shadow-warm-xl border-t sm:border border-[#DFC9AC]/80 max-h-[92vh] md:max-h-[84vh] flex flex-col md:grid md:grid-cols-2 md:grid-rows-[1fr_auto] overflow-hidden animate-sheetUp sm:animate-modalPop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Sheet Wrapper on mobile; display:contents on md:+ for 2-column grid */}
        <div className="overflow-y-auto flex-1 no-scrollbar md:contents">
          {/* Square (1:1) Hero Image Gallery Section */}
          <div
            className="relative aspect-square w-full md:col-start-1 md:row-start-1 md:row-span-2 md:h-full bg-[#2C190E] overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              key={currentImage}
              src={currentImage}
              alt={`${product.name} - Photo ${activeImageIdx + 1}`}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                !isAvailable ? "grayscale opacity-50" : ""
              }`}
            />

            {/* Top & Bottom soft gradients */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#2C190E]/65 via-[#2C190E]/25 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2C190E]/65 to-transparent pointer-events-none" />

            {/* Floating Mobile Grab Handle inside the image */}
            <div className="sm:hidden absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-[#FFFCF6]/80 backdrop-blur-md shadow-sm pointer-events-none" />

            {/* Category Pill Badge */}
            {product.category && (
              <div className="absolute top-4 left-4 bg-[#2C190E]/85 backdrop-blur-md text-[#E8B64F] border border-[#DFC9AC]/35 text-[11px] font-bold px-3 py-1 rounded-full shadow-warm tracking-wide">
                {product.category}
              </div>
            )}

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close product details"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#2C190E]/85 hover:bg-[#623B1B] backdrop-blur-md text-[#FFFCF6] border border-[#DFC9AC]/35 flex items-center justify-center shadow-warm-md transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Left / Right Gallery Controls when 2 or 3 images exist */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2C190E]/75 hover:bg-[#4A290F] text-[#FFFCF6] border border-[#DFC9AC]/35 flex items-center justify-center shadow-warm transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2C190E]/75 hover:bg-[#4A290F] text-[#FFFCF6] border border-[#DFC9AC]/35 flex items-center justify-center shadow-warm transition active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Square Thumbnail Strip at bottom of hero image */}
                <div className="absolute bottom-7 left-4 flex items-center gap-2 z-10">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx(idx);
                      }}
                      aria-label={`View photo ${idx + 1}`}
                      className={`w-11 h-11 aspect-square rounded-xl overflow-hidden border-2 transition-all shadow-warm ${
                        activeImageIdx === idx
                          ? "border-[#E8B64F] scale-105 ring-2 ring-[#2C190E]/60"
                          : "border-[#FFFCF6]/60 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Sold Out Overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 bg-[#2C190E]/60 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-[#2C190E] text-[#FFFCF6] border border-[#DFC9AC]/50 text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-warm-lg">
                  Sold Out
                </span>
              </div>
            )}

            {/* Already in order badge */}
            {cartQuantity > 0 && isAvailable && (
              <div className="absolute bottom-8 right-4 bg-[#E8B64F] text-[#301C10] text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-warm-md">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>{cartQuantity} in order</span>
              </div>
            )}
          </div>

          {/* Overlapping Curved Content Body on mobile; Right-column details panel on iPad/Laptop */}
          <div className="relative z-10 -mt-5 md:mt-0 md:col-start-2 md:row-start-1 bg-[#FAF7F0] rounded-t-[24px] md:rounded-none px-5 md:px-6 lg:px-7 pt-5 md:pt-6 pb-4 md:pb-5 space-y-3.5 md:space-y-4 md:overflow-y-auto">
            {/* Title + Price Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h2
                  id="product-detail-title"
                  className="text-xl md:text-2xl font-black text-[#301C10] leading-tight tracking-tight"
                >
                  {product.name}
                </h2>

                {/* Inline Preparation Status */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isAvailable ? "bg-[#E8B64F]" : "bg-red-500"
                    }`}
                  />
                  <span className="text-[11px] md:text-xs font-semibold text-[#8A6A53]">
                    {isAvailable ? "Freshly prepared to order" : "Currently unavailable"}
                  </span>
                </div>
              </div>

              {/* Clean Unit Price Badge */}
              <div className="bg-[#FFFCF6] border border-[#DFC9AC] px-3.5 py-1.5 md:px-4 md:py-2 rounded-2xl shadow-warm shrink-0 text-right">
                <span className="text-base md:text-lg font-black text-[#301C10] tracking-tight">
                  {formatRupees(product.priceMinor)}
                </span>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-[#FFFCF6] border border-[#DFC9AC]/80 rounded-2xl p-3.5 md:p-4 shadow-warm space-y-2">
              <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#8A6A53]">
                <span>About this item</span>
              </div>
              <p className="text-[13px] md:text-sm text-[#301C10]/90 leading-relaxed whitespace-pre-line">
                {product.description ||
                  "Crafted fresh with signature TEA TIME ingredients and served directly to your table."}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Footer with Safe-Area Padding */}
        <div className="md:col-start-2 md:row-start-2 px-4 md:px-6 lg:px-7 pt-3 md:py-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-[#FFFCF6] border-t border-[#DFC9AC] shrink-0">
          <div className="flex items-center gap-3">
            {/* Tactile Quantity Stepper */}
            <div
              className="h-12 flex items-center bg-[#FAF7F0] border border-[#DFC9AC] rounded-2xl p-1 shadow-warm shrink-0"
              aria-label="Quantity selector"
            >
              <button
                type="button"
                onClick={handleDecrement}
                disabled={!isAvailable || quantity <= 1}
                aria-label="Decrease quantity"
                className="w-9 h-full rounded-xl bg-[#FFFCF6] border border-[#DFC9AC]/70 flex items-center justify-center text-[#301C10] hover:bg-[#DFC9AC]/30 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.75]" />
              </button>

              <span
                className="w-9 text-center font-black text-sm text-[#301C10] select-none"
                aria-live="polite"
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={!isAvailable}
                aria-label="Increase quantity"
                className="w-9 h-full rounded-xl bg-[#FFFCF6] border border-[#DFC9AC]/70 flex items-center justify-center text-[#301C10] hover:bg-[#DFC9AC]/30 disabled:opacity-40 disabled:bg-transparent disabled:border-transparent transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
              </button>
            </div>

            {/* Primary Add to Order Button in Gold */}
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={!isAvailable}
              className={`h-12 flex-1 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-between gap-2 shadow-warm-md transition-all duration-200 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] ${
                isAvailable
                  ? "bg-[#E8B64F] hover:bg-[#d9a53d] text-[#1A0F08]"
                  : "bg-[#DFC9AC]/50 text-[#8A6A53] cursor-not-allowed"
              }`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#1A0F08] shrink-0" />
                <span className="tracking-tight">
                  {isAvailable ? "Add to order" : "Sold Out"}
                </span>
              </span>

              {isAvailable && (
                <span className="bg-[#0A0A0A] text-[#E8B64F] font-black px-3 py-1 rounded-xl text-xs shadow-sm">
                  {formatRupees(totalPriceMinor)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
