import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Store } from './lib/json-db.js'
import { uuid, dateInTimezone, nowIso } from './lib/ids.js'
import { hashPassword } from './lib/passwords.js'
import { seedDemoData } from './seed.js'
import { mulberry32, isoAt, dayOffset, canonicalHash } from './seed-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const PWD = 'Demo@12345'

const rnd = mulberry32(20260822)
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number) => rnd() < p

async function main() {
  const force = process.argv.includes('--force')
  const store = new Store(DATA_DIR)
  store.load()

  if (store.col('users').length === 0) {
    console.log('[rich-seed] base data missing, running base seed first...')
    await seedDemoData(store)
  }

  if (!force && store.byId<any>('meta', 'richSeed.v1')) {
    console.log('[rich-seed] rich data already present (meta marker). Use --force to re-add.')
    return
  }

  const users = store.col<any>('users')
  const hospitals = store.col<any>('hospitals')
  let h1 = hospitals.find((h) => h.city === 'Pune') ?? hospitals[0]
  if (!h1) throw new Error('No hospital found - base seed failed')
  let h2 = hospitals.find((h) => h.name === 'Sunrise Multispecialty Hospital')

  if (!h2) {
    h2 = store.insert('hospitals', {
      id: uuid(),
      name: 'Sunrise Multispecialty Hospital',
      city: 'Mumbai',
      address: 'Bandra Kurla Complex, Mumbai 400051',
      phone: '+912266778899',
      email: 'hello@sunrise.example',
      timezone: 'Asia/Kolkata',
    })
  }

  const dept = (hospitalId: string, name: string) =>
    store.col<any>('departments').find((d) => d.hospitalId === hospitalId && d.name === name) ??
    store.insert('departments', { id: uuid(), hospitalId, name })

  const depOrtho1 = dept(h1.id, 'Orthopedics')
  const depPed1 = dept(h1.id, 'Pediatrics')
  const derm1 = dept(h1.id, 'Dermatology')
  const gen2 = dept(h2!.id, 'General Medicine')
  const cardio2 = dept(h2!.id, 'Cardiology')
  const gyn2 = dept(h2!.id, 'Gynecology')

  const mkUser = async (
    email: string,
    fullName: string,
    role: string,
    hospitalId: string | null,
    phone?: string,
  ) => {
    const existing = store.find<any>('users', (u) => u.email === email)
    if (existing) return existing
    return store.insert('users', {
      id: uuid(),
      fullName,
      email,
      phone: phone ?? null,
      passwordHash: await hashPassword(PWD),
      isActive: true,
      emailVerified: true,
      phoneVerified: Boolean(phone),
      roles: [{ id: uuid(), hospitalId, role, isPrimary: true }],
    })
  }

  await mkUser('hospadmin@atelier.local', 'Hospital Admin', 'HOSPITAL_ADMIN', h1.id)
  await mkUser('nurse@atelier.local', 'Nurse Station', 'NURSE', h1.id)
  await mkUser('mumbai.reception@atelier.local', 'Sunrise Reception', 'RECEPTIONIST', h2!.id)
  await mkUser('mumbai.pharmacy@atelier.local', 'Sunrise Pharmacy', 'PHARMACIST', h2!.id)
  await mkUser('mumbai.lab@atelier.local', 'Sunrise Lab', 'LAB_TECH', h2!.id)

  const arjunUser = await mkUser(
    'arjun@atelier.local',
    'Arjun Reddy',
    'PATIENT',
    null,
    '+919810000011',
  )
  const meeraUser = await mkUser(
    'meera@atelier.local',
    'Meera Nair',
    'PATIENT',
    null,
    '+919810000012',
  )

  const weekly = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((dayOfWeek) => ({
    dayOfWeek,
    start: '09:00',
    end: '17:00',
    breakStart: '13:00',
    breakEnd: '14:00',
  }))

  const mkDoctor = (
    fullName: string,
    specialization: string,
    hospitalId: string,
    departmentId: string,
    fee: number,
    regNo: string,
    userId: string | null = null,
    experienceYears = 10,
  ) => {
    const existing = store.find<any>('doctors', (d) => d.fullName === fullName)
    if (existing) return existing
    const d = store.insert('doctors', {
      id: uuid(),
      userId,
      fullName,
      specializations: [specialization],
      qualification: 'MBBS, MD',
      registrationNumber: regNo,
      experienceYears,
      hospitalIds: [hospitalId],
      departmentId,
      roomNumber: null,
      feeConfig: { version: 1, amount: fee, currency: 'INR', effectiveFrom: new Date().toISOString() },
      feeHistory: [],
      isActive: true,
    })
    store.insert('schedules', { id: uuid(), doctorId: d.id, weekly, slotMinutes: 15 })
    for (let i = 0; i < 4; i++) {
      store.insert('rooms', {
        id: uuid(),
        hospitalId,
        name: `OPD-${String.fromCharCode(65 + Math.floor(rnd() * 5))}-${100 + store.col<any>('rooms').length}`,
        type: 'CONSULTATION',
        status: chance(0.3) ? 'OCCUPIED' : 'FREE',
      })
    }
    return d
  }

  const kavitaUser = await mkUser('kavita@atelier.local', 'Dr. Kavita Menon', 'DOCTOR', h1.id)
  const nehaUser = await mkUser('neha@atelier.local', 'Dr. Neha Verma', 'DOCTOR', h2!.id)
  const imranUser = await mkUser('imran@atelier.local', 'Dr. Imran Khan', 'DOCTOR', h2!.id)

  const doctorsNew = [
    mkDoctor('Dr. Kavita Menon', 'PEDIATRICS', h1.id, depPed1.id, 400, 'MMC-2009-33417', kavitaUser?.id ?? null, 16),
    mkDoctor('Dr. Suresh Patil', 'ORTHOPEDICS', h1.id, depOrtho1.id, 600, 'MMC-2012-50982', null, 13),
    mkDoctor('Dr. Anjali Deshmukh', 'DERMATOLOGY', h1.id, derm1.id, 500, 'MMC-2016-61873', null, 9),
    mkDoctor('Dr. Neha Verma', 'DERMATOLOGY', h2!.id, gen2.id, 550, 'MMC-2014-44290', nehaUser?.id ?? null, 11),
    mkDoctor('Dr. Imran Khan', 'GENERAL MEDICINE', h2!.id, gen2.id, 350, 'MMC-2010-27654', imranUser?.id ?? null, 15),
    mkDoctor('Dr. Lakshmi Iyer', 'GYNECOLOGY', h2!.id, gyn2.id, 700, 'MMC-2008-19023', null, 18),
  ]
  const asha = store.find<any>('doctors', (d) => d.fullName === 'Dr. Asha Rao')!
  const rahul = store.find<any>('doctors', (d) => d.fullName === 'Dr. Rahul Mehta')!
  const allDoctors = [asha, rahul, ...doctorsNew]

  const priyaPatient = store.find<any>('patients', (p) => p.userId === (store.find<any>('users', (u) => u.email === 'patient@atelier.local'))?.id)

  const patientNames: [string, string, string, string][] = [
    ['Aarav Patel', 'MALE', '1999-07-14', 'B+'],
    ['Diya Sharma', 'FEMALE', '1988-02-21', 'A+'],
    ['Rohan Desai', 'MALE', '1975-11-03', 'O+'],
    ['Kabir Singh', 'MALE', '1983-05-30', 'AB+'],
    ['Sneha Joshi', 'FEMALE', '1996-09-12', 'B-'],
    ['Vikram Rao', 'MALE', '1968-01-25', 'O-'],
    ['Pooja Bose', 'FEMALE', '1992-04-08', 'A-'],
    ['Aditya Kulkarni', 'MALE', '2001-12-19', 'B+'],
    ['Ishita Menon', 'FEMALE', '1986-06-27', 'A+'],
    ['Nikhil Chawla', 'MALE', '1993-03-15', 'O+'],
    ['Riya Kapoor', 'FEMALE', '1979-08-02', 'AB-'],
    ['Farhan Sheikh', 'MALE', '1990-10-31', 'B+'],
  ]

  const mrnSeq: Record<string, number> = {}
  for (const p of store.col<any>('patients')) {
    for (const r of p.registrations ?? []) {
      const n = Number(r.mrn.split('-')[1]) || 0
      mrnSeq[r.hospitalId] = Math.max(mrnSeq[r.hospitalId] ?? 0, n)
    }
  }
  const nextMrn = (hospitalId: string) => {
    mrnSeq[hospitalId] = (mrnSeq[hospitalId] ?? 0) + 1
    return `MRN-${String(mrnSeq[hospitalId]).padStart(6, '0')}`
  }

  const mkPatient = (fullName: string, gender: string, dob: string, bloodGroup: string, homeHospitalId: string) => {
    const phone = `+91981${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`
    return store.insert('patients', {
      id: uuid(),
      userId: null,
      fullName,
      phone,
      email: null,
      dob,
      gender,
      bloodGroup,
      registrations: [{ hospitalId: homeHospitalId, mrn: nextMrn(homeHospitalId), registeredAt: nowIso() }],
    })
  }

  const newPatients = patientNames.map(([n, g, d, b], i) =>
    mkPatient(n, g, d, b, i % 3 === 2 ? h2!.id : h1.id),
  )
  if (!priyaPatient) throw new Error('Priya patient record missing')
  if (!(priyaPatient.registrations ?? []).some((r: any) => r.hospitalId === h1.id)) {
    priyaPatient.registrations.push({ hospitalId: h1.id, mrn: nextMrn(h1.id), registeredAt: nowIso() })
    store.save('patients')
  }

  const ensureLinkedRecord = (user: any, fullName: string, phone: string, dob: string, gender: string) => {
    if (!user) return null
    const existing = store.find<any>('patients', (p) => p.userId === user.id)
    if (existing) return existing
    return store.insert('patients', {
      id: uuid(),
      userId: user.id,
      fullName,
      phone,
      email: user.email,
      dob,
      gender,
      bloodGroup: 'O+',
      registrations: [{ hospitalId: h1.id, mrn: nextMrn(h1.id), registeredAt: nowIso() }],
    })
  }
  ensureLinkedRecord(arjunUser, 'Arjun Reddy', '+919810000011', '1991-06-10', 'MALE')
  ensureLinkedRecord(meeraUser, 'Meera Nair', '+919810000012', '1994-11-02', 'FEMALE')

  const linkedPatients =
    store.filter<any>('patients', (p) => p.userId === arjunUser?.id || p.userId === meeraUser?.id)
  const allPatients = [priyaPatient, ...linkedPatients, ...newPatients]
  const patientsByHospital = (hid: string) =>
    allPatients.filter((p) => (p.registrations ?? []).some((r: any) => r.hospitalId === hid))

  const allergyRows: [string, string, string][] = [
    ['Penicillin', 'SEVERE', 'Urticaria and angioedema'],
    ['Sulfa drugs', 'MODERATE', 'Rash'],
    ['Dust mites', 'MILD', 'Sneezing, watery eyes'],
    ['Peanuts', 'SEVERE', 'Anaphylaxis risk'],
    ['Aspirin', 'MODERATE', 'Gastric upset'],
    ['Latex', 'MILD', 'Contact dermatitis'],
  ]
  allPatients.forEach((p, idx) => {
    if (idx % 2 === 0) {
      const a = allergyRows[idx % allergyRows.length]
      store.insert('allergies', { id: uuid(), patientId: p.id, substance: a[0], severity: a[1], reaction: a[2] })
    }
  })

  const conditionRows: [string, string, string][] = [
    ['Type 2 Diabetes Mellitus', '2019', 'On oral hypoglycemics'],
    ['Essential Hypertension', '2021', 'Controlled on amlodipine'],
    ['Hypothyroidism', '2020', 'On levothyroxine'],
    ['Bronchial Asthma', '2016', 'Seasonal exacerbations'],
    ['Chronic Migraine', '-', 'Episodic, photophobia'],
    ['Osteoarthritis (knee)', '2022', 'Bilateral'],
  ]
  allPatients.forEach((p, idx) => {
    if (idx % 3 !== 2) {
      const c = conditionRows[idx % conditionRows.length]
      store.insert('conditions', { id: uuid(), patientId: p.id, name: c[0], since: c[1], notes: c[2], active: true })
    }
  })

  const medRows: [string, string, string][] = [
    ['Metformin 500mg Tablet', '500mg', '1-0-1'],
    ['Amlodipine 5mg Tablet', '5mg', '1-0-0'],
    ['Levothyroxine 50mcg Tablet', '50mcg', '1-0-0 empty stomach'],
    ['Salbutamol Inhaler', '100mcg/puff', '2 puffs PRN'],
    ['Atorvastatin 10mg Tablet', '10mg', '0-0-1'],
    ['Pantoprazole 40mg Tablet', '40mg', '1-0-0 before food'],
  ]
  allPatients.forEach((p, idx) => {
    if (idx % 2 === 1) {
      const m = medRows[idx % medRows.length]
      store.insert('medications', { id: uuid(), patientId: p.id, drug: m[0], dose: m[1], frequency: m[2], active: true })
    }
  })

  const pharmacyItems: [string, string, number, number][] = [
    ['Cetirizine 10mg Tablet', 'CETIRIZINE-10', 20, 90],
    ['Metformin 500mg Tablet', 'METFORMIN-500', 45, 120],
    ['Amlodipine 5mg Tablet', 'AMLODIPINE-5', 38, 80],
    ['Atorvastatin 20mg Tablet', 'ATORVASTATIN-20', 75, 60],
    ['Pantoprazole 40mg Tablet', 'PANTOPRAZOLE-40', 55, 70],
    ['Azithromycin 500mg Tablet', 'AZITHROMYCIN-500', 95, 42],
    ['Ibuprofen 200mg Tablet', 'IBUPROFEN-200', 18, 100],
    ['ORS Powder Sachet', 'ORS-SACHET', 22, 150],
    ['Vitamin D3 60000 IU Capsule', 'VITD3-60K', 32, 26],
    ['Salbutamol Inhaler', 'SALBUTAMOL-INH', 145, 14],
    ['Ondansetron 4mg Injection', 'ONDANSETRON-INJ', 28, 34],
    ['Betadine Ointment 20g', 'BETADINE-OINT', 88, 22],
  ]
  const expiries = ['2026-09-30', '2026-12-15', '2027-03-31', '2027-06-30', '2027-12-31']
  const catalog = pharmacyItems.map(([name, sku, price, qty], i) => {
    let item = store.find<any>('pharmacyItems', (it) => it.sku === sku)
    if (!item) {
      item = store.insert('pharmacyItems', {
        id: uuid(),
        name,
        form: name.includes('Injection') ? 'INJECTION' : name.includes('Sachet') ? 'OTHER' : name.includes('Ointment') ? 'OINTMENT' : 'TABLET',
        strength: sku.split('-')[1] ?? '-',
        manufacturer: pick(['Cipla', 'Sun Pharma', 'Mankind', 'Torrent', 'Zydus']),
        price,
        currency: 'INR',
        sku,
        lowStockThreshold: 30,
        active: true,
      })
      const batch = store.insert('inventoryBatches', {
        id: uuid(),
        itemId: item.id,
        batchNo: `B-${sku.slice(0, 4)}-${String(i + 1).padStart(3, '0')}`,
        expiryDate: expiries[i % expiries.length],
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
    return item
  })
  const drugNames = [...catalog.map((c) => c.name), 'Paracetamol 500mg Tablet', 'Amoxicillin 500mg Capsule']

  const incCounter = (name: 'invoices' | 'orders') => {
    const c = store.byId<any>('counters', name)
    const v = (c?.value ?? 0) + 1
    if (c) store.patch('counters', name, { value: v })
    else store.insert('counters', { id: name as any, value: 1 })
    return v
  }

  const complaintTemplates = [
    { complaint: 'Fever with body ache since 2 days', diagnosis: 'Acute viral fever', plan: 'Rest, hydration, symptomatic treatment', exam: 'Temp 100.2F, throat congested' },
    { complaint: 'Cough with sputum since 1 week', diagnosis: 'Upper respiratory tract infection', plan: 'Antitussive, steam inhalation, review in 5 days', exam: 'Chest clear, no rhonchi' },
    { complaint: 'Headache and giddiness since morning', diagnosis: 'Tension headache', plan: 'Analgesic, avoid screen strain, review 1 week', exam: 'BP 138/88, fundus normal' },
    { complaint: 'Itchy rash over forearms', diagnosis: 'Contact dermatitis', plan: 'Antihistamine, topical steroid, avoid irritant', exam: 'Erythematous papules bilaterally' },
    { complaint: 'Knee pain while climbing stairs', diagnosis: 'Early osteoarthritis', plan: 'Quadriceps exercises, analgesic PRN, weight reduction', exam: 'Crepitus right knee, no effusion' },
    { complaint: 'Acidity and bloating after meals', diagnosis: 'Gastritis', plan: 'PPI 2 weeks, small frequent meals', exam: 'Mild epigastric tenderness' },
  ]

  const labTests: [string, string, string, string][] = [
    ['CBC', 'Haemoglobin', '13.8', '13-17 g/dL'],
    ['CBC', 'Total Leucocyte Count', '8200', '4000-11000 /uL'],
    ['LIPID', 'LDL Cholesterol', '148', '<100 mg/dL'],
    ['LIPID', 'Triglycerides', '176', '<150 mg/dL'],
    ['TSH', 'TSH', '4.9', '0.4-4.0 uIU/mL'],
    ['HBA1C', 'HbA1c', '7.4', '<5.7 %'],
  ]

  const nextTokenNo = (hid: string, did: string, date: string) => {
    let max = 0
    for (const t of store.col<any>('tokens')) {
      if (t.hospitalId === hid && t.doctorId === did && t.tokenDate === date) max = Math.max(max, t.tokenNumber)
    }
    return max + 1
  }

  let visitCount = 0
  let rxCount = 0
  let labCount = 0

  for (let daysAgo = 24; daysAgo >= 2; daysAgo--) {
    const visitsToday = 1 + Math.floor(rnd() * 2)
    const date = dayOffset(-daysAgo)
    for (let v = 0; v < visitsToday; v++) {
      const doctor = pick(allDoctors)
      const pool = patientsByHospital(doctor.hospitalIds[0])
      const patient = pick(pool.length > 0 ? pool : allPatients)
      const startHour = 9 + Math.floor(rnd() * 7)
      const mm = String(pick(['00', '15', '30', '45']))
      const hh = `${startHour}:${mm}`

      const consultationId = uuid()
      const pad2 = (n: number) => String(n).padStart(2, '0')
      const m0 = startHour * 60 + Number(mm)
      const hmOf = (mins: number) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
      const token = store.insert('tokens', {
        id: uuid(),
        consultationId,
        appointmentId: null,
        hospitalId: doctor.hospitalIds[0],
        doctorId: doctor.id,
        patientId: patient.id,
        patientName: patient.fullName,
        doctorName: doctor.fullName,
        tokenNumber: nextTokenNo(doctor.hospitalIds[0], doctor.id, date),
        tokenDate: date,
        priority: chance(0.15) ? 'SENIOR_CITIZEN' : 'NORMAL',
        status: 'COMPLETED',
        version: 1,
        feeSnapshot: JSON.parse(JSON.stringify(doctor.feeConfig)),
        paymentStatus: 'UNPAID',
        calledAt: isoAt(date, hmOf(m0)),
        startedAt: isoAt(date, hmOf(m0 + 10)),
        completedAt: isoAt(date, hmOf(m0 + 45)),
        nearTurnNotifiedAt: isoAt(date, hmOf(Math.max(m0 - 20, 540))),
      })

      const tpl = complaintTemplates[visitCount % complaintTemplates.length]
      store.insert('consultationContents', {
        id: uuid(),
        consultationId,
        tokenId: token.id,
        patientId: patient.id,
        doctorId: doctor.id,
        complaint: tpl.complaint,
        vitals: { bp: `${118 + Math.floor(rnd() * 20)}/${76 + Math.floor(rnd() * 10)}`, pulse: String(72 + Math.floor(rnd() * 20)), spo2: 97 + Math.floor(rnd() * 3) },
        examination: tpl.exam,
        assessment: tpl.diagnosis,
        diagnosis: tpl.diagnosis,
        plan: tpl.plan,
        followUpAt: null,
        savedBy: doctor.userId ?? 'seed-doctor',
        updatedAt: isoAt(date, hmOf(m0)),
      })

      const invSeq = incCounter('invoices')
      const paid = chance(0.72)
      const invoice = store.insert('invoices', {
        id: uuid(),
        invoiceNo: `INV-${String(invSeq).padStart(6, '0')}`,
        consultationId,
        tokenId: token.id,
        patientId: patient.id,
        patientUserId: patient.userId ?? null,
        doctorName: doctor.fullName,
        hospitalId: doctor.hospitalIds[0],
        lineItems: [{ description: `Consultation fee - ${doctor.fullName}`, amount: doctor.feeConfig.amount, currency: 'INR' }],
        total: doctor.feeConfig.amount,
        currency: 'INR',
        status: paid ? 'PAID' : 'UNPAID',
        pdfKey: null,
        pdfUrl: null,
        paidAt: paid ? isoAt(date, '18:30') : null,
      })
      if (paid) {
        const ordSeq = incCounter('orders')
        store.insert('payments', {
          id: uuid(),
          invoiceId: invoice.id,
          patientId: patient.id,
          patientUserId: patient.userId ?? null,
          orderId: `order_demo_${String(ordSeq).padStart(8, '0')}`,
          amount: invoice.total,
          currency: 'INR',
          status: 'CAPTURED',
          method: 'upi',
          provider: 'mock-razorpay',
          capturedAt: isoAt(date, '18:30'),
        })
      }

      if (chance(0.55)) {
        const items = Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => ({
          drug: pick(drugNames),
          dose: pick(['500mg', '250mg', '10mg']),
          frequency: pick(['1-0-1', '1-1-1', '0-0-1', 'SOS']),
          durationDays: pick([3, 5, 7]),
          instructions: pick(['after food', 'before food', 'complete the course']),
        }))
        const signedAt = isoAt(date, hmOf(m0))
        rxCount++
        store.insert('prescriptions', {
          id: uuid(),
          consultationId,
          patientId: patient.id,
          hospitalId: doctor.hospitalIds[0],
          doctorUserId: doctor.userId ?? 'seed-doctor',
          status: 'SIGNED',
          items,
          notes: chance(0.4) ? 'Review with reports' : null,
          contentHash: canonicalHash({ items, patientId: patient.id, signedAt }),
          pdfKey: null,
          pdfUrl: null,
          signedAt,
          fulfilledAt: null,
          doctorSnapshot: { name: doctor.fullName, registrationNumber: doctor.registrationNumber, qualification: doctor.qualification, signedBy: doctor.userId ?? 'seed-doctor' },
        })
      }

      if (chance(0.35)) {
        const t = pick(labTests)
        labCount++
        store.insert('labOrders', {
          id: uuid(),
          consultationId,
          patientId: patient.id,
          hospitalId: doctor.hospitalIds[0],
          orderedBy: doctor.userId ?? 'seed-doctor',
          tests: [{ code: t[0], name: t[0] === 'CBC' ? 'Complete Blood Count' : t[0] === 'LIPID' ? 'Lipid Profile' : t[0] }],
          priority: chance(0.25) ? 'URGENT' : 'ROUTINE',
          notes: null,
          status: 'RELEASED',
          results: [
            { parameter: t[1], value: t[2], unit: t[3].split(' ').pop(), referenceRange: t[3].split(' ')[0], flag: 'NORMAL' },
          ],
          collectedAt: isoAt(date, '19:00'),
          releasedAt: isoAt(dayOffset(Math.max(daysAgo - 1, 0)), '10:00'),
        })
      }

      visitCount++
    }
  }

  const recentLabs = [...store.col<any>('labOrders')].slice(-4)
  const statuses = ['ORDERED', 'COLLECTED', 'ENTERED', 'ENTERED'] as const
  recentLabs.forEach((l, i) => {
    const status = statuses[i]
    store.patch('labOrders', l.id, {
      status,
      releasedAt: null,
      collectedAt: status === 'ORDERED' ? null : nowIso(),
    })
  })

  const today = dayOffset(0)
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  let pool = shuffle(patientsByHospital(h1.id).filter((p) => p.id !== priyaPatient.id))
  if (pool.length < 5) pool = shuffle(allPatients.filter((p) => p.id !== priyaPatient.id))
  const ashaPatients = [pool[0] ?? priyaPatient, pool[1] ?? priyaPatient, pool[2] ?? priyaPatient, priyaPatient]
  const rahulPatients = [pool[3] ?? pool[0] ?? priyaPatient, pool[4] ?? pool[1] ?? priyaPatient]
  const liveQueuePlan: [any, any, string][] = [
    [asha, ashaPatients[0], 'CALLED'],
    [asha, ashaPatients[1], 'WAITING'],
    [asha, ashaPatients[2], 'WAITING'],
    [asha, priyaPatient, 'WAITING'],
    [rahul, rahulPatients[0], 'WAITING'],
    [rahul, rahulPatients[1], 'WAITING'],
  ]
  const prioritiesLive = ['NORMAL', 'SENIOR_CITIZEN', 'EMERGENCY', 'NORMAL', 'WOMAN_CHILD', 'NORMAL']
  liveQueuePlan.forEach(([doctor, patient, status], i) => {
    const n = nextTokenNo(h1.id, doctor.id, today)
    store.insert('tokens', {
      id: uuid(),
      consultationId: uuid(),
      appointmentId: null,
      hospitalId: h1.id,
      doctorId: doctor.id,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorName: doctor.fullName,
      tokenNumber: n,
      tokenDate: today,
      priority: prioritiesLive[i % prioritiesLive.length],
      status,
      version: 1,
      feeSnapshot: JSON.parse(JSON.stringify(doctor.feeConfig)),
      paymentStatus: 'UNPAID',
      calledAt: status === 'CALLED' ? nowIso() : null,
      startedAt: null,
      completedAt: null,
      nearTurnNotifiedAt: null,
    })
  })

  const apptPlan: [number, string, any, any][] = [
    [1, '10:00', priyaPatient, asha],
    [1, '11:30', linkedPatients.find((p) => p.userId === arjunUser?.id) ?? pick(newPatients), doctorsNew[0]],
    [1, '12:00', linkedPatients.find((p) => p.userId === meeraUser?.id) ?? pick(newPatients), doctorsNew[3]],
    [2, '09:30', pick(newPatients), rahul],
    [2, '15:45', pick(newPatients), doctorsNew[4]],
    [2, '16:15', pick(newPatients), doctorsNew[5]],
  ]
  apptPlan.forEach(([offset, time, patient, doctor]) => {
    const date = dayOffset(offset)
    store.insert('appointments', {
      id: uuid(),
      patientId: patient.id,
      doctorId: doctor.id,
      hospitalId: doctor.hospitalIds[0],
      startsAt: isoAt(date, time),
      date,
      status: 'BOOKED',
      reason: pick(['Follow-up visit', 'First consultation', 'Report review', 'Routine check-up']),
      priority: null,
      feeSnapshot: JSON.parse(JSON.stringify(doctor.feeConfig)),
      tokenId: null,
    })
  })

  const notif = (userId: string | null, category: string, subject: string, body: string, read: boolean) => {
    if (!userId) return
    store.insert('notifications', {
      id: uuid(),
      createdAt: nowIso(),
      userId,
      category,
      subject,
      body,
      readAt: read ? nowIso() : null,
      deliveries: [{ channel: 'INAPP', status: 'DELIVERED', provider: 'inapp', at: nowIso() }],
    })
  }
  const phaUser = store.find<any>('users', (u) => u.email === 'pharmacy@atelier.local')
  const lowStockItems = catalog.filter((c) => c.sku === 'IBUPROFEN-200' || c.sku === 'VITD3-60K')
  lowStockItems.forEach((item) => {
    notif(phaUser?.id ?? null, 'ALERT', 'Low stock', `${item.name} is at or below reorder threshold.`, false)
  })
  notif(arjunUser?.id ?? null, 'SYSTEM', 'Welcome to Atelier Health', 'Your account is ready.', true)
  notif(meeraUser?.id ?? null, 'APPOINTMENT', 'Appointment confirmed', 'Your appointment tomorrow has been confirmed.', false)
  notif(priyaPatient?.userId ?? null, 'QUEUE', 'Almost your turn', 'You are 2 away. Please head to the consulting area.', false)

  const staffForAudit = users.filter((u) => u.roles?.some((r: any) => r.role !== 'PATIENT'))
  for (let i = 0; i < 24; i++) {
    const actor = pick(staffForAudit)
    const action = pick(['auth.login', 'auth.login', 'phi.accessed', 'commerce.payment_captured', 'directory.attendance.check_in'])
    store.insert('auditLogs', {
      id: uuid(),
      timestamp: new Date(Date.now() - Math.floor(rnd() * 20 * 86_400_000)).toISOString(),
      actorId: actor.id,
      actorRole: actor.roles[0].role,
      action,
      resource: action.startsWith('phi') ? 'patient_record' : action.split('.')[0],
      resourceId: pick(allPatients).id,
      ip: '10.0.0.' + (2 + Math.floor(rnd() * 250)),
      correlationId: `cid_seed${i}`,
    })
  }

  store.insert('meta', { id: 'richSeed.v1' as any, at: nowIso() })
  store.flushAll()

  console.log(`[rich-seed] done:
   hospitals=2  departments=${store.col('departments').length}  doctors=${store.col('doctors').length}
   patients=${store.col('patients').length}  visits=${visitCount}  prescriptions=${rxCount}  labs=${labCount}
   invoices=${store.col('invoices').length}  payments=${store.col('payments').length}
   pharmacyItems=${store.col('pharmacyItems').length}  tokensToday(h1)=${store.filter<any>('tokens', (t) => t.tokenDate === today && t.hospitalId === h1.id).length}
   appointments upcoming=${apptPlan.length}  notifications=${store.col('notifications').length}  auditLogs=${store.col('auditLogs').length}`)
}

main().catch((e) => {
  console.error('[rich-seed] fatal:', e)
  process.exit(1)
})
