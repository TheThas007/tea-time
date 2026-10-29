import React, { useState } from "react";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { platformApi } from "../../lib/apiClient";
import { validatePasswordStrength } from "../../shared/constants";

interface Props {
  onSuccess: () => void;
  onLogout: () => void;
}

export const ForcePasswordChangeModal: React.FC<Props> = ({ onSuccess, onLogout }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validation = validatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validation.valid) {
      setError(validation.error || "Password does not meet requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await platformApi.completeRequiredPasswordChange(newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#27272a] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Set Permanent Password</h2>
            <p className="text-xs text-zinc-400">First-time login security verification</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
          For account security, you must replace your temporary password before accessing your dashboard.
        </p>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {/* Password strength checklist */}
          <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a] space-y-1.5 text-xs text-zinc-400">
            <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? "text-emerald-400" : "text-zinc-500"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? "text-emerald-400" : "text-zinc-500"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>At least one uppercase letter (A-Z)</span>
            </div>
            <div className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? "text-emerald-400" : "text-zinc-500"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>At least one number (0-9)</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={submitting || !validation.valid || newPassword !== confirmPassword}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/20"
            >
              {submitting ? "Updating..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

