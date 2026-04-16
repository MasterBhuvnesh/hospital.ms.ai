import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stable UUIDs for seed data
const HOSPITAL_ID = '00000000-0000-4000-a000-000000000001';
const DOCTOR_1_ID = '00000000-0000-4000-a000-000000000101';
const DOCTOR_2_ID = '00000000-0000-4000-a000-000000000102';
const DOCTOR_3_ID = '00000000-0000-4000-a000-000000000103';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding analytics-service database...\n');

  // ── Daily Metrics (last 7 days) ──────────────────
  for (let i = 0; i < 7; i++) {
    const date = daysAgo(i);
    const result = await prisma.dailyMetric.upsert({
      where: { hospitalId_date: { hospitalId: HOSPITAL_ID, date } },
      update: {},
      create: {
        hospitalId: HOSPITAL_ID,
        date,
        totalPatients: 80 + Math.floor(Math.random() * 40),
        totalConsultations: 60 + Math.floor(Math.random() * 30),
        totalAppointments: 50 + Math.floor(Math.random() * 25),
        noShows: Math.floor(Math.random() * 8),
        avgWaitTimeMins: 10 + Math.random() * 15,
        avgConsultMins: 8 + Math.random() * 7,
        revenue: 25000 + Math.random() * 15000,
      },
    });
    console.log(`  [daily] ${result.date.toISOString().split('T')[0]} — ${result.totalPatients} patients`);
  }

  // ── Doctor Daily Metrics ─────────────────────────
  const doctors = [DOCTOR_1_ID, DOCTOR_2_ID, DOCTOR_3_ID];
  for (const doctorId of doctors) {
    for (let i = 0; i < 7; i++) {
      const date = daysAgo(i);
      const result = await prisma.doctorDailyMetric.upsert({
        where: { doctorId_hospitalId_date: { doctorId, hospitalId: HOSPITAL_ID, date } },
        update: {},
        create: {
          doctorId,
          hospitalId: HOSPITAL_ID,
          date,
          patientsSeen: 10 + Math.floor(Math.random() * 15),
          avgConsultMins: 8 + Math.random() * 7,
          avgRating: 3.5 + Math.random() * 1.5,
          revenue: 5000 + Math.random() * 5000,
        },
      });
      console.log(`  [doctor] ${doctorId.slice(-3)} | ${result.date.toISOString().split('T')[0]} — ${result.patientsSeen} seen`);
    }
  }

  // ── Queue Stats (hourly for today) ───────────────
  for (let hour = 8; hour <= 18; hour++) {
    const date = daysAgo(0);
    const result = await prisma.queueStat.upsert({
      where: {
        hospitalId_doctorId_date_hour: {
          hospitalId: HOSPITAL_ID,
          doctorId: '',
          date,
          hour,
        },
      },
      update: {},
      create: {
        hospitalId: HOSPITAL_ID,
        date,
        hour,
        tokensIssued: 5 + Math.floor(Math.random() * 15),
        avgWaitMins: 5 + Math.random() * 20,
        peakQueueSize: 3 + Math.floor(Math.random() * 12),
      },
    });
    console.log(`  [queue] hour ${String(result.hour).padStart(2, '0')}:00 — ${result.tokensIssued} tokens`);
  }

  const [dailyCount, doctorCount, queueCount] = await Promise.all([
    prisma.dailyMetric.count(),
    prisma.doctorDailyMetric.count(),
    prisma.queueStat.count(),
  ]);

  console.log(`\nDone — ${dailyCount} daily metrics, ${doctorCount} doctor metrics, ${queueCount} queue stats.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
