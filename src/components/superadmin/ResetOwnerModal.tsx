import React, { useState } from "react";
import { X, Key, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { platformApi } from "../../lib/apiClient";
import { SuperAdminBusinessRow } from "../../types";

interface Props {
  business: SuperAdminBusinessRow;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetOwnerModal: React.FC<Props> = ({ business, onClose, onSuccess }) => {
  const [newEmail, setNewEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedResult, setIssuedResult] = useState<{ temporaryPassword?: string } | null>(null);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "A1!";
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await platformApi.resetOwnerAccess({
        businessId: business.id,
        newEmail: newEmail.trim() || undefined,
        temporaryPassword: temporaryPassword.trim() || undefined,
      });
      setIssuedResult(res);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to reset owner credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121214] border border-[#27272a] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Reset Owner Access</h2>
            <p className="text-xs text-zinc-400">For {business.name} ({business.ownerUsername})</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {issuedResult ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-sm">Credentials Reset Successfully</p>
                <p className="mt-1 text-zinc-300">
                  The owner will be prompted to change this password on their next sign in.
                </p>
                {issuedResult.temporaryPassword && (
                  <div className="mt-3 p-3 bg-black/50 border border-emerald-500/30 rounded-xl font-mono text-white select-all text-center text-sm font-bold">
                    {issuedResult.temporaryPassword}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                New Owner Email (Optional)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
                placeholder="Leave blank to keep existing email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-400">
                  New Temporary Password
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-3.5 py-2 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500 font-mono"
                placeholder="Leave blank to auto-generate"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#27272a]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20"
              >
                {loading ? "Resetting..." : "Reset Credentials"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

