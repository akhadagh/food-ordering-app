import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo, BrandButton, PageMeta } from '../components/brand';

const NotFoundPage = () => (
  <div className="page-container flex min-h-[60vh] flex-col items-center justify-center text-center">
    <PageMeta title="Page not found" path="/404" />
    <BrandLogo variant="icon" height={72} />
    <p className="mt-8 font-display text-6xl text-bamboo-900">404</p>
    <h1 className="mt-3 font-display text-display-sm text-bamboo-900">
      We could not find that page
    </h1>
    <p className="mt-2 max-w-md text-bamboo-600">
      The link may be out of date, or the page may have moved. The menu is right where you left it.
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <BrandButton to="/menu">Browse the menu</BrandButton>
      <BrandButton to="/" variant="secondary">
        Go to the homepage
      </BrandButton>
    </div>
  </div>
);

export default NotFoundPage;
