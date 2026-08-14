import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { menuAPI } from '../services/api';
import { ArrowRight, Star, Clock, Truck, Shield, ChevronRight } from 'lucide-react';

const HomePage = () => {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    menuAPI.getItems({ is_featured: true }).then(r => setFeatured(r.data.slice(0, 6)));
    menuAPI.getCategories().then(r => setCategories(r.data));
  }, []);

  const features = [
    { icon: <Clock size={24} />, title: 'Fast Delivery', desc: 'Delivered in 30-45 minutes' },
    { icon: <Shield size={24} />, title: 'Secure Payment', desc: 'MoMo, Vodafone Cash & more' },
    { icon: <Truck size={24} />, title: 'Live Tracking', desc: 'Track your order in real-time' },
    { icon: <Star size={24} />, title: 'Quality Food', desc: 'Fresh ingredients, authentic taste' },
  ];

  return (
    <div>
      <section className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative">
          <div className="max-w-2xl">
            <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              Authentic Ghanaian Cuisine
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Delicious Ghanaian<br />Food, Delivered Fresh
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg">
              From Banku with Okra Soup to Jollof Rice - order your favorite local dishes and get them delivered hot to your doorstep across Accra.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/menu" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 text-base px-8 py-3.5 inline-flex items-center gap-2">
                Order Now <ArrowRight size={18} />
              </Link>
              <Link to="/menu" className="btn-secondary border-white/30 text-white hover:bg-white/10 text-base px-8 py-3.5">
                View Menu
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 rounded-full"></span> 500+ Happy Customers</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-400 rounded-full"></span> 4.8 Rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="card p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary-50 text-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Popular Dishes</h2>
            <p className="text-gray-500 mt-1">Our most ordered Ghanaian favorites</p>
          </div>
          <Link to="/menu" className="text-primary-500 font-semibold hover:text-primary-600 flex items-center gap-1">
            View All <ChevronRight size={18} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map(item => (
            <Link key={item.id} to="/menu" className="card group hover:shadow-lg transition-all duration-300">
              <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-6xl">
                {item.name.includes('Jollof') ? '🍚' : item.name.includes('Banku') ? '🥘' : item.name.includes('Fufu') ? '🍲' : item.name.includes('Waakye') ? '🍛' : item.name.includes('Kenkey') ? '🫓' : '🍽️'}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition">{item.name}</h3>
                  <span className="bg-primary-50 text-primary-600 font-bold text-sm px-2.5 py-1 rounded-lg">GH₵{parseFloat(item.price).toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-1 mt-3 text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  <span className="text-xs text-gray-400 ml-1">(4.8)</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map(cat => (
            <Link key={cat.id} to="/menu" className="card p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="text-4xl mb-3">
                {cat.name.includes('Local') ? '🥘' : cat.name.includes('Rice') ? '🍚' : cat.name.includes('Soup') ? '🍲' : cat.name.includes('Drink') ? '🥤' : ' sides'}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-500 transition">{cat.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-primary-500 text-white py-16 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-white/80 mb-8">Get your favorite Ghanaian meals delivered in minutes. Use code <span className="font-bold bg-white/20 px-2 py-0.5 rounded">WELCOME10</span> for 10% off your first order!</p>
          <Link to="/menu" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-10 py-4 inline-flex items-center gap-2">
            Browse Menu <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
