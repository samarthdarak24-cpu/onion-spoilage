/** Validation schemas for the inspection lifecycle (spec §9 / §10). */
import { z } from 'zod';

export const createInspectionSchema = z.object({
  lotId: z.string().cuid(),
  centreId: z.string().cuid().optional(),
});

export const assignSampleSchema = z.object({
  sampleSize: z.coerce.number().int().positive().max(10000).default(100),
  weight: z.coerce.number().positive().optional(),
});

export const bindDeviceSchema = z.object({
  deviceCode: z.string().min(2).max(64),
});

export const addImageSchema = z.object({
  sampleId: z.string().cuid().optional(),
});

export const updateInspectionSchema = z.object({
  // reserved for notes / manual overrides; intentionally minimal
  note: z.string().max(2000).optional(),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type AssignSampleInput = z.infer<typeof assignSampleSchema>;
export type BindDeviceInput = z.infer<typeof bindDeviceSchema>;
