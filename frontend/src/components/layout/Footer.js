import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { BRAND, BUSINESS } from '../../config/brand';

const Footer = () => {
  const hasContact = Boolean(
    BUSINESS.supportPhone || BUSINESS.supportEmail || BUSINESS.address || BUSINESS.hours
  );

  return (
    <footer className="bg-brand-dark text-bamboo-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo variant="horizontal" theme="dark" height={38} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-bamboo-400 text-pretty">
              {BRAND.shortDescription}
            </p>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold text-white">Explore</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: '/menu', label: 'Our menu' },
                { to: '/cart', label: 'Your cart' },
                { to: '/orders', label: 'Track an order' },
                { to: '/login', label: 'Sign in' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-bamboo-400 transition-colors hover:text-accent-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold text-white">Popular dishes</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-bamboo-400">
              <li>Jollof rice</li>
              <li>Banku with okra soup</li>
              <li>Fufu with light soup</li>
              <li>Waakye and stew</li>
              <li>Kenkey with fried fish</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-base font-semibold text-white">Contact</h2>
            {hasContact ? (
              <ul className="mt-4 space-y-3 text-sm text-bamboo-400">
                {BUSINESS.supportPhone && (
                  <li className="flex items-start gap-2.5">
                    <Phone size={16} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
                    <a
                      href={`tel:${BUSINESS.supportPhone.replace(/\s/g, '')}`}
                      className="transition-colors hover:text-accent-400"
                    >
                      {BUSINESS.supportPhone}
                    </a>
                  </li>
                )}
                {BUSINESS.supportEmail && (
                  <li className="flex items-start gap-2.5">
                    <Mail size={16} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
                    <a
                      href={`mailto:${BUSINESS.supportEmail}`}
                      className="break-all transition-colors hover:text-accent-400"
                    >
                      {BUSINESS.supportEmail}
                    </a>
                  </li>
                )}
                {BUSINESS.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
                    <span>{BUSINESS.address}</span>
                  </li>
                )}
                {BUSINESS.hours && (
                  <li className="flex items-start gap-2.5">
                    <Clock size={16} className="mt-0.5 shrink-0 text-accent-400" aria-hidden="true" />
                    <span>{BUSINESS.hours}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-bamboo-400">
                Contact details are being updated. Reach us through any order to speak with the
                team.
              </p>
            )}

            {(BUSINESS.social.instagram ||
              BUSINESS.social.x ||
              BUSINESS.social.facebook) && (
              <div className="mt-5 flex gap-3">
                {BUSINESS.social.instagram && (
                  <a
                    href={BUSINESS.social.instagram}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-white/10 hover:text-accent-400"
                    aria-label="Afia Food Hub on Instagram"
                  >
                    <Instagram size={18} aria-hidden="true" />
                  </a>
                )}
                {BUSINESS.social.x && (
                  <a
                    href={BUSINESS.social.x}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-white/10 hover:text-accent-400"
                    aria-label="Afia Food Hub on X"
                  >
                    <Twitter size={18} aria-hidden="true" />
                  </a>
                )}
                {BUSINESS.social.facebook && (
                  <a
                    href={BUSINESS.social.facebook}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-control p-2 text-bamboo-400 transition-colors hover:bg-white/10 hover:text-accent-400"
                    aria-label="Afia Food Hub on Facebook"
                  >
                    <Facebook size={18} aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-bamboo-500">
          <p>
            &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved. Made in Ghana.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
