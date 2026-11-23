import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BrandLogo } from '../brand';

/**
 * Dish photo gallery.
 *
 * Every menu card shows the photographs that belong to that specific dish.
 * Multiple photographs rotate automatically, can be swiped on a touch screen
 * and can be stepped through with the arrow controls on desktop. A dish with
 * a single photograph displays it without any carousel chrome, so no broken
 * or empty carousel is ever rendered.
 */
const FoodImageCarousel = ({
  item,
  images: suppliedImages,
  alt,
  className = '',
  heightClass = 'h-44',
  showControls = true,
}) => {
  const images = useMemo(() => {
    const list = Array.isArray(suppliedImages)
      ? suppliedImages
      : Array.isArray(item?.images)
        ? item.images
        : [];
    const normalised = list
      .map((image) => (typeof image === 'string' ? { url: image } : image))
      .filter((image) => image?.url);
    if (normalised.length) return normalised;
    return item?.image_url ? [{ url: item.image_url }] : [];
  }, [item, suppliedImages]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);
  const count = images.length;

  useEffect(() => {
    setIndex(0);
  }, [count, item?.id]);

  const next = useCallback(() => {
    setIndex((current) => (count ? (current + 1) % count : 0));
  }, [count]);

  const previous = useCallback(() => {
    setIndex((current) => (count ? (current - 1 + count) % count : 0));
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = setInterval(next, 4500);
    return () => clearInterval(timer);
  }, [count, paused, next]);

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next();
    else previous();
  };

  const label = alt || item?.name || 'Ghanaian dish';

  if (!count) {
    return (
      <div className={`media relative ${heightClass} ${className}`}>
        <div className="flex h-full w-full items-center justify-center bg-clay-50">
          <BrandLogo variant="icon" height={52} className="opacity-25" />
        </div>
      </div>
    );
  }

  const current = images[Math.min(index, count - 1)];

  return (
    <div
      className={`media group/carousel relative select-none ${heightClass} ${className}`}
      role={count > 1 ? 'region' : undefined}
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      aria-label={count > 1 ? `Photos of ${label}` : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        key={current.url}
        src={current.url}
        alt={current.alt || label}
        loading="lazy"
        className="h-full w-full object-cover transition-opacity duration-300"
      />

      {count > 1 && (
        <>
          {showControls && (
            <>
              <button
                type="button"
                onClick={previous}
                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-bamboo-700 opacity-0 shadow-sm transition-opacity hover:bg-white focus:opacity-100 focus-visible:opacity-100 group-hover/carousel:opacity-100"
                aria-label={`Previous photo of ${label}`}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-bamboo-700 opacity-0 shadow-sm transition-opacity hover:bg-white focus:opacity-100 focus-visible:opacity-100 group-hover/carousel:opacity-100"
                aria-label={`Next photo of ${label}`}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </>
          )}

          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {images.map((image, imageIndex) => (
              <button
                key={`${image.url}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`h-1.5 rounded-full transition-all ${
                  imageIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
                aria-label={`Show photo ${imageIndex + 1} of ${count}`}
                aria-current={imageIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FoodImageCarousel;
