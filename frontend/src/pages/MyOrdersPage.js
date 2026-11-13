import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderAPI } from '../services/api';
import { BrandPrice, BrandBadge, BrandEmptyState, BrandErrorState, PageMeta } from '../components/brand';
import { Package, ChevronRight } from 'lucide-react';
import { ORDER_STATUS, PAYMENT_STATUS } from '../config/brand';

const MyOrdersPage = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', 'mine', page],
    queryFn: async () => (await orderAPI.getMyOrders({ page, limit: 10 })).data,
    placeholderData: (previous) => previous,
  });

  const orders = data?.orders || [];

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="skeleton h-9 w-48" />
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container max-w-4xl">
        <BrandErrorState
          title="We could not load your orders"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      <PageMeta title="My orders" path="/orders" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">My orders</h1>
        <p className="mt-1 text-bamboo-600">Every order you have placed with us.</p>
      </header>

      {orders.length === 0 ? (
        <BrandEmptyState
          title="No orders yet"
          description="When you place an order it will appear here, with live progress from our kitchen to your door."
          actionLabel="Browse the menu"
          actionTo="/menu"
          icon={Package}
        />
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => {
              const status = ORDER_STATUS[order.status] || {
                label: order.status,
                tone: 'neutral',
              };
              const payment = PAYMENT_STATUS[order.payment_status] || {
                label: order.payment_status,
                tone: 'neutral',
              };
              return (
                <li key={order.id}>
                  <Link
                    to={`/orders/${order.id}`}
                    className="card-interactive flex items-center justify-between gap-4 p-5"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-clay-50">
                        <Package size={20} className="text-primary-600" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-bamboo-900">Order #{order.id}</h2>
                        <p className="mt-0.5 text-sm text-bamboo-600">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' · '}
                          {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <BrandBadge tone={status.tone}>{status.label}</BrandBadge>
                          <BrandBadge tone={payment.tone}>{payment.label}</BrandBadge>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <BrandPrice amount={order.total} tone="ink" />
                      <ChevronRight size={18} className="text-bamboo-300" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {data.totalPages > 1 && (
            <nav className="mt-8 flex justify-center gap-2" aria-label="Orders pagination">
              {Array.from({ length: data.totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={`h-10 w-10 rounded-control text-sm font-medium transition-colors ${
                    page === i + 1
                      ? 'bg-primary-500 text-white'
                      : 'bg-bamboo-100 text-bamboo-700 hover:bg-bamboo-200'
                  }`}
                  aria-current={page === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default MyOrdersPage;
