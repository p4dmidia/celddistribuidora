
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import ConsorcioLanding from './pages/ConsorcioLanding';
import ConsorcioTracking from './pages/ConsorcioTracking';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AffiliateDashboard from './pages/AffiliateDashboard';
import AffiliateReferrals from './pages/AffiliateReferrals';
import AffiliateFinancial from './pages/AffiliateFinancial';
import AffiliateOrders from './pages/AffiliateOrders';
import AffiliateConsorcio from './pages/AffiliateConsorcio';
import AffiliateReports from './pages/AffiliateReports';
import AffiliateMaterials from './pages/AffiliateMaterials';
import AffiliateSettings from './pages/AffiliateSettings';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminAffiliates from './pages/AdminAffiliates';
import AdminReports from './pages/AdminReports';
import AffiliateLayout from './components/AffiliateLayout';
import AdminLayout from './components/AdminLayout';
import AdminProducts from './pages/AdminProducts';
import AdminOrders from './pages/AdminOrders';
import AdminSecurity from './pages/AdminSecurity';
import AdminCommissions from './pages/AdminCommissions';
import AdminConsorcio from './pages/AdminConsorcio';
import AdminCategories from './pages/AdminCategories';
import CheckoutPage from './pages/CheckoutPage';
import AdminFinancial from './pages/AdminFinancial';
import AdminMaterials from './pages/AdminMaterials';
import ProductDetails from './pages/ProductDetails';
import ConsorcioTerms from './pages/ConsorcioTerms';
import CheckoutSuccess from './pages/CheckoutSuccess';

import ProtectedRoute from './components/ProtectedRoute';
import ReferralHandler from './components/ReferralHandler';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      {!isDashboard && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/loja" element={<ShopPage />} />
          {/* Rotas de consórcio ocultas no Grupo A
          <Route path="/consorcio" element={<ConsorcioLanding />} />
          <Route path="/consorcio/termos" element={<ConsorcioTerms />} />
          <Route path="/meu-consorcio" element={<ConsorcioTracking />} />
          */}
          <Route path="/p/:id" element={<ProductDetails />} />
           <Route path="/checkout" element={<CheckoutPage />} />
           <Route path="/checkout/success/:orderId" element={<CheckoutSuccess />} />
           <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/ref/:referralCode" element={<ReferralHandler />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><AffiliateDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/referrals" element={<ProtectedRoute><AffiliateReferrals /></ProtectedRoute>} />
          <Route path="/dashboard/orders" element={<ProtectedRoute><AffiliateOrders /></ProtectedRoute>} />
          <Route path="/dashboard/financial" element={<ProtectedRoute><AffiliateFinancial /></ProtectedRoute>} />
          {/* Rota do consórcio oculta no Grupo A
          <Route path="/dashboard/consorcio" element={<ProtectedRoute><AffiliateConsorcio /></ProtectedRoute>} />}
          */}
          <Route path="/dashboard/reports" element={<ProtectedRoute><AffiliateReports /></ProtectedRoute>} />
          <Route path="/dashboard/materials" element={<ProtectedRoute><AffiliateMaterials /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><AffiliateSettings /></ProtectedRoute>} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/affiliates" element={<AdminAffiliates />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/financial" element={<AdminFinancial />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/commissions" element={<AdminCommissions />} />
          {/* Rota do consórcio oculta no Grupo A
          <Route path="/admin/consorcio" element={<AdminConsorcio />} />
          */}
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/materials" element={<AdminMaterials />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Routes>
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
};

import { AuthProvider } from './components/AuthContext';
import { CartProvider } from './components/CartContext';

import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <Router>
      <CartProvider>
        <AuthProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <AppContent />
        </AuthProvider>
      </CartProvider>
    </Router>
  );
};

export default App;
