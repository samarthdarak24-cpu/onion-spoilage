/**
 * IoT device service (spec §14 / §15).
 *
 * Devices register, send heartbeats, and stream sensor readings. A device can
 * be bound to a single inspection at a time (enforced by a unique column).
 * Readings are linked to the inspection the device is currently bound to so the
 * gas analyzer can consume them during the AI stage.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import { iotDeviceError, notFound, conflict } from '../../utils/errors';
import { normaliseDeviceCode } from '../../utils/ids';
import { recordAudit } from '../audit/audit.service';
import { realtimeHub } from '../../services/realtime/hub';
import type { ReadingInput, RegisterDeviceInput, HeartbeatInput } from './iot.schema';

export async function registerDevice(input: RegisterDeviceInput) {
  const deviceCode = normaliseDeviceCode(input.deviceCode);
  const existing = await prisma.ioTDevice.findUnique({ where: { deviceCode } });
  if (existing) throw conflict(`Device ${deviceCode} already registered`);

  const device = await prisma.ioTDevice.create({
    data: {
      deviceCode,
      name: input.name ?? null,
      type: input.type,
      centreId: input.centreId ?? null,
      status: 'OFFLINE',
    },
  });
  await recordAudit({ action: 'DEVICE_BOUND', entityType: 'IoTDevice', entityId: device.id, metadata: { deviceCode } });
  return device;
}

export async function heartbeat(deviceCode: string, input: HeartbeatInput, actorId?: string) {
  const code = normaliseDeviceCode(deviceCode);
  const device = await prisma.ioTDevice.findUnique({ where: { deviceCode: code } });
  if (!device) throw notFound('IoTDevice', code);

  const updated = await prisma.ioTDevice.update({
    where: { deviceCode: code },
    data: {
      status: input.status ?? 'ONLINE',
      lastSeenAt: new Date(),
      ...(input.firmwareVersion && { firmwareVersion: input.firmwareVersion }),
    },
  });

  if (updated.boundInspectionId) {
    realtimeHub.publishInspection(updated.boundInspectionId, 'device_heartbeat', {
      deviceCode: code, status: updated.status,
    });
  }
  await recordAudit({
    userId: actorId, action: 'DEVICE_BOUND', entityType: 'IoTDevice', entityId: device.id,
    metadata: { deviceCode: code, status: updated.status },
  });
  return updated;
}

export async function ingestReadings(deviceCode: string, readings: ReadingInput[]) {
  const code = normaliseDeviceCode(deviceCode);
  const device = await prisma.ioTDevice.findUnique({ where: { deviceCode: code } });
  if (!device) throw notFound('IoTDevice', code);

  // Refresh liveness.
  await prisma.ioTDevice.update({
    where: { deviceCode: code },
    data: { status: 'ONLINE', lastSeenAt: new Date() },
  });

  const created = await prisma.ioTReading.createMany({
    data: readings.map((r) => ({
      deviceId: device.id,
      inspectionId: device.boundInspectionId ?? null,
      timestamp: r.timestamp ?? new Date(),
      temperature: r.temperature ?? null,
      humidity: r.humidity ?? null,
      gas1: r.gas1 ?? null,
      gas2: r.gas2 ?? null,
      gas3: r.gas3 ?? null,
      airQuality: r.airQuality ?? null,
      rawPayload: (r.rawPayload ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });

  if (device.boundInspectionId) {
    realtimeHub.publishInspection(device.boundInspectionId, 'readings', { count: readings.length });
  }
  return { inserted: created.count };
}

export async function listDevices(filter: { centreId?: string; status?: string }) {
  return prisma.ioTDevice.findMany({
    where: {
      ...(filter.centreId && { centreId: filter.centreId }),
      ...(filter.status && { status: filter.status as never }),
    },
    orderBy: { lastSeenAt: 'desc' },
    take: 200,
  });
}

export async function getDevice(deviceCode: string) {
  const code = normaliseDeviceCode(deviceCode);
  const device = await prisma.ioTDevice.findUnique({
    where: { deviceCode: code },
    include: { readings: { orderBy: { timestamp: 'desc' }, take: 50 } },
  });
  if (!device) throw notFound('IoTDevice', code);
  return device;
}

export async function getDeviceByCode(code: string) {
  const device = await prisma.ioTDevice.findUnique({ where: { deviceCode: normaliseDeviceCode(code) } });
  if (!device) throw iotDeviceError(`Unknown device ${code}`);
  return device;
}
