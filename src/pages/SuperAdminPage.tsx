import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Plus,
  Settings,
  Search,
  Filter,
  ExternalLink,
  MoreVertical,
  LogOut,
  RefreshCw,
  Loader2,
  ShieldAlert,
  AlertCircle,
  Key,
  Shield,
  Layers,
} from "lucide-react";
import { platformApi } from "../lib/apiClient";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import {
  PackageId,
  PlatformPublicConfig,
  SubscriptionPackage,
  SuperAdminBusinessRow,
  SuperAdminMetrics,
} from "../types";
import { SuperAdminMetricsCards } from "../components/superadmin/SuperAdminMetricsCards";
import { AddBusinessModal } from "../components/superadmin/AddBusinessModal";
import { BusinessDetailsModal } from "../components/superadmin/BusinessDetailsModal";
import { RenewSubscriptionModal } from "../components/superadmin/RenewSubscriptionModal";
import { ResetOwnerModal } from "../components/superadmin/ResetOwnerModal";
import { PlatformPackagesModal } from "../components/superadmin/PlatformPackagesModal";
import { ForcePasswordChangeModal } from "../components/auth/ForcePasswordChangeModal";
import { MenyoLogo } from "../components/common/MenyoLogo";

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
  const [businesses, setBusinesses] = useState<SuperAdminBusinessRow[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformPublicConfig | null>(null);

  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [detailsBusiness, setDetailsBusiness] = useState<SuperAdminBusinessRow | null>(null);
  const [renewBusiness, setRenewBusiness] = useState<SuperAdminBusinessRow | null>(null);
  const [resetOwnerBusiness, setResetOwnerBusiness] = useState<SuperAdminBusinessRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Verify caller session
      const session = await platformApi.getSessionContext();
      if (session.claims.role !== "SUPER_ADMIN") {
        navigate("/dashboard");
        return;
      }

      setCurrentUsername(session.user.username);
      if (session.claims.mustChangePassword) {
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      // 2. Load dashboard
      const dash = await platformApi.getSuperAdminDashboard();
      setMetrics(dash.metrics);
      setBusinesses(dash.businesses);
      setPackages(dash.packages);
      setPlatformConfig(dash.platformConfig);
    } catch (err: any) {
      if (err?.code === "unauthenticated") {
        navigate("/login");
        return;
      }
      setError(err?.message || "Failed to load Super Admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("menyo_auth_role");
    localStorage.removeItem("menyo_auth_email");
    await signOut(auth).catch(() => {});
    navigate("/login");
  };

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchName = b.name.toLowerCase().includes(query);
        const matchSlug = b.slug.toLowerCase().includes(query);
        const matchOwner = b.ownerName.toLowerCase().includes(query);
        const matchEmail = b.ownerEmail.toLowerCase().includes(query);
        const matchUsername = b.ownerUsername.toLowerCase().includes(query);
        if (!matchName && !matchSlug && !matchOwner && !matchEmail && !matchUsername) {
          return false;
        }
      }

      // Package filter
      if (selectedPackageFilter !== "ALL") {
        if (b.packageId !== selectedPackageFilter) return false;
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        if (b.effectiveStatus !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [businesses, searchQuery, selectedPackageFilter, selectedStatusFilter]);

  // Actions
  const handleToggleSuspend = async (b: SuperAdminBusinessRow) => {
    const isSuspended = b.effectiveStatus === "SUSPENDED";
    const promptMsg = isSuspended
      ? `Reactivate workspace for "${b.name}"? Customer ordering will resume if subscription is valid.`
      : `Suspend workspace for "${b.name}"? Customers and owner will be blocked immediately.`;

    if (!window.confirm(promptMsg)) return;

    try {
      await platformApi.setBusinessOperationalStatus(
        b.id,
        isSuspended ? "active" : "suspended",
        isSuspended ? "Reactivated by admin" : "Suspended by admin"
      );
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update suspension status.");
    }
  };

  const handleArchive = async (b: SuperAdminBusinessRow) => {
    if (!window.confirm(`Archive "${b.name}"? This disables dashboard and customer ordering.`)) {
      return;
    }
    try {
      await platformApi.setBusinessOperationalStatus(
        b.id,
        "archived",
        "Archived by admin"
      );
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to archive business.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#7BBBFF]" />
        <span className="text-xs text-[#050F2A]/60 uppercase tracking-widest font-bold">
          Loading Menyo Super Admin...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2FDFF] text-[#050F2A] flex flex-col selection:bg-[#7BBBFF] selection:text-[#050F2A]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#050F2A] text-[#F2FDFF] shadow-md border-b border-[#050F2A]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MenyoLogo variant="light" size="md" />
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#7BBBFF]/20 text-[#7BBBFF] border border-[#7BBBFF]/30">
              Super Admin
            </span>
            <span className="hidden md:inline text-xs text-[#F2FDFF]/50">
              @{currentUsername}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPackagesModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-[#F2FDFF] flex items-center gap-1.5 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-[#7BBBFF]" />
              <span className="hidden sm:inline">Packages & Settings</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-[#7BBBFF] hover:bg-[#68a8f5] text-[#050F2A] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-[#7BBBFF]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Business</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#F2FDFF]/70 hover:text-white hover:bg-white/10 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 flex-1">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 7 Metrics Cards */}
        {metrics && <SuperAdminMetricsCards metrics={metrics} />}

        {/* Businesses Table Card */}
        <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
                Registered Restaurants
              </h2>
              <p className="text-xs text-[#050F2A]/60">
                Manage business tenants, subscriptions, credentials, and live statuses
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#050F2A]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, slug, owner..."
                  className="bg-[#F2FDFF]/60 border border-[#050F2A]/15 rounded-xl pl-9 pr-4 py-2 text-xs text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] w-48 sm:w-64"
                />
              </div>

              {/* Package Filter */}
              <select
                value={selectedPackageFilter}
                onChange={(e) => setSelectedPackageFilter(e.target.value)}
                className="bg-[#F2FDFF]/60 border border-[#050F2A]/15 rounded-xl px-3 py-2 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
              >
                <option value="ALL">All Packages</option>
                <option value="monthly">Monthly (Rs. 2,000)</option>
                <option value="6_months">6 Months (Rs. 10,000)</option>
                <option value="yearly">Yearly (Rs. 18,000)</option>
                <option value="3_months">3 Months (Legacy)</option>
                <option value="lifetime">Lifetime (Legacy)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#F2FDFF]/60 border border-[#050F2A]/15 rounded-xl px-3 py-2 text-xs text-[#050F2A] focus:outline-none focus:border-[#7BBBFF]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <button
                onClick={loadData}
                className="p-2 rounded-xl bg-[#F2FDFF] hover:bg-[#7BBBFF]/20 border border-[#050F2A]/15 text-[#050F2A] transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Business Rows Table */}
          <div className="overflow-x-auto border border-[#050F2A]/10 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2FDFF] text-[#050F2A]/70 border-b border-[#050F2A]/10 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3.5">Restaurant</th>
                  <th className="px-4 py-3.5">Owner / Account</th>
                  <th className="px-4 py-3.5">Package</th>
                  <th className="px-4 py-3.5">Activation</th>
                  <th className="px-4 py-3.5">Expiry</th>
                  <th className="px-4 py-3.5">Effective Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#050F2A]/10 text-[#050F2A]">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#050F2A]/40">
                      No businesses match your current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F2FDFF]/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-3">
                          {b.logoUrl ? (
                            <img
                              src={b.logoUrl}
                              alt={b.name}
                              className="w-8 h-8 rounded-lg object-cover bg-white border border-[#050F2A]/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#7BBBFF]/20 border border-[#7BBBFF]/30 flex items-center justify-center text-[#050F2A] font-bold text-xs">
                              {b.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-[#050F2A] block">{b.name}</span>
                            <span className="text-[11px] font-mono text-[#050F2A]/50">/{b.slug}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="block font-medium text-[#050F2A]">{b.ownerName}</span>
                        <span className="text-[11px] font-mono font-medium text-[#050F2A]/80 block">{b.ownerEmail}</span>
                        <span className="text-[10px] text-[#050F2A]/40 font-mono">@{b.ownerUsername}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        {b.isTrial || b.packageId === "2_days_trial" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                            2-Day Trial
                          </span>
                        ) : (
                          <span className="capitalize font-semibold text-[#050F2A]/80">
                            {b.packageId.replace("_", " ")}
                          </span>
                        )}
                        {b.packageId === "3_months" || b.packageId === "lifetime" ? (
                          <span className="ml-1 text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600 font-bold">
                            Legacy
                          </span>
                        ) : null}
                        {b.activationKey && (
                          <span className="text-[10px] font-mono text-[#050F2A]/50 block mt-0.5">
                            Key: {b.activationKey}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[#050F2A]/60">
                        {b.activationDateColombo}
                      </td>

                      <td className="px-4 py-3.5 font-mono">
                        {b.isLifetime ? (
                          <span className="text-emerald-700 font-semibold font-sans">Lifetime</span>
                        ) : (
                          <span
                            className={
                              b.daysRemaining !== null && b.daysRemaining <= 7
                                ? "text-amber-800 font-bold"
                                : "text-[#050F2A]/70"
                            }
                          >
                            {b.expiryDateColombo}
                            {b.daysRemaining !== null && b.daysRemaining >= 0 && (
                              <span className="text-[10px] text-[#050F2A]/50 ml-1">
                                ({b.daysRemaining}d)
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            b.effectiveStatus === "ACTIVE"
                              ? (b.isTrial || b.packageId === "2_days_trial")
                                ? "bg-amber-500/15 text-amber-800 border border-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-700 border border-emerald-500/25"
                              : b.effectiveStatus === "EXPIRED"
                              ? "bg-rose-500/15 text-rose-800 border border-rose-500/25"
                              : "bg-zinc-500/15 text-zinc-700 border border-zinc-500/25"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>
                            {b.effectiveStatus === "EXPIRED" && (b.isTrial || b.packageId === "2_days_trial")
                              ? "TRIAL EXPIRED"
                              : b.effectiveStatus}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailsBusiness(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F2FDFF] text-[#050F2A] border border-[#050F2A]/15 text-[11px] font-semibold transition-all shadow-sm"
                          >
                            Details
                          </button>

                          <a
                            href={`/${b.slug}/menu`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white hover:bg-[#F2FDFF] text-[#050F2A]/70 hover:text-[#050F2A] border border-[#050F2A]/15 text-[11px] transition-all shadow-sm"
                            title="Open Public Menu"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => setRenewBusiness(b)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                              b.isTrial || b.effectiveStatus === "EXPIRED"
                                ? "bg-[#7BBBFF] hover:bg-[#68a8f5] text-[#050F2A] shadow-sm"
                                : "bg-[#7BBBFF]/20 hover:bg-[#7BBBFF]/30 text-[#050F2A] border border-[#7BBBFF]/30"
                            }`}
                            title={b.isTrial || b.effectiveStatus === "EXPIRED" ? "Activate Subscription Key" : "Renew / Change Subscription"}
                          >
                            <Key className="w-3 h-3" />
                            <span>{b.isTrial || b.effectiveStatus === "EXPIRED" ? "Activate Key" : "Renew"}</span>
                          </button>

                          <button
                            onClick={() => setResetOwnerBusiness(b)}
                            className="p-1.5 rounded-lg bg-white hover:bg-[#F2FDFF] text-[#050F2A]/70 hover:text-[#050F2A] border border-[#050F2A]/15 transition-all shadow-sm"
                            title="Reset Owner Credentials"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleSuspend(b)}
                            className={`p-1.5 rounded-lg border text-[11px] transition-all shadow-sm ${
                              b.effectiveStatus === "SUSPENDED"
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25 hover:bg-emerald-500/25"
                                : "bg-rose-500/15 text-rose-700 border-rose-500/25 hover:bg-rose-500/25"
                            }`}
                            title={b.effectiveStatus === "SUSPENDED" ? "Reactivate Workspace" : "Suspend Workspace"}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddBusinessModal
          packages={packages}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {showPackagesModal && platformConfig && (
        <PlatformPackagesModal
          packages={packages}
          platformConfig={platformConfig}
          onClose={() => setShowPackagesModal(false)}
          onSuccess={() => {
            setShowPackagesModal(false);
            loadData();
          }}
        />
      )}

      {detailsBusiness && (
        <BusinessDetailsModal
          businessRow={detailsBusiness}
          onClose={() => setDetailsBusiness(null)}
          onRefreshList={() => loadData()}
          onOpenRenew={() => {
            const b = detailsBusiness;
            setDetailsBusiness(null);
            setRenewBusiness(b);
          }}
          onOpenResetOwner={() => {
            const b = detailsBusiness;
            setDetailsBusiness(null);
            setResetOwnerBusiness(b);
          }}
        />
      )}

      {renewBusiness && (
        <RenewSubscriptionModal
          business={renewBusiness}
          packages={packages}
          onClose={() => setRenewBusiness(null)}
          onSuccess={() => {
            setRenewBusiness(null);
            loadData();
          }}
        />
      )}

      {resetOwnerBusiness && (
        <ResetOwnerModal
          business={resetOwnerBusiness}
          onClose={() => setResetOwnerBusiness(null)}
          onSuccess={() => {
            setResetOwnerBusiness(null);
            loadData();
          }}
        />
      )}

      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSuccess={() => {
            setMustChangePassword(false);
            loadData();
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};
