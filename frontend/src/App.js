import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { BrandLoader, BrandLogo } from './components/brand';

import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import MyOrdersPage from './pages/MyOrdersPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// The admin area is rarely visited - keep it out of the main bundle.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminMenu = lazy(() => import('./pages/AdminMenu'));
const AdminSales = lazy(() => import('./pages/AdminSales'));
const AdminPromos = lazy(() => import('./pages/AdminPromos'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

const ChatBot = lazy(() => import('./components/chatbot/ChatBot'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/* --------------------------------------------------------------- guards -- */

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BrandLoader label="Checking your session…" />;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <BrandLoader label="Checking your session…" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

/* -------------------------------------------------------- error boundary -- */

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Afia Food Hub crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <BrandLogo variant="icon" height={64} />
        <h1 className="mt-7 font-display text-display-sm text-bamboo-900">
          Something went wrong on our side
        </h1>
        <p className="mt-2 max-w-md text-bamboo-600">
          The page ran into a problem. Reloading usually sorts it — and if it keeps happening,
          our team would like to hear from you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="btn-primary">
            Reload the page
          </button>
          <Link to="/" className="btn-secondary">
            Go to the homepage
          </Link>
        </div>
      </div>
    );
  }
}

/* ---------------------------------------------------------------- shell -- */

const AppShell = () => {
  return (
    <div className="flex min-h-screen flex-col bg-bamboo-50">
      <a href="#main" className="sr-only-focusable">
        Skip to content
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        <Suspense fallback={<BrandLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/menu"
              element={
                <AdminRoute>
                  <AdminMenu />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/sales"
              element={
                <AdminRoute>
                  <AdminSales />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/promos"
              element={
                <AdminRoute>
                  <AdminPromos />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />

      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <CartProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#26221E',
                    background: '#FFFFFF',
                    boxShadow: '0 8px 24px rgba(38,34,30,0.12)',
                  },
                  success: { iconTheme: { primary: '#256139', secondary: '#FFFFFF' } },
                  error: { iconTheme: { primary: '#B91C1C', secondary: '#FFFFFF' } },
                }}
              />
              <AppShell />
            </CartProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
