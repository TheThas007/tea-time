import React, { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, UtensilsCrossed, QrCode, Eye, X } from "lucide-react";

interface QuickOnboardingChecklistProps {
  productsCount: number;
  tablesCount: number;
  businessSlug: string;
  onNavigateTab: (tab: "menu" | "tables") => void;
}

export const QuickOnboardingChecklist: React.FC<QuickOnboardingChecklistProps> = ({
  productsCount,
  tablesCount,
  businessSlug,
  onNavigateTab,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`menyo_dismissed_guide_${businessSlug}`) === "true";
  });

  const step1Done = productsCount >= 1;
  const step2Done = tablesCount >= 1;
  const step3Done = step1Done && step2Done;

  const completedSteps = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
  const progressPercent = Math.round((completedSteps / 3) * 100);

  // If dismissed or all steps completed, hide onboarding checklist
  if (dismissed || (step1Done && step2Done && productsCount >= 3 && tablesCount >= 3)) {
    return null;
  }

  const handleSkipGuide = () => {
    setDismissed(true);
    localStorage.setItem(`menyo_dismissed_guide_${businessSlug}`, "true");
  };

  const liveMenuUrl = `/${businessSlug}`;

  return (
    <div className="bg-white border border-[#050F2A]/15 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 animate-fadeIn relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#050F2A]/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#050F2A] text-white text-[11px] font-bold tracking-wider">
              1-Minute Launch Guide
            </span>
            <button
              onClick={handleSkipGuide}
              className="text-xs font-bold text-[#050F2A]/50 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
              title="Skip this guide"
            >
              <X className="w-3.5 h-3.5" />
              <span>Skip Guide</span>
            </button>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#050F2A] tracking-tight">
            Complete 3 steps to start accepting customer QR orders! 🚀
          </h3>
          <p className="text-xs text-[#050F2A]/60 mt-0.5">
            Follow this simple checklist to get your digital menu and table QR codes ready.
          </p>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-xs font-bold text-[#050F2A]/60 block">Setup Progress</span>
            <span className="text-sm font-black text-[#050F2A]">{progressPercent}% Completed</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#050F2A] text-white flex items-center justify-center font-black text-xs shadow-xs">
            {completedSteps}/3
          </div>
        </div>
      </div>

      {/* 3 Interactive Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Add Menu Items */}
        <div
          onClick={() => onNavigateTab("menu")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            step1Done
              ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300"
              : "bg-white border-[#050F2A]/10 hover:border-[#050F2A]/30 hover:shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#050F2A]/60">Step 1</span>
              {step1Done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-[#050F2A]/30 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-4 h-4 text-[#050F2A]" />
              <h4 className="font-bold text-sm text-[#050F2A]">Add Food / Drinks</h4>
            </div>
            <p className="text-xs text-[#050F2A]/60 leading-relaxed">
              {step1Done
                ? `Great! ${productsCount} item(s) added to menu.`
                : "Add your first food or beverage items with prices."}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#050F2A]/10 flex items-center justify-between text-xs font-bold text-[#050F2A]">
            <span>{step1Done ? "Manage Items" : "Add Items Now"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Step 2: Add Tables */}
        <div
          onClick={() => onNavigateTab("tables")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            step2Done
              ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300"
              : "bg-white border-[#050F2A]/10 hover:border-[#050F2A]/30 hover:shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#050F2A]/60">Step 2</span>
              {step2Done ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-[#050F2A]/30 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-4 h-4 text-[#050F2A]" />
              <h4 className="font-bold text-sm text-[#050F2A]">Set Up Tables & QRs</h4>
            </div>
            <p className="text-xs text-[#050F2A]/60 leading-relaxed">
              {step2Done
                ? `Ready! ${tablesCount} table(s) configured.`
                : "Add dining tables (e.g. Table 01) and download printable QR cards."}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#050F2A]/10 flex items-center justify-between text-xs font-bold text-[#050F2A]">
            <span>{step2Done ? "View Tables" : "Create Tables"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Step 3: Test Customer View */}
        <a
          href={liveMenuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
            step3Done
              ? "bg-sky-50 border-sky-200 hover:border-[#050F2A] hover:shadow-sm"
              : "bg-white border-[#050F2A]/10 opacity-80"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#050F2A]/60">Step 3</span>
              {step3Done ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Ready
                </span>
              ) : (
                <span className="text-[10px] text-[#050F2A]/50">Pending 1 & 2</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-[#050F2A]" />
              <h4 className="font-bold text-sm text-[#050F2A]">Preview Customer Menu</h4>
            </div>
            <p className="text-xs text-[#050F2A]/60 leading-relaxed">
              Open your live restaurant URL to see what customers experience when scanning QR!
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#050F2A]/10 flex items-center justify-between text-xs font-bold text-[#050F2A]">
            <span>Open Live Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </a>
      </div>
    </div>
  );
};

