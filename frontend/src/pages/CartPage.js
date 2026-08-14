import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, deliveryFee } = useCart();

  if (items.length === 0) {
    return (
      <div className="page-container text-center py-20">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added any dishes yet</p>
        <Link to="/menu" className="btn-primary inline-flex items-center gap-2">
          <ShoppingBag size={18} /> Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.cartId} className="card p-4 flex gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                {item.name.includes('Jollof') ? '🍚' : item.name.includes('Banku') ? '🥘' : item.name.includes('Fufu') ? '🍲' : '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {item.customOptions?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.customOptions.map(o => `${o.option}: ${o.value}`).join(', ')}</p>
                    )}
                    {item.specialInstructions && <p className="text-xs text-gray-400 mt-0.5">Note: {item.specialInstructions}</p>}
                  </div>
                  <button onClick={() => removeItem(item.cartId)} className="text-gray-400 hover:text-accent-500 transition p-1"><Trash2 size={16} /></button>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg">
                    <button onClick={() => updateQuantity(item.cartId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-l-lg transition"><Minus size={14} /></button>
                    <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-r-lg transition"><Plus size={14} /></button>
                  </div>
                  <span className="font-bold text-primary-500">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-6 h-fit sticky top-24">
          <h3 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal ({items.length} items)</span><span className="font-medium">GH₵{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span className="font-medium">GH₵{deliveryFee.toFixed(2)}</span></div>
            <hr />
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary-500">GH₵{(subtotal + deliveryFee).toFixed(2)}</span></div>
          </div>
          <div className="mt-4 p-3 bg-primary-50 rounded-xl">
            <p className="text-sm text-primary-700">Use code <span className="font-bold">WELCOME10</span> for 10% off!</p>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight size={16} />
          </Link>
          <Link to="/menu" className="btn-secondary w-full mt-2 text-center block">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
