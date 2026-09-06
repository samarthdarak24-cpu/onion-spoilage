/**
 * Request validation middleware built on Zod (spec §3 validation layer).
 *
 * Parsed output REPLACES req.body / req.query / req.params so controllers
 * always receive coerced, type-safe input — never raw strings.
 *
 * Usage:
 *   router.post('/lots', validate({ body: createLotSchema }), controller)
 */
import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema, ZodTypeDef } from 'zod';

type Schemas = {
  body?: ZodSchema<unknown, ZodTypeDef, unknown>;
  query?: ZodSchema<unknown, ZodTypeDef, unknown>;
  params?: ZodSchema<unknown, ZodTypeDef, unknown>;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query;
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      // ZodError is shaped into field-level details by errorHandler.
      next(err);
    }
  };
}
