import React, { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { updatePageSeo } from "./shared/siteSeo";

// Lazy load pages for fast initial page load and split bundles
const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SuperAdminPage = lazy(() => import("./pages/SuperAdminPage").then((m) => ({ default: m.SuperAdminPage })));
const BusinessDashboardPage = lazy(() => import("./pages/BusinessDashboardPage").then((m) => ({ default: m.BusinessDashboardPage })));
const CustomerMenuPage = lazy(() => import("./pages/CustomerMenuPage").then((m) => ({ default: m.CustomerMenuPage })));
const LegalPoliciesPage = lazy(() => import("./pages/LegalPoliciesPage").then((m) => ({ default: m.LegalPoliciesPage })));

const PageLoader = () => (
  <div className="min-h-screen bg-[#F2FDFF] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-[#050F2A]" />
  </div>
);

const RouteSeo = () => {
  const { pathname, search } = useLocation();
  useEffect(() => updatePageSeo(pathname, search), [pathname, search]);
  return null;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Menyo Menu Encountered an Error">
      <BrowserRouter>
        <RouteSeo />
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* AEVONIX SaaS Platform Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Platform Authentication & Temporary Password Flow */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<LoginPage initialTab="signup" />} />

                {/* Redirect legacy /admin to /login */}
                <Route path="/admin" element={<BusinessDashboardPage />} />
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />

                {/* Business Owner Tenant Dashboard */}
                <Route path="/dashboard" element={<BusinessDashboardPage />} />
                <Route path="/:businessSlug/admin" element={<BusinessDashboardPage />} />
                <Route path="/:businessSlug/dashboard" element={<BusinessDashboardPage />} />

                {/* Platform Owner Super Admin Console */}
                <Route path="/super-admin" element={<SuperAdminPage />} />
                <Route path="/superadmin" element={<SuperAdminPage />} />

                {/* Legal & PayHere Merchant Compliance Policies */}
                <Route path="/terms" element={<LegalPoliciesPage initialSection="terms" />} />
                <Route path="/terms-and-conditions" element={<LegalPoliciesPage initialSection="terms" />} />
                <Route path="/privacy" element={<LegalPoliciesPage initialSection="privacy" />} />
                <Route path="/privacy-policy" element={<LegalPoliciesPage initialSection="privacy" />} />
                <Route path="/refund-policy" element={<LegalPoliciesPage initialSection="refund" />} />
                <Route path="/return-policy" element={<LegalPoliciesPage initialSection="refund" />} />

                {/* Dedicated Demo Routes */}
                <Route path="/demo" element={<CustomerMenuPage isExplicitDemoRoute={true} />} />
                <Route path="/demo/menu" element={<CustomerMenuPage isExplicitDemoRoute={true} />} />

              {/* Tenant Public Menu with slug */}
              <Route path="/:businessSlug/menu" element={<CustomerMenuPage />} />

              {/* Legacy Tea Time Backward Compatibility Routes */}
              <Route path="/menu" element={<CustomerMenuPage />} />

              {/* Clean Shop-Name Root URL -> Business Admin Panel (e.g. menyo.org/teatime) */}
              <Route path="/:businessSlug" element={<BusinessDashboardPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
