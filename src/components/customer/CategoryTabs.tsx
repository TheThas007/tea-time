import React, { useState } from "react";
import { Utensils, CupSoda, IceCreamCone, GlassWater, Sparkles } from "lucide-react";
import { DEFAULT_CATEGORY_ICONS } from "../../data/seedData";

export interface CategoryTabItem {
  name: string;
  iconUrl?: string;
}

interface CategoryTabsProps {
  categories: CategoryTabItem[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

function getFallbackCategoryIcon(name: string, isActive: boolean) {
  const lower = name.toLowerCase();
  const cls = `w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${isActive ? "text-[#1A0F08]" : "text-[#8A6A53]"
    }`;

  if (lower.includes("ice cream")) return <IceCreamCone className={cls} />;
  if (lower.includes("bubble") || lower.includes("milkshake")) return <CupSoda className={cls} />;
  if (lower.includes("falooda") || lower.includes("lassi") || lower.includes("mojito") || lower.includes("juice")) {
    return <GlassWater className={cls} />;
  }
  if (lower.includes("special")) return <Sparkles className={cls} />;
  return <Utensils className={cls} />;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <div className="flex items-start gap-4 md:gap-6 lg:gap-7 overflow-x-auto no-scrollbar py-2.5 md:py-3 px-1.5 md:px-2">
      {categories.map((cat) => {
        const isActive = activeCategory.toLowerCase() === cat.name.toLowerCase();
        const resolvedIcon =
          cat.iconUrl?.trim() ||
          DEFAULT_CATEGORY_ICONS[cat.name.toLowerCase()] ||
          "";
        const showImage = Boolean(resolvedIcon) && !failedImages[cat.name];

        return (
          <button
            key={cat.name}
            onClick={() => onSelectCategory(cat.name)}
            className="flex flex-col items-center gap-2 md:gap-2.5 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C99532] rounded-xl"
          >
            {/* Round Category Icon */}
            <div
              className={`w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] md:w-[82px] md:h-[82px] lg:w-[88px] lg:h-[88px] rounded-full p-0.5 transition-all duration-200 flex items-center justify-center overflow-hidden shadow-warm ${isActive
                ? "bg-[#E8B64F] ring-2 ring-[#E8B64F] scale-105 shadow-warm-md"
                : "bg-[#FFFCF6] border border-[#DFC9AC] group-hover:border-[#C99532]"
                }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#FAF7F0] flex items-center justify-center">
                {showImage ? (
                  <img
                    src={resolvedIcon}
                    alt={cat.name}
                    loading="lazy"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [cat.name]: true }))
                    }
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  getFallbackCategoryIcon(cat.name, isActive)
                )}
              </div>
            </div>

            {/* Category Name Label */}
            <span
              className={`px-3.5 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-[13px] font-bold whitespace-nowrap transition-all duration-200 shadow-warm ${isActive
                ? "bg-[#E8B64F] text-[#1A0F08] border border-[#E8B64F]"
                : "bg-[#FFFCF6] text-[#301C10] border border-[#DFC9AC] group-hover:bg-[#E8B64F]/25 group-hover:border-[#C99532]"
                }`}
            >
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
