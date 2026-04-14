import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password@123';

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  isVerified: boolean;
}

const seedUsers: SeedUser[] = [
  // ── Admins ──
  {
    email: 'admin@hospital.com',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    phone: '+919876543210',
    role: 'ADMIN',
    isVerified: true,
  },

  // ── Doctors ──
  {
    email: 'dr.sharma@hospital.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+919876543211',
    role: 'DOCTOR',
    isVerified: true,
  },
  {
    email: 'dr.patel@hospital.com',
    firstName: 'Amit',
    lastName: 'Patel',
    phone: '+919876543212',
    role: 'DOCTOR',
    isVerified: true,
  },
  {
    email: 'dr.gupta@hospital.com',
    firstName: 'Neha',
    lastName: 'Gupta',
    phone: '+919876543213',
    role: 'DOCTOR',
    isVerified: true,
  },

  // ── Patients ──
  {
    email: 'patient.rahul@gmail.com',
    firstName: 'Rahul',
    lastName: 'Verma',
    phone: '+919876543220',
    role: 'PATIENT',
    isVerified: true,
  },
  {
    email: 'patient.anita@gmail.com',
    firstName: 'Anita',
    lastName: 'Singh',
    phone: '+919876543221',
    role: 'PATIENT',
    isVerified: false,
  },
  {
    email: 'patient.suresh@gmail.com',
    firstName: 'Suresh',
    lastName: 'Reddy',
    phone: '+919876543222',
    role: 'PATIENT',
    isVerified: true,
  },

  // ── Receptionists ──
  {
    email: 'reception.meena@hospital.com',
    firstName: 'Meena',
    lastName: 'Iyer',
    phone: '+919876543230',
    role: 'RECEPTIONIST',
    isVerified: true,
  },

  // ── Lab Technicians ──
  {
    email: 'lab.vikram@hospital.com',
    firstName: 'Vikram',
    lastName: 'Joshi',
    phone: '+919876543240',
    role: 'LAB_TECHNICIAN',
    isVerified: true,
  },

  // ── Pharmacists ──
  {
    email: 'pharma.deepa@hospital.com',
    firstName: 'Deepa',
    lastName: 'Nair',
    phone: '+919876543250',
    role: 'PHARMACIST',
    isVerified: true,
  },
];

async function main() {
  console.log('Seeding identity-service database...\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  for (const user of seedUsers) {
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isActive: true,
      },
    });
    console.log(`  [${result.role.padEnd(14)}] ${result.email}`);
  }

  const count = await prisma.user.count();
  console.log(`\nDone — ${count} users in database.`);
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
