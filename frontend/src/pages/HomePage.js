import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { menuAPI } from '../services/api';
import { BrandLogo, BrandPrice, BrandLoader, BrandErrorState, PageMeta } from '../components/brand';
import { ArrowRight, Clock, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { BRAND, BUSINESS } from '../config/brand';

const FEATURES = [
  {
    icon: <Sparkles size={22} aria-hidden="true" />,
    title: 'Cooked to order',
    body: 'Every dish leaves the kitchen when you order it, not before.',
  },
  {
    icon: <Truck size={22} aria-hidden="true" />,
    title: 'Delivered across Accra',
    body: 'Hot food at your door, with the journey tracked from our kitchen to you.',
  },
  {
    icon: <ShieldCheck size={22} aria-hidden="true" />,
    title: 'Pay how you like',
    body: 'Mobile money, card, or cash when the food arrives.',
  },
  {
    icon: <Clock size={22} aria-hidden="true" />,
    title: 'Honest timing',
    body: 'A real estimate for your order, updated as it travels.',
  },
];

const HomePage = () => {
  const [featuredError, setFeaturedError] = useState(false);

  const {
    data: featured = [],
    isLoading: featuredLoading,
    isError: featuredIsError,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['menu', 'featured'],
    queryFn: async () => {
      const { data } = await menuAPI.getItems({ is_featured: true, is_available: true });
      return data.slice(0, 6);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: async () => (await menuAPI.getCategories()).data,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (featuredIsError) setFeaturedError(true);
  }, [featuredIsError]);

  const trustPoints = [
    BUSINESS.deliveryZones?.length ? `Delivering across ${BUSINESS.deliveryZones.join(', ')}` : null,
    BUSINESS.hours ? `Open ${BUSINESS.hours}` : null,
    'Mobile money, card and cash on delivery',
  ].filter(Boolean);

  return (
    <div>
      <PageMeta description={BRAND.shortDescription} path="/" />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative isolate overflow-hidden bg-brand-dark">
        <img
          src="/brand/banners/hero-home-1600x900.jpg"
          alt="Ghanaian jollof rice and fried plantain, freshly cooked"
          className="absolute inset-0 h-full w-full object-cover"
          fetchpriority="high"
        />
        <div className="absolute inset-0 media-scrim-left" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-bamboo-900/70 via-transparent to-transparent" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-300 backdrop-blur">
              Accra, Ghana
            </p>
            <h1 className="font-display text-display-xl text-white text-balance sm:text-display-xl">
              Real Ghanaian food, cooked to order and delivered hot.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-bamboo-200 text-pretty">
              Jollof, banku and okra, fufu and light soup, waakye and kenkey — made fresh in our
              kitchen and brought to your table while it is still steaming.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="btn-primary bg-white px-8 py-3.5 text-base text-primary-600 hover:bg-bamboo-50 hover:text-primary-700"
              >
                Order now <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                to="/menu"
                className="btn-secondary border-white/25 bg-transparent px-8 py-3.5 text-base text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                See the menu
              </Link>
            </div>

            {trustPoints.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-bamboo-300">
                {trustPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-control bg-clay-50 text-primary-600">
                {feature.icon}
              </div>
              <h2 className="font-display text-lg text-bamboo-900">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-bamboo-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- featured */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-display-md text-bamboo-900">Popular dishes</h2>
            <p className="mt-1 text-bamboo-600">What the kitchen is cooking most right now.</p>
          </div>
          <Link
            to="/menu"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700 sm:inline-flex"
          >
            See the whole menu <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {featuredLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-48 rounded-none" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {featuredError && !featuredLoading && (
          <BrandErrorState
            title="We could not load the menu"
            description="Please check your connection and try again."
            actionLabel="Try again"
            onAction={() => refetchFeatured()}
          />
        )}

        {!featuredLoading && !featuredError && featured.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-bamboo-600">
              Our menu is being updated right now. Please check back in a moment.
            </p>
          </div>
        )}

        {featured.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <Link
                key={item.id}
                to="/menu"
                className="card-interactive group overflow-hidden"
                aria-label={`${item.name}, ${item.category_name || 'Ghanaian dish'}`}
              >
                <div className="media h-48">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-clay-50">
                      <BrandLogo variant="icon" height={56} className="opacity-25" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg leading-snug text-bamboo-900 transition-colors group-hover:text-primary-600">
                      {item.name}
                    </h3>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- categories */}
      <section className="bg-white py-14">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-display-md text-bamboo-900">Browse by category</h2>
          <p className="mt-1 text-bamboo-600">From light soup and banku to rice and everything in between.</p>

          {categoriesLoading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-44" />
              ))}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/menu?category=${category.slug}`}
                  className="card-interactive group overflow-hidden"
                >
                  <div className="media h-32">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-clay-50">
                        <BrandLogo variant="icon" height={44} className="opacity-25" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-base leading-snug text-bamboo-900 transition-colors group-hover:text-primary-600">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-bamboo-600">
                        {category.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------- cta */}
      <section className="relative isolate overflow-hidden bg-brand-gradient py-16">
        <img
          src="/brand/banners/promo-delivery-1600x600.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="lazy"
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-display-md text-white text-balance">
            Hungry? The kitchen is open.
          </h2>
          <p className="mt-3 text-bamboo-100">
            Pick a dish, choose how you want to pay, and we will bring it to you while it is hot.
          </p>
          <Link
            to="/menu"
            className="btn-primary mt-8 bg-white px-9 py-3.5 text-base text-primary-600 hover:bg-bamboo-50 hover:text-primary-700"
          >
            Browse the menu <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
