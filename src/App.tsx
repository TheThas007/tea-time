import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { BusinessDashboardPage } from "./pages/BusinessDashboardPage";
import { CustomerMenuPage } from "./pages/CustomerMenuPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* AEVONIX SaaS Platform Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Platform Authentication & Temporary Password Flow */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage initialTab="signup" />} />

            {/* TEA TIME Dedicated Client Admin Dashboard (Original Client Dashboard) */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/teatime/admin" element={<AdminDashboardPage />} />

            {/* Business Owner Tenant Dashboard */}
            <Route path="/dashboard" element={<BusinessDashboardPage />} />
            <Route path="/:businessSlug/admin" element={<BusinessDashboardPage />} />
            <Route path="/:businessSlug/dashboard" element={<BusinessDashboardPage />} />

            {/* Platform Owner Super Admin Console */}
            <Route path="/super-admin" element={<SuperAdminPage />} />

            {/* Tenant Public Menu with slug */}
            <Route path="/:businessSlug/menu" element={<CustomerMenuPage />} />

            {/* Legacy Tea Time Backward Compatibility Routes */}
            <Route path="/menu" element={<CustomerMenuPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
