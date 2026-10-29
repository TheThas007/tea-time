import React, { useState, useMemo } from "react";
import {
  X,
  Building2,
  User,
  Key,
  Calendar,
  CreditCard,
  Palette,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { PackageId, PaymentMethod, SubscriptionPackage } from "../../types";
import { platformApi } from "../../lib/apiClient";
import {
  computeInitialSubscriptionWindow,
  getColomboDateString,
} from "../../shared/subscriptionMath";
import {
  validateBusinessSlug,
  validateUsername,
  validatePasswordStrength,
  validateHexColor,
  MENYO_DEFAULT_THEME,
} from "../../shared/constants";

interface Props {
  packages: SubscriptionPackage[];
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export const AddBusinessModal: React.FC<Props> = ({ packages, onClose, onSuccess }) => {
  const todayColombo = getColomboDateString();

  // Business info
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [username, setUsername] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "A1!";
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  });
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState(MENYO_DEFAULT_THEME.primaryColor);
  const [accentColor, setAccentColor] = useState(MENYO_DEFAULT_THEME.accentColor);
  const [backgroundColor, setBackgroundColor] = useState(MENYO_DEFAULT_THEME.backgroundColor);
  const [textColor, setTextColor] = useState(MENYO_DEFAULT_THEME.textColor);
  const [headerBackgroundColor, setHeaderBackgroundColor] = useState(MENYO_DEFAULT_THEME.headerBackgroundColor);
  const [headerTextColor, setHeaderTextColor] = useState(MENYO_DEFAULT_THEME.headerTextColor);

  // Package & Billing
  const [packageId, setPackageId] = useState<PackageId>("6_months");
  const [activationDate, setActivationDate] = useState(todayColombo);
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentDate, setPaymentDate] = useState(todayColombo);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug and username from name
  const handleNameChange = (val: string) => {
    setBusinessName(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 32);
    setSlug(generatedSlug);
    if (!username || username === slug) {
      setUsername(generatedSlug);
    }
  };

  // Generate secure temporary password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    pwd += "A1!"; // ensure meets requirement
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(pwd);
  };

  // Update package and default price
  const handlePackageChange = (pId: PackageId) => {
    setPackageId(pId);
    const found = packages.find((p) => p.id === pId);
    if (found) {
      setPaymentAmount(found.priceRupees);
    }
  };

  // Expiry preview
  const expiryPreview = useMemo(() => {
    try {
      const windowCalc = computeInitialSubscriptionWindow(packageId, activationDate);
      if (windowCalc.isLifetime) {
        return "Lifetime (No expiry date)";
      }
      return `${windowCalc.expiryDateColombo} (Closes end-of-day Asia/Colombo)`;
    } catch {
      return "Invalid activation date format (YYYY-MM-DD required)";
    }
  }, [packageId, activationDate]);

  const slugValidation = validateBusinessSlug(slug);
  const usernameValidation = validateUsername(username);
  const passwordValidation = temporaryPassword
    ? validatePasswordStrength(temporaryPassword)
    : { valid: false, error: "Temporary password required" };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!slugValidation.valid) {
      setError(slugValidation.error || "Invalid business slug.");
      return;
    }
    if (!usernameValidation.valid) {
      setError(usernameValidation.error || "Invalid username.");
      return;
    }
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Weak temporary password.");
      return;
    }
    if (!validateHexColor(primaryColor) || !validateHexColor(accentColor)) {
      setError("Please provide valid 6-character hex colors (e.g. #7BBBFF).");
      return;
    }

    setLoading(true);
    try {
      const res = await platformApi.createBusinessWithOwner({
        businessName: businessName.trim(),
        businessSlug: slug.trim(),
        ownerName: ownerName.trim(),
        username: username.trim(),
        ownerEmail: ownerEmail.trim(),
        temporaryPassword,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        address: address.trim() || undefined,
        branding: {
          logoUrl: logoUrl.trim() || undefined,
          primaryColor,
          accentColor,
          backgroundColor,
          textColor,
          headerBackgroundColor,
          headerTextColor,
        },
        packageId,
        activationDateColombo: activationDate,
        paymentAmountRupees: paymentAmount,
        paymentDateColombo: paymentDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paymentNote: paymentNote.trim() || undefined,
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err?.message || "Failed to create business workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050F2A]/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#050F2A]/10 rounded-3xl w-full max-w-3xl my-8 p-6 sm:p-8 shadow-2xl text-[#050F2A] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#050F2A]/50 hover:text-[#050F2A] hover:bg-[#F2FDFF] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#7BBBFF]/20 border border-[#7BBBFF]/30 flex items-center justify-center text-[#050F2A]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
              Onboard New Restaurant
            </h2>
            <p className="text-xs text-[#050F2A]/60">
              Provision workspace, owner account credentials, branding, and manual payment
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
          {/* Section 1: Business Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] border-b border-[#050F2A]/10 pb-2">
              1. Restaurant Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="e.g. Royal Cafe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  URL Slug * (e.g. /{slug || "slug"}/menu)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF] font-mono"
                  placeholder="royalcafe"
                  required
                />
                {!slugValidation.valid && slug.length > 0 && (
                  <p className="text-[11px] text-red-500 mt-1">{slugValidation.error}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="0771234567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="0771234567"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="Vavuniya, Sri Lanka"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner Credentials */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] border-b border-[#050F2A]/10 pb-2">
              2. Owner Account Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Unique Username * (for sign-in)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF] font-mono"
                  placeholder="royal_owner"
                  required
                />
                {!usernameValidation.valid && username.length > 0 && (
                  <p className="text-[11px] text-red-500 mt-1">{usernameValidation.error}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Owner Email *</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="owner@domain.com"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#050F2A]/70">Temporary Password *</label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] text-[#050F2A] hover:text-[#7BBBFF] font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF] font-mono"
                  placeholder="Auto-generate or type"
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-[#050F2A]/60 italic">
              Note: The owner will be forced to change this temporary password upon their first login.
            </p>
          </div>

          {/* Section 3: Branding & Appearance */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] border-b border-[#050F2A]/10 pb-2">
              3. Branding & Colors
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3 py-2 text-[#050F2A] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3 py-2 text-[#050F2A] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Package & Initial Payment */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#050F2A] border-b border-[#050F2A]/10 pb-2">
              4. Subscription Package & Initial Manual Payment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Package *</label>
                <select
                  value={packageId}
                  onChange={(e) => handlePackageChange(e.target.value as PackageId)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — Rs. {pkg.priceRupees.toLocaleString()}{" "}
                      (≈ ${Math.round(pkg.priceRupees / 300)} USD){" "}
                      {pkg.isPopular ? "(Most Popular)" : ""}
                      {pkg.isLegacy ? "(Legacy)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Activation Date (Colombo) *
                </label>
                <input
                  type="date"
                  value={activationDate}
                  onChange={(e) => setActivationDate(e.target.value)}
                  className="w-full bg-[#F2FDFF]/50 border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                  Calculated Expiry
                </label>
                <div className="w-full bg-[#F2FDFF] border border-[#050F2A]/10 rounded-xl px-3.5 py-2 text-[#050F2A]/80 text-xs font-semibold truncate flex items-center h-[38px]">
                  {expiryPreview}
                </div>
              </div>
            </div>

            <div className="bg-[#F2FDFF] p-4 rounded-2xl border border-[#050F2A]/10 space-y-4">
              <div className="text-xs font-bold text-[#050F2A] uppercase tracking-wider">
                Initial Payment Record (Offline / Direct Transfer)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                    Amount Collected (LKR) *
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm font-mono focus:outline-none focus:border-[#7BBBFF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                    Payment Date (Colombo) *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
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
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] text-sm focus:outline-none focus:border-[#7BBBFF]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD_MANUAL">Card (Manual)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">
                    Payment Reference / Bank Slip No.
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                    placeholder="e.g. BOC-TXN-98234"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#050F2A]/70 mb-1">Optional Note</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full bg-white border border-[#050F2A]/15 rounded-xl px-3.5 py-2 text-[#050F2A] placeholder-[#050F2A]/40 text-sm focus:outline-none focus:border-[#7BBBFF]"
                    placeholder="e.g. Paid in full via direct deposit"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#050F2A]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F2FDFF] border border-[#050F2A]/15 text-[#050F2A]/70 hover:text-[#050F2A] text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#7BBBFF] hover:bg-[#68a8f5] active:scale-95 text-[#050F2A] font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#7BBBFF]/20 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Provisioning..." : "Create & Activate Business"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
