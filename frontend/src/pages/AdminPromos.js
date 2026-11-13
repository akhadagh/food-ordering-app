import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { promoAPI, apiErrorMessage } from '../services/api';
import { BrandBadge, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order: '',
  max_discount: '',
  max_uses: '',
  is_active: true,
  expires_at: '',
};

const AdminPromos = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: promos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'promos'],
    queryFn: async () => (await promoAPI.getAll()).data,
  });

  const openAdd = () => {
    setEditPromo(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (promo) => {
    setEditPromo(promo);
    setForm({
      code: promo.code || '',
      discount_type: promo.discount_type || 'percentage',
      discount_value: String(promo.discount_value ?? ''),
      min_order: promo.min_order ? String(promo.min_order) : '',
      max_discount: promo.max_discount ? String(promo.max_discount) : '',
      max_uses: promo.max_uses ? String(promo.max_uses) : '',
      is_active: Boolean(promo.is_active),
      expires_at: promo.expires_at ? String(promo.expires_at).slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discount_type,
        discountValue: Number(form.discount_value),
        minOrder: Number(form.min_order) || 0,
        maxDiscount: form.max_discount ? Number(form.max_discount) : undefined,
        maxUses: form.max_uses ? Number(form.max_uses) : undefined,
        isActive: form.is_active,
        expiresAt: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      };

      if (editPromo) await promoAPI.update(editPromo.id, payload);
      else await promoAPI.create(payload);

      toast.success(editPromo ? 'Promo code updated' : 'Promo code created');
      setShowModal(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not save that promo code.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete the promo code "${promo.code}"?`)) return;
    try {
      await promoAPI.delete(promo.id);
      toast.success('Promo code deleted');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'promos'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not delete that promo code.'));
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <BrandLoader label="Loading promo codes…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load the promo codes"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={refetch}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageMeta title="Promo codes" path="/admin/promos" />

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-bamboo-900">Promo codes</h1>
          <p className="mt-1 text-bamboo-600">
            Only codes created here are accepted at checkout — nothing is advertised that does not
            exist.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary btn-sm">
          <Plus size={15} aria-hidden="true" /> New promo
        </button>
      </header>

      {promos.length === 0 ? (
        <div className="card p-12 text-center">
          <Tag size={28} className="mx-auto mb-4 text-bamboo-300" aria-hidden="true" />
          <h2 className="font-display text-lg text-bamboo-900">No promo codes yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-bamboo-600">
            Create one here and it will work at checkout straight away. Until then the customer
            checkout shows no discount at all.
          </p>
          <button type="button" onClick={openAdd} className="btn-primary mt-6">
            <Plus size={16} aria-hidden="true" /> Create the first promo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {promos.map((promo) => {
            const expired = promo.expires_at && new Date(promo.expires_at).getTime() < Date.now();
            const usedUp = promo.max_uses !== null && promo.used_count >= promo.max_uses;
            return (
              <article key={promo.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Tag size={17} className="text-primary-500" aria-hidden="true" />
                    <h2 className="font-display text-lg text-bamboo-900">{promo.code}</h2>
                  </div>
                  <BrandBadge tone={promo.is_active && !expired && !usedUp ? 'success' : 'danger'}>
                    {expired ? 'Expired' : usedUp ? 'Used up' : promo.is_active ? 'Active' : 'Inactive'}
                  </BrandBadge>
                </div>

                <dl className="mt-4 space-y-1.5 text-sm text-bamboo-600">
                  <div>
                    <dt className="inline">Discount: </dt>
                    <dd className="inline font-medium text-bamboo-900">
                      {promo.discount_type === 'percentage'
                        ? `${Number(promo.discount_value)}%`
                        : `GH₵ ${Number(promo.discount_value).toFixed(2)}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">Minimum order: </dt>
                    <dd className="inline font-medium text-bamboo-900">
                      GH₵ {Number(promo.min_order || 0).toFixed(2)}
                    </dd>
                  </div>
                  {promo.max_discount && (
                    <div>
                      <dt className="inline">Capped at: </dt>
                      <dd className="inline font-medium text-bamboo-900">
                        GH₵ {Number(promo.max_discount).toFixed(2)}
                      </dd>
                    </div>
                  )}
                  {promo.max_uses && (
                    <div>
                      <dt className="inline">Used: </dt>
                      <dd className="inline font-medium text-bamboo-900">
                        {promo.used_count}/{promo.max_uses}
                      </dd>
                    </div>
                  )}
                  {promo.expires_at && (
                    <div>
                      <dt className="inline">Expires: </dt>
                      <dd className="inline font-medium text-bamboo-900">
                        {new Date(promo.expires_at).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(promo)}
                    className="btn-secondary btn-sm flex-1"
                  >
                    <Edit2 size={14} aria-hidden="true" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo)}
                    className="btn-danger btn-sm flex-1"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bamboo-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 id="promo-modal-title" className="font-display text-lg text-bamboo-900">
                {editPromo ? 'Edit promo code' : 'New promo code'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-bamboo-100 hover:text-bamboo-700"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="promo-code" className="label">
                  Code
                </label>
                <input
                  id="promo-code"
                  type="text"
                  required
                  minLength={3}
                  maxLength={32}
                  placeholder="e.g. AKWAABA20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-type" className="label">
                    Type
                  </label>
                  <select
                    id="promo-type"
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                    className="select-field"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (GH₵)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="promo-value" className="label">
                    Value
                  </label>
                  <input
                    id="promo-value"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-min" className="label">
                    Minimum order (GH₵)
                  </label>
                  <input
                    id="promo-min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="promo-cap" className="label">
                    Maximum discount (GH₵)
                  </label>
                  <input
                    id="promo-cap"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="promo-uses" className="label">
                    Maximum uses
                  </label>
                  <input
                    id="promo-uses"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Unlimited"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="promo-expiry" className="label">
                    Expires
                  </label>
                  <input
                    id="promo-expiry"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-bamboo-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-bamboo-700">Active — customers can use this code</span>
              </label>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editPromo ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
