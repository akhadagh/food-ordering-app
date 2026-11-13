import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { BrandPrice, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import { Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#C4422B', '#256139', '#DE9710', '#5BA56E', '#F2A493', '#8A8073'];

const AdminSales = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'sales', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      return (await adminAPI.getSalesData(params)).data;
    },
    placeholderData: (previous) => previous,
  });

  const handleExport = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await adminAPI.exportSalesCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `afia-food-hub-sales-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Sales report downloaded');
    } catch {
      toast.error('The export failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <BrandLoader label="Building the report…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load the sales report"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      </div>
    );
  }

  const chartData = (data?.salesStats || [])
    .slice()
    .reverse()
    .map((row) => ({
      date: new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: Number(row.net_sales),
      collected: Number(row.collected_sales),
      orders: Number(row.order_count),
    }));

  const stats = data?.salesStats || [];
  const totalRevenue = stats.reduce((sum, row) => sum + Number(row.net_sales), 0);
  const totalCollected = stats.reduce((sum, row) => sum + Number(row.collected_sales), 0);
  const totalOrders = stats.reduce((sum, row) => sum + Number(row.order_count), 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDiscounts = stats.reduce((sum, row) => sum + Number(row.total_discounts), 0);

  const paymentRows = data?.paymentBreakdown || [];
  const paymentTotals = paymentRows.reduce((acc, row) => {
    acc[row.payment_method] = (acc[row.payment_method] || 0) + Number(row.count);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <PageMeta title="Sales & reports" path="/admin/sales" />

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-bamboo-900">Sales & reports</h1>
          <p className="mt-1 text-bamboo-600">Figures come straight from the orders table.</p>
        </div>
        <button type="button" onClick={handleExport} className="btn-primary btn-sm">
          <Download size={15} aria-hidden="true" /> Download CSV
        </button>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-bamboo-400" aria-hidden="true" />
          <label htmlFor="start-date" className="sr-only">
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field w-auto text-sm"
          />
        </div>
        <span className="text-bamboo-400">to</span>
        <label htmlFor="end-date" className="sr-only">
          End date
        </label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="input-field w-auto text-sm"
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="btn-secondary btn-sm"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Revenue booked',
            value: `GH₵ ${totalRevenue.toFixed(2)}`,
            hint: 'Subtotal + delivery − discounts',
            icon: <TrendingUp size={18} aria-hidden="true" />,
            tone: 'bg-garden-50 text-garden-700',
          },
          {
            label: 'Cash collected',
            value: `GH₵ ${totalCollected.toFixed(2)}`,
            hint: 'Payments confirmed by the provider',
            icon: <TrendingUp size={18} aria-hidden="true" />,
            tone: 'bg-clay-50 text-primary-700',
          },
          {
            label: 'Orders',
            value: totalOrders,
            hint: 'Excludes cancelled orders',
            icon: <BarChart3 size={18} aria-hidden="true" />,
            tone: 'bg-bamboo-100 text-bamboo-700',
          },
          {
            label: 'Average order',
            value: `GH₵ ${avgOrder.toFixed(2)}`,
            hint: `GH₵ ${totalDiscounts.toFixed(2)} discounted`,
            icon: <BarChart3 size={18} aria-hidden="true" />,
            tone: 'bg-gold-50 text-gold-700',
          },
        ].map((card) => (
          <div key={card.label} className="card p-5">
            <div
              className={`mb-3 flex h-9 w-9 items-center justify-center rounded-control ${card.tone}`}
            >
              {card.icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-bamboo-500">{card.label}</p>
            <p className="mt-1 font-display text-xl text-bamboo-900">{card.value}</p>
            <p className="mt-1 text-xs text-bamboo-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-base text-bamboo-900">Daily revenue</h2>
          {chartData.length > 0 ? (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F1EC" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B6257' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B6257' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`GH₵ ${Number(value).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#C4422B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-bamboo-500">No sales in this period.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-base text-bamboo-900">Order trend</h2>
          {chartData.length > 0 ? (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F1EC" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B6257' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B6257' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#256139" strokeWidth={2} dot={{ fill: '#256139', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-bamboo-500">No orders in this period.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-base text-bamboo-900">Popular dishes</h2>
          {data?.popularItems?.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {data.popularItems.map((item, index) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-sm font-bold text-white"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-bamboo-900">{item.name}</p>
                    <p className="text-xs text-bamboo-500">{item.total_quantity} sold</p>
                  </div>
                  <BrandPrice amount={item.total_revenue} size="sm" />
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-10 text-center text-bamboo-500">No dishes sold yet.</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-base text-bamboo-900">Payment methods</h2>
          {Object.keys(paymentTotals).length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={Object.entries(paymentTotals).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.keys(paymentTotals).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-2.5 text-sm">
                {paymentRows.map((row, i) => (
                  <li key={`${row.payment_method}-${row.payment_status}-${i}`} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="capitalize text-bamboo-700">
                      {String(row.payment_method).replace(/_/g, ' ')}
                    </span>
                    <span className="text-bamboo-400">({row.count})</span>
                    <span className="ml-auto font-medium text-bamboo-900">
                      GH₵ {Number(row.total).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-bamboo-500">No payments recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSales;
