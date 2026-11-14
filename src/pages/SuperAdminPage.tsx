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
  Trash2,
} from "lucide-react";
import { platformApi } from "../lib/apiClient";
import { auth, signOut } from "../lib/supabase";
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
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformPublicConfig | null>(null);

  const [activeTab, setActiveTab] = useState<"businesses" | "users" | "purchases">("businesses");

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
      setUsers(dash.users || []);
      setPayments(dash.payments || []);
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
      if (b.effectiveStatus === "ARCHIVED") {
        return false;
      }
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

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return users;
    return users.filter(
      (u) =>
        (u.displayName || "").toLowerCase().includes(query) ||
        (u.email || "").toLowerCase().includes(query) ||
        (u.username || "").toLowerCase().includes(query) ||
        (u.businessName || "").toLowerCase().includes(query) ||
        (u.role || "").toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return payments;
    return payments.filter(
      (p) =>
        (p.businessName || "").toLowerCase().includes(query) ||
        (p.reference || "").toLowerCase().includes(query) ||
        (p.packageId || "").toLowerCase().includes(query) ||
        (p.paymentMethod || "").toLowerCase().includes(query)
    );
  }, [payments, searchQuery]);

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
    if (!window.confirm(`Permanently delete "${b.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await platformApi.deleteBusiness(b.id);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete business.");
    }
  };

  const handleDeleteUser = async (u: { uid: string; displayName?: string; email?: string }) => {
    if (!window.confirm(`Permanently delete user "${u.displayName || u.email || u.uid}"? This cannot be undone.`)) {
      return;
    }
    try {
      await platformApi.deleteUserProfile(u.uid);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete user profile.");
    }
  };

  const handleResetPayments = async () => {
    if (!window.confirm("Reset all recorded payments to Rs. 0? This cannot be undone.")) {
      return;
    }
    try {
      await platformApi.resetAllPayments();
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to reset payments.");
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#1D1D1F] flex selection:bg-[#0071E3] selection:text-white">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between bg-white border-r border-black/[0.06] p-4 sticky top-0 h-screen shrink-0">
        <div className="space-y-6">
          <div className="px-2 pt-2 pb-1">
            <MenyoLogo variant="dark" size="lg" />
          </div>

          <div className="space-y-1.5">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#86868B] block mb-2">
              Workspace
            </span>
            <button
              onClick={() => setActiveTab("businesses")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-[13px] font-bold transition ${
                activeTab === "businesses"
                  ? "bg-[#0071E3]/10 text-[#0071E3]"
                  : "text-[#1D1D1F]/80 hover:bg-black/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                Restaurants
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.05] text-[#1D1D1F]">
                {filteredBusinesses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-[13px] font-bold transition ${
                activeTab === "users"
                  ? "bg-[#0071E3]/10 text-[#0071E3]"
                  : "text-[#1D1D1F]/80 hover:bg-black/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                Users &amp; Accounts
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.05] text-[#1D1D1F]">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("purchases")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-[13px] font-bold transition ${
                activeTab === "purchases"
                  ? "bg-[#0071E3]/10 text-[#0071E3]"
                  : "text-[#1D1D1F]/80 hover:bg-black/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                Purchases &amp; Revenue
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/[0.05] text-[#1D1D1F]">
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setShowPackagesModal(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[13px] font-bold text-[#1D1D1F]/80 hover:bg-black/[0.04] transition"
            >
              <Settings className="w-4 h-4" />
              Packages &amp; Settings
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between px-2">
          <div>
            <p className="text-xs font-bold text-[#1D1D1F]">Super Admin</p>
            <p className="text-[11px] text-[#86868B]">@{currentUsername}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Breadcrumb Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#86868B]">Workspace</span>
            <span className="text-[#86868B]">/</span>
            <span className="font-semibold text-[#1D1D1F]">
              {activeTab === "businesses" ? "Overview" : activeTab === "users" ? "Users & Accounts" : "Purchases & Revenue"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPayments}
              className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold transition"
            >
              Reset Payments
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-1.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add business</span>
            </button>
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

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#050F2A]/10 pb-3">
          <button
            onClick={() => setActiveTab("businesses")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "businesses"
                ? "bg-[#050F2A] text-white shadow-sm"
                : "bg-white text-[#050F2A]/70 hover:bg-[#050F2A]/5 border border-[#050F2A]/10"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Restaurants & Tenants</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "businesses" ? "bg-white/20 text-white" : "bg-[#050F2A]/10 text-[#050F2A]"}`}>
              {businesses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-[#050F2A] text-white shadow-sm"
                : "bg-white text-[#050F2A]/70 hover:bg-[#050F2A]/5 border border-[#050F2A]/10"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Logged-In Users & Accounts</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "users" ? "bg-white/20 text-white" : "bg-[#050F2A]/10 text-[#050F2A]"}`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("purchases")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "purchases"
                ? "bg-[#050F2A] text-white shadow-sm"
                : "bg-white text-[#050F2A]/70 hover:bg-[#050F2A]/5 border border-[#050F2A]/10"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Purchases & Revenue</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "purchases" ? "bg-white/20 text-white" : "bg-[#050F2A]/10 text-[#050F2A]"}`}>
              {payments.length}
            </span>
          </button>
        </div>

        {/* Businesses Table Card */}
        {activeTab === "businesses" && (
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

                          <button
                            onClick={() => handleArchive(b)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-all shadow-sm"
                            title="Remove / Archive Business"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* Users & Accounts Tab */}
        {activeTab === "users" && (
          <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
                  Logged-In Users & Accounts
                </h2>
                <p className="text-xs text-[#050F2A]/60">
                  All registered owners, staff, and platform accounts across Menyo
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#050F2A]/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user, email, business..."
                    className="bg-[#F2FDFF]/60 border border-[#050F2A]/15 rounded-xl pl-9 pr-4 py-2 text-xs text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] w-48 sm:w-64"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-[#F2FDFF] hover:bg-[#7BBBFF]/20 border border-[#050F2A]/15 text-[#050F2A] transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#050F2A]/10 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F2FDFF] text-[#050F2A]/70 border-b border-[#050F2A]/10 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Email / Contact</th>
                    <th className="px-4 py-3.5">Username</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Linked Restaurant</th>
                    <th className="px-4 py-3.5">Joined</th>
                    <th className="px-4 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#050F2A]/10 text-[#050F2A]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[#050F2A]/50">
                        No user accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-[#F2FDFF]/60 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-[#050F2A]">
                          {u.displayName}
                        </td>
                        <td className="px-4 py-3.5 text-[#050F2A]/80">
                          {u.email || u.phone || "—"}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#050F2A]/70">
                          @{u.username || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.role === "SUPER_ADMIN"
                              ? "bg-purple-500/10 text-purple-700 border-purple-500/20"
                              : "bg-[#7BBBFF]/15 text-[#050F2A] border-[#7BBBFF]/30"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#050F2A]">
                          {u.businessName}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#050F2A]/60">
                          {u.createdAtMs ? new Date(u.createdAtMs).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.active !== false
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
                                : "bg-rose-500/15 text-rose-700 border-rose-500/25"
                            }`}>
                              {u.active !== false ? "ACTIVE" : "DISABLED"}
                            </span>
                            {u.role !== "SUPER_ADMIN" && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-all shadow-sm"
                                title="Permanently Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchases & Revenue Tab */}
        {activeTab === "purchases" && (
          <div className="bg-white border border-[#050F2A]/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#050F2A]">
                  Subscription Purchases & Revenue
                </h2>
                <p className="text-xs text-[#050F2A]/60">
                  Complete log of plan renewals, activations, and payment references
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#050F2A]/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search business, reference..."
                    className="bg-[#F2FDFF]/60 border border-[#050F2A]/15 rounded-xl pl-9 pr-4 py-2 text-xs text-[#050F2A] placeholder-[#050F2A]/40 focus:outline-none focus:border-[#7BBBFF] w-48 sm:w-64"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-[#F2FDFF] hover:bg-[#7BBBFF]/20 border border-[#050F2A]/15 text-[#050F2A] transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#050F2A]/10 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F2FDFF] text-[#050F2A]/70 border-b border-[#050F2A]/10 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Restaurant</th>
                    <th className="px-4 py-3.5">Package</th>
                    <th className="px-4 py-3.5">Method</th>
                    <th className="px-4 py-3.5">Reference / Key</th>
                    <th className="px-4 py-3.5">Notes</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#050F2A]/10 text-[#050F2A]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[#050F2A]/50">
                        No purchase records found yet. Renewals and new paid signups will appear here.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F2FDFF]/60 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#050F2A]/70">
                          {p.dateColombo || "—"}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-[#050F2A]">
                          {p.businessName}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-full bg-[#7BBBFF]/20 border border-[#7BBBFF]/40 text-[#050F2A] font-bold text-[10px] uppercase">
                            {p.packageId}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[#050F2A]/80 font-medium">
                          {p.paymentMethod}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-[#050F2A]/70">
                          {p.reference || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-[#050F2A]/60 max-w-xs truncate">
                          {p.notes || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                          Rs. {(p.amountRupees || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
    </div>
  );
};
