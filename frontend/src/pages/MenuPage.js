import React, { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { Search, Plus, Minus, ShoppingCart, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const MenuPage = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customOptions, setCustomOptions] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const { addItem } = useCart();

  useEffect(() => {
    menuAPI.getCategories().then(r => setCategories(r.data));
    loadItems();
  }, []);

  const loadItems = (catId = null) => {
    const params = {};
    if (catId) params.category_id = catId;
    menuAPI.getItems(params).then(r => setItems(r.data));
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    loadItems(catId);
  };

  const filtered = items.filter(i =>
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())) && i.is_available
  );

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const options = Object.entries(customOptions)
      .filter(([_, v]) => v)
      .map(([k, v]) => ({ option: k, value: v }));
    addItem(selectedItem, quantity, options, specialInstructions);
    setSelectedItem(null);
    setQuantity(1);
    setCustomOptions({});
    setSpecialInstructions('');
  };

  const defaultOptions = {
    'Banku with Tilapia': { 'Tilapia Size': ['Medium (GH₵45)', 'Large (GH₵55)'], 'Spice Level': ['Mild', 'Medium', 'Hot'] },
    'Banku with Okra Soup': { 'Protein': ['Fish (GH₵35)', 'Crab (GH₵45)', 'Mixed (GH₵50)'] },
    'Fufu with Light Soup': { 'Protein': ['Goat Meat (GH₵40)', 'Chicken (GH₵42)', 'Snail (GH₵55)'], 'Fufu Type': ['Cassava', 'Plantain', 'Mixed'] },
    'Jollof Rice': { 'Protein': ['Chicken (GH₵40)', 'Goat Meat (GH₵50)', 'Beef (GH₵45)'], 'Portion': ['Regular', 'Large (+GH₵10)'] },
    'Waakye and Stew': { 'Extras': ['Gari', 'Spaghetti', 'Boiled Egg (+GH₵3)'], 'Protein': ['Chicken', 'Beef', 'Fish'] },
    'Rice Ball with Groundnut Soup': { 'Protein': ['Chicken (GH₵38)', 'Goat Meat (GH₵45)'] },
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Menu</h1>
        <p className="text-gray-500">Authentic Ghanaian dishes made fresh to order</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search dishes..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="sm:hidden">
          <select value={activeCategory || ''} onChange={e => handleCategoryChange(e.target.value ? parseInt(e.target.value) : null)} className="input-field">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="hidden sm:flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => handleCategoryChange(null)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${!activeCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => handleCategoryChange(c.id)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeCategory === c.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="card hover:shadow-lg transition-all duration-300 group">
            <div className="h-44 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-6xl relative">
              {item.name.includes('Jollof') ? '🍚' : item.name.includes('Banku') ? '🥘' : item.name.includes('Fufu') ? '🍲' : item.name.includes('Waakye') ? '🍛' : item.name.includes('Kenkey') ? '🫓' : item.name.includes('Groundnut') ? '🥜' : item.name.includes('Sobolo') || item.name.includes('Lime') || item.name.includes('Beer') || item.name.includes('Coca') || item.name.includes('Water') ? '🥤' : item.name.includes('Shito') || item.name.includes('Gari') || item.name.includes('Plantain') || item.name.includes('Yam') ? '🍟' : '🍽️'}
              {item.is_featured && <span className="absolute top-3 left-3 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Featured</span>}
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition text-lg">{item.name}</h3>
              </div>
              <span className="text-primary-500 font-bold text-xl">GH₵{parseFloat(item.price).toFixed(2)}</span>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">{item.category_name}</span>
              </div>
              <button onClick={() => { setSelectedItem(item); setQuantity(1); setCustomOptions({}); }} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                <Plus size={16} /> Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No items found</p>
          <p className="text-gray-300 text-sm mt-1">Try a different search or category</p>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="h-40 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-6xl rounded-t-2xl">
              {selectedItem.name.includes('Jollof') ? '🍚' : selectedItem.name.includes('Banku') ? '🥘' : selectedItem.name.includes('Fufu') ? '🍲' : '🍽️'}
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">{selectedItem.name}</h3>
              <p className="text-primary-500 font-bold text-xl mt-1">GH₵{parseFloat(selectedItem.price).toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-2">{selectedItem.description}</p>

              {Object.entries(defaultOptions[selectedItem.name] || {}).map(([option, values]) => (
                <div key={option} className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{option}</label>
                  <div className="flex flex-wrap gap-2">
                    {values.map(v => (
                      <button key={v} onClick={() => setCustomOptions(prev => ({ ...prev, [option]: v }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${customOptions[option] === v ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instructions</label>
                <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Any special requests..." className="input-field text-sm" rows={2} />
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm font-semibold text-gray-700">Quantity:</span>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus size={14} /></button>
                <span className="font-bold text-lg">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Plus size={14} /></button>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setSelectedItem(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddToCart} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <ShoppingCart size={16} /> Add GH₵{(selectedItem.price * quantity).toFixed(2)}
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
