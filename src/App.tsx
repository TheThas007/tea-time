import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { BusinessDashboardPage } from "./pages/BusinessDashboardPage";
import { CustomerMenuPage } from "./pages/CustomerMenuPage";

export const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Menyo Menu Encountered an Error">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
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

              {/* Dedicated Tea Time Customer Menu Route */}
              <Route path="/teatime/menu" element={<CustomerMenuPage />} />

              {/* Tenant Public Menu with slug */}
              <Route path="/:businessSlug/menu" element={<CustomerMenuPage />} />

              {/* Legacy Tea Time Backward Compatibility Routes */}
              <Route path="/menu" element={<CustomerMenuPage />} />

              {/* Clean Shop-Name Root URL (e.g. menyo.org/examplecafe) */}
              <Route path="/:businessSlug" element={<CustomerMenuPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
