import type { Store } from './lib/json-db.js'
import { uuid } from './lib/ids.js'
import { hashPassword } from './lib/passwords.js'

const STAFF_PASSWORD = 'Demo@12345'
const ADMIN_PASSWORD = 'Admin@12345'

export async function seedDemoData(store: Store) {
  if (store.col('users').length > 0) return null

  const adminUser = store.insert('users', {
    id: uuid(),
    fullName: 'Platform Admin',
    email: 'admin@atelier.local',
    phone: null,
    passwordHash: await hashPassword(ADMIN_PASSWORD),
    isActive: true,
    emailVerified: true,
    phoneVerified: false,
    roles: [{ id: uuid(), hospitalId: null, role: 'PLATFORM_ADMIN', isPrimary: true }],
  })

  const hospital = store.insert('hospitals', {
    id: uuid(),
    name: 'City Care Hospital',
    city: 'Pune',
    address: '12 FC Road, Pune 411005',
    phone: '+912012345678',
    email: 'hello@citycare.example',
    timezone: 'Asia/Kolkata',
  })

  const deptGeneral = store.insert('departments', { id: uuid(), hospitalId: hospital.id, name: 'General Medicine' })
  const deptCardio = store.insert('departments', { id: uuid(), hospitalId: hospital.id, name: 'Cardiology' })

  const mkStaff = async (
    email: string,
    fullName: string,
    role: string,
    hospitalId: string | null,
    primary = true,
  ) => {
    const u = store.insert('users', {
      id: uuid(),
      fullName,
      email,
      phone: null,
      passwordHash: await hashPassword(STAFF_PASSWORD),
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
      roles: [{ id: uuid(), hospitalId, role, isPrimary: primary }],
    })
    return u
  }

  const ashaUser = await mkStaff('asha@atelier.local', 'Dr. Asha Rao', 'DOCTOR', hospital.id)
  const rahulUser = await mkStaff('rahul@atelier.local', 'Dr. Rahul Mehta', 'DOCTOR', hospital.id)
  const receptionist = await mkStaff('reception@atelier.local', 'Reception Desk', 'RECEPTIONIST', hospital.id)
  const pharmacist = await mkStaff('pharmacy@atelier.local', 'Pharmacy Counter', 'PHARMACIST', hospital.id)
  const labtech = await mkStaff('lab@atelier.local', 'Lab Bench', 'LAB_TECH', hospital.id)

  const asha = store.insert('doctors', {
    id: uuid(),
    userId: ashaUser.id,
    fullName: 'Dr. Asha Rao',
    specializations: ['CARDIOLOGY'],
    qualification: 'MBBS, MD, DM Cardiology',
    registrationNumber: 'MMC-2011-45231',
    experienceYears: 14,
    hospitalIds: [hospital.id],
    departmentId: deptCardio.id,
    roomNumber: 'C-204',
    feeConfig: { version: 1, amount: 500, currency: 'INR', effectiveFrom: new Date().toISOString() },
    feeHistory: [],
    isActive: true,
  })

  const rahul = store.insert('doctors', {
    id: uuid(),
    userId: rahulUser.id,
    fullName: 'Dr. Rahul Mehta',
    specializations: ['GENERAL MEDICINE'],
    qualification: 'MBBS, MD',
    registrationNumber: 'MMC-2015-77120',
    experienceYears: 9,
    hospitalIds: [hospital.id],
    departmentId: deptGeneral.id,
    roomNumber: 'G-101',
    feeConfig: { version: 1, amount: 350, currency: 'INR', effectiveFrom: new Date().toISOString() },
    feeHistory: [],
    isActive: true,
  })

  const weekly = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((dayOfWeek) => ({
    dayOfWeek,
    start: '09:00',
    end: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
  }))
  for (const d of [asha, rahul]) {
    store.insert('schedules', { id: uuid(), doctorId: d.id, weekly, slotMinutes: 15 })
  }

  const patientUser = store.insert('users', {
    id: uuid(),
    fullName: 'Priya Sharma',
    email: 'patient@atelier.local',
    phone: '+919810000001',
    passwordHash: await hashPassword(STAFF_PASSWORD),
    isActive: true,
    emailVerified: true,
    phoneVerified: true,
    roles: [{ id: uuid(), hospitalId: null, role: 'PATIENT', isPrimary: true }],
  })

  const patient = store.insert('patients', {
    id: uuid(),
    userId: patientUser.id,
    fullName: 'Priya Sharma',
    phone: '+919810000001',
    email: 'patient@atelier.local',
    dob: '1994-03-18',
    gender: 'FEMALE',
    bloodGroup: 'O+',
    registrations: [] as any[],
  })
  patient.registrations.push({
    hospitalId: hospital.id,
    mrn: 'MRN-000001',
    registeredAt: new Date().toISOString(),
  })
  store.save('patients')

  const paracetamol = store.insert('pharmacyItems', {
    id: uuid(),
    name: 'Paracetamol 500mg Tablet',
    form: 'TABLET',
    strength: '500mg',
    manufacturer: 'Cipla',
    price: 30,
    currency: 'INR',
    sku: 'PARACETAMOL-500',
    lowStockThreshold: 20,
    active: true,
  })
  const amoxicillin = store.insert('pharmacyItems', {
    id: uuid(),
    name: 'Amoxicillin 500mg Capsule',
    form: 'CAPSULE',
    strength: '500mg',
    manufacturer: 'Sun Pharma',
    price: 80,
    currency: 'INR',
    sku: 'AMOXICILLIN-500',
    lowStockThreshold: 15,
    active: true,
  })

  for (const [item, qty] of [
    [paracetamol, 100],
    [amoxicillin, 60],
  ] as const) {
    const batch = store.insert('inventoryBatches', {
      id: uuid(),
      itemId: item.id,
      batchNo: `B-${item.sku.slice(0, 4)}-001`,
      expiryDate: '2027-12-31',
      qtyOriginal: qty,
      qtyRemaining: qty,
    })
    store.insert('stockMovements', {
      id: uuid(),
      itemId: item.id,
      batchId: batch.id,
      deltaQty: qty,
      reason: 'STOCK_IN',
      refId: batch.id,
    })
  }

  store.insert('counters', { id: 'invoices', value: 0 })
  store.insert('counters', { id: 'orders', value: 0 })

  return {
    hospital,
    accounts: [
      { label: 'Platform admin', login: 'admin@atelier.local', password: ADMIN_PASSWORD },
      { label: 'Doctor (cardiology)', login: 'asha@atelier.local', password: STAFF_PASSWORD },
      { label: 'Doctor (general medicine)', login: 'rahul@atelier.local', password: STAFF_PASSWORD },
      { label: 'Receptionist', login: 'reception@atelier.local', password: STAFF_PASSWORD },
      { label: 'Pharmacist', login: 'pharmacy@atelier.local', password: STAFF_PASSWORD },
      { label: 'Lab technician', login: 'lab@atelier.local', password: STAFF_PASSWORD },
      { label: 'Patient', login: 'patient@atelier.local', password: STAFF_PASSWORD },
    ],
    ids: {
      hospitalId: hospital.id,
      doctorId: asha.id,
      doctorUserId: ashaUser.id,
      patientId: patient.id,
      patientUserId: patientUser.id,
      receptionistUserId: receptionist.id,
      pharmacistUserId: pharmacist.id,
      labTechUserId: labtech.id,
    },
  }
}
