import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { apiErrorMessage } from '../services/api';
import { BrandLogo, BrandPrice, BrandEmptyState, BrandErrorState, PageMeta } from '../components/brand';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CartPage = () => {
  const { items, quote, cart, loading, error, reload, updateQuantity, removeItem } = useCart();
  const [busyId, setBusyId] = useState(null);

  const handleQuantity = async (item, quantity) => {
    setBusyId(item.menuItemId);
    try {
      await updateQuantity(item.id, quantity);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not update your cart.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (item) => {
    setBusyId(item.menuItemId);
    try {
      await removeItem(item.id);
      toast.success(`${item.name} removed from your cart`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not remove that item.'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton h-9 w-40" />
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-32" />
            ))}
          </div>
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load your cart"
          description={error}
          actionLabel="Try again"
          onAction={reload}
        />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="page-container">
        <PageMeta title="Your cart" path="/cart" />
        <BrandEmptyState
          title="Your cart is empty"
          description="Nothing here yet. Find something good in the kitchen."
          actionLabel="Browse the menu"
          actionTo="/menu"
          icon={ShoppingBag}
        />
      </div>
    );
  }

  // A cart can be present but not priceable - for example when a dish now
  // needs an option that was not chosen. The API explains why, so show that
  // rather than a generic message.
  const blockingIssue = (cart?.issues || []).find((issue) => issue.code === 'cart_invalid');

  return (
    <div className="page-container">
      <PageMeta title="Your cart" path="/cart" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Your cart</h1>
        <p className="mt-1 text-bamboo-600">
          {items.length} item{items.length === 1 ? '' : 's'} — priced by our kitchen, not your browser.
        </p>
      </header>

      {blockingIssue && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-card border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {blockingIssue.message} Go back to{' '}
            <Link to="/menu" className="font-semibold underline">
              the menu
            </Link>{' '}
            to finish your choices.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const line = quote?.items?.find((i) => i.menu_item_id === item.menuItemId);
            const options = item.customOptions || [];
            return (
              <article key={item.id} className="card flex gap-4 p-4">
                <div className="media h-24 w-24 shrink-0 rounded-control">
                  {line ? (
                    <img src={line.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-clay-50">
                      <BrandLogo variant="icon" height={32} className="opacity-25" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-base text-bamboo-900">{item.name}</h2>
                      {options.length > 0 && (
                        <p className="mt-0.5 text-xs text-bamboo-500">
                          {options.map((o) => `${o.option}: ${o.value}`).join(' · ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="mt-0.5 text-xs text-bamboo-500">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={busyId === item.menuItemId}
                      className="shrink-0 rounded-control p-2 text-bamboo-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                      aria-label={`Remove ${item.name} from your cart`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-control border border-bamboo-200 bg-white">
                      <button
                        type="button"
                        onClick={() => handleQuantity(item, item.quantity - 1)}
                        disabled={busyId === item.menuItemId}
                        className="rounded-l-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-50 disabled:opacity-50"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantity(item, item.quantity + 1)}
                        disabled={busyId === item.menuItemId}
                        className="rounded-r-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-50 disabled:opacity-50"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <BrandPrice amount={line?.line_total ?? 0} size="sm" tone="ink" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-6">
            <h2 className="font-display text-lg text-bamboo-900">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
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
              {Number(quote?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-garden-700">
                  <dt>Discount</dt>
                  <dd>
                    <BrandPrice amount={-Number(quote.discount)} size="sm" tone="ink" />
                  </dd>
                </div>
              )}
              <hr className="border-bamboo-200" />
              <div className="flex items-baseline justify-between">
                <dt className="font-display text-base text-bamboo-900">Total</dt>
                <dd>
                  <BrandPrice amount={quote?.total ?? 0} size="lg" />
                </dd>
              </div>
            </dl>

            <Link to="/checkout" className="btn-primary mt-6 w-full">
              Proceed to checkout <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/menu" className="btn-secondary mt-2 w-full">
              Keep browsing
            </Link>

            <p className="mt-5 text-xs leading-relaxed text-bamboo-500">
              Totals are calculated by our kitchen from the live menu, so what you see here is
              exactly what you will be charged.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
