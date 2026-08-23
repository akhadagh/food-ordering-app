import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-900 text-gray-300">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-white">Efia&apos;s<span className="text-primary-400">Eat</span></span>
          </div>
          <p className="text-sm text-gray-400">Delivering authentic Ghanaian meals to your doorstep. Fresh, hot, and made with love.</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Link to="/menu" className="block text-sm hover:text-primary-400 transition">Menu</Link>
            <Link to="/cart" className="block text-sm hover:text-primary-400 transition">Cart</Link>
            <Link to="/orders" className="block text-sm hover:text-primary-400 transition">Track Order</Link>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-3">Popular Dishes</h3>
          <div className="space-y-2 text-sm">
            <p>Fufu with Light Soup</p>
            <p>Jollof Rice</p>
            <p>Banku with Tilapia</p>
            <p>Waakye & Stew</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-3">Contact Us</h3>
          <div className="space-y-2 text-sm">
            <p>123 Oxford Street, Osu, Accra</p>
            <p>+233 24 123 4567</p>
            <p>hello@efiaseat.com</p>
            <p className="flex items-center gap-2 mt-3">
              <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs font-medium">MoMo: 0241234567</span>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Efia&apos;sEat. All rights reserved. Made in Ghana.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
