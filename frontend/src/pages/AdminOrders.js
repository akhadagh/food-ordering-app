import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI, apiErrorMessage } from '../services/api';
import { BrandPrice, BrandBadge, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import { RefreshCw, ChevronDown, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { ORDER_STATUS, ORDER_STATUS_FLOW, PAYMENT_STATUS } from '../config/brand';

const STATUS_OPTIONS = [
  ...ORDER_STATUS_FLOW.map((value) => ({ value, label: ORDER_STATUS[value].label })),
  { value: 'cancelled', label: 'Cancelled' },
];

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'orders', status, search, page],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      return (await adminAPI.getOrders(params)).data;
    },
    placeholderData: (previous) => previous,
  });

  const orders = data?.orders || [];

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await adminAPI.updateOrderStatus(orderId, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Order status updated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not update that order.'));
      await refetch();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="page-container">
      <PageMeta title="Manage orders" path="/admin/orders" />

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-bamboo-900">Manage orders</h1>
          <p className="mt-1 text-bamboo-600">Move each order through the kitchen and out the door.</p>
        </div>
        <button type="button" onClick={() => refetch()} className="btn-secondary btn-sm">
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bamboo-400"
            aria-hidden="true"
          />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            type="search"
            placeholder="Search by customer, address or order number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-11"
          />
        </div>
        <div className="sm:w-56">
          <label htmlFor="order-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="order-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="select-field"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <BrandLoader label="Loading orders…" />}

      {isError && (
        <BrandErrorState
          title="We could not load the orders"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="card p-12 text-center text-bamboo-600">
          No orders match that filter.
        </div>
      )}

      {orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUS[order.status] || { label: order.status, tone: 'neutral' };
            const paymentInfo = PAYMENT_STATUS[order.payment_status] || {
              label: order.payment_status,
              tone: 'neutral',
            };
            const allowed = [
              ...(ORDER_STATUS_FLOW.includes(order.status)
                ? ORDER_STATUS_FLOW.slice(ORDER_STATUS_FLOW.indexOf(order.status) + 1)
                : []),
              ...(order.status !== 'delivered' && order.status !== 'cancelled' ? ['cancelled'] : []),
            ];

            return (
              <article key={order.id} className="card p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-base text-bamboo-900">Order #{order.id}</h2>
                      <BrandBadge tone={statusInfo.tone}>{statusInfo.label}</BrandBadge>
                      <BrandBadge tone={paymentInfo.tone}>{paymentInfo.label}</BrandBadge>
                    </div>

                    <p className="mt-1.5 text-sm text-bamboo-600">
                      {order.user_name} · {order.user_email}
                      {order.user_phone ? ` · ${order.user_phone}` : ''}
                    </p>
                    <p className="mt-0.5 text-sm text-bamboo-600">
                      {new Date(order.created_at).toLocaleString()} ·{' '}
                      <span className="capitalize">
                        {String(order.payment_method).replace(/_/g, ' ')}
                      </span>
                      {order.fulfilment_type === 'pickup' && ' · collection'}
                    </p>

                    {order.items?.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-pill bg-bamboo-100 px-2.5 py-1 text-xs text-bamboo-700"
                          >
                            {item.name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="mt-3 text-sm text-bamboo-600">
                      <span className="font-medium text-bamboo-700">
                        {order.fulfilment_type === 'pickup' ? 'Collection note' : 'Address'}:
                      </span>{' '}
                      {order.delivery_address}
                    </p>
                    {order.delivery_notes && (
                      <p className="mt-1 text-sm text-bamboo-500">Note: {order.delivery_notes}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                    <BrandPrice amount={order.total} size="lg" />
                    {allowed.length > 0 ? (
                      <div className="relative">
                        <label htmlFor={`status-${order.id}`} className="sr-only">
                          Update status for order {order.id}
                        </label>
                        <select
                          id={`status-${order.id}`}
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className="select-field w-48 pr-9 text-sm"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={option.value !== order.status && !allowed.includes(option.value)}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={15}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-bamboo-400"
                          aria-hidden="true"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-bamboo-400">Final status</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {data?.totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Orders pagination">
          {Array.from({ length: data.totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              className={`h-10 w-10 rounded-control text-sm font-medium transition-colors ${
                page === i + 1 ? 'bg-primary-500 text-white' : 'bg-bamboo-100 text-bamboo-700'
              }`}
              aria-current={page === i + 1 ? 'page' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default AdminOrders;
