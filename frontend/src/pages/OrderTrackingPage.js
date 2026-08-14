import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import { Package, Clock, ChefHat, Truck, CheckCircle, ArrowLeft } from 'lucide-react';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: <Package size={20} /> },
  { key: 'confirmed', label: 'Confirmed', icon: <Clock size={20} /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat size={20} /> },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: <Truck size={20} /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle size={20} /> },
];

const OrderTrackingPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 15000);
    return () => clearInterval(interval);
  }, [id]);

  const loadOrder = async () => {
    try {
      const res = await orderAPI.getOrder(id);
      setOrder(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const getStatusIndex = (status) => STATUS_STEPS.findIndex(s => s.key === status);

  const getStatusColor = (status) => {
    const colors = { placed: 'bg-blue-500', confirmed: 'bg-yellow-500', preparing: 'bg-orange-500', out_for_delivery: 'bg-purple-500', delivered: 'bg-green-500', cancelled: 'bg-red-500' };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;
  if (!order) return <div className="page-container text-center py-20"><p className="text-gray-500">Order not found</p></div>;

  const currentIndex = getStatusIndex(order.status);

  return (
    <div className="page-container max-w-3xl mx-auto">
      <Link to="/orders" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-500 mb-6 transition"><ArrowLeft size={18} /> Back to Orders</Link>

      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-sm text-gray-500 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(order.status)}`}>
            {STATUS_STEPS.find(s => s.key === order.status)?.label || order.status}
          </span>
        </div>

        {order.status !== 'cancelled' && (
          <div className="mb-8">
            <div className="relative">
              <div className="flex justify-between relative z-10">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  return (
                    <div key={step.key} className="flex flex-col items-center text-center w-24">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${isCompleted ? 'bg-primary-500 text-white scale-110' : 'bg-gray-100 text-gray-400'} ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}>
                        {step.icon}
                      </div>
                      <span className={`text-xs font-medium ${isCompleted ? 'text-primary-600' : 'text-gray-400'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-100 z-0">
                <div className="h-full bg-primary-500 transition-all duration-700" style={{ width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${getStatusColor(order.status)}`}>
              {STATUS_STEPS.find(s => s.key === order.status)?.icon || <Package size={18} />}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {order.status === 'placed' && 'Your order has been placed. Waiting for confirmation.'}
                {order.status === 'confirmed' && 'Restaurant has confirmed your order. Preparing soon!'}
                {order.status === 'preparing' && 'Your food is being prepared with love. Almost ready!'}
                {order.status === 'out_for_delivery' && 'Your order is on its way! Rider is heading to you.'}
                {order.status === 'delivered' && 'Your order has been delivered. Enjoy your meal!'}
                {order.status === 'cancelled' && 'This order has been cancelled.'}
              </p>
              {order.estimated_delivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
                <p className="text-sm text-gray-500 mt-0.5">Estimated delivery: {new Date(order.estimated_delivery).toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg p-3">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-400 ml-1">x{item.quantity}</span>
                    {item.custom_options?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{item.custom_options.map(o => `${o.option}: ${o.value}`).join(', ')}</p>}
                  </div>
                  <span className="font-medium">GH₵{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>GH₵{parseFloat(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>GH₵{parseFloat(order.delivery_fee).toFixed(2)}</span></div>
              {parseFloat(order.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-GH₵{parseFloat(order.discount).toFixed(2)}</span></div>}
              <hr />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary-500">GH₵{parseFloat(order.total).toFixed(2)}</span></div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="text-gray-500">Delivery Address:</span> <span className="font-medium">{order.delivery_address}</span></div>
              <div><span className="text-gray-500">Payment:</span> <span className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</span></div>
              {order.delivery_notes && <div><span className="text-gray-500">Notes:</span> <span className="font-medium">{order.delivery_notes}</span></div>}
            </div>
          </div>
        </div>

        {order.status_history?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Status History</h3>
            <div className="space-y-2">
              {order.status_history.map((h, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-400 mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-700 capitalize">{h.status.replace('_', ' ')}</p>
                    <p className="text-gray-400 text-xs">{new Date(h.created_at).toLocaleString()} - {h.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
