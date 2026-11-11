import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { BrandLogo } from '../brand/BrandLogo';
import {
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ClipboardList,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu when clicking outside or navigating.
  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenu) return undefined;
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setUserMenu(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setUserMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenu]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenu(false);
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/menu', label: 'Menu' },
    ...(user ? [{ to: '/orders', label: 'My orders' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Dashboard' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-bamboo-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-control focus-visible:outline-none"
            aria-label="Afia Food Hub — home"
          >
            <BrandLogo variant="horizontal" height={36} className="hidden sm:block" />
            <BrandLogo variant="icon" height={34} className="sm:hidden" />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`nav-link ${isActive(link.to) ? 'nav-link-active' : ''}`}
                aria-current={isActive(link.to) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/cart"
              className="relative rounded-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-100 hover:text-primary-600"
              aria-label={`Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
            >
              <ShoppingCart size={22} aria-hidden="true" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[0.6875rem] font-bold text-white">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenu((open) => !open)}
                  className="flex items-center gap-2 rounded-control bg-bamboo-50 px-2.5 py-1.5 transition-colors hover:bg-bamboo-100 sm:px-3 sm:py-2"
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium text-bamboo-700 sm:block">
                    {user.name?.split(' ')[0]}
                  </span>
                  <ChevronDown size={16} className="text-bamboo-400" aria-hidden="true" />
                </button>

                {userMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 overflow-hidden rounded-card border border-bamboo-200 bg-white py-2 shadow-card-hover"
                  >
                    <div className="border-b border-bamboo-100 px-4 py-2.5">
                      <p className="truncate font-semibold text-bamboo-900">{user.name}</p>
                      <p className="truncate text-xs text-bamboo-600">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-2.5 text-bamboo-700 transition-colors hover:bg-bamboo-50"
                    >
                      <User size={16} aria-hidden="true" /> Profile
                    </Link>
                    <Link
                      to="/orders"
                      role="menuitem"
                      className="flex items-center gap-3 px-4 py-2.5 text-bamboo-700 transition-colors hover:bg-bamboo-50"
                    >
                      <ClipboardList size={16} aria-hidden="true" /> My orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        role="menuitem"
                        className="flex items-center gap-3 px-4 py-2.5 text-bamboo-700 transition-colors hover:bg-bamboo-50"
                      >
                        <LayoutDashboard size={16} aria-hidden="true" /> Admin dashboard
                      </Link>
                    )}
                    <hr className="my-2 border-bamboo-100" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-danger-600 transition-colors hover:bg-danger-50"
                    >
                      <LogOut size={16} aria-hidden="true" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary btn-sm">
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-100 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div id="mobile-menu" className="border-t border-bamboo-100 py-3 md:hidden">
            <div className="space-y-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block rounded-control px-3 py-2.5 font-medium transition-colors ${
                    isActive(link.to)
                      ? 'bg-clay-50 text-primary-600'
                      : 'text-bamboo-700 hover:bg-bamboo-50'
                  }`}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
