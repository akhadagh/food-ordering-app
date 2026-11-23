/**
 * The client's approved food catalogue.
 *
 * Afia Food Hub is not a general restaurant or marketplace. It sells exactly
 * five Ghanaian food categories, and those categories are the only ones the
 * platform may expose. This module is the single source of truth used by the
 * seed, the menu service and the administration API, so a category can never
 * be introduced through one path while another path rejects it.
 */

export const APPROVED_CATEGORIES = [
  {
    name: 'Banku',
    slug: 'banku',
    description:
      'Fermented maize and cassava dough, served with okra stew, grilled fish and pepper sauces.',
    image: '/brand/banners/category-banku.jpg',
    sort: 1,
  },
  {
    name: 'Fufu',
    slug: 'fufu',
    description:
      'Pounded cassava and plantain, served with light, groundnut and palm nut soups.',
    image: '/brand/banners/category-fufu.jpg',
    sort: 2,
  },
  {
    name: 'Omotuo',
    slug: 'omotuo',
    description: 'Soft rice balls served with groundnut or palm nut soup.',
    image: '/brand/banners/category-omotuo.jpg',
    sort: 3,
  },
  {
    name: 'Kokonte',
    slug: 'kokonte',
    description: 'Dried cassava flour pudding served with groundnut or palm nut soup.',
    image: '/brand/banners/category-kokonte.jpg',
    sort: 4,
  },
  {
    name: 'Rice dishes',
    slug: 'rice-dishes',
    description: 'Ghanaian jollof, fried rice and rice with stew, cooked to order.',
    image: '/brand/banners/category-rice-dishes.jpg',
    sort: 5,
  },
];

export const APPROVED_CATEGORY_SLUGS = APPROVED_CATEGORIES.map((c) => c.slug);
export const APPROVED_CATEGORY_NAMES = APPROVED_CATEGORIES.map((c) => c.name);

export function normalise(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Resolve a category from a name or slug.
 *
 * Returns the canonical approved category, or null when the value is outside
 * the client's catalogue. Both "Rice dishes" and "rice-dishes" resolve to the
 * same record.
 */
export function resolveApprovedCategory({ name, slug } = {}) {
  const wantedName = normalise(name);
  const wantedSlug = normalise(slug);

  if (!wantedName && !wantedSlug) return null;

  return (
    APPROVED_CATEGORIES.find(
      (category) =>
        (wantedName && normalise(category.name) === wantedName) ||
        (wantedSlug && normalise(category.slug) === wantedSlug)
    ) || null
  );
}

export function isApprovedCategorySlug(slug) {
  return APPROVED_CATEGORY_SLUGS.includes(normalise(slug));
}

export function isApprovedCategoryName(name) {
  return APPROVED_CATEGORY_NAMES.some((approved) => normalise(approved) === normalise(name));
}

/**
 * Words that identify unrelated standalone products the client has explicitly
 * excluded. This is a safety net for an administrator who types an old dish
 * name instead of creating a meal combination under an approved category.
 */
export const FORBIDDEN_STANDALONE_TERMS = [
  'kenkey',
  'waakye',
  'pizza',
  'burger',
  'spaghetti',
  'noodle',
  'sobolo',
  'palm wine',
  'bottled water',
  'sachet water',
  'kelewele',
];

export function findForbiddenStandaloneTerm(name) {
  const text = normalise(name);
  return FORBIDDEN_STANDALONE_TERMS.find((term) => text.includes(term)) || null;
}

export default {
  APPROVED_CATEGORIES,
  APPROVED_CATEGORY_SLUGS,
  APPROVED_CATEGORY_NAMES,
  resolveApprovedCategory,
  isApprovedCategorySlug,
  isApprovedCategoryName,
  FORBIDDEN_STANDALONE_TERMS,
  findForbiddenStandaloneTerm,
};
