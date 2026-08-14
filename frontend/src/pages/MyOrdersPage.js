import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { Package, Eye, ChevronRight } from 'lucide-react';

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadOrders(); }, [page]);

  const loadOrders = async () => {
    try {
      const res = await orderAPI.getMyOrders({ page, limit: 10 });
      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const getStatusStyle = (status) => {
    const styles = {
      placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-yellow-100 text-yellow-700',
      preparing: 'bg-orange-100 text-orange-700', out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;

  return (
    <div className="page-container max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
          <p className="text-gray-500 mb-6">Start ordering your favorite Ghanaian dishes!</p>
          <Link to="/menu" className="btn-primary">Browse Menu</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`} className="card p-5 flex items-center justify-between hover:shadow-md transition group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Package size={20} className="text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()} - {order.items?.length} item(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-gray-900">GH₵{parseFloat(order.total).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500 transition" />
              </div>
            </Link>
          ))}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`w-10 h-10 rounded-lg font-medium transition ${page === i + 1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
