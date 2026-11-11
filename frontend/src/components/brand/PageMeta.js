import React, { useEffect } from 'react';

const BRAND = 'Afia Food Hub';
const DEFAULT_DESCRIPTION =
  'Order jollof, banku and okra, fufu and light soup, waakye and more — authentic Ghanaian food cooked to order and delivered across Accra.';

const setMeta = (selector, attrs) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
};

const setLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

/**
 * Sets the document title and social sharing metadata for a route.
 *
 *   <PageMeta title="Your cart" description="…" />
 *   <PageMeta title="Menu" image="/brand/banners/social-cover-1200x630.jpg" />
 */
export const PageMeta = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = '/brand/banners/social-cover-1200x630.jpg',
  path = '',
}) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} — Ghanaian Food Delivered Hot`;
    document.title = fullTitle;

    setMeta('meta[name="description"]', { name: 'description', content: description });

    const url = `${window.location.origin}${path}`;
    setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: BRAND });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });

    setLink('canonical', url);
  }, [title, description, image, path]);

  return null;
};

export default PageMeta;
