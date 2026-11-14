import React, { useState } from "react";
import { X, Check, ShieldCheck, Zap, Sparkles, CreditCard, MessageCircle, AlertCircle } from "lucide-react";
import { SubscriptionPackage } from "../../types";

interface SubscriptionUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  businessSlug: string;
  ownerEmail?: string;
  currentDaysRemaining?: number | null;
  isExpired?: boolean;
}

const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: "monthly",
    name: "Standard Monthly",
    durationMonths: 1,
    isLifetime: false,
    priceMinor: 200000,
    priceDisplay: 2000,
    priceRupees: 2000,
    currency: "LKR",
    description: "Ideal for growing cafes looking for zero-commitment monthly billing.",
    scopeNote: "1 Month Active QR Ordering",
    active: true,
    sortOrder: 1,
  },
  {
    id: "6_months",
    name: "Growth (6 Months)",
    durationMonths: 6,
    isLifetime: false,
    priceMinor: 1000000,
    priceDisplay: 10000,
    priceRupees: 10000,
    currency: "LKR",
    description: "Most popular for steady restaurants. Save Rs. 2,000 on upfront renewal.",
    scopeNote: "6 Months Active QR Ordering",
    active: true,
    sortOrder: 2,
    isPopular: true,
    savingsDisplay: "Save Rs. 2,000",
  },
  {
    id: "yearly",
    name: "Annual Business (1 Year)",
    durationMonths: 12,
    isLifetime: false,
    priceMinor: 1800000,
    priceDisplay: 18000,
    priceRupees: 18000,
    currency: "LKR",
    description: "Maximum savings for established cafes. Full priority support & QR branding.",
    scopeNote: "12 Months Active QR Ordering",
    active: true,
    sortOrder: 3,
    savingsDisplay: "Save Rs. 6,000",
  },
];

export const SubscriptionUpgradeModal: React.FC<SubscriptionUpgradeModalProps> = ({
  isOpen,
  onClose,
  businessName,
  businessSlug,
  ownerEmail,
  currentDaysRemaining,
  isExpired = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>("6_months");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePackage = DEFAULT_PACKAGES.find((p) => p.id === selectedPlan) || DEFAULT_PACKAGES[0];

  const handlePayHereClick = () => {
    // PayHere approval pending notice
    setPaymentNotice(
      "PayHere Online Card Gateway approval is currently in progress. For immediate activation, contact us on WhatsApp with 1-click!"
    );
  };

  const whatsappMessage = encodeURIComponent(
    `Hi Menyo Support! I would like to renew/upgrade "${businessName}" (Slug: ${businessSlug}, Email: ${
      ownerEmail || "N/A"
    }) to the *${activePackage.name}* (Rs. ${activePackage.priceDisplay.toLocaleString()} LKR). Please provide the payment details to activate.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFCF6] border border-[#DFC9AC] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-warm-xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#FAF7F0] hover:bg-[#DFC9AC]/40 border border-[#DFC9AC] flex items-center justify-center text-[#8A6A53] hover:text-[#301C10] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E8B64F]/20 border border-[#E8B64F]/40 text-[#4A290F] text-xs font-bold uppercase tracking-wider mb-2">
            <span>Menyo Subscription Renewal</span>
          </div>
          <h2 className="text-2xl font-black text-[#301C10] tracking-tight">
            {isExpired ? "Reactivate Your Menu Access" : "Upgrade or Renew Your Plan"}
          </h2>
          <p className="text-xs text-[#8A6A53] mt-1 max-w-md mx-auto">
            Keep your live customer QR ordering seamless, instant, and interruption-free for{" "}
            <span className="font-bold text-[#301C10]">{businessName}</span>.
          </p>
        </div>

        {/* Package Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {DEFAULT_PACKAGES.map((pkg) => {
            const isSelected = selectedPlan === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedPlan(pkg.id);
                  setPaymentNotice(null);
                }}
                className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-[#4A290F] bg-[#FAF7F0] shadow-warm"
                    : "border-[#DFC9AC]/60 bg-[#FFFCF6] hover:border-[#DFC9AC]"
                }`}
              >
                {pkg.isPopular && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#E8B64F] text-[#1A0F08] text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Popular
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#8A6A53] uppercase">{pkg.durationMonths} Mo</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#4A290F] flex items-center justify-center text-[#FFFCF6]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[#301C10]">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-black text-[#301C10]">
                      Rs. {pkg.priceDisplay.toLocaleString()}
                    </span>
                  </div>
                  {pkg.savingsDisplay && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {pkg.savingsDisplay}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8A6A53] mt-3 leading-snug">{pkg.description}</p>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary Banner */}
        <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-[#DFC9AC] mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-[#301C10]">Selected: {activePackage.name}</span>
            </div>
            <p className="text-[#8A6A53] mt-0.5 text-[11px]">
              Full Unlimited Customer Orders & Kitchen Display Realtime Access
            </p>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-[#4A290F]">
              Rs. {activePackage.priceDisplay.toLocaleString()} LKR
            </span>
          </div>
        </div>

        {paymentNotice && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{paymentNotice}</span>
          </div>
        )}

        {/* Payment Action Buttons */}
        <div className="space-y-2.5">
          {/* PayHere Direct Card Gateway (Integrated Ready) */}
          <button
            onClick={handlePayHereClick}
            className="w-full py-3.5 rounded-xl bg-[#4A290F] hover:bg-[#623B1B] text-[#FFFCF6] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-warm cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-[#E8B64F]" />
            <span>Pay Online via PayHere (Card / Frimi / Genie)</span>
          </button>

          {/* Instant WhatsApp Manual Payment Alternative */}
          <a
            href={`https://wa.me/94764847081?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageCircle className="w-4 h-4 text-white" />
            <span>Instant Bank Transfer / WhatsApp Activation</span>
          </a>
        </div>

        <p className="text-center text-[10px] text-[#8A6A53] mt-4">
          🔒 Secure 256-bit SSL encrypted. Account automatically refreshes immediately upon verification.
        </p>
      </div>
    </div>
  );
};
