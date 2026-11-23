import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { menuAPI, apiErrorMessage } from '../services/api';
import { BrandPrice, BrandBadge, BrandErrorState, BrandLoader, PageMeta } from '../components/brand';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  ImagePlus,
  FolderPlus,
  Star,
  ArrowUp,
  ArrowDown,
  Save,
} from 'lucide-react';
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
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catEdits, setCatEdits] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'menu'],
    queryFn: async () => {
      const [itemsRes, catsRes] = await Promise.all([
        menuAPI.getItems({ limit: 200, include_inactive: true }),
        menuAPI.getCategories({ include_inactive: true }),
      ]);
      return { items: itemsRes.data, categories: catsRes.data };
    },
  });

  const items = data?.items || [];
  const categories = data?.categories || [];
  const loadError = isError ? apiErrorMessage(error, 'We could not load the menu.') : null;

  useEffect(() => {
    if (!showCategoryModal) return;
    const next = {};
    for (const category of categories) next[category.id] = category.description || '';
    setCatEdits(next);
  }, [showCategoryModal, categories]);

  const openAdd = () => {
    setEditItem(null);
    setExistingImages([]);
    setNewImages([]);
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setExistingImages(item.images || (item.image_url ? [{ url: item.image_url, is_cover: true }] : []));
    setNewImages([]);
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

      if (newImages.length) {
        const data = new FormData();
        data.append('name', fields.name);
        if (fields.description) data.append('description', fields.description);
        data.append('price', String(fields.price));
        if (fields.category_id) data.append('category_id', String(fields.category_id));
        data.append('is_available', String(fields.is_available));
        data.append('is_featured', String(fields.is_featured));
        data.append('stock_quantity', String(fields.stock_quantity));
        for (const image of newImages) data.append('images', image.file);

        if (editItem) await menuAPI.updateItem(editItem.id, data);
        else await menuAPI.createItem(data);
      } else if (editItem) {
        await menuAPI.updateItem(editItem.id, fields);
      } else {
        await menuAPI.createItem(fields);
      }

      toast.success(editItem ? 'Dish updated' : 'Dish added');
      closeModal();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not save that dish.'));
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    for (const image of newImages) {
      if (image.preview) URL.revokeObjectURL(image.preview);
    }
    setNewImages([]);
    setExistingImages([]);
    setShowModal(false);
  };

  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files || []);
    const room = Math.max(0, 8 - existingImages.length - newImages.length);
    const next = files.slice(0, room).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    if (files.length > room) {
      toast.error('A dish can have at most 8 photographs.');
    }
    setNewImages((current) => [...current, ...next]);
    event.target.value = '';
  };

  const removeNewImage = (index) => {
    setNewImages((current) => {
      const copy = [...current];
      const [removed] = copy.splice(index, 1);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  };

  const applyItemResponse = (response) => {
    const item = response?.data;
    if (!item) return;
    setEditItem(item);
    setExistingImages(item.images || []);
    queryClient.setQueryData(['admin', 'menu'], (current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((row) => (row.id === item.id ? item : row)),
      };
    });
  };

  const handleDeleteImage = async (image) => {
    if (!editItem?.id) return;
    if (!window.confirm('Remove this photograph from the dish?')) return;
    try {
      applyItemResponse(await menuAPI.deleteItemImage(editItem.id, image.id));
      toast.success('Photograph removed');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not remove that photograph.'));
    }
  };

  const handleMakeCover = async (image) => {
    if (!editItem?.id) return;
    try {
      const ordered = existingImages.map((entry, index) => ({
        id: entry.id,
        sort_order: index,
        is_cover: entry.id === image.id,
      }));
      applyItemResponse(await menuAPI.reorderItemImages(editItem.id, ordered));
      toast.success('Cover photograph updated');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not set that cover photograph.'));
    }
  };

  const handleMoveImage = async (image, direction) => {
    if (!editItem?.id) return;
    const index = existingImages.findIndex((entry) => entry.id === image.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= existingImages.length) return;
    const ordered = [...existingImages];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      const payload = ordered.map((entry, position) => ({
        id: entry.id,
        sort_order: position,
        is_cover: Boolean(entry.is_cover),
      }));
      applyItemResponse(await menuAPI.reorderItemImages(editItem.id, payload));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not reorder those photographs.'));
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

  const handleToggleCategory = async (category) => {
    try {
      await menuAPI.updateCategory(category.id, { is_active: !category.is_active });
      toast.success(category.is_active ? 'Category hidden' : 'Category activated');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not update that category.'));
    }
  };

  const handleSaveCategoryDescription = async (category) => {
    try {
      await menuAPI.updateCategory(category.id, {
        description: catEdits[category.id] ?? '',
      });
      toast.success('Category description saved');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'menu'] });
      await queryClient.invalidateQueries({ queryKey: ['menu'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not save that description.'));
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
            <FolderPlus size={15} aria-hidden="true" /> Manage categories
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
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="select-field"
                  >
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
                <label htmlFor="dish-images" className="label">
                  Photographs
                </label>
                <p className="field-hint mb-2">
                  Add up to 8 photos of this exact meal. The cover photo is shown first.
                </p>
                <input
                  id="dish-images"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelection}
                  className="w-full text-sm text-bamboo-600 file:mr-3 file:rounded-control file:border-0 file:bg-bamboo-100 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-bamboo-700 hover:file:bg-bamboo-200"
                />

                {editItem && existingImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {existingImages.map((image, index) => (
                      <div
                        key={image.id || image.url}
                        className="overflow-hidden rounded-control border border-bamboo-200 bg-bamboo-50"
                      >
                        <div className="relative">
                          <img
                            src={image.url}
                            alt={`${editItem.name} photo ${index + 1}`}
                            className="h-24 w-full object-cover"
                          />
                          {image.is_cover && (
                            <span className="absolute left-1.5 top-1.5 rounded-pill bg-primary-500 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
                              Cover
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 p-1.5">
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(image, -1)}
                              disabled={index === 0}
                              className="rounded p-1 text-bamboo-500 hover:bg-bamboo-200 disabled:opacity-30"
                              aria-label="Move photo earlier"
                            >
                              <ArrowUp size={13} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(image, 1)}
                              disabled={index === existingImages.length - 1}
                              className="rounded p-1 text-bamboo-500 hover:bg-bamboo-200 disabled:opacity-30"
                              aria-label="Move photo later"
                            >
                              <ArrowDown size={13} aria-hidden="true" />
                            </button>
                          </div>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMakeCover(image)}
                              disabled={image.is_cover}
                              className="rounded p-1 text-bamboo-500 hover:bg-bamboo-200 disabled:opacity-30"
                              aria-label="Use as cover photo"
                            >
                              <Star size={13} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(image)}
                              className="rounded p-1 text-danger-500 hover:bg-danger-50"
                              aria-label="Remove photo"
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {newImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {newImages.map((image, index) => (
                      <div
                        key={image.preview}
                        className="overflow-hidden rounded-control border border-dashed border-primary-300 bg-clay-50"
                      >
                        <img
                          src={image.preview}
                          alt={`New photo ${index + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="flex w-full items-center justify-center gap-1 p-1.5 text-xs font-medium text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={12} aria-hidden="true" /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
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

            <p className="rounded-control bg-clay-50 p-3 text-sm text-bamboo-700">
              Afia Food Hub sells exactly five food categories. Categories cannot be added,
              renamed or deleted outside this list. Hide a category to remove it from the
              customer menu while keeping its dishes and order history intact.
            </p>

            <ul className="mt-5 space-y-3">
              {categories.map((category) => (
                <li key={category.id} className="rounded-control border border-bamboo-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-bamboo-900">{category.name}</p>
                      <p className="text-xs text-bamboo-500">{category.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BrandBadge tone={category.is_active === false ? 'neutral' : 'success'}>
                        {category.is_active === false ? 'Hidden' : 'Active'}
                      </BrandBadge>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(category)}
                        className="btn-secondary btn-sm"
                      >
                        {category.is_active === false ? 'Activate' : 'Hide'}
                      </button>
                    </div>
                  </div>
                  <label
                    htmlFor={`category-description-${category.id}`}
                    className="mt-3 block text-xs font-medium text-bamboo-600"
                  >
                    Customer description
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id={`category-description-${category.id}`}
                      type="text"
                      maxLength={400}
                      value={catEdits[category.id] ?? ''}
                      onChange={(e) =>
                        setCatEdits((current) => ({ ...current, [category.id]: e.target.value }))
                      }
                      className="input-field text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCategoryDescription(category)}
                      className="btn-secondary btn-sm shrink-0"
                      aria-label={`Save description for ${category.name}`}
                    >
                      <Save size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
