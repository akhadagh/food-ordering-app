import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../services/api';
import { MapPin, CreditCard, Tag, CheckCircle, Smartphone, Banknote, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'mtn_momo', name: 'MTN Mobile Money', icon: <Smartphone size={20} />, color: 'bg-yellow-400 text-white', desc: 'Pay with MTN MoMo' },
  { id: 'vodafone_cash', name: 'Vodafone Cash', icon: <Smartphone size={20} />, color: 'bg-red-600 text-white', desc: 'Pay with Vodafone Cash' },
  { id: 'airteltigo_money', name: 'AirtelTigo Money', icon: <Smartphone size={20} />, color: 'bg-red-500 text-white', desc: 'Pay with AirtelTigo' },
  { id: 'cash', name: 'Cash on Delivery', icon: <Banknote size={20} />, color: 'bg-green-500 text-white', desc: 'Pay when your food arrives' },
  { id: 'card', name: 'Debit/Credit Card', icon: <CreditCard size={20} />, color: 'bg-blue-500 text-white', desc: 'Visa, Mastercard' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: <Wallet size={20} />, color: 'bg-gray-700 text-white', desc: 'Direct bank transfer' },
];

const CheckoutPage = () => {
  const { items, subtotal, deliveryFee, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    delivery_address: user?.address || '',
    delivery_notes: '',
    payment_method: 'mtn_momo',
    phone_number: user?.phone || '',
    promo_code: '',
  });
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const handleApplyPromo = async () => {
    if (!form.promo_code) return;
    try {
      const res = await orderAPI.validatePromo({ code: form.promo_code, subtotal });
      if (res.data.valid) {
        setDiscount(res.data.discount);
        setPromoApplied(true);
        toast.success(`Promo applied! GH₵${res.data.discount.toFixed(2)} off`);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error('Invalid promo code');
    }
  };

  const total = subtotal + deliveryFee - discount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.delivery_address) return toast.error('Please enter delivery address');
    if (items.length === 0) return toast.error('Cart is empty');

    setLoading(true);
    try {
      const orderData = {
        items: items.map(i => ({
          menu_item_id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          custom_options: i.customOptions,
          special_instructions: i.specialInstructions,
        })),
        delivery_address: form.delivery_address,
        delivery_notes: form.delivery_notes,
        payment_method: form.payment_method,
        promo_code: promoApplied ? form.promo_code : undefined,
      };

      const res = await orderAPI.create(orderData);
      setOrderId(res.data.id);
      setOrderPlaced(true);
      clearCart();
      toast.success('Order placed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="page-container text-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 mb-2">Your order #{orderId} has been placed successfully</p>
        {form.payment_method !== 'cash' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-md mx-auto my-6">
            <p className="text-yellow-800 font-medium">Payment Instructions</p>
            <p className="text-sm text-yellow-700 mt-1">
              {form.payment_method === 'mtn_momo' && `Dial *170# on your MTN phone and send GH₵${total.toFixed(2)} to merchant number 0241234567. Reference: ORDER-${orderId}`}
              {form.payment_method === 'vodafone_cash' && `Dial *110# and send GH₵${total.toFixed(2)} to 0501234567. Reference: ORDER-${orderId}`}
              {form.payment_method === 'airteltigo_money' && `Dial *185# and send GH₵${total.toFixed(2)} to 0261234567. Reference: ORDER-${orderId}`}
              {form.payment_method === 'card' && `A payment link has been sent to your phone. Complete payment of GH₵${total.toFixed(2)} to confirm your order.`}
              {form.payment_method === 'bank_transfer' && `Transfer GH₵${total.toFixed(2)} to Efia'sEat Account - Bank: GCB, Account: 1234567890, Name: Efia'sEat Ltd. Reference: ORDER-${orderId}`}
            </p>
          </div>
        )}
        <div className="flex gap-4 justify-center mt-8">
          <button onClick={() => navigate(`/orders/${orderId}`)} className="btn-primary">Track Order</button>
          <button onClick={() => navigate('/menu')} className="btn-secondary">Order More</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2"><MapPin size={20} /> Delivery Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={user?.name || ''} readOnly className="input-field bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" placeholder="+233 XX XXX XXXX" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                  <textarea placeholder="e.g. 123 Oxford Street, Osu, Accra" value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address: e.target.value })} className="input-field" rows={2} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes (Optional)</label>
                  <input type="text" placeholder="e.g. Near the traffic light, call when arriving" value={form.delivery_notes} onChange={e => setForm({ ...form, delivery_notes: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2"><CreditCard size={20} /> Payment Method</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(pm => (
                  <button key={pm.id} type="button" onClick={() => setForm({ ...form, payment_method: pm.id })} className={`p-4 rounded-xl border-2 text-left transition-all ${form.payment_method === pm.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${pm.color}`}>{pm.icon}</div>
                    <p className="font-medium text-sm text-gray-900">{pm.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pm.desc}</p>
                  </button>
                ))}
              </div>
              {['mtn_momo', 'vodafone_cash', 'airteltigo_money'].includes(form.payment_method) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number</label>
                  <input type="tel" placeholder="+233 XX XXX XXXX" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} className="input-field" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h3>
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.cartId} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} x{item.quantity}</span>
                    <span className="font-medium">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>GH₵{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>GH₵{deliveryFee.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-GH₵{discount.toFixed(2)}</span></div>}
                <hr />
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary-500">GH₵{total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Promo code" value={form.promo_code} onChange={e => setForm({ ...form, promo_code: e.target.value })} className="input-field pl-9 text-sm" disabled={promoApplied} />
                </div>
                <button type="button" onClick={handleApplyPromo} className={`btn-primary text-sm px-4 ${promoApplied ? 'bg-green-500' : ''}`} disabled={promoApplied}>
                  {promoApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3.5 text-lg flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : `Place Order - GH₵${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
