import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CustomerMenuPage } from "./pages/CustomerMenuPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Root redirects to Table 07 demo menu */}
            <Route path="/" element={<Navigate to="/menu?table=tbl_07_k8j3m" replace />} />
            
            {/* Customer Digital Menu & Ordering */}
            <Route path="/menu" element={<CustomerMenuPage />} />

            {/* Admin Management & Kitchen Dashboard */}
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/menu" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

