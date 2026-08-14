import React, { useState, useEffect } from 'react';
import { promoAPI } from '../services/api';
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminPromos = () => {
  const [promos, setPromos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_order: '', max_uses: '', expires_at: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPromos(); }, []);

  const loadPromos = async () => {
    try { const res = await promoAPI.getAll(); setPromos(res.data); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openAdd = () => { setEditPromo(null); setForm({ code: '', discount_type: 'percentage', discount_value: '', min_order: '', max_uses: '', expires_at: '' }); setShowModal(true); };
  const openEdit = (p) => { setEditPromo(p); setForm({ code: p.code, discount_type: p.discount_type, discount_value: p.discount_value, min_order: p.min_order || '', max_uses: p.max_uses || '', expires_at: p.expires_at ? p.expires_at.split('T')[0] : '' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, discount_value: parseFloat(form.discount_value), min_order: form.min_order ? parseFloat(form.min_order) : 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null, expires_at: form.expires_at || null };
      if (editPromo) { await promoAPI.update(editPromo.id, data); toast.success('Promo updated!'); }
      else { await promoAPI.create(data); toast.success('Promo created!'); }
      setShowModal(false);
      loadPromos();
    } catch (err) { toast.error('Operation failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    try { await promoAPI.delete(id); toast.success('Deleted'); loadPromos(); } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 mt-1">{promos.length} promo codes</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Promo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map(p => (
          <div key={p.id} className="card p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-primary-500" />
                <span className="font-bold text-lg text-gray-900">{p.code}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Discount: {p.discount_type === 'percentage' ? `${p.discount_value}%` : `GH₵${p.discount_value}`}</p>
              <p>Min. Order: GH₵{parseFloat(p.min_order || 0).toFixed(2)}</p>
              {p.max_uses && <p>Usage: {p.used_count}/{p.max_uses}</p>}
              {p.expires_at && <p>Expires: {new Date(p.expires_at).toLocaleDateString()}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1"><Edit2 size={14} /> Edit</button>
              <button onClick={() => handleDelete(p.id)} className="btn-danger text-sm flex-1 flex items-center justify-center gap-1"><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{editPromo ? 'Edit Promo' : 'Add Promo'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input-field" required placeholder="e.g. SUMMER10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className="input-field">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (GH₵)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <input type="number" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order (GH₵)</label>
                  <input type="number" step="0.01" value={form.min_order} onChange={e => setForm({ ...form, min_order: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} className="input-field" />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editPromo ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
