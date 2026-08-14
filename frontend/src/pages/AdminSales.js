import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#d97706', '#006B3F', '#CE1126', '#3b82f6', '#8b5cf6'];

const AdminSales = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadData(); }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await adminAPI.getSalesData(params);
      setData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await adminAPI.exportSalesCSV(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Sales report downloaded!');
    } catch (err) { toast.error('Export failed'); }
  };

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;
  if (!data) return null;

  const chartData = data.salesStats?.slice().reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    revenue: parseFloat(d.net_sales),
    orders: parseInt(d.order_count),
  })) || [];

  const totalRevenue = data.salesStats?.reduce((s, r) => s + parseFloat(r.net_sales), 0) || 0;
  const totalOrders = data.salesStats?.reduce((s, r) => s + parseInt(r.order_count), 0) || 0;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales & Reports</h1>
          <p className="text-gray-500 mt-1">Analyze your restaurant performance</p>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2">
          <Download size={16} /> Download CSV Report
        </button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-auto text-sm" />
        </div>
        <span className="text-gray-400 self-center">to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-auto text-sm" />
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="btn-secondary text-sm">Clear</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><TrendingUp size={18} className="text-green-600" /></div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">GH₵{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><BarChart3 size={18} className="text-blue-600" /></div>
            <span className="text-sm text-gray-500">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><TrendingUp size={18} className="text-purple-600" /></div>
            <span className="text-sm text-gray-500">Avg. Order Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">GH₵{avgOrder.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Daily Revenue</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`GH₵${v.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-gray-400 py-20">No data available</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#006B3F" strokeWidth={2} dot={{ fill: '#006B3F' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-gray-400 py-20">No data available</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Popular Items</h3>
          {data.popularItems?.length > 0 ? (
            <div className="space-y-3">
              {data.popularItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.total_quantity} sold</p>
                  </div>
                  <span className="font-bold text-sm text-primary-500">GH₵{parseFloat(item.total_revenue).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-gray-400 py-10">No data</p>}
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Payment Methods</h3>
          {data.paymentBreakdown?.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={data.paymentBreakdown.map(p => ({ name: p.payment_method?.replace('_', ' '), value: parseInt(p.count) }))} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                {data.paymentBreakdown.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="capitalize">{p.payment_method?.replace('_', ' ')}</span>
                    <span className="text-gray-400">({p.count})</span>
                    <span className="font-medium ml-auto">GH₵{parseFloat(p.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center text-gray-400 py-10">No data</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminSales;
