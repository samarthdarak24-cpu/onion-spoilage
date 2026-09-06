/** Validation schemas for the config module (spec §32). */
import { z } from 'zod';

export const fusionConfigSchema = z.object({
  visionWeight: z.coerce.number().min(0).max(1),
  gasWeight: z.coerce.number().min(0).max(1),
  environmentWeight: z.coerce.number().min(0).max(1),
  earlySpoilageEnabled: z.boolean().optional(),
});

export const gradingThresholdsSchema = z.object({
  gradeA: z.coerce.number().min(0).max(100),
  urs: z.coerce.number().min(0).max(100),
});

export type FusionConfigInput = z.infer<typeof fusionConfigSchema>;
export type GradingThresholdsInput = z.infer<typeof gradingThresholdsSchema>;
