import { z, ZodError } from 'zod';

/**
 * Request validation with zod.
 *
 * Every write route validates its body, query and parameters. Schemas are
 * strict by default: an unknown field is rejected, so a client cannot smuggle
 * `role: "admin"` into a signup body (audit finding P0-02).
 */

export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body ?? {});
    }
    if (schemas.query) {
      // req.query is a getter in Express 5 - assign to a new property.
      req.validatedQuery = schemas.query.parse(req.query ?? {});
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params ?? {});
    }
    next();
  } catch (err) {
    next(err instanceof ZodError ? err : new ZodError([{ code: 'custom', message: 'Invalid request.' }]));
  }
};

/** Common field helpers. */
export const field = {
  name: (min = 1, max = 120) =>
    z.string().trim().min(min).max(max),
  email: () =>
    z.string().trim().toLowerCase().email().max(255),
  phone: () =>
    z
      .string()
      .trim()
      .regex(/^\+?233\d{9}$|^0\d{9}$/, 'Enter a valid Ghanaian phone number.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  password: (min = 8) =>
    z.string().min(min).max(200).regex(/[a-zA-Z]/, 'Password must contain a letter.').regex(/[0-9]/, 'Password must contain a number.'),
  id: () => z.coerce.number().int().positive(),
  bool: () =>
    z
      .union([z.boolean(), z.string()])
      .transform((v) => (typeof v === 'boolean' ? v : ['true', '1', 'yes'].includes(v.toLowerCase()))),
  optionalBool: () =>
    z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === '') return undefined;
        return typeof v === 'boolean' ? v : ['true', '1', 'yes'].includes(v.toLowerCase());
      }),
  positiveInt: (max = 99) =>
    z.coerce.number().int().min(1).max(max),
};

export default validate;
