import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { menuAPI, cartAPI, apiErrorMessage } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  BrandLogo,
  BrandPrice,
  BrandErrorState,
  BrandEmptyState,
  PageMeta,
} from '../components/brand';
import { Search, Plus, Minus, ShoppingCart, X, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

const SORTS = [
  { value: 'featured', label: 'Featured first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const MenuPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addItem, reload } = useCart();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState('featured');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customOptions, setCustomOptions] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const category = searchParams.get('category');
    if (category !== null) setActiveCategory(category);
  }, [searchParams]);

  const { data: categories = [] } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: async () => (await menuAPI.getCategories()).data,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['menu', 'items', activeCategory, search],
    queryFn: async () => {
      const params = { is_available: true };
      if (activeCategory) params.category = activeCategory;
      if (search.trim()) params.search = search.trim();
      const { data } = await menuAPI.getItems(params);
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const sorted = useMemo(() => {
    const list = [...items];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'price_asc') list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price_desc') list.sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [items, sort]);

  const selectCategory = (slug) => {
    setActiveCategory(slug);
    if (slug) setSearchParams({ category: slug });
    else setSearchParams({});
  };

  const buildOptions = (state) =>
    Object.entries(state)
      .filter(([, value]) => value)
      .map(([name, value]) => ({ option: name, value }));

  const addToCart = async (item, options, instructions, count) => {
    await addItem({
      menuItemId: item.id,
      quantity: count,
      customOptions: options,
      specialInstructions: instructions,
    });
    await reload();
    toast.success(`${item.name} added to your cart`);
  };

  /**
   * A dish with no customisation options goes straight into the cart. A
   * dish with options opens the options panel, because the kitchen has to
   * know which protein to cook.
   */
  const openItem = async (item) => {
    if (!item.custom_options?.length) {
      setAdding(true);
      try {
        await addToCart(item, [], '', 1);
      } catch (err) {
        toast.error(apiErrorMessage(err, 'We could not add that to your cart.'));
      } finally {
        setAdding(false);
      }
      return;
    }
    setSelectedItem(item);
    setQuantity(1);
    setCustomOptions({});
    setSpecialInstructions('');
  };

  const handleAddToCart = async () => {
    if (!selectedItem) return;

    setAdding(true);
    try {
      await addToCart(selectedItem, buildOptions(customOptions), specialInstructions, quantity);
      setSelectedItem(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'We could not add that to your cart.'));
    } finally {
      setAdding(false);
    }
  };

  const options = selectedItem?.custom_options || [];
  const optionTotal = options.reduce((sum, group) => {
    const chosen = customOptions[group.name];
    if (!chosen) return sum;
    const match = (group.options || []).find((o) => o.label === chosen);
    return sum + Number(match?.price_delta || 0);
  }, 0);
  const unitPrice = Number(selectedItem?.price || 0) + optionTotal;

  return (
    <div className="page-container">
      <PageMeta title="Menu" description={`Browse the Afia Food Hub menu of Ghanaian dishes.`} path="/menu" />

      <header className="mb-8">
        <h1 className="font-display text-display-md text-bamboo-900">Our menu</h1>
        <p className="mt-1 text-bamboo-600">
          Authentic Ghanaian dishes, made fresh when you order.
        </p>
      </header>

      {/* ------------------------------------------------------- filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-bamboo-400"
              aria-hidden="true"
            />
            <label htmlFor="menu-search" className="sr-only">
              Search the menu
            </label>
            <input
              id="menu-search"
              type="search"
              placeholder="Search for jollof, banku, fufu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>

          <div className="sm:w-52">
            <label htmlFor="menu-sort" className="sr-only">
              Sort the menu
            </label>
            <select
              id="menu-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="select-field"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            type="button"
            onClick={() => selectCategory('')}
            className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === ''
                ? 'bg-primary-500 text-white'
                : 'bg-bamboo-100 text-bamboo-700 hover:bg-bamboo-200'
            }`}
            aria-pressed={activeCategory === ''}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.slug)}
              className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === category.slug
                  ? 'bg-primary-500 text-white'
                  : 'bg-bamboo-100 text-bamboo-700 hover:bg-bamboo-200'
              }`}
              aria-pressed={activeCategory === category.slug}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------- results */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-44 rounded-none" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <BrandErrorState
          title="We could not load the menu"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      )}

      {!isLoading && !isError && sorted.length === 0 && (
        <BrandEmptyState
          title="Nothing matched that"
          description="Try a different dish or clear the filters to see the whole menu."
          actionLabel="Show everything"
          onAction={() => {
            setSearch('');
            selectCategory('');
          }}
          icon={SlidersHorizontal}
        />
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((item) => (
            <article key={item.id} className="card-interactive group overflow-hidden">
              <div className="media h-44">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-clay-50">
                    <BrandLogo variant="icon" height={52} className="opacity-25" />
                  </div>
                )}
                {item.is_featured && (
                  <span className="absolute left-3 top-3 rounded-pill bg-primary-500 px-2.5 py-1 text-xs font-semibold text-white">
                    Featured
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg leading-snug text-bamboo-900">
                    {item.name}
                  </h2>
                  <BrandPrice amount={item.price} size="sm" className="shrink-0" />
                </div>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-bamboo-600">
                    {item.description}
                  </p>
                )}
                {item.category_name && (
                  <span className="badge-neutral mt-3">{item.category_name}</span>
                )}
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  disabled={adding}
                  className="btn-primary mt-4 w-full"
                >
                  <Plus size={16} aria-hidden="true" />
                  {item.custom_options?.length ? 'Choose options' : 'Add to cart'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------- modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-bamboo-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-item-title"
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="media h-40">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-clay-50">
                    <BrandLogo variant="icon" height={56} className="opacity-25" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-bamboo-700 shadow-sm transition-colors hover:bg-white"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="p-6">
              <h2 id="menu-item-title" className="font-display text-display-sm text-bamboo-900">
                {selectedItem.name}
              </h2>
              <div className="mt-1">
                <BrandPrice amount={unitPrice} size="lg" />
              </div>
              {selectedItem.description && (
                <p className="mt-3 text-sm leading-relaxed text-bamboo-600">
                  {selectedItem.description}
                </p>
              )}

              {options.length > 0 && (
                <div className="mt-6 space-y-5">
                  {options.map((group) => (
                    <fieldset key={group.name}>
                      <legend className="mb-2 text-sm font-semibold text-bamboo-700">
                        {group.name}
                        {group.required && (
                          <span className="ml-1.5 text-xs font-normal text-bamboo-500">(required)</span>
                        )}
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {(group.options || []).map((option) => {
                          const selected = customOptions[group.name] === option.label;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                setCustomOptions((prev) => ({
                                  ...prev,
                                  [group.name]: selected ? undefined : option.label,
                                }))
                              }
                              className={`rounded-control border px-3 py-2 text-sm font-medium transition-colors ${
                                selected
                                  ? 'border-primary-500 bg-clay-50 text-primary-700'
                                  : 'border-bamboo-200 text-bamboo-600 hover:border-bamboo-300 hover:bg-bamboo-50'
                              }`}
                              aria-pressed={selected}
                            >
                              {option.label}
                              {Number(option.price_delta) > 0 && (
                                <span className="ml-1 text-bamboo-500">
                                  +GH₵ {Number(option.price_delta).toFixed(2)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <label htmlFor="special-instructions" className="label">
                  Special instructions
                </label>
                <textarea
                  id="special-instructions"
                  rows={2}
                  maxLength={500}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Anything we should know? (spice, allergies, call on arrival…)"
                  className="input-field text-sm"
                />
              </div>

              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm font-semibold text-bamboo-700">Quantity</span>
                <div className="flex items-center gap-1 rounded-control border border-bamboo-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="rounded-l-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-50"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                  >
                    <Minus size={14} aria-hidden="true" />
                  </button>
                  <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="rounded-r-control p-2 text-bamboo-600 transition-colors hover:bg-bamboo-50"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="btn-primary flex-1"
                >
                  {adding ? (
                    'Adding…'
                  ) : (
                    <>
                      <ShoppingCart size={16} aria-hidden="true" /> Add GH₵{' '}
                      {(unitPrice * quantity).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
