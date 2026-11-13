import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderAPI, apiErrorMessage } from '../services/api';
import {
  BrandPrice,
  BrandBadge,
  BrandLoader,
  BrandErrorState,
  PageMeta,
} from '../components/brand';
import {
  Package,
  Clock,
  ChefHat,
  Truck,
  CheckCircle,
  ArrowLeft,
  XCircle,
  ShoppingBag,
  Store,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ORDER_STATUS, ORDER_STATUS_FLOW, PAYMENT_STATUS } from '../config/brand';

const STEPS = [
  { key: 'placed', label: 'Placed', icon: <Package size={20} aria-hidden="true" /> },
  { key: 'confirmed', label: 'Confirmed', icon: <Clock size={20} aria-hidden="true" /> },
  { key: 'preparing', label: 'Preparing', icon: <ChefHat size={20} aria-hidden="true" /> },
  { key: 'ready', label: 'Ready', icon: <ShoppingBag size={20} aria-hidden="true" /> },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: <Truck size={20} aria-hidden="true" /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle size={20} aria-hidden="true" /> },
];

const OrderTrackingPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', id],
    queryFn: async () => (await orderAPI.getOrder(id)).data,
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (order) document.title = `Order #${order.id} | Afia Food Hub`;
  }, [order]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await orderAPI.cancelOrder(id, cancelReason.trim() || undefined);
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowCancelForm(false);
      setCancelReason('');
      toast.success('Your order has been cancelled.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not cancel that order.'));
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container max-w-3xl">
        <BrandLoader label="Loading your order…" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="page-container max-w-3xl">
        <BrandErrorState
          title="We could not find that order"
          description="It may have been removed, or it may belong to another account."
          linkTo="/orders"
          linkLabel="Back to my orders"
          onAction={refetch}
        />
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);
  const status = ORDER_STATUS[order.status] || { label: order.status, tone: 'neutral' };
  const payment = PAYMENT_STATUS[order.payment_status] || {
    label: order.payment_status,
    tone: 'neutral',
  };
  const canCancel = ['placed', 'confirmed'].includes(order.status);

  return (
    <div className="page-container max-w-3xl">
      <PageMeta title={`Order #${order.id}`} path={`/orders/${order.id}`} />

      <Link
        to="/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-bamboo-600 transition-colors hover:text-primary-600"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to my orders
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-display-sm text-bamboo-900">Order #{order.id}</h1>
            <p className="mt-1 text-sm text-bamboo-600">
              Placed on{' '}
              {new Date(order.created_at).toLocaleString(undefined, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <BrandBadge tone={status.tone}>{status.label}</BrandBadge>
            <BrandBadge tone={payment.tone}>{payment.label}</BrandBadge>
          </div>
        </div>

        {/* ------------------------------------------------- status track */}
        {!isCancelled && (
          <div className="my-9">
            <ol className="relative flex justify-between">
              {STEPS.map((step, index) => {
                const completed = index <= currentIndex;
                const current = index === currentIndex;
                return (
                  <li
                    key={step.key}
                    className="relative z-10 flex w-24 flex-col items-center text-center"
                    aria-current={current ? 'step' : undefined}
                  >
                    <span
                      className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 ${
                        completed
                          ? 'bg-primary-500 text-white'
                          : 'bg-bamboo-100 text-bamboo-400'
                      } ${current ? 'ring-4 ring-clay-100' : ''}`}
                    >
                      {step.icon}
                    </span>
                    <span
                      className={`text-xs font-medium leading-tight ${
                        completed ? 'text-primary-600' : 'text-bamboo-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
              <div className="absolute left-6 right-6 top-6 z-0 h-0.5 bg-bamboo-100" aria-hidden="true">
                <div
                  className="h-full bg-primary-500 transition-all duration-700"
                  style={{
                    width: `${(Math.max(currentIndex, 0) / (STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>
            </ol>
          </div>
        )}

        {/* ------------------------------------------------------ summary */}
        <div className="mb-6 flex items-start gap-3 rounded-control bg-bamboo-50 p-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isCancelled ? 'bg-danger-50 text-danger-600' : 'bg-clay-50 text-primary-600'
            }`}
          >
            {isCancelled ? (
              <XCircle size={18} aria-hidden="true" />
            ) : order.fulfilment_type === 'pickup' ? (
              <Store size={18} aria-hidden="true" />
            ) : (
              <Truck size={18} aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-bamboo-900">
              {isCancelled
                ? 'This order has been cancelled.'
                : order.fulfilment_type === 'pickup'
                  ? 'You are collecting this order.'
                  : 'Your order is on its way.'}
            </p>
            <p className="mt-1 text-sm text-bamboo-600">
              {status.description}
              {order.estimated_delivery &&
                !['delivered', 'cancelled'].includes(order.status) &&
                ` Estimated ${
                  order.fulfilment_type === 'pickup' ? 'ready' : 'delivery'
                }: ${new Date(order.estimated_delivery).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}.`}
            </p>
            {order.cancellation_reason && (
              <p className="mt-1 text-sm text-bamboo-500">
                Reason: {order.cancellation_reason}
              </p>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- details */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section>
            <h2 className="font-display text-base text-bamboo-900">Items</h2>
            <ul className="mt-3 space-y-2">
              {order.items?.map((item) => (
                <li key={item.id} className="rounded-control bg-bamboo-50 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-bamboo-900">
                      {item.name} <span className="text-bamboo-500">× {item.quantity}</span>
                    </span>
                    <BrandPrice
                      amount={Number(item.price) * item.quantity}
                      size="sm"
                      tone="ink"
                    />
                  </div>
                  {item.custom_options?.length > 0 && (
                    <p className="mt-1 text-xs text-bamboo-500">
                      {item.custom_options
                        .map((o) => `${o.option}: ${o.value}`)
                        .join(' · ')}
                    </p>
                  )}
                  {item.special_instructions && (
                    <p className="mt-1 text-xs text-bamboo-500">Note: {item.special_instructions}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-base text-bamboo-900">Order details</h2>
            <dl className="mt-3 space-y-2 rounded-control bg-bamboo-50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-bamboo-600">Subtotal</dt>
                <dd>
                  <BrandPrice amount={order.subtotal} size="sm" tone="ink" />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-bamboo-600">Delivery</dt>
                <dd>
                  <BrandPrice amount={order.delivery_fee} size="sm" tone="ink" />
                </dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-garden-700">
                  <dt>Discount {order.promo_code ? `(${order.promo_code})` : ''}</dt>
                  <dd>
                    <BrandPrice amount={-Number(order.discount)} size="sm" tone="ink" />
                  </dd>
                </div>
              )}
              <hr className="border-bamboo-200" />
              <div className="flex items-baseline justify-between">
                <dt className="font-display text-base text-bamboo-900">Total</dt>
                <dd>
                  <BrandPrice amount={order.total} size="lg" />
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="text-bamboo-600">
                  {order.fulfilment_type === 'pickup' ? 'Collection' : 'Delivery address'}:
                </span>{' '}
                <span className="font-medium text-bamboo-900">{order.delivery_address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-bamboo-400" aria-hidden="true" />
                <span className="text-bamboo-600">Payment method:</span>
                <span className="font-medium capitalize text-bamboo-900">
                  {String(order.payment_method).replace(/_/g, ' ')}
                </span>
              </div>
              {order.customer_phone && (
                <div>
                  <span className="text-bamboo-600">Contact:</span>{' '}
                  <span className="font-medium text-bamboo-900">{order.customer_phone}</span>
                </div>
              )}
              {order.delivery_notes && (
                <div>
                  <span className="text-bamboo-600">Notes:</span>{' '}
                  <span className="font-medium text-bamboo-900">{order.delivery_notes}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------- cancel */}
        {canCancel && (
          <div className="mt-8 border-t border-bamboo-100 pt-6">
            {!showCancelForm ? (
              <button
                type="button"
                onClick={() => setShowCancelForm(true)}
                className="btn-ghost text-danger-600 hover:bg-danger-50"
              >
                Cancel this order
              </button>
            ) : (
              <div className="rounded-card border border-danger-200 bg-danger-50 p-4">
                <h3 className="font-display text-base text-danger-700">Cancel this order?</h3>
                <p className="mt-1 text-sm text-danger-700/80">
                  We can only cancel while the order is still placed or confirmed.
                </p>
                <label htmlFor="cancel-reason" className="label mt-4 text-danger-700">
                  Reason (optional)
                </label>
                <input
                  id="cancel-reason"
                  type="text"
                  maxLength={300}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Changed my mind…"
                  className="input-field"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="btn-danger btn-sm"
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel my order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelForm(false)}
                    className="btn-secondary btn-sm"
                  >
                    Keep my order
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------ history */}
        {order.status_history?.length > 0 && (
          <section className="mt-8 border-t border-bamboo-100 pt-6">
            <h2 className="font-display text-base text-bamboo-900">Timeline</h2>
            <ol className="mt-3 space-y-3">
              {order.status_history.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" aria-hidden="true" />
                  <div>
                    <p className="font-medium capitalize text-bamboo-700">
                      {String(entry.status).replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-bamboo-500">
                      {new Date(entry.created_at).toLocaleString()}
                      {entry.note ? ` — ${entry.note}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
