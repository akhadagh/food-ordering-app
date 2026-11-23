import { Router } from 'express';
import { z } from 'zod';
import { validate, field } from '../middleware/validate.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { uploadMenuImages, uploadedFiles } from '../middleware/upload.js';
import * as menu from '../services/menu.service.js';
import { storeImage } from '../services/storage.service.js';
import { withTransaction } from '../config/db.js';
import { getProvider, availablePaymentMethods } from '../payments/index.js';
import { badRequest } from '../utils/errors.js';

const router = Router();

/* --------------------------------------------------------------- public -- */

const listSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category_id: field.id().optional(),
  category: z.string().trim().max(120).optional(),
  is_featured: field.optionalBool(),
  is_available: field.optionalBool(),
  include_inactive: field.optionalBool(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const wantsInactive = (req) =>
  Boolean(req.validatedQuery?.include_inactive) && req.user?.role === 'admin';

router.get(
  '/categories',
  optionalAuth,
  validate({ query: z.object({ include_inactive: field.optionalBool() }).strict() }),
  async (req, res, next) => {
    try {
      res.json(await menu.listCategories({ includeInactive: wantsInactive(req) }));
    } catch (err) {
      next(err);
    }
  }
);

router.get('/items', optionalAuth, validate({ query: listSchema }), async (req, res, next) => {
  try {
    const q = req.validatedQuery || {};
    const result = await menu.listItems({
      search: q.search,
      categoryId: q.category_id,
      categorySlug: q.category,
      featured: q.is_featured,
      available: q.is_available,
      includeInactiveCategories: wantsInactive(req),
      limit: q.limit,
      offset: q.offset,
    });
    res.json(result.items);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/items/:id',
  optionalAuth,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      res.json(await menu.getItem(req.params.id, { includeInactive: req.user?.role === 'admin' }));
    } catch (err) {
      next(err);
    }
  }
);

/** The payment methods the checkout can actually offer right now. */
router.get('/payment-methods', (_req, res) => {
  const provider = getProvider();
  res.json({
    provider: provider.id,
    onlineEnabled: provider.id !== 'disabled',
    methods: availablePaymentMethods(),
  });
});

/* ----------------------------------------------------------------- admin -- */

const itemSchema = z
  .object({
    name: field.name(2, 140),
    slug: z.string().trim().max(80).optional(),
    description: z.string().trim().max(1000).optional(),
    price: z.coerce.number().min(0).max(100000),
    category_id: field.id().optional(),
    image_url: z.string().trim().max(500).optional(),
    is_available: field.bool().optional(),
    is_featured: field.bool().optional(),
    stock_quantity: z.coerce.number().int().min(0).max(100000).optional(),
    custom_options: z.array(z.record(z.any())).max(20).optional(),
    images: z.array(z.any()).max(20).optional(),
  })
  .strict();

router.post(
  '/items',
  requireAuth,
  requireAdmin,
  writeLimiter,
  uploadMenuImages,
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      const files = uploadedFiles(req);
      if (files.length) {
        const stored = [];
        for (const file of files) stored.push(await storeImage(file));
        body.images = stored.map((entry) => entry.url);
        body.image_url = stored[0].url;
      }
      const parsed = itemSchema.parse(body);
      const id = await menu.createItem(parsed);
      res.status(201).json(await menu.getItem(id, { includeInactive: true }));
    } catch (err) {
      next(err);
    }
  }
);

const itemUpdateSchema = itemSchema.partial().strict();

router.put(
  '/items/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  uploadMenuImages,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      const files = uploadedFiles(req);
      const parsed = itemUpdateSchema.parse(body);
      await withTransaction(async (client) => {
        await menu.updateItem(req.params.id, parsed, client);
        if (files.length) {
          const urls = [];
          for (const file of files) {
            const stored = await storeImage(file);
            urls.push(stored.url);
          }
          await menu.addItemImages(req.params.id, urls, client);
        }
      });
      res.json(await menu.getItem(req.params.id, { includeInactive: true }));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/items/:id/images',
  requireAuth,
  requireAdmin,
  writeLimiter,
  uploadMenuImages,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      const files = uploadedFiles(req);
      if (!files.length) throw badRequest('Choose at least one photo to upload.');
      const urls = [];
      for (const file of files) {
        const stored = await storeImage(file);
        urls.push(stored.url);
      }
      await withTransaction(async (client) => {
        await menu.addItemImages(req.params.id, urls, client);
      });
      res.status(201).json(await menu.getItem(req.params.id, { includeInactive: true }));
    } catch (err) {
      next(err);
    }
  }
);

const imageOrderSchema = z
  .object({
    images: z
      .array(
        z
          .object({
            id: field.id(),
            sort_order: z.coerce.number().int().min(0).max(999).optional(),
            is_cover: z.boolean().optional(),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict();

router.put(
  '/items/:id/images',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }), body: imageOrderSchema }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await menu.reorderItemImages(req.params.id, req.body.images, client);
      });
      res.json(await menu.getItem(req.params.id, { includeInactive: true }));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/items/:id/images/:imageId',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id(), imageId: field.id() }) }),
  async (req, res, next) => {
    try {
      await withTransaction(async (client) => {
        await menu.deleteItemImage(req.params.id, req.params.imageId, client);
      });
      res.json(await menu.getItem(req.params.id, { includeInactive: true }));
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/items/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      await menu.deleteItem(req.params.id);
      res.json({ message: 'Menu item deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

const categorySchema = z
  .object({
    name: field.name(2, 80),
    slug: z.string().trim().max(80).optional(),
    description: z.string().trim().max(400).optional(),
    image_url: z.string().trim().max(500).optional(),
    sort_order: z.coerce.number().int().min(0).max(999).optional(),
    is_active: field.bool().optional(),
  })
  .strict();

router.post(
  '/categories',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: categorySchema }),
  async (req, res, next) => {
    try {
      const id = await menu.createCategory(req.body);
      const { rows } = await (await import('../config/db.js')).query(
        'SELECT id, name, slug, description, image_url, sort_order, is_active FROM categories WHERE id = $1',
        [id]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/categories/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }), body: categorySchema.partial().strict() }),
  async (req, res, next) => {
    try {
      await menu.updateCategory(req.params.id, req.body);
      res.json({ id: Number(req.params.id), ...req.body });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/categories/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ params: z.object({ id: field.id() }) }),
  async (req, res, next) => {
    try {
      await menu.deleteCategory(req.params.id);
      res.json({ message: 'Category deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
