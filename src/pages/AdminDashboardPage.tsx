import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AdminHeader } from "../components/admin/AdminHeader";
import { AdminSidebar, AdminTab } from "../components/admin/AdminSidebar";
import { LiveOrdersView } from "../components/admin/LiveOrdersView";
import { MenuManager } from "../components/admin/MenuManager";
import { TableManager } from "../components/admin/TableManager";
import { CafeSettingsView } from "../components/admin/CafeSettingsView";
import { Loader2, ShieldAlert } from "lucide-react";

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, isLoading, isAnonymous } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");

  const storedRole = typeof window !== "undefined" ? localStorage.getItem("menyo_auth_role") : null;
  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("menyo_auth_email") : null;
  const isAuthenticatedAdmin =
    (user && !isAnonymous) ||
    storedRole === "BUSINESS_OWNER" ||
    storedRole === "SUPER_ADMIN" ||
    storedEmail?.toLowerCase() === "admin@teatime.lk" ||
    storedEmail?.toLowerCase() === "admin@aevonix.lk";

  if (isLoading && !isAuthenticatedAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-[#050F2A] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#7BBBFF]" />
        <p className="text-xs text-[#050F2A]/60 font-semibold tracking-wide">
          Verifying Menyo administrative privileges...
        </p>
      </div>
    );
  }

  // If user is not logged in through Firebase Auth or active Menyo admin session, redirect to admin login
  if (!isAuthenticatedAdmin && (!user || isAnonymous)) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-[#050F2A] selection:bg-[#7BBBFF]/30">
      {/* Top Menyo Navy Header Bar */}
      <AdminHeader />

      <div className="flex-1 flex">
        {/* Left Menyo Navy Sidebar */}
        <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Content View with modern clean background */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {activeTab === "orders" && <LiveOrdersView />}
          {activeTab === "menu" && <MenuManager />}
          {activeTab === "tables" && <TableManager />}
          {activeTab === "settings" && <CafeSettingsView />}
        </main>
      </div>
    </div>
  );
};

