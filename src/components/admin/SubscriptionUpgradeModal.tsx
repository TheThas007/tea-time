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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-[28px] max-w-2xl w-full p-6 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-[#D2D2D7]/60 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header — Apple.com Typography */}
        <div className="text-center mb-7">
          <p className="text-[11px] font-semibold text-[#0071E3] uppercase tracking-[0.14em] mb-1.5">
            Menyo Subscription
          </p>
          <h2 className="text-2xl sm:text-[30px] font-semibold text-[#1D1D1F] tracking-[-0.025em] leading-tight">
            {isExpired ? "Reactivate your plan." : "Choose the plan that’s right for you."}
          </h2>
          <p className="text-[13px] text-[#6E6E73] mt-2 max-w-md mx-auto leading-relaxed">
            Seamless QR ordering and real-time kitchen sync for{" "}
            <span className="font-semibold text-[#1D1D1F]">{businessName}</span>.
          </p>
        </div>

        {/* Apple-style Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {DEFAULT_PACKAGES.map((pkg) => {
            const isSelected = selectedPlan === pkg.id;
            const monthlyEq = Math.round(pkg.priceDisplay / (pkg.durationMonths || 1));
            return (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedPlan(pkg.id);
                  setPaymentNotice(null);
                }}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "border-[#0071E3] ring-2 ring-[#0071E3]/20 bg-[#FBFBFD] shadow-sm"
                    : "border-[#D2D2D7] bg-white hover:border-[#86868B]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-[#6E6E73] tracking-wide uppercase">
                      {pkg.durationMonths} {pkg.durationMonths === 1 ? "Month" : "Months"}
                    </span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#0071E3] flex items-center justify-center text-white shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : pkg.isPopular ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#E8F3FF] text-[#0071E3] text-[10px] font-semibold">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <h3 className="font-semibold text-[15px] text-[#1D1D1F] tracking-tight">
                    {pkg.name}
                  </h3>

                  <div className="mt-3">
                    <div className="text-[22px] font-semibold text-[#1D1D1F] tracking-[-0.02em]">
                      Rs. {pkg.priceDisplay.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#6E6E73] mt-0.5">
                      Rs. {monthlyEq.toLocaleString()}/mo
                    </div>
                  </div>

                  {pkg.savingsDisplay && (
                    <span className="inline-block mt-2 text-[11px] font-medium text-[#008009] bg-[#E8F8EB] px-2 py-0.5 rounded-full">
                      {pkg.savingsDisplay}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#6E6E73] mt-4 leading-relaxed">
                  {pkg.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Summary Bar */}
        <div className="p-4 bg-[#F5F5F7] rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0071E3]" />
              <span className="text-[13px] font-semibold text-[#1D1D1F]">
                {activePackage.name}
              </span>
            </div>
            <p className="text-[#6E6E73] mt-0.5 text-[11px]">
              Unlimited QR orders, live kitchen display, and instant updates.
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-lg font-semibold text-[#1D1D1F] tracking-tight">
              Rs. {activePackage.priceDisplay.toLocaleString()}{" "}
              <span className="text-xs font-normal text-[#6E6E73]">LKR</span>
            </span>
          </div>
        </div>

        {paymentNotice && (
          <div className="mb-4 p-3.5 bg-[#F5F5F7] border border-[#D2D2D7] rounded-2xl flex items-center gap-2.5 text-xs text-[#1D1D1F] animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#0071E3]" />
            <span>{paymentNotice}</span>
          </div>
        )}

        {/* Apple-style Pill Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handlePayHereClick}
            className="w-full py-3.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-[14px] tracking-tight transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Continue with PayHere (Card / Frimi / Genie)</span>
          </button>

          <a
            href={`https://wa.me/94764847081?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-medium text-[14px] tracking-tight transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-[#0071E3]" />
            <span>Instant Bank Transfer via WhatsApp</span>
          </a>
        </div>

        <p className="text-center text-[11px] text-[#86868B] mt-5">
          256-bit SSL encrypted. Your account updates automatically upon verification.
        </p>
      </div>
    </div>
  );
};
