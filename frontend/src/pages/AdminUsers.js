import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAPI, apiErrorMessage } from '../services/api';
import { BrandBadge, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import { Search, ShieldCheck, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: async () => {
      const params = { page, limit: 25 };
      if (search.trim()) params.search = search.trim();
      return (await adminAPI.getUsers(params)).data;
    },
    placeholderData: (previous) => previous,
  });

  const users = data?.users || [];

  const toggleRole = async (user) => {
    const nextRole = user.role === 'admin' ? 'customer' : 'admin';
    try {
      await adminAPI.setUserRole(user.id, nextRole);
      toast.success(`${user.email} is now ${nextRole === 'admin' ? 'an administrator' : 'a customer'}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not change that role.'));
    }
  };

  const toggleActive = async (user) => {
    try {
      await adminAPI.setUserActive(user.id, !user.is_active);
      toast.success(`${user.email} has been ${user.is_active ? 'deactivated' : 'reactivated'}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not change that account.'));
    }
  };

  return (
    <div className="page-container">
      <PageMeta title="Customers" path="/admin/users" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Customers</h1>
        <p className="mt-1 text-bamboo-600">
          Everyone with an account, and what they have ordered.
        </p>
      </header>

      <div className="mb-6 relative max-w-md">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bamboo-400"
          aria-hidden="true"
        />
        <label htmlFor="user-search" className="sr-only">
          Search customers
        </label>
        <input
          id="user-search"
          type="search"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input-field pl-11"
        />
      </div>

      {isLoading && <BrandLoader label="Loading customers…" />}

      {isError && (
        <BrandErrorState
          title="We could not load the customers"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      )}

      {!isLoading && !isError && users.length === 0 && (
        <div className="card p-12 text-center text-bamboo-600">No customers match that search.</div>
      )}

      {users.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem]">
              <caption className="sr-only">Customer accounts</caption>
              <thead className="bg-bamboo-50">
                <tr>
                  {['Customer', 'Contact', 'Role', 'Orders', 'Lifetime value', 'Actions'].map((head) => (
                    <th
                      key={head}
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-bamboo-500"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bamboo-100">
                {users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-bamboo-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-bamboo-900">{user.name}</p>
                          {!user.is_active && (
                            <BrandBadge tone="danger" className="mt-1">
                              Deactivated
                            </BrandBadge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-bamboo-600">
                      <p className="truncate">{user.email}</p>
                      {user.phone && <p className="truncate text-xs">{user.phone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <BrandBadge tone={user.role === 'admin' ? 'accent' : 'neutral'}>
                        {user.role === 'admin' ? 'Administrator' : 'Customer'}
                      </BrandBadge>
                    </td>
                    <td className="px-5 py-4 text-sm tabular-nums text-bamboo-700">{user.order_count}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-bamboo-700">
                      GH₵ {Number(user.lifetime_value || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleRole(user)}
                          className="btn-secondary btn-sm"
                          aria-label={`Change the role of ${user.email}`}
                        >
                          <UserCog size={14} aria-hidden="true" />
                          {user.role === 'admin' ? 'Make customer' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          className="btn-ghost btn-sm"
                        >
                          {user.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2" aria-label="Customers pagination">
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

export default AdminUsers;
