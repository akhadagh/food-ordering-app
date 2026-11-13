import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { BrandCard, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import {
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  ChevronRight,
  ChefHat,
  ShoppingBag,
  Truck,
  Banknote,
} from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await adminAPI.getDashboard()).data,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <BrandLoader label="Loading your dashboard…" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load the dashboard"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      </div>
    );
  }

  const money = (value) =>
    `GH₵ ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cards = [
    {
      title: 'Revenue booked',
      value: money(stats.totalRevenue),
      hint: `${money(stats.collectedRevenue)} collected`,
      icon: <DollarSign size={20} aria-hidden="true" />,
      color: 'bg-garden-500',
      to: '/admin/sales',
    },
    {
      title: "Today's revenue",
      value: money(stats.todayRevenue),
      hint: `${money(stats.outstandingRevenue)} outstanding`,
      icon: <TrendingUp size={20} aria-hidden="true" />,
      color: 'bg-bamboo-600',
      to: '/admin/sales',
    },
    {
      title: 'Total orders',
      value: stats.totalOrders,
      hint: `${stats.cancelledOrders} cancelled`,
      icon: <ShoppingCart size={20} aria-hidden="true" />,
      color: 'bg-primary-500',
      to: '/admin/orders',
    },
    {
      title: 'New orders',
      value: stats.pendingOrders,
      hint: 'Waiting for confirmation',
      icon: <Clock size={20} aria-hidden="true" />,
      color: 'bg-gold-500',
      to: '/admin/orders',
    },
    {
      title: 'In the kitchen',
      value: stats.preparingOrders + stats.readyOrders,
      hint: `${stats.preparingOrders} preparing · ${stats.readyOrders} ready`,
      icon: <ChefHat size={20} aria-hidden="true" />,
      color: 'bg-clay-500',
      to: '/admin/orders',
    },
    {
      title: 'On the road',
      value: stats.outForDeliveryOrders,
      hint: `${stats.deliveredOrders} delivered`,
      icon: <Truck size={20} aria-hidden="true" />,
      color: 'bg-bamboo-700',
      to: '/admin/orders',
    },
    {
      title: 'Customers',
      value: stats.totalUsers,
      hint: `${stats.totalCustomers} customer accounts`,
      icon: <Users size={20} aria-hidden="true" />,
      color: 'bg-bamboo-500',
      to: '/admin/users',
    },
    {
      title: 'Menu items',
      value: stats.totalMenuItems,
      hint: `${stats.availableMenuItems} available`,
      icon: <Package size={20} aria-hidden="true" />,
      color: 'bg-primary-600',
      to: '/admin/menu',
    },
  ];

  const links = [
    {
      title: 'Manage orders',
      desc: 'See incoming orders and move them through the kitchen.',
      to: '/admin/orders',
      icon: <ShoppingCart size={22} aria-hidden="true" />,
    },
    {
      title: 'Manage menu',
      desc: 'Add, edit and retire dishes, categories and photos.',
      to: '/admin/menu',
      icon: <ShoppingBag size={22} aria-hidden="true" />,
    },
    {
      title: 'Sales & reports',
      desc: 'Revenue, popular dishes and a CSV export.',
      to: '/admin/sales',
      icon: <TrendingUp size={22} aria-hidden="true" />,
    },
    {
      title: 'Promo codes',
      desc: 'Create discounts that the checkout actually honours.',
      to: '/admin/promos',
      icon: <Banknote size={22} aria-hidden="true" />,
    },
  ];

  return (
    <div className="page-container">
      <PageMeta title="Admin dashboard" path="/admin" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Dashboard</h1>
        <p className="mt-1 text-bamboo-600">Here is how Afia Food Hub is doing right now.</p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="card-interactive p-5"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-control text-white ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-bamboo-500">{card.title}</p>
            <p className="mt-1 font-display text-xl text-bamboo-900">{card.value}</p>
            <p className="mt-1 text-xs text-bamboo-500">{card.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="card-interactive group p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-control bg-clay-50 text-primary-600 transition-colors group-hover:bg-primary-500 group-hover:text-white">
              {link.icon}
            </div>
            <h2 className="font-display text-base text-bamboo-900 transition-colors group-hover:text-primary-600">
              {link.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-bamboo-600">{link.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
              Open <ChevronRight size={15} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
