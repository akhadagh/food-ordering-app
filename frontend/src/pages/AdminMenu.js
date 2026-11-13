import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { menuAPI, apiErrorMessage } from '../services/api';
import { BrandPrice, BrandBadge, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import { Plus, Edit2, Trash2, X, ImagePlus, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  is_available: true,
  is_featured: false,
  stock_quantity: 0,
};

const AdminMenu = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'menu'],
    queryFn: async () => {
      const [itemsRes, catsRes] = await Promise.all([
        menuAPI.getItems({ limit: 200 }),
        menuAPI.getCategories(),
      ]);
      return { items: itemsRes.data, categories: catsRes.data };
    },
  });

  const items = data?.items || [];
  const categories = data?.categories || [];
  const loadError = isError ? apiErrorMessage(error, 'We could not load the menu.') : null;

  const openAdd = () => {
    setEditItem(null);
    setImageFile(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setImageFile(null);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category_id: item.category_id || '',
      is_available: Boolean(item.is_available),
      is_featured: Boolean(item.is_featured),
      stock_quantity: item.stock_quantity ?? 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const fields = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        category_id: form.category_id ? Number(form.category_id) : undefined,
        is_available: form.is_available,
        is_featured: form.is_featured,
        stock_quantity: Number(form.stock_quantity) || 0,
      };

      if (imageFile) {
        const data = new FormData();
        data.append('name', fields.name);
        if (fields.description) data.append('description', fields.description);
        data.append('price', String(fields.price));
        if (fields.category_id) data.append('category_id', String(fields.category_id));
        data.append('is_available', String(fields.is_available));
        data.append('is_featured', String(fields.is_featured));
        data.append('stock_quantity', String(fields.stock_quantity));
        data.append('image', imageFile);

        if (editItem) await menuAPI.updateItem(editItem.id, data);
        else await menuAPI.createItem(data);
      } else {
        if (editItem) await menuAPI.updateItem(editItem.id, fields);
        else await menuAPI.createItem(fields);
      }

      toast.success(editItem ? 'Dish updated' : 'Dish added');
      setShowModal(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not save that dish.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? It will be removed from the menu.`)) return;
    try {
      await menuAPI.deleteItem(item.id);
      toast.success('Dish deleted');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not delete that dish.'));
    }
  };

  const handleAddCategory = async (event) => {
    event.preventDefault();
    try {
      await menuAPI.createCategory({
        name: catForm.name.trim(),
        description: catForm.description.trim() || undefined,
      });
      toast.success('Category added');
      setShowCategoryModal(false);
      setCatForm({ name: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not add that category.'));
    }
  };

  const handleDeleteCategory = async (category) => {
    if (
      !window.confirm(
        `Delete "${category.name}"? The dishes in it stay on the menu but lose their category.`
      )
    )
      return;
    try {
      await menuAPI.deleteCategory(category.id);
      toast.success('Category deleted');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not delete that category.'));
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <BrandLoader label="Loading the menu…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <BrandErrorState
          title="We could not load the menu"
          description={loadError}
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageMeta title="Manage menu" path="/admin/menu" />

      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-bamboo-900">Manage menu</h1>
          <p className="mt-1 text-bamboo-600">
            {items.length} dish{items.length === 1 ? '' : 'es'} across {categories.length} categor
            {categories.length === 1 ? 'y' : 'ies'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="btn-secondary btn-sm"
          >
            <FolderPlus size={15} aria-hidden="true" /> Category
          </button>
          <button type="button" onClick={openAdd} className="btn-primary btn-sm">
            <Plus size={15} aria-hidden="true" /> Add dish
          </button>
        </div>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem]">
            <caption className="sr-only">Menu items</caption>
            <thead className="bg-bamboo-50">
              <tr>
                {['Dish', 'Category', 'Price', 'Availability', 'Featured', 'Actions'].map((head) => (
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
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-bamboo-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="media h-11 w-11 shrink-0 rounded-control">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-clay-50">
                            <ImagePlus size={16} className="text-bamboo-300" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-bamboo-900">{item.name}</p>
                        <p className="truncate text-xs text-bamboo-500">
                          {item.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-bamboo-600">
                    {item.category_name || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <BrandPrice amount={item.price} size="sm" />
                  </td>
                  <td className="px-5 py-4">
                    <BrandBadge tone={item.is_available ? 'success' : 'danger'}>
                      {item.is_available ? 'Available' : 'Hidden'}
                    </BrandBadge>
                  </td>
                  <td className="px-5 py-4 text-sm text-bamboo-500">
                    {item.is_featured ? 'Yes' : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-bamboo-100 hover:text-primary-600"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="ml-1 rounded-control p-2 text-bamboo-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------- dish modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bamboo-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dish-modal-title"
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 id="dish-modal-title" className="font-display text-lg text-bamboo-900">
                {editItem ? 'Edit dish' : 'Add a dish'}
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
                <label htmlFor="dish-name" className="label">
                  Name
                </label>
                <input
                  id="dish-name"
                  type="text"
                  required
                  maxLength={140}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="dish-description" className="label">
                  Description
                </label>
                <textarea
                  id="dish-description"
                  rows={2}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dish-price" className="label">
                    Price (GH₵)
                  </label>
                  <input
                    id="dish-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="dish-category" className="label">
                    Category
                  </label>
                  <select
                    id="dish-category"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="select-field"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="dish-stock" className="label">
                  Stock
                </label>
                <input
                  id="dish-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className="input-field"
                />
                <p className="field-hint">Set to 0 when stock is not tracked for this dish.</p>
              </div>

              <div>
                <label htmlFor="dish-image" className="label">
                  Photo
                </label>
                <input
                  id="dish-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-bamboo-600 file:mr-3 file:rounded-control file:border-0 file:bg-bamboo-100 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-bamboo-700 hover:file:bg-bamboo-200"
                />
                {editItem?.image_url && (
                  <img
                    src={editItem.image_url}
                    alt="Current dish photo"
                    className="mt-3 h-24 w-24 rounded-control object-cover"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                    className="h-4 w-4 rounded border-bamboo-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-bamboo-700">Available to customers</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-bamboo-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-bamboo-700">Featured on the homepage</span>
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editItem ? 'Update dish' : 'Add dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- category modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bamboo-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCategoryModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 id="category-modal-title" className="font-display text-lg text-bamboo-900">
                Categories
              </h2>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-bamboo-100 hover:text-bamboo-700"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label htmlFor="category-name" className="label">
                  Category name
                </label>
                <input
                  id="category-name"
                  type="text"
                  required
                  maxLength={80}
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="category-description" className="label">
                  Description
                </label>
                <input
                  id="category-description"
                  type="text"
                  maxLength={400}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="input-field"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                <Plus size={16} aria-hidden="true" /> Add category
              </button>
            </form>

            {categories.length > 0 && (
              <div className="mt-6 border-t border-bamboo-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-bamboo-700">Existing categories</h3>
                <ul className="space-y-1">
                  {categories.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center justify-between gap-3 rounded-control px-1 py-1.5 text-sm"
                    >
                      <span className="text-bamboo-800">{category.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="rounded-control p-1.5 text-bamboo-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
