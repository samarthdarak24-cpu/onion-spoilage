/** Validation schemas for the IoT module (spec §14 / §15). */
import { z } from 'zod';

export const registerDeviceSchema = z.object({
  deviceCode: z.string().min(2).max(64),
  name: z.string().max(120).optional(),
  type: z.string().max(64).default('GAS_POD'),
  centreId: z.string().cuid().optional(),
});

export const heartbeatSchema = z.object({
  firmwareVersion: z.string().max(32).optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).optional(),
});

export const readingSchema = z.object({
  timestamp: z.coerce.date().optional(),
  temperature: z.coerce.number().optional(),
  humidity: z.coerce.number().optional(),
  gas1: z.coerce.number().optional(),
  gas2: z.coerce.number().optional(),
  gas3: z.coerce.number().optional(),
  airQuality: z.coerce.number().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export const readingsBatchSchema = z.object({
  readings: z.array(readingSchema).min(1).max(500),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type ReadingInput = z.infer<typeof readingSchema>;
export type ReadingsBatchInput = z.infer<typeof readingsBatchSchema>;
