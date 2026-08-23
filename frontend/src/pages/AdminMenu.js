import React, { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminMenu = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', is_available: true, is_featured: false });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [itemsRes, catsRes] = await Promise.all([menuAPI.getItems(), menuAPI.getCategories()]);
    setItems(itemsRes.data);
    setCategories(catsRes.data);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '', is_available: true, is_featured: false }); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, description: item.description || '', price: item.price, category_id: item.category_id, is_available: item.is_available, is_featured: item.is_featured }); setShowModal(true); };
  
  // reset image file when opening modal
  const openAddWithReset = () => { setImageFile(null); openAdd(); };
  const openEditWithReset = (item) => { setImageFile(null); openEdit(item); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Use FormData if an image is provided
      let response;
      if (imageFile) {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('price', parseFloat(form.price));
        fd.append('category_id', parseInt(form.category_id));
        fd.append('is_available', form.is_available);
        fd.append('is_featured', form.is_featured);
        fd.append('image', imageFile);
        if (editItem) response = await menuAPI.updateItem(editItem.id, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        else response = await menuAPI.createItem(fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const data = { ...form, price: parseFloat(form.price), category_id: parseInt(form.category_id) };
        if (editItem) response = await menuAPI.updateItem(editItem.id, data);
        else response = await menuAPI.createItem(data);
      }
      toast.success(editItem ? 'Item updated!' : 'Item created!');
      setShowModal(false);
      loadData();
    } catch (err) { toast.error('Operation failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await menuAPI.deleteItem(id); toast.success('Item deleted'); loadData(); } catch (err) { toast.error('Failed to delete'); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try { await menuAPI.createCategory(catForm); toast.success('Category added!'); setShowCategoryModal(false); setCatForm({ name: '', description: '' }); loadData(); } catch (err) { toast.error('Failed to add category'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await menuAPI.deleteCategory(id); toast.success('Category deleted'); loadData(); } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div className="page-container text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div></div>;

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Menu</h1>
          <p className="text-gray-500 mt-1">{items.length} items in {categories.length} categories</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCategoryModal(true)} className="btn-secondary flex items-center gap-2"><Plus size={16} /> Category</button>
          <button onClick={openAddWithReset} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Item</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Featured</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{item.description}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.category_name}</td>
                  <td className="px-6 py-4 font-medium text-primary-500">GH₵{parseFloat(item.price).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{item.is_featured ? '⭐' : '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditWithReset(item)} className="text-gray-400 hover:text-blue-500 mr-2"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (GH₵)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input-field">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full" />
                {editItem && editItem.image && (
                  <img src={editItem.image} alt="current" className="mt-2 h-20 object-cover rounded" />
                )}
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} className="rounded border-gray-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-gray-700">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-gray-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Add Category</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className="input-field" />
              </div>
              <button type="submit" className="btn-primary w-full">Add Category</button>
            </form>
            {categories.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Existing Categories:</p>
                <div className="space-y-1">
                  {categories.map(c => (
                    <div key={c.id} className="flex justify-between items-center text-sm py-1">
                      <span>{c.name}</span>
                      <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
