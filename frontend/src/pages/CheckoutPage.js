import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, menuAPI, apiErrorMessage } from '../services/api';
import { BrandPrice, BrandLoader, BrandErrorState, PageMeta } from '../components/brand';
import {
  MapPin,
  CreditCard,
  Tag,
  CheckCircle,
  Smartphone,
  Banknote,
  Wallet,
  Store,
  Truck,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICONS = {
  mtn_momo: Smartphone,
  telecel_cash: Smartphone,
  airteltigo_money: Smartphone,
  card: CreditCard,
  cash: Banknote,
  bank_transfer: Wallet,
};

const FULFILMENT = [
  { id: 'delivery', label: 'Deliver to me', icon: Truck },
  { id: 'pickup', label: 'I will collect', icon: Store },
];

const CheckoutPage = () => {
  const { user } = useAuth();
  const { items, quote, loading: cartLoading, error: cartError, reload, clear } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    delivery_address: user?.address || '',
    delivery_notes: '',
    phone_number: user?.phone || '',
    payment_method: 'cash',
    fulfilment_type: 'delivery',
    promo_code: '',
  });
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState(null);
  const [idempotencyKey] = useState(
    () => `af-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      delivery_address: prev.delivery_address || user?.address || '',
      phone_number: prev.phone_number || user?.phone || '',
    }));
  }, [user]);

  const { data: paymentConfig, isLoading: methodsLoading } = useQuery({
    queryKey: ['menu', 'payment-methods'],
    queryFn: async () => (await menuAPI.getPaymentMethods()).data,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!paymentConfig?.methods?.length) return;
    const available = paymentConfig.methods.map((m) => m.id);
    setForm((prev) =>
      available.includes(prev.payment_method)
        ? prev
        : { ...prev, payment_method: available[0] }
    );
  }, [paymentConfig]);

  const methods = paymentConfig?.methods || [];
  const onlineEnabled = Boolean(paymentConfig?.onlineEnabled);

  const handleApplyPromo = async () => {
    const code = form.promo_code.trim();
    if (!code) return;
    setPromoBusy(true);
    try {
      const { data } = await orderAPI.validatePromo(code, quote?.subtotal ?? 0);
      if (data.valid) {
        setDiscount(Number(data.discount));
        setPromoApplied(true);
        toast.success(`Promo applied — GH₵ ${Number(data.discount).toFixed(2)} off`);
      } else {
        setPromoApplied(false);
        setDiscount(0);
        toast.error(data.message || 'That promo code is not valid.');
      }
    } catch (err) {
      setPromoApplied(false);
      setDiscount(0);
      toast.error(apiErrorMessage(err, 'That promo code is not valid.'));
    } finally {
      setPromoBusy(false);
    }
  };

  const total = useMemo(() => {
    const base = quote ? Number(quote.total) : 0;
    return Math.max(0, base - (promoApplied ? discount : 0));
  }, [quote, discount, promoApplied]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.delivery_address.trim()) {
      toast.error('Please enter a delivery address.');
      return;
    }
    if (!form.phone_number.trim()) {
      toast.error('Please enter a phone number we can reach you on.');
      return;
    }
    if (!items.length) {
      toast.error('Your cart is empty.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customOptions: item.customOptions || [],
          specialInstructions: item.specialInstructions || '',
        })),
        deliveryAddress: form.delivery_address.trim(),
        deliveryNotes: form.delivery_notes.trim() || undefined,
        customerPhone: form.phone_number.trim(),
        paymentMethod: form.payment_method,
        fulfilmentType: form.fulfilment_type,
        ...(promoApplied ? { promoCode: form.promo_code.trim() } : {}),
      };

      const { data } = await orderAPI.create(payload, idempotencyKey);
      setOrderId(data.id);
      // The cart is emptied straight away, so the amount the customer must
      // pay is the one the server recorded on the order - not the cart total,
      // which is zero once the cart has been cleared.
      setPlacedOrder(data);
      setOrderPlaced(true);
      await clear();
      toast.success('Order placed successfully');
    } catch (err) {
      setError(apiErrorMessage(err, 'We could not place your order. Please try again.'));
      toast.error(apiErrorMessage(err, 'We could not place your order.'));
    } finally {
      setLoading(false);
    }
  };

  if (methodsLoading || cartLoading) {
    return (
      <div className="page-container">
        <BrandLoader label="Preparing checkout…" />
      </div>
    );
  }

  // A cart that failed to load is not an empty cart: say so, and offer a
  // retry, rather than telling the customer they have nothing in it.
  if (cartError) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load your cart"
          description={cartError}
          actionLabel="Try again"
          onAction={reload}
        />
      </div>
    );
  }

  if (orderPlaced) {
    const isCash = form.payment_method === 'cash';
    // The amount the customer must pay is the one the server recorded on the
    // order. The cart is empty by now, so the cart quote is no use here.
    const confirmedTotal = Number(placedOrder?.total ?? total);
    return (
      <div className="page-container">
        <PageMeta title="Order confirmed" path={`/orders/${orderId}`} />
        <div className="mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-garden-50">
            <CheckCircle size={40} className="text-garden-600" aria-hidden="true" />
          </div>
          <h1 className="font-display text-display-md text-bamboo-900">Order placed</h1>
          <p className="mt-2 text-bamboo-600">
            Order <span className="font-semibold text-bamboo-900">#{orderId}</span> is with the
            kitchen.
          </p>

          <div className="mt-6 rounded-card border border-bamboo-200 bg-white p-5 text-left">
            <p className="text-sm font-semibold text-bamboo-900">
              {isCash ? 'Paying on delivery' : 'Payment'}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-bamboo-600">
              {isCash ? (
                <>
                  Please have <strong className="text-bamboo-900">GH₵ {confirmedTotal.toFixed(2)}</strong>{' '}
                  ready in cash for the rider. We will call you when the order is on its way.
                </>
              ) : (
                <>
                  Your order is awaiting payment confirmation. We will update the order the moment
                  the payment is confirmed — you do not need to do anything else.
                </>
              )}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate(`/orders/${orderId}`)} className="btn-primary">
              Track this order
            </button>
            <button type="button" onClick={() => navigate('/menu')} className="btn-secondary">
              Order something else
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="Your cart is empty"
          description="Add a dish before checking out."
          linkTo="/menu"
          linkLabel="Browse the menu"
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageMeta title="Checkout" path="/checkout" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Checkout</h1>
        <p className="mt-1 text-bamboo-600">
          Almost there — tell us where to bring it and how you would like to pay.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-card border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* ------------------------------------------------ fulfilment */}
            <section className="card p-6">
              <h2 className="font-display text-lg text-bamboo-900">How would you like it?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {FULFILMENT.map((option) => {
                  const Icon = option.icon;
                  const selected = form.fulfilment_type === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setForm({ ...form, fulfilment_type: option.id })}
                      className={`flex items-center gap-3 rounded-control border-2 p-4 text-left transition-colors ${
                        selected
                          ? 'border-primary-500 bg-clay-50'
                          : 'border-bamboo-200 hover:border-bamboo-300'
                      }`}
                      aria-pressed={selected}
                    >
                      <Icon
                        size={20}
                        className={selected ? 'text-primary-600' : 'text-bamboo-500'}
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-bamboo-900">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* --------------------------------------------------- delivery */}
            <section className="card p-6">
              <h2 className="font-display text-lg text-bamboo-900">Delivery details</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="full-name" className="label">
                    Full name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="input-field bg-bamboo-50"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="label">
                    Phone number <span className="font-normal text-bamboo-500">(required)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    maxLength={30}
                    placeholder="+233 24 123 4567"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className="input-field"
                  />
                  <p className="field-hint">We call this number when the order is on its way.</p>
                </div>

                {form.fulfilment_type === 'delivery' && (
                  <>
                    <div>
                      <label htmlFor="address" className="label">
                        Delivery address <span className="font-normal text-bamboo-500">(required)</span>
                      </label>
                      <textarea
                        id="address"
                        required
                        rows={2}
                        maxLength={400}
                        placeholder="e.g. 12 Oxford Street, Osu, Accra"
                        value={form.delivery_address}
                        onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label htmlFor="notes" className="label">
                        Delivery notes
                      </label>
                      <input
                        id="notes"
                        type="text"
                        maxLength={500}
                        placeholder="e.g. Near the traffic light, call on arrival"
                        value={form.delivery_notes}
                        onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </>
                )}

                {form.fulfilment_type === 'pickup' && (
                  <p className="rounded-control bg-bamboo-50 p-4 text-sm text-bamboo-600">
                    We will send you the pickup point and a ready time once the kitchen confirms
                    your order.
                  </p>
                )}
              </div>
            </section>

            {/* --------------------------------------------------- payment */}
            <section className="card p-6">
              <h2 className="font-display text-lg text-bamboo-900">Payment method</h2>
              {!onlineEnabled && (
                <p className="mt-2 rounded-control bg-gold-50 p-3 text-sm text-gold-700">
                  Online mobile money payments are not switched on at the moment, so cash on
                  delivery is the only option right now. We will let you know as soon as mobile
                  money is live.
                </p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {methods.map((method) => {
                  const Icon = ICONS[method.id] || CreditCard;
                  const selected = form.payment_method === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setForm({ ...form, payment_method: method.id })}
                      className={`flex items-start gap-3 rounded-control border-2 p-4 text-left transition-colors ${
                        selected
                          ? 'border-primary-500 bg-clay-50'
                          : 'border-bamboo-200 hover:border-bamboo-300'
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${
                          selected ? 'bg-primary-500 text-white' : 'bg-bamboo-100 text-bamboo-600'
                        }`}
                      >
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-bamboo-900">
                          {method.label}
                        </span>
                        <span className="block text-xs text-bamboo-600">
                          {method.online
                            ? 'Approved on your phone'
                            : 'Pay when your food arrives'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------ summary */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <div className="card p-6">
              <h2 className="font-display text-lg text-bamboo-900">Order summary</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="text-bamboo-600">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="shrink-0 font-medium text-bamboo-900">
                      GH₵{' '}
                      {Number(
                        quote?.items?.find((i) => i.menu_item_id === item.menuItemId)?.line_total ?? 0
                      ).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              <hr className="my-4 border-bamboo-200" />

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-bamboo-600">Subtotal</dt>
                  <dd>
                    <BrandPrice amount={quote?.subtotal ?? 0} size="sm" tone="ink" />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-bamboo-600">Delivery</dt>
                  <dd>
                    <BrandPrice amount={quote?.delivery_fee ?? 0} size="sm" tone="ink" />
                  </dd>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-garden-700">
                    <dt>Promo</dt>
                    <dd>
                      <BrandPrice amount={-discount} size="sm" tone="ink" />
                    </dd>
                  </div>
                )}
                <hr className="border-bamboo-200" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-display text-base text-bamboo-900">Total</dt>
                  <dd>
                    <BrandPrice amount={total} size="lg" />
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-4">
              <label htmlFor="promo" className="label">
                Promo code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-bamboo-400"
                    aria-hidden="true"
                  />
                  <input
                    id="promo"
                    type="text"
                    maxLength={40}
                    placeholder="Enter a code"
                    value={form.promo_code}
                    onChange={(e) => {
                      setForm({ ...form, promo_code: e.target.value.toUpperCase() });
                      setPromoApplied(false);
                      setDiscount(0);
                    }}
                    disabled={promoApplied}
                    className="input-field pl-9 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={promoApplied || promoBusy || !form.promo_code.trim()}
                  className="btn-primary btn-sm shrink-0"
                >
                  {promoBusy ? 'Checking…' : promoApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
              {loading ? 'Placing your order…' : `Place order — GH₵ ${total.toFixed(2)}`}
            </button>

            <p className="text-center text-xs leading-relaxed text-bamboo-500">
              By placing this order you agree that our rider will contact you on the number above.
            </p>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
