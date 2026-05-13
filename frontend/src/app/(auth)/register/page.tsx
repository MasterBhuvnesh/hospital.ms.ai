/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', dob: '', gender: 'Other', role: 'patient'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          dob: new Date(formData.dob).toISOString(),
          gender: formData.gender,
          role: formData.role
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Server rejected registration'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, role: formData.role }));
      window.location.href = formData.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard';
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const pwdStrength = (() => {
    const l = formData.password.length;
    if (l === 0) return -1;
    if (l < 6) return 0;
    if (l < 10) return 1;
    if (l < 14) return 2;
    return 3;
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --primary: #1D4ED8;
          --primary-dark: #1E3A8A;
          --primary-mid: #2563EB;
          --primary-light: #DBEAFE;
          --accent: #60A5FA;
          --surface: #F8FAFF;
          --surface-container: #EFF4FF;
          --on-surface: #0F172A;
          --on-surface-var: #475569;
          --outline: #CBD5E1;
          --outline-var: #E2E8F0;
          --error: #B91C1C;
          --error-bg: #FEF2F2;
        }

        .reg-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          position: relative;
          overflow: hidden;
        }
        .reg-root::before {
          content: '';
          position: absolute; top: -20%; right: -10%;
          width: 55%; height: 55%;
          background: radial-gradient(circle, rgba(29,78,216,0.09) 0%, transparent 65%);
          pointer-events: none;
        }
        .reg-root::after {
          content: '';
          position: absolute; bottom: -15%; left: -10%;
          width: 45%; height: 45%;
          background: radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 65%);
          pointer-events: none;
        }

        .reg-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 640px;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid var(--outline-var);
          box-shadow: 0 4px 40px rgba(29,78,216,0.08), 0 1px 4px rgba(29,78,216,0.04);
          padding: 48px 56px;
        }
        @media(max-width:600px){ .reg-card { padding: 32px 24px; } }

        .reg-logo {
          display: inline-flex; align-items: center; gap: 10px;
          margin-bottom: 36px; text-decoration: none;
        }
        .reg-logo-mark {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(29,78,216,0.25);
          transition: transform 0.2s;
        }
        .reg-logo:hover .reg-logo-mark { transform: scale(1.06); }
        .reg-logo-mark span { color: #fff; font-size: 17px; }
        .reg-logo-name {
          font-family: 'Inter', serif;
          font-size: 20px; font-weight: 500;
          color: var(--primary-dark); letter-spacing: 0.04em;
        }

        .reg-step-hint { display: flex; align-items: center; gap: 6px; margin-bottom: 28px; }
        .reg-step-pip { width: 28px; height: 3px; border-radius: 2px; background: var(--primary); }
        .reg-step-pip.dim { background: var(--outline-var); width: 16px; }
        .reg-step-label {
          font-family: 'Inter', monospace;
          font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #94A3B8; margin-left: 4px;
        }

        .reg-header { margin-bottom: 28px; }
        .reg-header h1 {
          font-family: 'Inter', serif;
          font-size: 34px; font-weight: 400;
          color: var(--on-surface); letter-spacing: -0.01em; margin: 0 0 6px;
        }
        .reg-header p { font-size: 13px; color: var(--on-surface-var); font-weight: 300; margin: 0; }

        .reg-error {
          background: var(--error-bg); border-left: 3px solid var(--error);
          padding: 12px 16px; border-radius: 6px;
          font-size: 13px; color: var(--error); font-weight: 500; margin-bottom: 22px;
        }

        .reg-role-label {
          font-family: 'Inter', monospace;
          font-size: 9px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--on-surface-var); display: block; margin-bottom: 10px;
        }
        .reg-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .reg-role-card {
          border: 1px solid var(--outline); border-radius: 12px; padding: 15px 16px;
          cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; gap: 12px;
          background: var(--surface);
        }
        .reg-role-card:hover { border-color: var(--primary); background: var(--surface-container); }
        .reg-role-card.active {
          border-color: var(--primary); background: var(--surface-container);
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .reg-role-card input { display: none; }
        .reg-role-icon {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: var(--outline-var); transition: background 0.18s; flex-shrink: 0;
        }
        .reg-role-card.active .reg-role-icon { background: rgba(29,78,216,0.1); }
        .reg-role-icon span { font-size: 18px; color: var(--on-surface-var); transition: color 0.18s; }
        .reg-role-card.active .reg-role-icon span { color: var(--primary); }
        .reg-role-text p {
          font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--on-surface-var); margin: 0 0 2px; transition: color 0.18s;
        }
        .reg-role-card.active .reg-role-text p { color: var(--primary); }
        .reg-role-text small { font-size: 11px; color: #94A3B8; }

        .reg-divider {
          display: flex; align-items: center; gap: 12px; margin: 6px 0 20px;
        }
        .reg-divider::before, .reg-divider::after { content:''; flex:1; height:1px; background:var(--outline-var); }
        .reg-divider span {
          font-family: 'Inter', monospace;
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #94A3B8;
        }

        .reg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:520px){ .reg-grid-2 { grid-template-columns: 1fr; } }

        .reg-field { margin-bottom: 16px; }
        .reg-field-label {
          font-family: 'Inter', monospace;
          font-size: 9px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--on-surface-var); display: block; margin-bottom: 8px;
        }
        .reg-field-wrap { position: relative; }
        .reg-field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          font-size: 18px; color: #94A3B8; pointer-events: none; transition: color 0.15s;
        }
        .reg-field-wrap:focus-within .reg-field-icon { color: var(--primary); }
        .reg-field-wrap input,
        .reg-field-wrap select {
          width: 100%; padding: 13px 14px 13px 44px;
          border: 1px solid var(--outline); border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: 14px;
          color: var(--on-surface); background: var(--surface); outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          appearance: none; -webkit-appearance: none;
        }
        .reg-field-wrap input:focus,
        .reg-field-wrap select:focus {
          border-color: var(--primary); background: #fff;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .reg-field-wrap input::placeholder { color: #94A3B8; }
        .reg-select-arrow {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 18px; color: #94A3B8; pointer-events: none;
        }

        .reg-pwd-strength { display: flex; gap: 4px; margin-top: 8px; }
        .reg-pwd-bar { flex: 1; height: 3px; border-radius: 2px; background: var(--outline-var); transition: background 0.3s; }
        .reg-pwd-bar.weak { background: #EF4444; }
        .reg-pwd-bar.fair { background: #F59E0B; }
        .reg-pwd-bar.strong { background: var(--primary); }

        .reg-submit {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          border: none; border-radius: 12px; color: #fff;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.03em;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 8px;
          box-shadow: 0 6px 24px rgba(29,78,216,0.22);
        }
        .reg-submit:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(29,78,216,0.3); }
        .reg-submit:active { transform: scale(0.99); }
        .reg-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }
        .reg-submit-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
          display: inline-block; transition: transform 0.3s; flex-shrink: 0;
        }
        .reg-submit:hover .reg-submit-dot { transform: scale(1.6); }
        .reg-submit .arr { font-size: 18px; transition: transform 0.2s; }
        .reg-submit:hover .arr { transform: translateX(3px); }

        .reg-footer {
          text-align: center; font-size: 13px; color: var(--on-surface-var);
          margin-top: 24px; padding-top: 22px; border-top: 1px solid var(--outline-var);
        }
        .reg-footer a { color: var(--primary); font-weight: 500; text-decoration: none; margin-left: 4px; }
        .reg-footer a:hover { text-decoration: underline; text-underline-offset: 3px; }
      `}</style>

      <div className="reg-root">
        <div className="reg-card">

          <Link href="/" className="reg-logo">
            <div className="reg-logo-mark">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
            </div>
            <span className="reg-logo-name">Atelier Health</span>
          </Link>

          <div className="reg-step-hint">
            <div className="reg-step-pip"></div>
            <div className="reg-step-pip dim"></div>
            <div className="reg-step-pip dim"></div>
            <span className="reg-step-label">Registration</span>
          </div>

          <div className="reg-header">
            <h1>Create an Account</h1>
            <p>Join the premier clinical portal to manage your health securely.</p>
          </div>

          {error && <div className="reg-error">{error}</div>}

          <form onSubmit={handleRegister}>

            <label className="reg-role-label">I am a...</label>
            <div className="reg-role-grid">
              <label
                className={`reg-role-card${formData.role === 'patient' ? ' active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'patient' })}
              >
                <input type="radio" name="role" value="patient" checked={formData.role === 'patient'} onChange={handleChange} />
                <div className="reg-role-icon"><span className="material-symbols-outlined">person_outline</span></div>
                <div className="reg-role-text"><p>Patient</p><small>Member portal</small></div>
              </label>
              <label
                className={`reg-role-card${formData.role === 'doctor' ? ' active' : ''}`}
                onClick={() => setFormData({ ...formData, role: 'doctor' })}
              >
                <input type="radio" name="role" value="doctor" checked={formData.role === 'doctor'} onChange={handleChange} />
                <div className="reg-role-icon"><span className="material-symbols-outlined">stethoscope</span></div>
                <div className="reg-role-text"><p>Clinician</p><small>Provider access</small></div>
              </label>
            </div>

            <div className="reg-divider"><span>personal details</span></div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-field-label">First Name</label>
                <div className="reg-field-wrap">
                  <span className="material-symbols-outlined reg-field-icon">badge</span>
                  <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="First name" />
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-field-label">Last Name</label>
                <div className="reg-field-wrap">
                  <span className="material-symbols-outlined reg-field-icon">badge</span>
                  <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Last name" />
                </div>
              </div>
            </div>

            <div className="reg-divider"><span>credentials</span></div>

            <div className="reg-field">
              <label className="reg-field-label">Email Address</label>
              <div className="reg-field-wrap">
                <span className="material-symbols-outlined reg-field-icon">alternate_email</span>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="name@domain.com" />
              </div>
            </div>

            <div className="reg-field">
              <label className="reg-field-label">Password</label>
              <div className="reg-field-wrap">
                <span className="material-symbols-outlined reg-field-icon">lock</span>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="Create a strong password" />
              </div>
              <div className="reg-pwd-strength">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`reg-pwd-bar${i <= pwdStrength ? pwdStrength <= 0 ? ' weak' : pwdStrength <= 1 ? ' fair' : ' strong' : ''}`} />
                ))}
              </div>
            </div>

            <div className="reg-divider"><span>demographics</span></div>

            <div className="reg-grid-2">
              <div className="reg-field">
                <label className="reg-field-label">Date of Birth</label>
                <div className="reg-field-wrap">
                  <span className="material-symbols-outlined reg-field-icon">calendar_month</span>
                  <input type="date" name="dob" required value={formData.dob} onChange={handleChange} />
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-field-label">Gender</label>
                <div className="reg-field-wrap">
                  <span className="material-symbols-outlined reg-field-icon">face</span>
                  <select name="gender" required value={formData.gender} onChange={handleChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                  <span className="material-symbols-outlined reg-select-arrow">expand_more</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="reg-submit">
              <span className="reg-submit-dot"></span>
              <span>{loading ? 'Creating Account…' : 'Finish Registration'}</span>
              <span className="material-symbols-outlined arr">arrow_forward</span>
            </button>
          </form>

          <p className="reg-footer">
            Already a member?<Link href="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </>
  );
}