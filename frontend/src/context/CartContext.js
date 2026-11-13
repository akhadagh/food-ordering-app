import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { cartAPI, apiErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

/**
 * The shopping cart.
 *
 * The cart lives on the server, so it survives a device change and every
 * price in it is the server's own calculation (audit findings P1-10, P2-14).
 * The browser only mirrors the last response for instant rendering.
 */
export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await cartAPI.get();
      setCart(data);
      setError(null);
      return data;
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not load your cart.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The cart is owned by the server, and which cart that is depends on the
   * session: a guest cart and a signed-in customer's cart are different
   * records. When the customer signs in the guest cart is merged into theirs,
   * so the cart is re-read - otherwise the browser would keep showing the
   * guest's copy of it.
   */
  const sessionId = user?.id ?? null;
  const loadedSession = useRef(sessionId);
  useEffect(() => {
    if (loadedSession.current === sessionId) return;
    loadedSession.current = sessionId;
    setLoading(true);
    load();
  }, [sessionId, load]);

  const addItem = async ({ menuItemId, quantity = 1, customOptions = [], specialInstructions = '' }) => {
    const { data } = await cartAPI.addItem({
      menuItemId,
      quantity,
      customOptions,
      specialInstructions,
    });
    await load();
    return data;
  };

  const updateQuantity = async (id, quantity) => {
    await cartAPI.updateItem(id, quantity);
    await load();
  };

  const removeItem = async (id) => {
    await cartAPI.removeItem(id);
    await load();
  };

  const clear = async () => {
    await cartAPI.clear();
    await load();
  };

  const items = cart?.items || [];
  const quote = cart?.quote || null;

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        quote,
        loading,
        error,
        reload: load,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        totalItems,
        subtotal: quote ? Number(quote.subtotal) : 0,
        deliveryFee: quote ? Number(quote.delivery_fee) : 0,
        discount: quote ? Number(quote.discount) : 0,
        total: quote ? Number(quote.total) : 0,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

export default CartContext;
