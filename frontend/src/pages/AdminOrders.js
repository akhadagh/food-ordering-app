import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { RefreshCw, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed', color: 'bg-blue-100 text-blue-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'preparing', label: 'Preparing', color: 'bg-orange-100 text-orange-700' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await adminAPI.getOrders(params);
      setOrders(res.data.orders);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      toast.success('Order status updated');
      loadOrders();
    } catch (err) {
      toast.error('Failed to update status');
    }
    setUpdating(null);
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Orders</h1>
          <p className="text-gray-500 mt-1">View and update incoming orders</p>
        </div>
        <div className="flex gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field w-auto">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={loadOrders} className="btn-secondary flex items-center gap-2"><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">Order #{order.id}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_OPTIONS.find(s => s.value === order.status)?.color || ''}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {order.user_name} ({order.user_email}) - {order.user_phone}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.created_at).toLocaleString()} | {order.payment_method?.replace('_', ' ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.items?.map((item, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        {item.name} x{item.quantity}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Address: {order.delivery_address}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-primary-500 mb-2">GH₵{parseFloat(order.total).toFixed(2)}</p>
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={e => handleStatusUpdate(order.id, e.target.value)}
                      disabled={updating === order.id}
                      className="input-field text-sm w-44 pr-8"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
