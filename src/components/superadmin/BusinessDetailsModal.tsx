import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  ExternalLink,
  Shield,
  CreditCard,
  History,
  FileText,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  PlayCircle,
} from "lucide-react";
import { platformApi } from "../../lib/apiClient";
import { SuperAdminBusinessRow } from "../../types";

interface Props {
  businessRow: SuperAdminBusinessRow;
  onClose: () => void;
  onRefreshList: () => void;
  onOpenRenew: () => void;
  onOpenResetOwner: () => void;
}

export const BusinessDetailsModal: React.FC<Props> = ({
  businessRow,
  onClose,
  onRefreshList,
  onOpenRenew,
  onOpenResetOwner,
}) => {
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await platformApi.getBusinessDetailsForSuperAdmin(businessRow.id);
      setDetails(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load business details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [businessRow.id]);

  const handleToggleStatus = async (newStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED") => {
    const reason = window.prompt(`Enter reason for marking ${newStatus}:`, "Administrative action");
    if (reason === null) return;

    setActionLoading(true);
    try {
      await platformApi.setBusinessOperationalStatus(businessRow.id, newStatus, reason);
      await fetchDetails();
      onRefreshList();
    } catch (err: any) {
      alert(err?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121214] border border-[#27272a] rounded-3xl w-full max-w-4xl my-8 p-6 sm:p-8 shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-sm">Loading business profile & records...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#27272a]">
              <div className="flex items-center gap-4">
                {details.business?.branding?.logoUrl ? (
                  <img
                    src={details.business.branding.logoUrl}
                    alt={details.business.name}
                    className="w-14 h-14 rounded-2xl object-cover bg-black border border-[#27272a]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xl">
                    {details.business?.name?.charAt(0) || "B"}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{details.business?.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                      /{details.business?.slug}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Registered ID: <span className="font-mono text-zinc-300">{details.business?.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/${details.business?.slug}/menu`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all"
                >
                  <span>Open Public Menu</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {businessRow.status === "SUSPENDED" ? (
                  <button
                    onClick={() => handleToggleStatus("ACTIVE")}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Reactivate</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleStatus("SUSPENDED")}
                    disabled={actionLoading}
                    className="px-3.5 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Suspend</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats & status banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[11px] text-zinc-400 block mb-1">Status</span>
                <span className={`text-sm font-bold uppercase ${
                  businessRow.status === "ACTIVE" ? "text-emerald-400" :
                  businessRow.status === "EXPIRED" ? "text-amber-400" : "text-red-400"
                }`}>
                  {businessRow.status}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[11px] text-zinc-400 block mb-1">Current Package</span>
                <span className="text-sm font-bold text-white capitalize">
                  {details.access?.packageId?.replace("_", " ") || "None"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[11px] text-zinc-400 block mb-1">Active Products</span>
                <span className="text-sm font-bold text-white">
                  {details.stats?.productsCount || 0}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
                <span className="text-[11px] text-zinc-400 block mb-1">Lifetime Orders</span>
                <span className="text-sm font-bold text-white">
                  {details.stats?.ordersCount || 0}
                </span>
              </div>
            </div>

            {/* Owner & Private info */}
            <div className="bg-[#18181b] p-5 rounded-2xl border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                  <User className="w-4 h-4" />
                  <span>Owner Account</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenResetOwner}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300"
                  >
                    Reset Credentials
                  </button>
                  <span className="text-zinc-600">&bull;</span>
                  <button
                    onClick={onOpenRenew}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300"
                  >
                    Renew Subscription
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zinc-400 block mb-0.5">Username</span>
                  <span className="font-mono text-white font-semibold">{businessRow.ownerUsername}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Email</span>
                  <span className="text-white">{details.private?.ownerEmail || businessRow.ownerEmail}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-0.5">Phone</span>
                  <span className="text-white">{details.business?.phone || "Not provided"}</span>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Recorded Payments</span>
              </h3>
              {details.payments && details.payments.length > 0 ? (
                <div className="border border-[#27272a] rounded-2xl overflow-hidden divide-y divide-[#27272a]">
                  {details.payments.map((pm: any) => (
                    <div key={pm.id} className="p-3.5 bg-[#18181b] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">
                          Rs. {pm.amountRupees.toLocaleString()}{" "}
                          <span className="font-normal text-zinc-400">via {pm.paymentMethod}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Date: {pm.paymentDateColombo} &bull; Ref: {pm.reference || "None"}
                        </div>
                      </div>
                      <span className="text-emerald-400 font-semibold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {pm.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No manual payments recorded yet.</p>
              )}
            </div>

            {/* Audit Logs */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Recent Platform Audit Trail</span>
              </h3>
              {details.auditLogs && details.auditLogs.length > 0 ? (
                <div className="border border-[#27272a] rounded-2xl overflow-hidden divide-y divide-[#27272a] max-h-48 overflow-y-auto">
                  {details.auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-[#18181b] text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{log.action}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(log.performedAtMs).toLocaleString("en-US", { timeZone: "Asia/Colombo" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">By {log.performedByUsername}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No audit records for this business.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

