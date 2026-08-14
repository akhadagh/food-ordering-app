import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { ShoppingCart, Users, DollarSign, Package, TrendingUp, Clock, ChevronRight } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboard().then(r => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;

  const cards = [
    { title: 'Total Revenue', value: `GH₵${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign size={22} />, color: 'bg-green-500', link: '/admin/sales' },
    { title: "Today's Revenue", value: `GH₵${stats.todayRevenue.toFixed(2)}`, icon: <TrendingUp size={22} />, color: 'bg-blue-500', link: '/admin/sales' },
    { title: 'Total Orders', value: stats.totalOrders, icon: <ShoppingCart size={22} />, color: 'bg-primary-500', link: '/admin/orders' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: <Clock size={22} />, color: 'bg-yellow-500', link: '/admin/orders' },
    { title: 'Preparing', value: stats.preparingOrders, icon: <Package size={22} />, color: 'bg-orange-500', link: '/admin/orders' },
    { title: 'Total Users', value: stats.totalUsers, icon: <Users size={22} />, color: 'bg-purple-500' },
  ];

  const links = [
    { title: 'Manage Orders', desc: 'View and update order statuses', to: '/admin/orders', icon: '📋' },
    { title: 'Manage Menu', desc: 'Add, edit or remove menu items', to: '/admin/menu', icon: '🍽️' },
    { title: 'Sales & Reports', desc: 'Download sales data and analytics', to: '/admin/sales', icon: '📊' },
    { title: 'Promo Codes', desc: 'Create and manage discount codes', to: '/admin/promos', icon: '🏷️' },
  ];

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your restaurant overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map((c, i) => (
          <Link key={i} to={c.link || '#'} className="card p-5 hover:shadow-md transition group">
            <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-white mb-3`}>{c.icon}</div>
            <p className="text-sm text-gray-500">{c.title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map((l, i) => (
          <Link key={i} to={l.to} className="card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className="text-4xl mb-3">{l.icon}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition">{l.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{l.desc}</p>
            <div className="flex items-center gap-1 text-primary-500 text-sm font-medium mt-3 group-hover:gap-2 transition-all">
              Open <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
