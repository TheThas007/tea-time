import React, { useState } from "react";
import { X, Settings, DollarSign, Phone, AlertCircle, Save } from "lucide-react";
import { PlatformPublicConfig, SubscriptionPackage } from "../../types";
import { platformApi } from "../../lib/apiClient";

interface Props {
  packages: SubscriptionPackage[];
  platformConfig: PlatformPublicConfig;
  onClose: () => void;
  onSuccess: () => void;
}

export const PlatformPackagesModal: React.FC<Props> = ({
  packages: initialPackages,
  platformConfig: initialConfig,
  onClose,
  onSuccess,
}) => {
  const [packages, setPackages] = useState<SubscriptionPackage[]>(
    JSON.parse(JSON.stringify(initialPackages))
  );
  const [salesPhone, setSalesPhone] = useState(initialConfig?.salesContactPhone || "");
  const [salesWhatsapp, setSalesWhatsapp] = useState(initialConfig?.salesContactWhatsapp || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePriceChange = (id: string, price: number) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === id ? { ...pkg, priceRupees: price } : pkg))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await platformApi.updatePlatformPackagesAndSettings({
        packages,
        salesContactPhone: salesPhone.trim() || undefined,
        salesContactWhatsapp: salesWhatsapp.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to update platform settings.");
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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#7BBBFF]/20 border border-[#7BBBFF]/30 flex items-center justify-center text-[#050F2A]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
              Menyo Packages & Pricing
            </h2>
            <p className="text-xs text-[#050F2A]/60">
              Updates pricing and contact channels for new onboarding and renewals
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]">
              Default Package Prices (LKR)
            </label>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-3.5 bg-[#F2FDFF] border border-[#050F2A]/10 rounded-xl gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#050F2A]">{pkg.name}</span>
                    {pkg.isPopular && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#7BBBFF] text-[#050F2A] rounded-full">
                        Popular
                      </span>
                    )}
                    {pkg.isLegacy && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full">
                        Legacy
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] text-[#050F2A]/60">{pkg.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#050F2A]/60">Rs.</span>
                  <input
                    type="number"
                    value={pkg.priceRupees}
                    onChange={(e) => handlePriceChange(pkg.id, Number(e.target.value))}
                    className="w-24 bg-white border border-[#050F2A]/15 rounded-lg px-2.5 py-1.5 text-right font-mono text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  />
                  <span className="text-[11px] text-[#050F2A]/50 font-semibold whitespace-nowrap">
                    ≈ ${Math.round((pkg.priceRupees || 0) / 300)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#050F2A]">
              Platform Sales & Support Contact
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-bold text-[#050F2A]/70 mb-1">
                  Sales Phone
                </span>
                <input
                  type="text"
                  value={salesPhone}
                  onChange={(e) => setSalesPhone(e.target.value)}
                  className="w-full bg-[#F2FDFF] border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="0771234567"
                />
              </div>
              <div>
                <span className="block text-[11px] font-bold text-[#050F2A]/70 mb-1">
                  Sales WhatsApp
                </span>
                <input
                  type="text"
                  value={salesWhatsapp}
                  onChange={(e) => setSalesWhatsapp(e.target.value)}
                  className="w-full bg-[#F2FDFF] border border-[#050F2A]/15 rounded-xl px-3 py-1.5 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="0771234567"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#050F2A]/10">
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
              className="px-5 py-2 rounded-xl bg-[#7BBBFF] hover:bg-[#68a8f5] active:scale-95 text-[#050F2A] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#7BBBFF]/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Saving..." : "Save Platform Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
