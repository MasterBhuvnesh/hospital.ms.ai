/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

// Tab excludes telemedicine per requirements
const ALL_TABS = ['overview','ehr','appointments','prescriptions','labs','analytics','notifications','settings'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
const fmt = (d: string | Date) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };
const uid = (arr: { id?: number }[]) => Math.max(...arr.map(a => a.id ?? 0), 0) + 1;

const EMPTY_PATIENT = {
  name: '', age: '', gender: 'Male', contact: '', address: '', bloodGroup: 'O+',
  diseases: [], surgeries: [], familyHistory: '', allergies: [], medications: [], vitals: [], visits: [],
};

const APPT_STATUS_STYLE = {
  'Scheduled':   'bg-blue-50 text-blue-700 border border-blue-200',
  'Confirmed':   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'In Progress': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Completed':   'bg-slate-100 text-slate-600 border border-slate-200',
  'Cancelled':   'bg-red-50 text-red-600 border border-red-200',
  'No-show':     'bg-orange-50 text-orange-600 border border-orange-200',
};

const LAB_FLAG_STYLE = {
  normal:   'text-emerald-600',
  high:     'text-red-600 font-bold',
  low:      'text-blue-600 font-bold',
  critical: 'text-red-700 font-black animate-pulse',
};

// ─── INLINE STYLES (Atelier Health palette) ──────────────────────────────────
// Primary: #1D3EB6 (deep royal blue matching screenshots)
// Accent italic: blue-600

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #1D3EB6;
    --primary-light: #EEF2FF;
    --primary-mid: #3B5BD6;
    --font-serif: 'Inter', system-ui, sans-serif;
    --font-sans: 'Inter', system-ui, sans-serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  }

  body { font-family: var(--font-sans); background: #F8F9FD; color: #0F172A; }

  .atelier-gradient { background: linear-gradient(135deg, #1D3EB6 0%, #2D5BE3 100%); }
  .atelier-gradient-soft { background: linear-gradient(135deg, #EEF2FF 0%, #F0F4FF 100%); }

  .sidebar { transition: width 0.3s cubic-bezier(.4,0,.2,1); }
  .main-content { transition: margin-left 0.3s cubic-bezier(.4,0,.2,1); }

  .tab-active { background: var(--primary) !important; color: white !important; }
  .tab-item:hover:not(.tab-active) { background: #F1F5F9; color: #1E293B; }

  .card { background: white; border-radius: var(--radius-lg); border: 1px solid #E2E8F0; box-shadow: var(--shadow-sm); }
  .card:hover { box-shadow: var(--shadow-md); }

  .inp {
    width: 100%; padding: 10px 14px; background: #F8FAFC; border: 1px solid #E2E8F0;
    border-radius: var(--radius-md); outline: none; font-size: 13px; font-weight: 500;
    font-family: var(--font-sans); color: #0F172A; transition: all 0.15s;
  }
  .inp:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(29,62,182,0.1); background: white; }
  select.inp { cursor: pointer; }
  textarea.inp { resize: vertical; }

  .btn-primary {
    padding: 10px 20px; background: var(--primary); color: white; border: none;
    border-radius: var(--radius-md); font-weight: 700; font-size: 13px; cursor: pointer;
    font-family: var(--font-sans); transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-primary:hover { background: var(--primary-mid); }
  .btn-primary:active { transform: scale(0.97); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-ghost {
    padding: 10px 20px; background: transparent; color: #64748B; border: 1px solid #E2E8F0;
    border-radius: var(--radius-md); font-weight: 700; font-size: 13px; cursor: pointer;
    font-family: var(--font-sans); transition: all 0.15s;
  }
  .btn-ghost:hover { background: #F1F5F9; color: #1E293B; }

  .btn-danger {
    padding: 10px 20px; background: #EF4444; color: white; border: none;
    border-radius: var(--radius-md); font-weight: 700; font-size: 13px; cursor: pointer;
    font-family: var(--font-sans); transition: all 0.15s;
  }
  .btn-danger:hover { background: #DC2626; }

  .modal-overlay {
    position: fixed; inset: 0; z-index: 200; display: flex; align-items: center;
    justify-content: center; padding: 16px; background: rgba(15,23,42,0.5);
    backdrop-filter: blur(4px); animation: fadeIn 0.15s ease;
  }
  .modal-box {
    background: white; border-radius: var(--radius-xl); width: 100%; max-width: 560px;
    box-shadow: 0 25px 50px rgba(0,0,0,0.15); display: flex; flex-direction: column;
    max-height: 92vh; animation: zoomIn 0.2s cubic-bezier(.34,1.56,.64,1);
  }
  .modal-box.wide { max-width: 760px; }
  .modal-header {
    padding: 18px 24px; border-bottom: 1px solid #F1F5F9; display: flex;
    justify-content: space-between; align-items: center; background: #FAFBFF; flex-shrink: 0;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }
  .modal-footer {
    padding: 16px 24px; border-top: 1px solid #F1F5F9; display: flex;
    justify-content: flex-end; gap: 10px; background: #FAFBFF; flex-shrink: 0;
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }

  .field-label {
    display: block; font-size: 10px; font-weight: 700; color: #94A3B8;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; margin-left: 2px;
  }

  .stat-card {
    background: white; border-radius: var(--radius-lg); padding: 20px;
    border: 1px solid #E2E8F0; box-shadow: var(--shadow-sm);
  }

  .badge {
    display: inline-flex; align-items: center; padding: 2px 10px;
    border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  }

  .patient-card {
    background: white; border-radius: var(--radius-lg); padding: 20px;
    border: 1px solid #E2E8F0; box-shadow: var(--shadow-sm); cursor: pointer;
    transition: all 0.2s; position: relative;
  }
  .patient-card:hover { box-shadow: var(--shadow-md); border-color: #C7D2FE; transform: translateY(-1px); }

  .avatar {
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; flex-shrink: 0;
    background: linear-gradient(135deg, #1D3EB6 0%, #3B5BD6 100%);
  }

  .notif-panel {
    position: absolute; right: 0; top: 52px; width: 320px; background: white;
    border-radius: var(--radius-lg); box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    border: 1px solid #E2E8F0; z-index: 50; overflow: hidden;
  }

  .timeline-dot {
    position: absolute; left: -17px; top: 8px; width: 10px; height: 10px;
    border-radius: 50%; background: var(--primary); border: 2px solid white;
    box-shadow: 0 0 0 2px var(--primary);
  }

  .progress-bar { height: 6px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.5s ease; }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .animate-in { animation: slideUp 0.3s ease; }
  .animate-spin { animation: spin 1s linear infinite; }
  .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }

  .ms { font-family: 'Material Symbols Outlined'; font-size: 20px; line-height: 1;
    font-weight: 400; display: inline-block; vertical-align: middle; }
  .ms-fill { font-variation-settings: 'FILL' 1; }
  .ms-sm { font-size: 16px; }
  .ms-lg { font-size: 24px; }

  .divider { height: 1px; background: #F1F5F9; }

  .print-rx { display: none; }
  @media print {
    .no-print { display: none !important; }
    .print-rx { display: block; padding: 40px; font-family: var(--font-sans); }
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function Icon({ name, fill = false, size = 'md', color = '' }) {
  const sz = size === 'sm' ? 'ms-sm' : size === 'lg' ? 'ms-lg' : '';
  return <span className={`ms ${sz} ${fill ? 'ms-fill' : ''}`} style={color ? { color } : {}}>{name}</span>;
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '26px', fontWeight: 900, color }}>{value}</span>
        <span className="ms ms-fill" style={{ fontSize: '22px', color, opacity: 0.7 }}>{icon}</span>
      </div>
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px' }}>{label}</p>
      {sub && <p style={{ fontSize: '10px', color: '#CBD5E1', marginTop: '2px' }}>{sub}</p>}
    </div>
  );
}

function Badge({ label, style: bStyle }) {
  return <span className="badge" style={bStyle}>{label}</span>;
}

function ApptBadge({ status }) {
  const map = {
    'Scheduled':   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    'Confirmed':   { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
    'In Progress': { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    'Completed':   { bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
    'Cancelled':   { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
    'No-show':     { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  };
  const s = map[status] || map['Scheduled'];
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{status}</span>
  );
}

function Modal({ title, icon, onClose, children, footer, wide }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-box${wide ? ' wide' : ''}`}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ms ms-fill" style={{ color: 'var(--primary)', fontSize: '18px' }}>{icon}</span>
            <h3 style={{ fontWeight: 900, fontSize: '15px', color: '#0F172A' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <span className="ms" style={{ color: '#94A3B8', fontSize: '18px' }}>close</span>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function Grid2({ children, gap = 16 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap }}>{children}</div>;
}

// ─── AI HOOK ──────────────────────────────────────────────────────────────────

function useAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const analyze = useCallback(async (prompt) => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a clinical decision support AI for Atelier Health. Be concise, medically accurate, and always recommend physician oversight. Use **bold** for section headings.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      setResult(data.content?.map((c) => c.text || '').join('') || 'Analysis unavailable.');
    } catch {
      setResult('AI service unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, result, analyze, setResult };
}

// ─── PRINT PRESCRIPTION ───────────────────────────────────────────────────────

function printPrescription(rx, doctorName) {
  const win = window.open('', '_blank', 'width=700,height=900');
  win.document.write(`
    <html><head><title>Prescription - ${rx.patientName}</title>
    <style>
      body { font-family: 'Georgia', serif; padding: 40px; color: #0F172A; max-width: 680px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1D3EB6; padding-bottom: 20px; margin-bottom: 24px; }
      .clinic-name { font-size: 24px; font-weight: 700; color: #1D3EB6; }
      .clinic-sub { font-size: 12px; color: #64748B; margin-top: 4px; }
      .rx-symbol { font-size: 48px; color: #1D3EB6; font-style: italic; line-height: 1; }
      .info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #F8FAFC; padding: 16px; border-radius: 8px; }
      .info-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8; display: block; margin-bottom: 4px; }
      .info-item span { font-size: 14px; font-weight: 600; }
      .diagnosis { background: #EFF6FF; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
      .diagnosis strong { color: #1D3EB6; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      th { background: #1D3EB6; color: white; padding: 10px 14px; text-align: left; font-size: 12px; }
      td { padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
      tr:nth-child(even) td { background: #F8FAFC; }
      .notes { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #475569; font-style: italic; margin-bottom: 32px; }
      .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #E2E8F0; padding-top: 20px; }
      .signature { text-align: right; }
      .sig-line { width: 200px; border-bottom: 1px solid #0F172A; margin-bottom: 6px; }
      .sig-name { font-weight: 700; font-size: 13px; }
      .disclaimer { font-size: 10px; color: #94A3B8; max-width: 300px; }
    </style>
    </head><body>
    <div class="header">
      <div><div class="clinic-name">Atelier Health</div><div class="clinic-sub">Clinical Portal · AI-Augmented Healthcare</div></div>
      <div class="rx-symbol">℞</div>
    </div>
    <div class="info-row">
      <div class="info-item"><label>Patient</label><span>${rx.patientName}</span></div>
      <div class="info-item"><label>Date</label><span>${fmt(rx.date)}</span></div>
      <div class="info-item"><label>Rx #</label><span>${rx.id}</span></div>
    </div>
    <div class="diagnosis"><strong>Diagnosis:</strong> ${rx.diagnosis}</div>
    <table>
      <thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${rx.medications.map(m => `<tr><td><strong>${m.name}</strong></td><td>${m.dose}</td><td>${m.frequency}</td><td>${m.duration}</td></tr>`).join('')}</tbody>
    </table>
    ${rx.doctorNotes ? `<div class="notes"><strong>Notes:</strong> ${rx.doctorNotes}</div>` : ''}
    <div class="footer">
      <div class="disclaimer">This prescription is generated by Atelier Health Clinical Portal. Valid only with physician authorization.</div>
      <div class="signature"><div class="sig-line"></div><div class="sig-name">${doctorName || rx.signature}</div><div style="font-size:11px;color:#64748B">Authorized Physician</div></div>
    </div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // UI
  const [dateFilter, setDateFilter] = useState(today());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // Modals
  const [modal, setModal] = useState(null);
  const [editingPatient, setEditingPatient] = useState({ ...EMPTY_PATIENT });
  const [editingAppt, setEditingAppt] = useState({ patientId: '', type: '', time: '09:00', date: today(), status: 'Scheduled', consultationType: 'In-Person', notes: '' });
  const [editingRx, setEditingRx] = useState({ patientId: '', medications: [{ name: '', dose: '', frequency: '', duration: '' }], diagnosis: '', doctorNotes: '' });
  const [editingLab, setEditingLab] = useState({ patientId: '', testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' });
  const [editingInvoice, setEditingInvoice] = useState({ patientId: '', services: [{ name: '', amount: 0 }], paymentStatus: 'Pending', insuranceCovered: 0 });
  const [newVital, setNewVital] = useState({ bp: '', heartRate: '', sugar: '', bmi: '', temp: '', spo2: '', recordedAt: today() });
  const [newVisit, setNewVisit] = useState({ doctorNotes: '', diagnosis: '', prescriptions: [] });

  // Settings toggles
  const [settings, setSettings] = useState({ twoFactor: true, sessionTimeout: true, hipaaMode: true, darkMode: false, emailNotifs: true, smsAlerts: false });

  // Doctor profile (editable in settings)
  const [doctorProfile, setDoctorProfile] = useState({ name: '', specialty: 'General Physician', clinic: 'Atelier Health Clinic', phone: '', email: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  // AI
  const ai = useAI();
  const [aiPrompt, setAiPrompt] = useState('');
  const [radiologyImage, setRadiologyImage] = useState(null);
  const [radiologyAnalysis, setRadiologyAnalysis] = useState('');
  const [radiologyLoading, setRadiologyLoading] = useState(false);
  const [radiologyPatientId, setRadiologyPatientId] = useState('');
  const fileInputRef = useRef(null);

  // ── Load from API / storage ───────────────────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem('user');
    let userId = null;
    if (u) {
      const parsed = JSON.parse(u);
      userId = parsed.id;
      setUser(parsed);
      setDoctorProfile(prev => ({
        ...prev,
        userId: parsed.id,
        name: parsed.name || `Dr. ${(parsed.email || '').split('@')[0]}`,
        email: parsed.email || '',
        ...JSON.parse(localStorage.getItem('ehr_doctor_profile') || '{}')
      }));
    }
    
    // Load local defaults for standalone modules
    const load = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
    setLabReports(load('ehr_labs') || []);
    setInvoices(load('ehr_invoices') || []);
    setSettings(load('ehr_settings') || { twoFactor: true, sessionTimeout: true, hipaaMode: true, darkMode: false, emailNotifs: true, smsAlerts: false });
    setNotifications(load('ehr_notifications') || [
      { id: 1, type: 'appointment', message: 'Welcome to Atelier Health Clinical Portal', time: new Date().toISOString(), read: false, priority: 'low' },
    ]);
    setAuditLogs(load('ehr_audit') || []);
    
    // Fetch connected data from backend with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    Promise.all([
      fetch('/api/patients', { signal: controller.signal }).then(r => r.json()).catch(() => []),
      fetch('/api/appointments' + (userId ? `?doctorId=${userId}` : ''), { signal: controller.signal }).then(r => r.json()).catch(() => []),
      fetch('/api/prescriptions' + (userId ? `?doctorId=${userId}` : ''), { signal: controller.signal }).then(r => r.json()).catch(() => [])
    ]).then(([pts, appts, rxs]) => {
      clearTimeout(timeout);
      // Safely map DB patients to UI
      const mappedPts = (pts.length > 0 && Array.isArray(pts)) ? pts.map(p => ({
         ...p,
         id: p.id,
         name: p.firstName + (p.lastName ? ` ${p.lastName}` : ''),
         age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 'Unknown',
         contact: p.phone || '',
         bloodGroup: p.vitals?.bloodGroup || 'O+',
         vitals: p.vitals ? [p.vitals] : [],
         userId: p.userId
      })) : (load('ehr_patients') || []);
      
      const mappedAppts = (appts.length > 0 && Array.isArray(appts)) ? appts.map(a => ({
         ...a,
         patientId: a.patientId,
         name: a.patient ? a.patient.firstName : 'Unknown'
      })) : (load('ehr_appointments') || []);
      
      const mappedRxs = (rxs.length > 0 && Array.isArray(rxs)) ? rxs.map(rx => ({
         ...rx,
         patientId: rx.patientId,
         patientName: rx.patient ? rx.patient.firstName : 'Unknown',
         medications: rx.medicine ? [{name: rx.medicine.name, dose: '', duration: '', frequency: ''}] : [],
         diagnosis: 'General Checkup' // Fallback
      })) : (load('ehr_prescriptions') || []);
      
      setPatients(mappedPts);
      setAppointments(mappedAppts);
      setPrescriptions(mappedRxs);
      setLoaded(true);
    }).catch(() => {
      // Backend unavailable, use localStorage
      setPatients(load('ehr_patients') || []);
      setAppointments(load('ehr_appointments') || []);
      setPrescriptions(load('ehr_prescriptions') || []);
      setLoaded(true);
    }).finally(() => {
      clearTimeout(timeout);
    });
  }, []);

  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_patients', JSON.stringify(patients)); }, [patients, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_appointments', JSON.stringify(appointments)); }, [appointments, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_prescriptions', JSON.stringify(prescriptions)); }, [prescriptions, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_labs', JSON.stringify(labReports)); }, [labReports, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_invoices', JSON.stringify(invoices)); }, [invoices, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_notifications', JSON.stringify(notifications)); }, [notifications, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_settings', JSON.stringify(settings)); }, [settings, loaded]);
  useEffect(() => { if (!loaded) return; localStorage.setItem('ehr_doctor_profile', JSON.stringify(doctorProfile)); }, [doctorProfile, loaded]);

  // ── Cross-tab sync: patient paying an invoice writes to ehr_invoices ──────────
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ehr_invoices' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) setInvoices(updated);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);


  // Keep selectedPatient in sync after patient updates
  useEffect(() => {
    if (selectedPatient) {
      const updated = patients.find(p => p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    }
  }, [patients]);

  const addAudit = useCallback((action, target) => {
    const log = { id: Date.now(), action, user: doctorProfile.name || 'Doctor', target, timestamp: new Date().toISOString() };
    setAuditLogs(prev => {
      const next = [log, ...prev.slice(0, 99)];
      localStorage.setItem('ehr_audit', JSON.stringify(next));
      return next;
    });
  }, [doctorProfile.name]);

  const addNotif = useCallback((type, message, priority = 'medium') => {
    setNotifications(prev => [{ id: Date.now(), type, message, time: new Date().toISOString(), read: false, priority }, ...prev]);
  }, []);

  // ── Analytics ────────────────────────────────────────────────────────────────
  const analytics = {
    totalRevenue: invoices.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + i.totalAmount, 0),
    pendingRevenue: invoices.filter(i => i.paymentStatus === 'Pending').reduce((s, i) => s + i.totalAmount, 0),
    todayAppts: appointments.filter(a => a.date === today()).length,
    completedAppts: appointments.filter(a => a.status === 'Completed').length,
    criticalLabs: labReports.filter(l => l.results?.some(r => r.flag === 'critical')).length,
    unreadNotifs: notifications.filter(n => !n.read).length,
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.diseases || []).some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.contact || '').includes(searchQuery)
  );

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const savePatient = async () => {
    if (!editingPatient.name?.trim()) { alert('Patient name is required.'); return; }
    if (!editingPatient.age) { alert('Age is required.'); return; }
    
    // API POST
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        firstName: editingPatient.name,
        dob: new Date(new Date().getFullYear() - parseInt(editingPatient.age || "30"), 0, 1).toISOString(),
        phone: editingPatient.contact,
        gender: editingPatient.gender || 'Unknown'
      })
    });
    const dbPatient = await res.json();
    
    if (editingPatient.id && !String(editingPatient.id).includes('-')) {
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? { ...p, ...editingPatient } : p));
      addAudit('UPDATE_PATIENT', editingPatient.name);
      addNotif('appointment', `Patient record updated: ${editingPatient.name}`, 'low');
    } else {
      const p = { ...EMPTY_PATIENT, ...editingPatient, id: dbPatient.id || uid(patients), userId: dbPatient.userId, registeredAt: new Date().toISOString() };
      setPatients(prev => [...prev, p]);
      addAudit('CREATE_PATIENT', p.name);
      addNotif('appointment', `New patient registered: ${p.name}`, 'low');
    }
    setModal(null);
    setEditingPatient({ ...EMPTY_PATIENT });
  };

  const deletePatient = (id) => {
    const p = patients.find(x => x.id === id);
    if (!p) return;

    // Optimistic UI update immediately
    setPatients(prev => prev.filter(x => x.id !== id));
    setAppointments(prev => prev.filter(a => a.patientId !== id.toString()));
    setPrescriptions(prev => prev.filter(r => r.patientId !== id.toString()));
    setLabReports(prev => prev.filter(l => l.patientId !== id.toString()));
    setInvoices(prev => prev.filter(i => i.patientId !== id.toString()));
    addAudit('DELETE_PATIENT', p.name);
    addNotif('alert', `Patient record deleted: ${p.name}`, 'medium');
    setSelectedPatient(null);

    // Persist to database so the patient doesn't reappear on reload
    fetch(`/api/patients?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(r => { if (!r.ok) console.warn('DB delete failed, patient may reappear on reload'); })
      .catch(() => console.warn('Could not reach API to delete patient from DB'));
  };


  const saveAppointment = async () => {
    if (!editingAppt.patientId) { alert('Please select a patient.'); return; }
    if (!editingAppt.type) { alert('Please select consultation type.'); return; }
    const pt = patients.find(p => p.id.toString() === editingAppt.patientId);
    if (!pt) { alert('Patient not found.'); return; }
    
    // API POST to backend
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        patientId: pt.id,
        doctorId: doctorProfile.userId, // Requires doctorProfile to have userId
        date: editingAppt.date,
        time: editingAppt.time || "09:00",
        type: editingAppt.type,
        notes: editingAppt.notes
      })
    });
    const dbAppt = await res.json();
    
    if (editingAppt.id && !String(editingAppt.id).includes('-')) {
      setAppointments(prev => prev.map(a => a.id === editingAppt.id ? { ...a, ...editingAppt, name: pt.name } : a));
      addAudit('UPDATE_APPOINTMENT', pt.name);
    } else {
      const a = { ...editingAppt, id: dbAppt.id || uid(appointments), name: pt.name };
      setAppointments(prev => [...prev, a]);
      addNotif('appointment', `Appointment scheduled: ${pt.name} on ${fmt(editingAppt.date)} at ${editingAppt.time}`);
      addAudit('CREATE_APPOINTMENT', pt.name);
    }
    setModal(null);
  };

  const saveRx = async () => {
    if (!editingRx.patientId) { alert('Please select a patient.'); return; }
    if (!editingRx.diagnosis?.trim()) { alert('Diagnosis is required.'); return; }
    if (!editingRx.medications?.some(m => m.name)) { alert('Add at least one medication.'); return; }
    const pt = patients.find(p => p.id.toString() === editingRx.patientId);
    if (!pt) return;

    const rx = { ...editingRx, id: uid(prescriptions), patientName: pt.name, date: today(), signature: doctorProfile.name || user?.email || 'Dr. Physician' };

    const meds = (editingRx.medications || []).filter(m => m.name);
    for (const med of meds) {
      fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: pt.userId || pt.id,
          doctorId: user?.id || doctorProfile.userId,
          medicineName: med.name,
          dose: med.dose,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          diagnosis: editingRx.diagnosis,
          doctorNotes: editingRx.doctorNotes,
          instructions: editingRx.doctorNotes,
          status: 'PENDING'
        })
      });
    }

    setPrescriptions(prev => [...prev, rx]);
    addAudit('CREATE_PRESCRIPTION', pt.name);
    addNotif('appointment', `Prescription issued for ${pt.name}: ${editingRx.diagnosis}`, 'low');
    setModal(null);
    setEditingRx({ patientId: '', medications: [{ name: '', dose: '', frequency: '', duration: '', quantity: '' }], diagnosis: '', doctorNotes: '' });
  };

  const saveLab = () => {
    if (!editingLab.patientId) { alert('Please select a patient.'); return; }
    if (!editingLab.testName?.trim()) { alert('Test name is required.'); return; }
    const pt = patients.find(p => p.id.toString() === editingLab.patientId);
    if (!pt) return;
    const lab = { ...editingLab, id: uid(labReports), patientName: pt.name, date: today() };
    setLabReports(prev => [...prev, lab]);
    if (lab.results?.some(r => r.flag === 'critical')) {
      addNotif('lab', `CRITICAL lab value detected for ${pt.name} — ${lab.testName}`, 'high');
    } else {
      addNotif('lab', `Lab report added for ${pt.name}: ${lab.testName}`, 'low');
    }
    addAudit('CREATE_LAB', pt.name);
    setModal(null);
    setEditingLab({ patientId: '', testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' });
  };

  const saveInvoice = () => {
    if (!editingInvoice.patientId) { alert('Please select a patient.'); return; }
    if (!editingInvoice.services?.some(s => s.name)) { alert('Add at least one service.'); return; }
    const pt = patients.find(p => p.id.toString() === editingInvoice.patientId);
    if (!pt) return;
    const total = (editingInvoice.services || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const inv = { ...editingInvoice, id: uid(invoices), patientName: pt.name, date: today(), totalAmount: total };
    setInvoices(prev => [...prev, inv]);
    addAudit('CREATE_INVOICE', pt.name);
    addNotif('billing', `Invoice created for ${pt.name}: ₹${total.toLocaleString()}`, 'low');
    setModal(null);
    setEditingInvoice({ patientId: '', services: [{ name: '', amount: 0 }], paymentStatus: 'Pending', insuranceCovered: 0 });
  };

  const addVitalToPatient = () => {
    if (!selectedPatient) return;
    if (!newVital.bp && !newVital.heartRate) { alert('Enter at least one vital sign.'); return; }
    const updated = { ...selectedPatient, vitals: [...(selectedPatient.vitals || []), { ...newVital }] };
    setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updated : p));
    setSelectedPatient(updated);
    addAudit('ADD_VITAL', selectedPatient.name);
    addNotif('appointment', `Vitals recorded for ${selectedPatient.name}`, 'low');
    setNewVital({ bp: '', heartRate: '', sugar: '', bmi: '', temp: '', spo2: '', recordedAt: today() });
    setModal(null);
  };

  const addVisitToPatient = () => {
    if (!selectedPatient) return;
    if (!newVisit.diagnosis?.trim()) { alert('Diagnosis is required.'); return; }
    const visit = { ...newVisit, id: Date.now(), date: today(), prescriptions: newVisit.prescriptions || [], attachments: [] };
    const updated = { ...selectedPatient, visits: [...(selectedPatient.visits || []), visit] };
    setPatients(prev => prev.map(p => p.id === selectedPatient.id ? updated : p));
    setSelectedPatient(updated);
    addAudit('ADD_VISIT', selectedPatient.name);
    addNotif('appointment', `Visit recorded for ${selectedPatient.name}: ${newVisit.diagnosis}`, 'low');
    setNewVisit({ doctorNotes: '', diagnosis: '', prescriptions: [] });
    setModal(null);
  };

  const checkDrugInteraction = async (meds) => {
    const names = (meds || []).map(m => m.name).filter(Boolean);
    if (names.length < 2) { alert('Add at least 2 medications to check interactions.'); return; }
    await ai.analyze(`Drug interaction check for: ${names.join(', ')}. For each pair, provide: Severity level, Mechanism, Clinical significance, Management recommendation. Be concise and clinically accurate.`);
  };

  const runRadiologyAI = async () => {
    if (!radiologyImage) return;
    setRadiologyLoading(true);
    setRadiologyAnalysis('');
    try {
      const base64 = radiologyImage.split(',')[1];
      const mediaType = radiologyImage.split(';')[0].split(':')[1];
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system: 'You are a radiologist AI assistant for Atelier Health. Analyze medical imaging and provide structured clinical findings. Always note findings require physician confirmation.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Analyze this medical image and provide a structured report with: 1) Imaging Modality & Body Region 2) Key Findings (describe what is visible) 3) Potential Diagnoses (with confidence) 4) Incidental Findings 5) Recommendations & Follow-up. Use clear section headers.' }
            ]
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || '').join('') || 'Analysis failed.';
      setRadiologyAnalysis(text);
      addNotif('ai', `Radiology AI analysis complete${radiologyPatientId ? ' for ' + (patients.find(p => p.id.toString() === radiologyPatientId)?.name || '') : ''}`, 'medium');
      addAudit('RADIOLOGY_AI_ANALYSIS', radiologyPatientId ? (patients.find(p => p.id.toString() === radiologyPatientId)?.name || 'Unknown') : 'Unassigned');
    } catch {
      setRadiologyAnalysis('AI service unavailable. Please try again.');
    } finally {
      setRadiologyLoading(false);
    }
  };

  const handleRadiologyUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRadiologyImage(ev.target?.result);
    reader.readAsDataURL(file);
    setRadiologyAnalysis('');
  };

  // ── Nav items (no telemedicine) ───────────────────────────────────────────────
  const navItems = [
    { id: 'overview',       label: 'Overview',        icon: 'dashboard' },
    { id: 'ehr',            label: 'Patient EHR',     icon: 'folder_shared',  badge: patients.length },
    { id: 'appointments',   label: 'Appointments',    icon: 'calendar_month', badge: analytics.todayAppts || undefined },
    { id: 'prescriptions',  label: 'Prescriptions',   icon: 'medication' },
    { id: 'labs',           label: 'Lab Reports',     icon: 'biotech',        badge: analytics.criticalLabs || undefined },
    { id: 'analytics',      label: 'Analytics',       icon: 'analytics' },
    { id: 'notifications',  label: 'Notifications',   icon: 'notifications',  badge: analytics.unreadNotifs || undefined },
    { id: 'settings',       label: 'Settings',        icon: 'settings' },
  ];

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F9FD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <style>{STYLES}</style>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="ms ms-fill animate-spin" style={{ color: 'white', fontSize: '26px' }}>progress_activity</span>
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Loading Clinical Portal…</p>
      </div>
    );
  }

  const doctorDisplayName = doctorProfile.name || (user ? `Dr. ${(user.email || '').split('@')[0]}` : 'Doctor');

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FD', fontFamily: 'var(--font-sans)' }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
        <aside className="sidebar" style={{
          width: sidebarOpen ? '248px' : '68px',
          height: '100vh', position: 'fixed', left: 0, top: 0,
          background: 'white', borderRight: '1px solid #E2E8F0',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          boxShadow: '1px 0 0 #E2E8F0'
        }}>
          {/* Logo */}
          <div style={{ padding: '16px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{
              width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0
            }}>
              <span className="ms ms-fill" style={{ color: 'white', fontSize: '18px' }}>medical_services</span>
            </button>
            {sidebarOpen && (
              <div>
                <p style={{ fontWeight: 900, fontSize: '13px', color: '#0F172A', lineHeight: 1.2 }}>Atelier Health</p>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', fontWeight: 700 }}>Clinical Portal</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`tab-item${isActive ? ' tab-active' : ''}`} style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: sidebarOpen ? '10px' : '0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  padding: sidebarOpen ? '9px 12px' : '9px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                  color: isActive ? 'white' : '#64748B',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  marginBottom: '2px', position: 'relative', transition: 'all 0.15s'
                }}>
                  <span className={`ms${isActive ? ' ms-fill' : ''}`} style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
                  {item.badge > 0 && (
                    <span style={{
                      minWidth: '18px', height: '18px', borderRadius: '9px', fontSize: '9px', fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--primary)',
                      color: 'white', position: sidebarOpen ? 'static' : 'absolute',
                      top: sidebarOpen ? 'auto' : '4px', right: sidebarOpen ? 'auto' : '4px'
                    }}>{item.badge}</span>
                  )}
                  {!sidebarOpen && (
                    <span style={{
                      position: 'absolute', left: '100%', marginLeft: '8px', padding: '5px 10px',
                      background: '#0F172A', color: 'white', fontSize: '11px', fontWeight: 700,
                      borderRadius: '8px', whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0,
                      transition: 'opacity 0.15s', zIndex: 100
                    }} className="tooltip">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom CTA */}
          <div style={{ padding: '12px', borderTop: '1px solid #F1F5F9', flexShrink: 0, display: 'flex', justifyContent: sidebarOpen ? 'stretch' : 'center' }}>
            {sidebarOpen ? (
              <button onClick={() => { setEditingAppt({ patientId: '', type: '', time: '09:00', date: today(), status: 'Scheduled', consultationType: 'In-Person', notes: '' }); setModal('appt'); }}
                className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <span className="ms ms-sm">add</span> New Appointment
              </button>
            ) : (
              <button onClick={() => { setEditingAppt({ patientId: '', type: '', time: '09:00', date: today(), status: 'Scheduled', consultationType: 'In-Person', notes: '' }); setModal('appt'); }}
                style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="ms" style={{ color: 'white' }}>add</span>
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
        <main className="main-content" style={{ marginLeft: sidebarOpen ? '248px' : '68px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

          {/* TOP BAR */}
          <header style={{
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 24px', borderBottom: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ position: 'relative' }}>
              <span className="ms" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '18px' }}>search</span>
              <input type="text" placeholder="Search patients, records, diagnoses…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '16px', paddingTop: '9px', paddingBottom: '9px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '999px', fontSize: '13px', width: '300px', outline: 'none', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Notifications bell */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setNotifOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', position: 'relative' }}
                  onBlur={e => { if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setNotifOpen(false); }}>
                  <span className="ms" style={{ fontSize: '20px', color: '#64748B' }}>notifications</span>
                  {analytics.unreadNotifs > 0 && (
                    <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', border: '2px solid white' }}></span>
                  )}
                </button>
                {notifOpen && (
                  <div className="notif-panel">
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '13px' }}>Notifications</span>
                      <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>Mark all read</button>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.slice(0, 12).map(n => (
                        <div key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: n.read ? 'white' : '#EFF6FF', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span className="ms ms-fill ms-sm" style={{ color: n.priority === 'high' ? '#EF4444' : n.priority === 'medium' ? '#F59E0B' : '#94A3B8', flexShrink: 0, marginTop: '1px' }}>
                            {n.type === 'appointment' ? 'calendar_month' : n.type === 'lab' ? 'biotech' : n.type === 'ai' ? 'psychology' : n.type === 'billing' ? 'receipt' : 'warning'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B', lineHeight: 1.4 }}>{n.message}</p>
                            <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>{new Date(n.time).toLocaleTimeString()}</p>
                          </div>
                          {!n.read && <div style={{ width: '7px', height: '7px', background: 'var(--primary)', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }}></div>}
                        </div>
                      ))}
                      {notifications.length === 0 && <p style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px' }}>No notifications</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleLogout} title="Logout">
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{doctorDisplayName}</p>
                  <p style={{ fontSize: '10px', color: '#94A3B8' }}>Tap to log out</p>
                </div>
                <div className="avatar" style={{ width: '34px', height: '34px', borderRadius: '10px', fontSize: '14px', border: '1px solid rgba(29,62,182,0.2)' }}>
                  {doctorDisplayName.charAt(3)?.toUpperCase() || 'D'}
                </div>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', width: '100%', flex: 1 }}>

            {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="animate-in">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', fontFamily: 'var(--font-serif)' }}>Clinical Overview</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <StatCard label="Total Patients"  value={patients.length} icon="person" color="var(--primary)" />
                  <StatCard label="Today's Appts"   value={analytics.todayAppts} icon="calendar_month" color="#2563EB" />
                  <StatCard label="Completed"        value={analytics.completedAppts} icon="check_circle" color="#059669" />
                  <StatCard label="Lab Critical"     value={analytics.criticalLabs} icon="emergency" color="#DC2626" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Today's Schedule */}
                    <div className="card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 900, fontSize: '15px' }}>Today's Schedule</h3>
                        <button onClick={() => setActiveTab('appointments')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>View All →</button>
                      </div>
                      {appointments.filter(a => a.date === today()).length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', border: '1.5px dashed #E2E8F0', borderRadius: '12px' }}>
                          <span className="ms ms-fill" style={{ fontSize: '40px', color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>event_available</span>
                          <p style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>No appointments today</p>
                          <button onClick={() => { setEditingAppt({ patientId: '', type: '', time: '09:00', date: today(), status: 'Scheduled', consultationType: 'In-Person', notes: '' }); setModal('appt'); }}
                            className="btn-primary" style={{ marginTop: '16px' }}>Schedule Now</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {appointments.filter(a => a.date === today()).sort((a, b) => a.time.localeCompare(b.time)).map(appt => (
                            <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                              <div className="avatar" style={{ width: '44px', height: '44px', borderRadius: '12px', flexDirection: 'column', fontSize: '11px', flexShrink: 0 }}>
                                <span style={{ fontWeight: 900, fontSize: '14px', lineHeight: 1 }}>{appt.time.split(':')[0]}</span>
                                <span style={{ fontSize: '9px' }}>{appt.time.split(':')[1]}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.name}</p>
                                <p style={{ fontSize: '11px', color: '#64748B' }}>{appt.type} · {appt.consultationType}</p>
                              </div>
                              <ApptBadge status={appt.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Patients */}
                    <div className="card" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 900, fontSize: '15px' }}>Recent Patients</h3>
                        <button onClick={() => setActiveTab('ehr')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>All Records →</button>
                      </div>
                      {patients.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '24px 0' }}>No patients registered yet</p>
                      ) : (
                        [...patients].reverse().slice(0, 6).map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', borderRadius: '10px', transition: 'background 0.15s' }}
                            onClick={() => { setSelectedPatient(p); setActiveTab('ehr'); }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div className="avatar" style={{ width: '34px', height: '34px', borderRadius: '10px', fontSize: '13px', flexShrink: 0 }}>{p.name.charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                              <p style={{ fontSize: '11px', color: '#94A3B8' }}>{p.gender} · {p.age}y · {p.bloodGroup}</p>
                            </div>
                            <span style={{ fontSize: '10px', color: '#CBD5E1', flexShrink: 0 }}>{fmt(p.registeredAt)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right col */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* AI support */}
                    <div className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <span className="ms ms-fill" style={{ color: 'var(--primary)' }}>psychology</span>
                        <h3 style={{ fontWeight: 900, fontSize: '14px' }}>AI Clinical Support</h3>
                      </div>
                      <textarea rows={3} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                        className="inp" style={{ fontSize: '12px', lineHeight: 1.5 }}
                        placeholder="Ask: drug interactions, differential diagnosis, risk assessment, treatment guidelines…" />
                      <button onClick={() => ai.analyze(aiPrompt)} disabled={!aiPrompt.trim() || ai.loading}
                        className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                        {ai.loading
                          ? <><span className="ms ms-sm animate-spin">progress_activity</span> Analyzing…</>
                          : <><span className="ms ms-sm">auto_awesome</span> Analyze</>}
                      </button>
                      {ai.result && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE', fontSize: '12px', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', color: '#1E293B', whiteSpace: 'pre-wrap' }}>
                          {ai.result}
                          <button onClick={() => ai.setResult('')} style={{ display: 'block', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#94A3B8' }}>✕ Dismiss</button>
                        </div>
                      )}
                    </div>

                    {/* Critical Alerts */}
                    <div className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '14px', marginBottom: '14px' }}>Critical Alerts</h3>
                      {notifications.filter(n => n.priority === 'high' && !n.read).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
                          <span className="ms ms-fill" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', color: '#10B981' }}>done_all</span>
                          <p style={{ fontSize: '12px', fontWeight: 600 }}>All clear</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {notifications.filter(n => n.priority === 'high' && !n.read).slice(0, 5).map(n => (
                            <div key={n.id} style={{ padding: '10px 12px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                              <p style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B' }}>{n.message}</p>
                              <p style={{ fontSize: '10px', color: '#EF4444', marginTop: '3px' }}>{new Date(n.time).toLocaleTimeString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '14px', marginBottom: '14px' }}>Quick Actions</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { label: 'Register Patient', icon: 'person_add', action: () => { setEditingPatient({ ...EMPTY_PATIENT }); setModal('patient'); } },
                          { label: 'New Prescription', icon: 'medication', action: () => { setEditingRx({ patientId: '', medications: [{ name: '', dose: '', frequency: '', duration: '', quantity: '' }], diagnosis: '', doctorNotes: '' }); setModal('rx'); } },
                          { label: 'Add Lab Report', icon: 'biotech', action: () => { setEditingLab({ patientId: '', testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' }); setModal('lab'); } },
                          { label: 'Create Invoice', icon: 'receipt_long', action: () => { setEditingInvoice({ patientId: '', services: [{ name: '', amount: 0 }], paymentStatus: 'Pending', insuranceCovered: 0 }); setModal('invoice'); } },
                        ].map(a => (
                          <button key={a.label} onClick={a.action} style={{
                            padding: '12px 8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px',
                            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                            color: '#475569', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}>
                            <span className="ms ms-fill" style={{ fontSize: '20px' }}>{a.icon}</span>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ EHR ════════════════════════════════════════════════════════════ */}
            {activeTab === 'ehr' && (
              <div className="animate-in">
                {selectedPatient ? (
                  <>
                    <button onClick={() => setSelectedPatient(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '20px' }}>
                      <span className="ms ms-sm">arrow_back</span> Back to Directory
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Header card */}
                      <div className="card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <div className="avatar" style={{ width: '72px', height: '72px', borderRadius: '18px', fontSize: '28px', flexShrink: 0 }}>{selectedPatient.name.charAt(0)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h3 style={{ fontSize: '22px', fontWeight: 900, fontFamily: 'var(--font-serif)', color: '#0F172A' }}>{selectedPatient.name}</h3>
                                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{selectedPatient.gender} · {selectedPatient.age} yrs · {selectedPatient.bloodGroup} · ID #{selectedPatient.id}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                  {(selectedPatient.diseases || []).map((d, i) => <span key={i} style={{ padding: '2px 10px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>{d}</span>)}
                                  {(selectedPatient.allergies || []).map((a, i) => <span key={i} style={{ padding: '2px 10px', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>⚠ {a}</span>)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setEditingPatient({ ...selectedPatient }); setModal('patient'); }} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '10px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                                  <span className="ms ms-sm">edit</span> Edit
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
                              {[
                                { label: 'Contact', value: selectedPatient.contact || '—' },
                                { label: 'Address', value: selectedPatient.address || '—' },
                                { label: 'Family History', value: selectedPatient.familyHistory || '—' },
                                { label: 'Registered', value: fmt(selectedPatient.registeredAt) },
                              ].map(row => (
                                <div key={row.label}>
                                  <p style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{row.label}</p>
                                  <p style={{ fontSize: '12px', fontWeight: 700, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Vitals */}
                        <div className="card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ fontWeight: 900, fontSize: '14px' }}>Vitals</h4>
                            <button onClick={() => setModal('vital')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                              <span className="ms ms-sm">add</span> Record
                            </button>
                          </div>
                          {(selectedPatient.vitals || []).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '20px 0' }}>No vitals recorded</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {[...(selectedPatient.vitals || [])].reverse().slice(0, 3).map((v, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#F8FAFC', borderRadius: '10px' }}>
                                  {[['BP', v.bp, ''], ['HR', v.heartRate, 'bpm'], ['Sugar', v.sugar, 'mg/dL'], ['BMI', v.bmi, ''], ['Temp', v.temp, '°F'], ['SpO₂', v.spo2, '%']].map(([lbl, val, unit]) => (
                                    <div key={lbl}>
                                      <p style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '2px' }}>{lbl}</p>
                                      <p style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A' }}>{val || '—'}{val ? unit : ''}</p>
                                    </div>
                                  ))}
                                  <div style={{ gridColumn: '1/-1', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '10px', color: '#CBD5E1' }}>{fmt(v.recordedAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Medications */}
                        <div className="card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ fontWeight: 900, fontSize: '14px' }}>Current Medications</h4>
                            {(selectedPatient.medications || []).length >= 2 && (
                              <button onClick={() => checkDrugInteraction(selectedPatient.medications)} disabled={ai.loading}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#D97706' }}>
                                <span className="ms ms-sm">warning</span> Check Interactions
                              </button>
                            )}
                          </div>
                          {(selectedPatient.medications || []).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '20px 0' }}>No medications listed</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {selectedPatient.medications.map((m, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px' }}>
                                  <span className="ms ms-fill" style={{ color: 'var(--primary)', fontSize: '16px' }}>medication</span>
                                  <div>
                                    <p style={{ fontSize: '13px', fontWeight: 700 }}>{m.name}</p>
                                    <p style={{ fontSize: '11px', color: '#64748B' }}>{m.dose} · {m.frequency} · {m.duration}</p>
                                  </div>
                                </div>
                              ))}
                              {ai.result && <div style={{ padding: '10px 12px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A', fontSize: '11px', lineHeight: 1.6, maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{ai.result}</div>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Surgeries */}
                      {(selectedPatient.surgeries || []).length > 0 && (
                        <div className="card" style={{ padding: '20px' }}>
                          <h4 style={{ fontWeight: 900, fontSize: '14px', marginBottom: '12px' }}>Surgical History</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {selectedPatient.surgeries.map((s, i) => (
                              <span key={i} style={{ padding: '4px 12px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Visit Timeline */}
                      <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ fontWeight: 900, fontSize: '14px' }}>Visit Timeline</h4>
                          <button onClick={() => setModal('visit')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                            <span className="ms ms-sm">add</span> Add Visit
                          </button>
                        </div>
                        {(selectedPatient.visits || []).length === 0 ? (
                          <div style={{ padding: '32px', textAlign: 'center', border: '1.5px dashed #E2E8F0', borderRadius: '12px' }}>
                            <span className="ms ms-fill" style={{ fontSize: '40px', color: '#CBD5E1', display: 'block', marginBottom: '8px' }}>history</span>
                            <p style={{ fontSize: '13px', color: '#94A3B8' }}>No visit records yet</p>
                          </div>
                        ) : (
                          <div style={{ paddingLeft: '20px', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '8px', top: '4px', bottom: '4px', width: '2px', background: '#E2E8F0', borderRadius: '1px' }}></div>
                            {[...(selectedPatient.visits || [])].reverse().map(v => (
                              <div key={v.id} style={{ position: 'relative', marginBottom: '16px' }}>
                                <div className="timeline-dot"></div>
                                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1px solid #F1F5F9' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <p style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{v.diagnosis}</p>
                                    <span style={{ fontSize: '10px', color: '#94A3B8', flexShrink: 0, marginLeft: '12px' }}>{fmt(v.date)}</span>
                                  </div>
                                  {v.doctorNotes && <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>{v.doctorNotes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Patient Prescriptions */}
                      <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ fontWeight: 900, fontSize: '14px' }}>Prescriptions</h4>
                          <button onClick={() => { setEditingRx({ patientId: selectedPatient.id.toString(), medications: [{ name: '', dose: '', frequency: '', duration: '' }], diagnosis: '', doctorNotes: '' }); setModal('rx'); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                            <span className="ms ms-sm">add</span> New Rx
                          </button>
                        </div>
                        {prescriptions.filter(r => r.patientId === selectedPatient.id.toString()).length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>No prescriptions for this patient</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {prescriptions.filter(r => r.patientId === selectedPatient.id.toString()).reverse().map(rx => (
                              <div key={rx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                <div>
                                  <p style={{ fontSize: '13px', fontWeight: 700 }}>{rx.diagnosis}</p>
                                  <p style={{ fontSize: '11px', color: '#64748B' }}>{rx.medications.map(m => m.name).filter(Boolean).join(', ')} · {fmt(rx.date)}</p>
                                </div>
                                <button onClick={() => printPrescription(rx, doctorDisplayName)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                  <span className="ms ms-sm">print</span> Print
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Patient Lab Reports */}
                      <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 style={{ fontWeight: 900, fontSize: '14px' }}>Lab Reports</h4>
                          <button onClick={() => { setEditingLab({ patientId: selectedPatient.id.toString(), testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' }); setModal('lab'); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                            <span className="ms ms-sm">add</span> Add Report
                          </button>
                        </div>
                        {labReports.filter(l => l.patientId === selectedPatient.id.toString()).length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>No lab reports for this patient</p>
                        ) : (
                          labReports.filter(l => l.patientId === selectedPatient.id.toString()).reverse().map(lab => (
                            <div key={lab.id} style={{ marginBottom: '12px', border: lab.results?.some(r => r.flag === 'critical') ? '1px solid #FECACA' : '1px solid #F1F5F9', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ padding: '10px 14px', background: lab.results?.some(r => r.flag === 'critical') ? '#FEF2F2' : '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ fontWeight: 700, fontSize: '13px' }}>{lab.testName}</p>
                                <span style={{ fontSize: '10px', color: '#64748B' }}>{fmt(lab.date)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                      <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Electronic Health Records</h2>
                        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{patients.length} registered patients</p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => exportCSV(patients.map(p => ({ id: p.id, name: p.name, age: p.age, gender: p.gender, contact: p.contact, bloodGroup: p.bloodGroup, registered: p.registeredAt })), 'patients.csv')}
                          className="btn-ghost"><span className="ms ms-sm">download</span> Export CSV</button>
                        <button onClick={() => { setEditingPatient({ ...EMPTY_PATIENT }); setModal('patient'); }} className="btn-primary">
                          <span className="ms ms-sm">person_add</span> Register Patient
                        </button>
                      </div>
                    </div>

                    {filteredPatients.length === 0 ? (
                      <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
                        <span className="ms ms-fill" style={{ fontSize: '48px', color: '#CBD5E1', display: 'block', marginBottom: '12px' }}>folder_shared</span>
                        <p style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>{searchQuery ? 'No results found' : 'Registry is empty'}</p>
                        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>{searchQuery ? `No patients match "${searchQuery}"` : 'Register your first patient to get started'}</p>
                        {!searchQuery && <button onClick={() => { setEditingPatient({ ...EMPTY_PATIENT }); setModal('patient'); }} className="btn-primary">Register First Patient</button>}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {filteredPatients.map(p => (
                          <div key={p.id} className="patient-card" onClick={() => setSelectedPatient(p)}>
                            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }} id={`card-actions-${p.id}`}
                              onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setEditingPatient({ ...p }); setModal('patient'); }}
                                style={{ padding: '5px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                                <span className="ms ms-sm" style={{ color: '#64748B' }}>edit</span>
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}
                              onMouseEnter={e => { const el = document.getElementById(`card-actions-${p.id}`); if (el) el.style.opacity = '1'; }}
                              onMouseLeave={e => { const el = document.getElementById(`card-actions-${p.id}`); if (el) el.style.opacity = '0'; }}>
                              <div className="avatar" style={{ width: '52px', height: '52px', borderRadius: '14px', fontSize: '22px', flexShrink: 0 }}>{p.name.charAt(0)}</div>
                              <div>
                                <h4 style={{ fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>{p.name}</h4>
                                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{p.gender} · {p.age} yrs · {p.bloodGroup}</p>
                              </div>
                            </div>
                            {((p.diseases || []).length > 0 || (p.allergies || []).length > 0) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                                {(p.diseases || []).slice(0, 2).map((d, i) => <span key={i} style={{ padding: '2px 8px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>{d}</span>)}
                                {(p.allergies || []).slice(0, 1).map((a, i) => <span key={i} style={{ padding: '2px 8px', background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: '999px', fontSize: '10px', fontWeight: 700 }}>⚠ {a}</span>)}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #F8FAFC', fontSize: '10px', color: '#CBD5E1' }}>
                              <span>{p.visits?.length || 0} visits · {p.vitals?.length || 0} vitals</span>
                              <span>{fmt(p.registeredAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══ APPOINTMENTS ═══════════════════════════════════════════════════ */}
            {activeTab === 'appointments' && (
              <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Appointment Management</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Schedule, manage and track all consultations</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => exportCSV(appointments, 'appointments.csv')} className="btn-ghost"><span className="ms ms-sm">download</span> Export</button>
                    <button onClick={() => { setEditingAppt({ patientId: '', type: '', time: '09:00', date: today(), status: 'Scheduled', consultationType: 'In-Person', notes: '' }); setModal('appt'); }} className="btn-primary">
                      <span className="ms ms-sm">add</span> New Appointment
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="card" style={{ padding: '14px 20px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    {['Today', 'Tomorrow', 'All'].map((v) => {
                      const val = v === 'Today' ? today() : v === 'Tomorrow' ? tomorrow() : 'all';
                      const isActive = v === 'All' ? dateFilter === 'all' : dateFilter === val;
                      return (
                        <button key={v} onClick={() => setDateFilter(val)} style={{
                          padding: '7px 14px', fontSize: '12px', fontWeight: 700, border: 'none',
                          background: isActive ? 'var(--primary)' : 'white', color: isActive ? 'white' : '#64748B', cursor: 'pointer',
                          fontFamily: 'var(--font-sans)', transition: 'all 0.15s'
                        }}>{v}</button>
                      );
                    })}
                  </div>
                  <input type="date" value={dateFilter === 'all' ? '' : dateFilter} onChange={e => setDateFilter(e.target.value || 'all')}
                    style={{ padding: '7px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 600, outline: 'none', cursor: 'pointer' }} />
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                    {(dateFilter === 'all' ? appointments : appointments.filter(a => a.date === dateFilter)).length} appointment(s)
                  </span>
                </div>

                <div className="card" style={{ overflow: 'hidden' }}>
                  {(dateFilter === 'all' ? appointments : appointments.filter(a => a.date === dateFilter)).length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center' }}>
                      <span className="ms ms-fill" style={{ fontSize: '48px', color: '#CBD5E1', display: 'block', marginBottom: '12px' }}>event_available</span>
                      <p style={{ fontWeight: 700, color: '#475569', marginBottom: '4px' }}>No appointments {dateFilter !== 'all' ? 'for this date' : 'yet'}</p>
                      <button onClick={() => { setEditingAppt({ patientId: '', type: '', time: '09:00', date: dateFilter === 'all' ? today() : dateFilter, status: 'Scheduled', consultationType: 'In-Person', notes: '' }); setModal('appt'); }}
                        className="btn-primary" style={{ marginTop: '16px' }}>Schedule Appointment</button>
                    </div>
                  ) : (
                    (dateFilter === 'all' ? [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)) : appointments.filter(a => a.date === dateFilter).sort((a, b) => a.time.localeCompare(b.time))).map((appt, idx, arr) => (
                      <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: idx < arr.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="avatar" style={{ width: '52px', height: '52px', borderRadius: '12px', flexDirection: 'column', fontSize: '11px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 900, fontSize: '13px', lineHeight: 1.1 }}>{appt.time}</span>
                          {dateFilter === 'all' && <span style={{ fontSize: '9px', opacity: 0.8 }}>{fmt(appt.date).split(',')[0]}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>{appt.name}</p>
                          <p style={{ fontSize: '12px', color: '#64748B' }}>{appt.type} · {appt.consultationType}</p>
                          {appt.notes && <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appt.notes}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select value={appt.status} onChange={e => { const newStatus = e.target.value; setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: newStatus } : a)); addAudit('UPDATE_APPT_STATUS', appt.name); fetch('/api/appointments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: appt.id, status: newStatus }) }); }}
                            style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', fontWeight: 700, outline: 'none', background: 'white', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                            {['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No-show'].map(s => <option key={s}>{s}</option>)}
                          </select>
                          <button onClick={() => { setEditingAppt(appt); setModal('appt'); }} style={{ padding: '7px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex' }}>
                            <span className="ms ms-sm" style={{ color: '#64748B' }}>edit</span>
                          </button>
                          <button onClick={() => { if (window.confirm('Delete this appointment?')) { setAppointments(prev => prev.filter(a => a.id !== appt.id)); addAudit('DELETE_APPOINTMENT', appt.name); } }}
                            style={{ padding: '7px', border: '1px solid #FECACA', borderRadius: '8px', background: 'white', cursor: 'pointer', display: 'flex' }}>
                            <span className="ms ms-sm" style={{ color: '#EF4444' }}>delete</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

         
            {/* ══ PRESCRIPTIONS ══════════════════════════════════════════════════ */}
            {activeTab === 'prescriptions' && (
              <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>E-Prescriptions</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{prescriptions.length} prescriptions issued</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => exportCSV(prescriptions.map(r => ({ id: r.id, patient: r.patientName, diagnosis: r.diagnosis, date: r.date, medications: r.medications.map(m => m.name).join('; ') })), 'prescriptions.csv')} className="btn-ghost">
                      <span className="ms ms-sm">download</span> Export
                    </button>
                    <button onClick={() => { setEditingRx({ patientId: '', medications: [{ name: '', dose: '', frequency: '', duration: '' }], diagnosis: '', doctorNotes: '' }); setModal('rx'); }} className="btn-primary">
                      <span className="ms ms-sm">add</span> New Prescription
                    </button>
                  </div>
                </div>

                {prescriptions.length === 0 ? (
                  <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
                    <span className="ms ms-fill" style={{ fontSize: '48px', color: '#CBD5E1', display: 'block', marginBottom: '12px' }}>medication</span>
                    <p style={{ fontWeight: 700, color: '#475569', marginBottom: '24px' }}>No prescriptions yet</p>
                    <button onClick={() => setModal('rx')} className="btn-primary">Create Prescription</button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[...prescriptions].reverse().map(rx => (
                      <div key={rx.id} className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F4FF 100%)', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>{rx.patientName}</p>
                            <p style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>{fmt(rx.date)}</p>
                          </div>
                          <span style={{ padding: '3px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '10px', fontWeight: 700, color: '#64748B' }}>Rx #{rx.id}</span>
                        </div>
                        <div style={{ padding: '16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '10px' }}>Dx: <span style={{ color: '#0F172A' }}>{rx.diagnosis}</span></p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {rx.medications.map((m, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#F8FAFC', borderRadius: '8px' }}>
                                <span className="ms ms-fill" style={{ color: 'var(--primary)', fontSize: '14px' }}>medication</span>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{m.name}</span>
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{m.dose} · {m.frequency}</span>
                              </div>
                            ))}
                          </div>
                          {rx.doctorNotes && <p style={{ marginTop: '10px', fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>{rx.doctorNotes}</p>}
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#CBD5E1' }}>Dr. {rx.signature}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => checkDrugInteraction(rx.medications)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: '#D97706' }}>⚠ Interactions</button>
                              <button onClick={() => printPrescription(rx, doctorDisplayName)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span className="ms" style={{ fontSize: '12px' }}>print</span> Print
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {ai.result && (
                  <div style={{ marginTop: '20px', padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Drug Interaction Analysis</strong>
                      <button onClick={() => ai.setResult('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '12px' }}>✕ Dismiss</button>
                    </div>
                    {ai.result}
                  </div>
                )}
              </div>
            )}

            {/* ══ LABS ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'labs' && (
              <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Lab & Report Management</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{labReports.length} reports · <span style={{ color: analytics.criticalLabs > 0 ? '#DC2626' : '#94A3B8', fontWeight: analytics.criticalLabs > 0 ? 700 : 400 }}>{analytics.criticalLabs} critical</span></p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => exportCSV(labReports.map(l => ({ id: l.id, patient: l.patientName, test: l.testName, date: l.date, status: l.status })), 'lab_reports.csv')} className="btn-ghost">
                      <span className="ms ms-sm">download</span> Export
                    </button>
                    <button onClick={() => { setEditingLab({ patientId: '', testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' }); setModal('lab'); }} className="btn-primary">
                      <span className="ms ms-sm">add</span> Add Report
                    </button>
                  </div>
                </div>

                {labReports.length === 0 ? (
                  <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
                    <span className="ms ms-fill" style={{ fontSize: '48px', color: '#CBD5E1', display: 'block', marginBottom: '12px' }}>biotech</span>
                    <p style={{ fontWeight: 700, color: '#475569', marginBottom: '24px' }}>No lab reports yet</p>
                    <button onClick={() => setModal('lab')} className="btn-primary">Add Lab Report</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[...labReports].reverse().map(lab => {
                      const hasCritical = lab.results?.some(r => r.flag === 'critical');
                      const hasAbnormal = lab.results?.some(r => r.flag !== 'normal');
                      return (
                        <div key={lab.id} className="card" style={{ overflow: 'hidden', border: hasCritical ? '1px solid #FECACA' : hasAbnormal ? '1px solid #FDE68A' : '1px solid #E2E8F0' }}>
                          <div style={{ padding: '14px 20px', background: hasCritical ? '#FEF2F2' : hasAbnormal ? '#FFFBEB' : '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {hasCritical && <span className="ms ms-fill animate-pulse" style={{ color: '#DC2626' }}>emergency</span>}
                              <div>
                                <p style={{ fontWeight: 900, fontSize: '14px' }}>{lab.testName}</p>
                                <p style={{ fontSize: '11px', color: '#64748B' }}>{lab.patientName} · {fmt(lab.date)}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <select value={lab.status} onChange={e => { setLabReports(prev => prev.map(l => l.id === lab.id ? { ...l, status: e.target.value } : l)); addAudit('UPDATE_LAB_STATUS', lab.patientName); }}
                                style={{ padding: '5px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', fontWeight: 700, outline: 'none', background: 'white', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                {['Pending', 'Completed', 'Reviewed'].map(s => <option key={s}>{s}</option>)}
                              </select>
                              <span className="badge" style={lab.status === 'Completed' ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' } : lab.status === 'Reviewed' ? { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' } : { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>{lab.status}</span>
                            </div>
                          </div>
                          <div style={{ padding: '14px 20px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>
                                  {['Parameter', 'Value', 'Unit', 'Normal Range', 'Flag'].map(h => (
                                    <th key={h} style={{ paddingBottom: '8px', fontWeight: 700, color: '#94A3B8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(lab.results || []).map((r, i) => (
                                  <tr key={i} style={{ borderBottom: i < lab.results.length - 1 ? '1px solid #F8FAFC' : 'none', background: r.flag === 'critical' ? '#FEF2F2' : r.flag !== 'normal' ? '#FFFBEB' : 'transparent' }}>
                                    <td style={{ padding: '9px 0', fontWeight: 700, color: '#0F172A' }}>{r.parameter}</td>
                                    <td style={{ padding: '9px 8px', fontWeight: 900, color: r.flag === 'critical' ? '#DC2626' : r.flag === 'high' ? '#DC2626' : r.flag === 'low' ? '#2563EB' : '#059669' }}>{r.value}</td>
                                    <td style={{ padding: '9px 8px', color: '#64748B' }}>{r.unit}</td>
                                    <td style={{ padding: '9px 8px', color: '#94A3B8' }}>{r.normalRange}</td>
                                    <td style={{ padding: '9px 0' }}>
                                      <span className="badge" style={r.flag === 'critical' ? { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' } : r.flag !== 'normal' ? { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' } : { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>{r.flag.toUpperCase()}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}



            {/* ══ ANALYTICS ══════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="animate-in">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Analytics Dashboard</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Clinical and operational insights</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <StatCard label="Total Patients"    value={patients.length}      icon="person"         color="var(--primary)" />
                  <StatCard label="Total Appointments" value={appointments.length} icon="calendar_month" color="#2563EB" />
                  <StatCard label="Prescriptions"     value={prescriptions.length} icon="medication"    color="#7C3AED" />
                  <StatCard label="Lab Reports"        value={labReports.length}   icon="biotech"        color="#059669" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Gender Distribution */}
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontWeight: 900, fontSize: '15px', marginBottom: '16px' }}>Patient Demographics</h3>
                    {patients.length === 0 ? <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>No patient data yet</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {['Male', 'Female', 'Other'].map(g => {
                          const count = patients.filter(p => p.gender === g).length;
                          const pct = patients.length ? Math.round(count / patients.length * 100) : 0;
                          return (
                            <div key={g}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{g}</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>{count} ({pct}%)</span>
                              </div>
                              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }}></div></div>
                            </div>
                          );
                        })}
                        {/* Blood Group */}
                        <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Blood Group Distribution</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
                              const count = patients.filter(p => p.bloodGroup === bg).length;
                              if (!count) return null;
                              return <span key={bg} style={{ padding: '4px 10px', background: '#EFF6FF', color: 'var(--primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>{bg}: {count}</span>;
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Appointment Breakdown */}
                  <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ fontWeight: 900, fontSize: '15px', marginBottom: '16px' }}>Appointment Status</h3>
                    {appointments.length === 0 ? <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>No appointment data yet</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No-show'].map(s => {
                          const count = appointments.filter(a => a.status === s).length;
                          const pct = appointments.length ? Math.round(count / appointments.length * 100) : 0;
                          if (!count) return null;
                          const colors = { 'Completed': '#059669', 'Cancelled': '#EF4444', 'In Progress': '#D97706', 'Confirmed': '#7C3AED' };
                          const c = colors[s] || 'var(--primary)';
                          return (
                            <div key={s}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{s}</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>{count}</span>
                              </div>
                              <div className="progress-bar"><div style={{ height: '100%', borderRadius: '999px', transition: 'width 0.5s', background: c, width: `${pct}%` }}></div></div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>


                {/* Top Diagnoses */}
                {(() => {
                  const allDx = [...prescriptions.map(r => r.diagnosis), ...labReports.map(l => l.testName)].filter(Boolean);
                  const counts = allDx.reduce((acc, d) => ({ ...acc, [d]: (acc[d] || 0) + 1 }), {});
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                  if (!sorted.length) return null;
                  return (
                    <div className="card" style={{ padding: '24px', marginTop: '20px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '15px', marginBottom: '16px' }}>Common Diagnoses / Tests</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {sorted.map(([label, count]) => (
                          <span key={label} style={{ padding: '5px 14px', background: '#EFF6FF', color: 'var(--primary)', border: '1px solid #C7D2FE', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                            {label} <span style={{ opacity: 0.6, marginLeft: '4px' }}>×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ══ NOTIFICATIONS ══════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
              <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Notifications</h2>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{analytics.unreadNotifs} unread · {notifications.length} total</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} className="btn-ghost">Mark All Read</button>
                    <button onClick={() => { if (window.confirm('Clear all notifications?')) setNotifications([]); }} className="btn-ghost" style={{ color: '#EF4444', borderColor: '#FECACA' }}>Clear All</button>
                  </div>
                </div>

                <div className="card" style={{ overflow: 'hidden' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center' }}>
                      <span className="ms ms-fill" style={{ fontSize: '48px', color: '#CBD5E1', display: 'block', marginBottom: '12px' }}>notifications</span>
                      <p style={{ fontWeight: 700, color: '#475569' }}>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={n.id} onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px', borderBottom: idx < notifications.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer', background: n.read ? 'transparent' : '#F0F4FF', transition: 'background 0.15s' }}
                        onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = '#E8EEFF'; else e.currentTarget.style.background = '#FAFBFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : '#F0F4FF'; }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: n.priority === 'high' ? '#FEF2F2' : n.priority === 'medium' ? '#FFFBEB' : '#F8FAFC' }}>
                          <span className="ms ms-fill" style={{ fontSize: '20px', color: n.priority === 'high' ? '#DC2626' : n.priority === 'medium' ? '#D97706' : '#94A3B8' }}>
                            {n.type === 'appointment' ? 'calendar_month' : n.type === 'lab' ? 'biotech' : n.type === 'ai' ? 'psychology' : n.type === 'billing' ? 'receipt' : 'warning'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: n.read ? 600 : 800, color: n.read ? '#64748B' : '#0F172A', lineHeight: 1.4 }}>{n.message}</p>
                          <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{new Date(n.time).toLocaleString()}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span className="badge" style={n.priority === 'high' ? { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' } : n.priority === 'medium' ? { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' } : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>{n.priority}</span>
                          {!n.read && <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══ SETTINGS ══════════════════════════════════════════════════════ */}
            {activeTab === 'settings' && (
              <div className="animate-in">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-serif)' }}>Settings & Audit Log</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Manage your profile, security, and system audit trail</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Doctor Profile */}
                    <div className="card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontWeight: 900, fontSize: '14px' }}>Doctor Profile</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setEditingProfile(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                          {editingProfile ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Reset doctor profile to defaults? This cannot be undone.')) {
                              const reset = { name: '', specialty: 'General Physician', clinic: 'Atelier Health Clinic', phone: '', email: user?.email || '' };
                              setDoctorProfile(reset);
                              localStorage.removeItem('ehr_doctor_profile');
                              setEditingProfile(false);
                              addAudit('DELETE_DOCTOR_PROFILE', doctorDisplayName);
                              addNotif('alert', 'Doctor profile has been reset', 'medium');
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#EF4444' }}
                        >
                          Reset
                        </button>
                      </div>
                      </div>
                      {editingProfile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[['Full Name', 'name', 'Dr. Jane Smith'], ['Specialty', 'specialty', 'Cardiologist'], ['Clinic Name', 'clinic', 'Atelier Health'], ['Phone', 'phone', '+91 98765 43210'], ['Email', 'email', 'doctor@clinic.com']].map(([label, key, ph]) => (
                            <div key={key}>
                              <label className="field-label">{label}</label>
                              <input className="inp" value={doctorProfile[key] || ''} onChange={e => setDoctorProfile(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                            </div>
                          ))}
                          <button onClick={() => { setEditingProfile(false); addAudit('UPDATE_PROFILE', doctorProfile.name); }} className="btn-primary" style={{ justifyContent: 'center' }}>Save Profile</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                            <div className="avatar" style={{ width: '52px', height: '52px', borderRadius: '14px', fontSize: '22px', flexShrink: 0 }}>{doctorDisplayName.charAt(3)?.toUpperCase() || 'D'}</div>
                            <div>
                              <p style={{ fontWeight: 900, fontSize: '14px' }}>{doctorDisplayName}</p>
                              <p style={{ fontSize: '12px', color: '#64748B' }}>{doctorProfile.specialty}</p>
                            </div>
                          </div>
                          {[['Clinic', doctorProfile.clinic], ['Phone', doctorProfile.phone || '—'], ['Email', doctorProfile.email || user?.email || '—']].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>{label}</span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Security Settings */}
                    <div className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '14px', marginBottom: '16px' }}>Security & Preferences</h3>
                      {[
                        { key: 'twoFactor',    label: 'Two-Factor Authentication', sub: 'Extra security layer', icon: 'security' },
                        { key: 'sessionTimeout', label: 'Session Timeout (30 min)', sub: 'Auto-logout on inactivity', icon: 'schedule' },
                        { key: 'hipaaMode',    label: 'HIPAA Compliance Mode', sub: 'Enhanced data protection', icon: 'verified_user' },
                        { key: 'emailNotifs',  label: 'Email Notifications', sub: 'Receive alerts via email', icon: 'email' },
                        { key: 'smsAlerts',    label: 'SMS Alerts', sub: 'Critical alert SMS', icon: 'sms' },
                      ].map(item => (
                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
                          <span className="ms ms-fill" style={{ color: 'var(--primary)', fontSize: '18px' }}>{item.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8' }}>{item.sub}</p>
                          </div>
                          <button onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                            style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: settings[item.key] ? 'var(--primary)' : '#E2E8F0', transition: 'background 0.2s', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: '3px', left: settings[item.key] ? '22px' : '3px', width: '18px', height: '18px', background: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }}></div>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Data Management */}
                    <div className="card" style={{ padding: '20px' }}>
                      <h3 style={{ fontWeight: 900, fontSize: '14px', marginBottom: '16px' }}>Data Management</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button onClick={() => exportCSV(patients.map(p => ({ id: p.id, name: p.name, age: p.age, gender: p.gender, contact: p.contact, bloodGroup: p.bloodGroup })), 'all_patients.csv')}
                          className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>
                          <span className="ms ms-sm">download</span> Export All Patient Data
                        </button>
                        <button onClick={async () => {
                          if (window.confirm('This will permanently delete ALL clinical data including database records. This action cannot be undone. Proceed?')) {
                            // Delete all patients from DB
                            await Promise.allSettled(
                              patients.map(p => fetch(`/api/patients?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' }))
                            );
                            // Clear local storage
                            ['ehr_patients', 'ehr_appointments', 'ehr_prescriptions', 'ehr_labs', 'ehr_invoices', 'ehr_notifications', 'ehr_audit'].forEach(k => localStorage.removeItem(k));
                            window.location.reload();
                          }
                        }}
                          style={{ padding: '10px 20px', background: 'white', border: '2px solid #FECACA', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: '#EF4444', width: '100%', transition: 'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          ⚠ Clear All Local Data
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Audit Log */}
                  <div className="card" style={{ padding: '24px', maxHeight: '700px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                      <h3 style={{ fontWeight: 900, fontSize: '15px' }}>Audit Log <span style={{ fontSize: '13px', fontWeight: 500, color: '#94A3B8' }}>({auditLogs.length} entries)</span></h3>
                      <button onClick={() => exportCSV(auditLogs, 'audit_log.csv')} className="btn-ghost" style={{ fontSize: '11px', padding: '6px 12px' }}>
                        <span className="ms ms-sm">download</span> Export
                      </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {auditLogs.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '48px 0' }}>No audit events yet. Actions you take will appear here.</p>
                      ) : (
                        auditLogs.map(log => (
                          <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', marginBottom: '6px' }}>
                            <span className="ms" style={{ color: '#94A3B8', fontSize: '16px' }}>history</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '12px', color: '#1E293B' }}>
                                <span style={{ fontWeight: 700 }}>{log.action.replace(/_/g, ' ')}</span>
                                <span style={{ color: '#64748B' }}> — {log.target}</span>
                              </p>
                              <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{log.user}</p>
                            </div>
                            <span style={{ fontSize: '10px', color: '#CBD5E1', flexShrink: 0 }}>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

        {/* ══ MODALS ═══════════════════════════════════════════════════════════════ */}

        {/* Register / Edit Patient */}
        {modal === 'patient' && (
          <Modal title={editingPatient.id ? 'Edit Patient Record' : 'Register New Patient'} icon="person_add" onClose={() => { setModal(null); setEditingPatient({ ...EMPTY_PATIENT }); }} wide
            footer={<><button onClick={() => { setModal(null); setEditingPatient({ ...EMPTY_PATIENT }); }} className="btn-ghost">Cancel</button><button onClick={savePatient} className="btn-primary">Save Patient</button></>}>
            <Grid2>
              <Field label="Full Name *"><input className="inp" value={editingPatient.name || ''} onChange={e => setEditingPatient(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" /></Field>
              <Field label="Age *"><input className="inp" type="number" min="0" max="150" value={editingPatient.age || ''} onChange={e => setEditingPatient(p => ({ ...p, age: e.target.value }))} placeholder="35" /></Field>
              <Field label="Gender">
                <select className="inp" value={editingPatient.gender || 'Male'} onChange={e => setEditingPatient(p => ({ ...p, gender: e.target.value }))}>
                  {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Blood Group">
                <select className="inp" value={editingPatient.bloodGroup || 'O+'} onChange={e => setEditingPatient(p => ({ ...p, bloodGroup: e.target.value }))}>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Contact Number"><input className="inp" value={editingPatient.contact || ''} onChange={e => setEditingPatient(p => ({ ...p, contact: e.target.value }))} placeholder="+91 98765 43210" /></Field>
              <Field label="Address"><input className="inp" value={editingPatient.address || ''} onChange={e => setEditingPatient(p => ({ ...p, address: e.target.value }))} placeholder="City, State, PIN" /></Field>
              <Field label="Known Diseases (comma-separated)">
                <input className="inp" value={(editingPatient.diseases || []).join(', ')} onChange={e => setEditingPatient(p => ({ ...p, diseases: e.target.value.split(',').map(x => x.trim()).filter(Boolean) }))} placeholder="Diabetes Type 2, Hypertension" />
              </Field>
              <Field label="Allergies (comma-separated)">
                <input className="inp" value={(editingPatient.allergies || []).join(', ')} onChange={e => setEditingPatient(p => ({ ...p, allergies: e.target.value.split(',').map(x => x.trim()).filter(Boolean) }))} placeholder="Penicillin, Aspirin" />
              </Field>
              <Field label="Surgical History (comma-separated)">
                <input className="inp" value={(editingPatient.surgeries || []).join(', ')} onChange={e => setEditingPatient(p => ({ ...p, surgeries: e.target.value.split(',').map(x => x.trim()).filter(Boolean) }))} placeholder="Appendectomy 2018" />
              </Field>
              <Field label="Family History">
                <input className="inp" value={editingPatient.familyHistory || ''} onChange={e => setEditingPatient(p => ({ ...p, familyHistory: e.target.value }))} placeholder="Diabetes in father, Heart disease in grandfather" />
              </Field>
            </Grid2>
            {/* Medications */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="field-label" style={{ margin: 0 }}>Current Medications</label>
                <button onClick={() => setEditingPatient(p => ({ ...p, medications: [...(p.medications || []), { name: '', dose: '', frequency: '', duration: '' }] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>+ Add Medication</button>
              </div>
              {(editingPatient.medications || []).map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input className="inp" style={{ fontSize: '12px' }} value={m.name} onChange={e => setEditingPatient(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Drug name" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.dose} onChange={e => setEditingPatient(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, dose: e.target.value } : x) }))} placeholder="Dose" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.frequency} onChange={e => setEditingPatient(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, frequency: e.target.value } : x) }))} placeholder="Frequency" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.duration} onChange={e => setEditingPatient(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, duration: e.target.value } : x) }))} placeholder="Duration" />
                  <button onClick={() => setEditingPatient(p => ({ ...p, medications: (p.medications || []).filter((_, j) => j !== i) }))}
                    style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', color: '#EF4444' }}>
                    <span className="ms" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {/* New / Edit Appointment */}
        {modal === 'appt' && (
          <Modal title={editingAppt.id ? 'Edit Appointment' : 'New Appointment'} icon="calendar_add_on" onClose={() => setModal(null)}
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={saveAppointment} className="btn-primary">Save Appointment</button></>}>
            {patients.length === 0 ? (
              <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>No patients registered. <button onClick={() => setModal('patient')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline', fontWeight: 700 }}>Register one first.</button></p>
              </div>
            ) : (
              <>
                <Field label="Patient *">
                  <select className="inp" value={editingAppt.patientId || ''} onChange={e => setEditingAppt(p => ({ ...p, patientId: e.target.value }))}>
                    <option value="" disabled>— Select Patient —</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Grid2>
                  <Field label="Consultation Type *">
                    <select className="inp" value={editingAppt.type || ''} onChange={e => setEditingAppt(p => ({ ...p, type: e.target.value }))}>
                      <option value="">— Select Type —</option>
                      {['General Checkup', 'Follow-up', 'Specialist Referral', 'Emergency', 'Procedure', 'Lab Review', 'Prescription Refill', 'Initial Consultation'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Mode">
                    <select className="inp" value={editingAppt.consultationType || 'In-Person'} onChange={e => setEditingAppt(p => ({ ...p, consultationType: e.target.value }))}>
                      <option>In-Person</option><option>Telemedicine</option>
                    </select>
                  </Field>
                  <Field label="Date *"><input type="date" className="inp" value={editingAppt.date || today()} onChange={e => setEditingAppt(p => ({ ...p, date: e.target.value }))} /></Field>
                  <Field label="Time *"><input type="time" className="inp" value={editingAppt.time || '09:00'} onChange={e => setEditingAppt(p => ({ ...p, time: e.target.value }))} /></Field>
                </Grid2>
                <Field label="Status">
                  <select className="inp" value={editingAppt.status || 'Scheduled'} onChange={e => setEditingAppt(p => ({ ...p, status: e.target.value }))}>
                    {['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No-show'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Notes (optional)">
                  <textarea className="inp" rows={2} value={editingAppt.notes || ''} onChange={e => setEditingAppt(p => ({ ...p, notes: e.target.value }))} placeholder="Additional context, chief complaint…" />
                </Field>
              </>
            )}
          </Modal>
        )}

        {/* New Prescription */}
        {modal === 'rx' && (
          <Modal title="New Prescription" icon="medication" onClose={() => { setModal(null); setEditingRx({ patientId: '', medications: [{ name: '', dose: '', frequency: '', duration: '', quantity: '' }], diagnosis: '', doctorNotes: '' }); ai.setResult(''); }} wide
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={saveRx} className="btn-primary">Save Prescription</button></>}>
            <Grid2>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Patient *">
                  <select className="inp" value={editingRx.patientId || ''} onChange={e => setEditingRx(p => ({ ...p, patientId: e.target.value }))}>
                    <option value="" disabled>— Select Patient —</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="Diagnosis *">
                  <input className="inp" value={editingRx.diagnosis || ''} onChange={e => setEditingRx(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Primary diagnosis e.g. Type 2 Diabetes Mellitus" />
                </Field>
              </div>
            </Grid2>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="field-label" style={{ margin: 0 }}>Medications *</label>
                <button onClick={() => setEditingRx(p => ({ ...p, medications: [...(p.medications || []), { name: '', dose: '', frequency: '', duration: '', quantity: '' }] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>+ Add Drug</button>
              </div>
              {(editingRx.medications || []).map((m, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input className="inp" style={{ fontSize: '12px' }} value={m.name} onChange={e => setEditingRx(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Drug name" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.dose} onChange={e => setEditingRx(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, dose: e.target.value } : x) }))} placeholder="Dose" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.frequency} onChange={e => setEditingRx(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, frequency: e.target.value } : x) }))} placeholder="Frequency" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.duration} onChange={e => setEditingRx(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, duration: e.target.value } : x) }))} placeholder="Duration" />
                  <input className="inp" style={{ fontSize: '12px' }} value={m.quantity} onChange={e => setEditingRx(p => ({ ...p, medications: (p.medications || []).map((x, j) => j === i ? { ...x, quantity: e.target.value } : x) }))} placeholder="Quantity" />
                  {(editingRx.medications || []).length > 1 && (
                    <button onClick={() => setEditingRx(p => ({ ...p, medications: (p.medications || []).filter((_, j) => j !== i) }))}
                      style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', color: '#EF4444' }}>
                      <span className="ms" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  )}
                </div>
              ))}
              {(editingRx.medications || []).filter(m => m.name).length >= 2 && (
                <button onClick={() => checkDrugInteraction(editingRx.medications)} disabled={ai.loading}
                  style={{ width: '100%', padding: '9px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#92400E', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                  {ai.loading ? <><span className="ms ms-sm animate-spin">progress_activity</span> Checking…</> : <><span className="ms ms-sm">warning</span> Check Drug Interactions</>}
                </button>
              )}
              {ai.result && <div style={{ marginTop: '8px', padding: '12px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A', fontSize: '12px', lineHeight: 1.6, maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{ai.result}</div>}
            </div>
            <Field label="Doctor Notes / Instructions">
              <textarea className="inp" rows={2} value={editingRx.doctorNotes || ''} onChange={e => setEditingRx(p => ({ ...p, doctorNotes: e.target.value }))} placeholder="Take after meals, monitor blood pressure, avoid alcohol…" />
            </Field>
          </Modal>
        )}

        {/* Add Lab Report */}
        {modal === 'lab' && (
          <Modal title="Add Lab Report" icon="biotech" onClose={() => { setModal(null); setEditingLab({ patientId: '', testName: '', results: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }], status: 'Pending' }); }} wide
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={saveLab} className="btn-primary">Save Report</button></>}>
            <Grid2>
              <Field label="Patient *">
                <select className="inp" value={editingLab.patientId || ''} onChange={e => setEditingLab(p => ({ ...p, patientId: e.target.value }))}>
                  <option value="" disabled>— Select Patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Test Name *">
                <input className="inp" value={editingLab.testName || ''} onChange={e => setEditingLab(p => ({ ...p, testName: e.target.value }))} placeholder="CBC, LFT, HbA1c, Lipid Profile…" />
              </Field>
              <Field label="Report Status">
                <select className="inp" value={editingLab.status || 'Pending'} onChange={e => setEditingLab(p => ({ ...p, status: e.target.value }))}>
                  {['Pending', 'Completed', 'Reviewed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </Grid2>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="field-label" style={{ margin: 0 }}>Results</label>
                <button onClick={() => setEditingLab(p => ({ ...p, results: [...(p.results || []), { parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>+ Add Row</button>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr auto', gap: '6px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span>Parameter</span><span>Value</span><span>Unit</span><span>Normal Range</span><span>Flag</span><span></span>
              </div>
              {(editingLab.results || []).map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input className="inp" style={{ fontSize: '12px' }} value={r.parameter} onChange={e => setEditingLab(p => ({ ...p, results: (p.results || []).map((x, j) => j === i ? { ...x, parameter: e.target.value } : x) }))} placeholder="e.g. Hemoglobin" />
                  <input className="inp" style={{ fontSize: '12px' }} value={r.value} onChange={e => setEditingLab(p => ({ ...p, results: (p.results || []).map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))} placeholder="12.5" />
                  <input className="inp" style={{ fontSize: '12px' }} value={r.unit} onChange={e => setEditingLab(p => ({ ...p, results: (p.results || []).map((x, j) => j === i ? { ...x, unit: e.target.value } : x) }))} placeholder="g/dL" />
                  <input className="inp" style={{ fontSize: '12px' }} value={r.normalRange} onChange={e => setEditingLab(p => ({ ...p, results: (p.results || []).map((x, j) => j === i ? { ...x, normalRange: e.target.value } : x) }))} placeholder="12.0 – 16.0" />
                  <select className="inp" style={{ fontSize: '12px' }} value={r.flag} onChange={e => setEditingLab(p => ({ ...p, results: (p.results || []).map((x, j) => j === i ? { ...x, flag: e.target.value } : x) }))}>
                    {['normal', 'high', 'low', 'critical'].map(f => <option key={f}>{f}</option>)}
                  </select>
                  {(editingLab.results || []).length > 1 && (
                    <button onClick={() => setEditingLab(p => ({ ...p, results: (p.results || []).filter((_, j) => j !== i) }))}
                      style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', color: '#EF4444' }}>
                      <span className="ms" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Modal>
        )}

        {/* Record Vitals */}
        {modal === 'vital' && selectedPatient && (
          <Modal title={`Record Vitals — ${selectedPatient.name}`} icon="monitor_heart" onClose={() => setModal(null)}
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={addVitalToPatient} className="btn-primary">Save Vitals</button></>}>
            <Grid2>
              {[['Blood Pressure (mmHg)', 'bp', '120/80'], ['Heart Rate (bpm)', 'heartRate', '72'], ['Blood Sugar (mg/dL)', 'sugar', '90'], ['BMI', 'bmi', '22.5'], ['Temperature (°F)', 'temp', '98.6'], ['SpO₂ (%)', 'spo2', '98']].map(([label, key, ph]) => (
                <Field key={key} label={label}>
                  <input className="inp" value={newVital[key]} onChange={e => setNewVital(v => ({ ...v, [key]: e.target.value }))} placeholder={ph} />
                </Field>
              ))}
              <Field label="Date Recorded">
                <input type="date" className="inp" value={newVital.recordedAt} onChange={e => setNewVital(v => ({ ...v, recordedAt: e.target.value }))} />
              </Field>
            </Grid2>
          </Modal>
        )}

        {/* Add Visit */}
        {modal === 'visit' && selectedPatient && (
          <Modal title={`Add Visit Record — ${selectedPatient.name}`} icon="clinical_notes" onClose={() => setModal(null)}
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={addVisitToPatient} className="btn-primary">Save Visit</button></>}>
            <Field label="Primary Diagnosis *">
              <input className="inp" value={newVisit.diagnosis || ''} onChange={e => setNewVisit(v => ({ ...v, diagnosis: e.target.value }))} placeholder="e.g. Acute Viral Pharyngitis" />
            </Field>
            <Field label="Clinical Notes / Observations">
              <textarea className="inp" rows={4} value={newVisit.doctorNotes || ''} onChange={e => setNewVisit(v => ({ ...v, doctorNotes: e.target.value }))} placeholder="Patient complaints, examination findings, plan of care…" />
            </Field>
          </Modal>
        )}

        {/* Create Invoice */}
        {modal === 'invoice' && (
          <Modal title="Create Invoice" icon="receipt_long" onClose={() => { setModal(null); setEditingInvoice({ patientId: '', services: [{ name: '', amount: 0 }], paymentStatus: 'Pending', insuranceCovered: 0 }); }}
            footer={<><button onClick={() => setModal(null)} className="btn-ghost">Cancel</button><button onClick={saveInvoice} className="btn-primary">Create Invoice</button></>}>
            <Field label="Patient *">
              <select className="inp" value={editingInvoice.patientId || ''} onChange={e => setEditingInvoice(p => ({ ...p, patientId: e.target.value }))}>
                <option value="" disabled>— Select Patient —</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="field-label" style={{ margin: 0 }}>Services / Line Items</label>
                <button onClick={() => setEditingInvoice(p => ({ ...p, services: [...(p.services || []), { name: '', amount: 0 }] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>+ Add Line</button>
              </div>
              {(editingInvoice.services || []).map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input className="inp" style={{ fontSize: '12px' }} value={s.name} onChange={e => setEditingInvoice(p => ({ ...p, services: (p.services || []).map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder="Service description" />
                  <input type="number" className="inp" style={{ fontSize: '12px', width: '120px' }} value={s.amount || ''} onChange={e => setEditingInvoice(p => ({ ...p, services: (p.services || []).map((x, j) => j === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x) }))} placeholder="₹ Amount" />
                  {(editingInvoice.services || []).length > 1 && (
                    <button onClick={() => setEditingInvoice(p => ({ ...p, services: (p.services || []).filter((_, j) => j !== i) }))}
                      style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', padding: '8px', display: 'flex', color: '#EF4444' }}>
                      <span className="ms" style={{ fontSize: '14px' }}>close</span>
                    </button>
                  )}
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 900, color: '#0F172A', padding: '8px 0', borderTop: '1px solid #E2E8F0', marginTop: '8px' }}>
                Total: ₹{(editingInvoice.services || []).reduce((s, x) => s + (Number(x.amount) || 0), 0).toLocaleString()}
              </div>
            </div>
            <Grid2>
              <Field label="Payment Status">
                <select className="inp" value={editingInvoice.paymentStatus || 'Pending'} onChange={e => setEditingInvoice(p => ({ ...p, paymentStatus: e.target.value }))}>
                  {['Paid', 'Pending', 'Overdue', 'Partial'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Insurance Covered (₹)">
                <input type="number" className="inp" value={editingInvoice.insuranceCovered || ''} onChange={e => setEditingInvoice(p => ({ ...p, insuranceCovered: parseFloat(e.target.value) || 0 }))} placeholder="0" />
              </Field>
            </Grid2>
          </Modal>
        )}

      </div>
    </>
  );
}

