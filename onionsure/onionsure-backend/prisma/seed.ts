/**
 * Idempotent seed (spec §59).
 *
 * Creates the five platform roles, a demo FPO / procurement centre / farmer /
 * buyer, an IoT pod, an active fusion config, and grading thresholds — so the
 * backend is immediately usable for development, demos, and the test suite.
 *
 * Demo credentials (all passwords = `password123`):
 *   admin / officer1 / fpo1 / farmer1 / buyer1
 *
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'password123';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // --- Organisations --------------------------------------------------------
  const fpo = await prisma.fpo.upsert({
    where: { code: 'FPO-GV001' },
    update: {},
    create: {
      code: 'FPO-GV001',
      name: 'Green Valley FPO',
      registrationNumber: 'FPO/KA/2021/001',
      district: 'Dharwad',
      state: 'Karnataka',
      contactPerson: 'Suma',
      phone: '+919999999001',
    },
  });

  const centre = await prisma.procurementCentre.upsert({
    where: { centreCode: 'CTR-HBL001' },
    update: {},
    create: {
      centreCode: 'CTR-HBL001',
      name: 'Hubli Procurement Centre',
      location: 'Hubli',
      district: 'Dharwad',
      state: 'Karnataka',
      status: 'ACTIVE',
    },
  });

  const farmer = await prisma.farmer.upsert({
    where: { farmerCode: 'FRM-0001' },
    update: {},
    create: {
      farmerCode: 'FRM-0001',
      name: 'Ramesh Patil',
      phone: '+919999999002',
      village: 'Kalkeri',
      district: 'Dharwad',
      state: 'Karnataka',
      fpoId: fpo.id,
    },
  });

  const buyer = await prisma.buyer.upsert({
    where: { buyerCode: 'BYR-0001' },
    update: {},
    create: {
      buyerCode: 'BYR-0001',
      companyName: 'FreshMart Foods Pvt Ltd',
      location: 'Bengaluru',
      phone: '+919999999003',
    },
  });

  // --- Users (linked to their organisations) ---------------------------------
  const users = [
    { username: 'admin', name: 'Platform Admin', role: 'ADMIN' as const },
    { username: 'officer1', name: 'Officer Anita', role: 'PROCUREMENT_OFFICER' as const, centreId: centre.id },
    { username: 'fpo1', name: 'FPO Manager', role: 'FPO' as const, fpoId: fpo.id },
    { username: 'farmer1', name: 'Ramesh Patil', role: 'FARMER' as const },
    { username: 'buyer1', name: 'Buyer Raghav', role: 'BUYER' as const },
  ];

  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        passwordHash,
        centreId: u.centreId ?? null,
        fpoId: u.fpoId ?? null,
      },
      create: {
        username: u.username,
        name: u.name,
        passwordHash,
        role: u.role,
        email: `${u.username}@onionsure.test`,
        status: 'ACTIVE',
        centreId: u.centreId ?? null,
        fpoId: u.fpoId ?? null,
      },
    });

    // Link the org row back to its user where applicable.
    if (u.role === 'FARMER') await prisma.farmer.update({ where: { id: farmer.id }, data: { userId: created.id } });
    if (u.role === 'BUYER') await prisma.buyer.update({ where: { id: buyer.id }, data: { userId: created.id } });
  }

  // --- IoT device -----------------------------------------------------------
  await prisma.ioTDevice.upsert({
    where: { deviceCode: 'POD-HBL-01' },
    update: {},
    create: {
      deviceCode: 'POD-HBL-01',
      name: 'Hubli Gas Pod 01',
      type: 'GAS_POD',
      centreId: centre.id,
      status: 'OFFLINE',
      firmwareVersion: '1.0.0',
    },
  });

  // --- Active fusion configuration ------------------------------------------
  const existingCfg = await prisma.fusionConfig.findFirst({ where: { isActive: true } });
  if (!existingCfg) {
    await prisma.fusionConfig.create({
      data: {
        visionWeight: 0.5,
        gasWeight: 0.3,
        environmentWeight: 0.2,
        earlySpoilageEnabled: true,
        version: 1,
        isActive: true,
      },
    });
  }

  // --- Grading thresholds ---------------------------------------------------
  const thresholds = [
    { grade: 'GRADE_A' as const, minScore: 85, maxScore: 100 },
    { grade: 'URS' as const, minScore: 65, maxScore: 84 },
    { grade: 'REJECTED' as const, minScore: 0, maxScore: 64 },
  ];
  for (const t of thresholds) {
    const found = await prisma.qualityThreshold.findFirst({ where: { grade: t.grade, isActive: true } });
    if (!found) {
      await prisma.qualityThreshold.create({
        data: { grade: t.grade, minScore: t.minScore, maxScore: t.maxScore, isActive: true, version: 1 },
      });
    }
  }

  // --- A couple of demo lots ------------------------------------------------
  const lotCount = await prisma.lot.count();
  if (lotCount === 0) {
    for (let i = 1; i <= 3; i += 1) {
      const seq = i;
      await prisma.lot.create({
        data: {
          lotNumber: `LOT-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`,
          farmerId: farmer.id,
          fpoId: fpo.id,
          centreId: centre.id,
          crop: 'ONION',
          quantity: 500 + i * 250,
          unit: 'KG',
          status: 'REGISTERED',
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Demo accounts (password = password123): admin, officer1, fpo1, farmer1, buyer1');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
