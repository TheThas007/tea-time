import React, { useState, useMemo } from "react";
import { X, Calendar, RefreshCw, AlertCircle, CreditCard, Key, Check, Copy, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { PackageId, PaymentMethod, SubscriptionPackage, SuperAdminBusinessRow } from "../../types";
import { platformApi } from "../../lib/apiClient";
import {
  computeRenewalSubscriptionWindow,
  getColomboDateString,
} from "../../shared/subscriptionMath";

interface Props {
  business: SuperAdminBusinessRow;
  packages: SubscriptionPackage[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RenewSubscriptionModal: React.FC<Props> = ({
  business,
  packages,
  onClose,
  onSuccess,
}) => {
  const isTrialOrExpired =
    business.isTrial ||
    business.packageId === "2_days_trial" ||
    business.effectiveStatus === "EXPIRED";

  // Default to 6_months (Most Popular) or the business's current package if active
  const initialPkgId: PackageId =
    business.packageId === "monthly" || business.packageId === "6_months" || business.packageId === "yearly"
      ? business.packageId
      : "6_months";

  const [packageId, setPackageId] = useState<PackageId>(initialPkgId);
  const [startDate, setStartDate] = useState(
    business.expiryDateColombo && business.effectiveStatus === "ACTIVE"
      ? business.expiryDateColombo
      : getColomboDateString()
  );

  const selectedPkg = packages.find((p) => p.id === packageId);
  const [amountRupees, setAmountRupees] = useState<number>(selectedPkg?.priceRupees || 10000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");

  // Auto-generate a clean Menyo Activation Key
  const [activationKey, setActivationKey] = useState<string>(() => {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `MENYO-ACT-${timestamp}-${randomHex}`;
  });

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state for copying WhatsApp message
  const [activatedSuccess, setActivatedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);

  const handlePackageChange = (pId: PackageId) => {
    setPackageId(pId);
    const found = packages.find((p) => p.id === pId);
    if (found) {
      setAmountRupees(found.priceRupees);
    }
  };

  const renewalPreview = useMemo(() => {
    try {
      const windowCalc = computeRenewalSubscriptionWindow(
        packageId,
        business.expiryDateColombo,
        startDate
      );
      if (windowCalc.isLifetime) {
        return "Lifetime (Permanent active status)";
      }
      return `${windowCalc.expiryDateColombo} (Closes end-of-day Asia/Colombo)`;
    } catch {
      return "Invalid date selection";
    }
  }, [packageId, business.expiryDateColombo, startDate]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activationKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const generateWhatsAppMessage = () => {
    return `Hi ${business.ownerName || "there"},
Your Menyo Digital Menu subscription for *${business.name}* is now ACTIVE! 🎉

🔑 *Activation Key:* ${activationKey}
📦 *Plan:* ${selectedPkg?.name || packageId}
📅 *Valid Until:* ${renewalPreview}
📧 *Login Email:* ${business.ownerEmail}

You can access your restaurant dashboard now:
👉 https://menyo.aevonix.lk/login

Thank you for partnering with Menyo!`;
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedWaMessage(true);
    setTimeout(() => setCopiedWaMessage(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await platformApi.renewOrChangeSubscription({
        businessId: business.id,
        packageId,
        startDateColombo: startDate,
        amountRupees,
        paymentMethod,
        reference: activationKey.trim(),
        notes: notes.trim() || undefined,
      });

      setActivatedSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to renew subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050F2A]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#050F2A]/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl text-[#050F2A] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#050F2A]/50 hover:text-[#050F2A] hover:bg-[#F2FDFF] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#7BBBFF]/20 border border-[#7BBBFF]/30 flex items-center justify-center text-[#050F2A]">
            {isTrialOrExpired ? <Key className="w-5 h-5 text-[#050F2A]" /> : <RefreshCw className="w-5 h-5 text-[#050F2A]" />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
              {isTrialOrExpired ? "Activate Subscription Key" : "Renew Subscription"}
            </h2>
            <p className="text-xs text-[#050F2A]/60">
              {isTrialOrExpired
                ? `Activate account access for `
                : `Extend access window for `}
              <span className="font-bold text-[#050F2A]">{business.name}</span>
            </p>
          </div>
        </div>

        {/* Customer Account / Login Email Box */}
        <div className="mb-5 p-3.5 bg-[#F2FDFF] border border-[#050F2A]/10 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Mail className="w-4 h-4 text-[#7BBBFF] shrink-0" />
            <div className="truncate">
              <span className="text-[11px] text-[#050F2A]/60 block font-medium">Customer Login Email:</span>
              <span className="font-mono font-bold text-[#050F2A] text-xs truncate block">{business.ownerEmail}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 border border-amber-500/30 font-bold text-[10px] uppercase shrink-0">
            {business.isTrial || business.packageId === "2_days_trial" ? "2-Day Trial" : business.effectiveStatus}
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Activated Confirmation View */}
        {activatedSuccess ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#050F2A]">Subscription Key Activated!</h3>
              <p className="text-xs text-[#050F2A]/70 mt-1">
                Account unlocked for <span className="font-bold">{business.ownerEmail}</span>. Status is now ACTIVE.
              </p>
            </div>

            <div className="p-4 bg-[#F2FDFF] rounded-2xl border border-[#050F2A]/10 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#050F2A]/60 font-medium">Activated Key:</span>
                <span className="font-mono font-black text-[#050F2A] bg-white px-2.5 py-1 rounded-lg border border-[#050F2A]/10">
                  {activationKey}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#050F2A]/60 font-medium">Plan & Expiry:</span>
                <span className="font-bold text-[#050F2A]">{selectedPkg?.name} ({renewalPreview})</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopyWhatsAppMessage}
                className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                {copiedWaMessage ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied WhatsApp Message!</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    <span>Copy WhatsApp Confirmation Message</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-full bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A] text-xs font-bold transition-all"
              >
                Close & Return to Super Admin
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Activation Key Generator Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#050F2A]/80 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#7BBBFF]" />
                  <span>Subscription Activation Key *</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="text-[11px] font-semibold text-[#7BBBFF] hover:text-[#050F2A] flex items-center gap-1 transition-colors"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <input
                type="text"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/20 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm font-mono font-bold tracking-wider focus:outline-none focus:border-[#7BBBFF]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                Select Package to Activate *
              </label>
              <select
                value={packageId}
                onChange={(e) => handlePackageChange(e.target.value as PackageId)}
                className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
              >
                {packages
                  .filter((pkg) => pkg.id !== "2_days_trial" && pkg.id !== "trial")
                  .map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — Rs. {pkg.priceRupees.toLocaleString()}{" "}
                      {pkg.isPopular ? "(Most Popular)" : ""}
                      {pkg.isLegacy ? "(Legacy)" : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Start Date (Colombo) *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Calculated Expiry Date
                </label>
                <div className="w-full bg-[#F2FDFF] border border-[#050F2A]/10 rounded-xl px-3 py-2 text-[#050F2A]/80 text-xs font-semibold truncate flex items-center h-[38px]">
                  {renewalPreview}
                </div>
              </div>
            </div>

            <div className="bg-[#F2FDFF] p-4 rounded-2xl border border-[#050F2A]/10 space-y-3">
              <div className="text-xs font-bold text-[#050F2A] uppercase tracking-wider">
                Payment Verification Record
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                    Amount Received (LKR) *
                  </label>
                  <input
                    type="number"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(Number(e.target.value))}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-sm font-mono focus:outline-none focus:border-[#7BBBFF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (WhatsApp Slip)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD_MANUAL">Card / Online Payment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Notes / WhatsApp Ref</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-[#050F2A] text-xs placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF]"
                  placeholder={`e.g. Paid via WhatsApp ref: ${business.ownerEmail}`}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]/70 hover:text-[#050F2A] text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#7BBBFF] hover:bg-[#68a8f5] active:scale-95 text-[#050F2A] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#7BBBFF]/20 flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{loading ? "Activating Key..." : isTrialOrExpired ? "Activate Subscription Key" : "Confirm & Apply Renewal"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
