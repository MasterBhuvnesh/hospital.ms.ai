/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Authentication failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, role }));
      window.location.href = role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard';
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

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

        * { box-sizing: border-box; }

        .login-root {
          font-family: 'Inter', sans-serif;
          background: var(--surface);
          height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media(max-width:800px){ .login-root { grid-template-columns: 1fr; } }

        /* ── LEFT PANEL ── */
        .login-left {
          background: linear-gradient(145deg, var(--primary-dark) 0%, var(--primary) 55%, var(--primary-mid) 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
        }
        @media(max-width:800px){ .login-left { display: none; } }

        .login-left-glow {
          position: absolute;
          bottom: -100px; right: -80px;
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 65%);
          pointer-events: none;
        }
        .login-left-glow2 {
          position: absolute;
          top: -60px; left: -60px;
          width: 280px; height: 280px;
          background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-left-noise {
          position: absolute; inset: 0;
          opacity: .035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0;
        }
        .login-left > * { position: relative; z-index: 1; }

        .login-logo {
          display: flex; align-items: center; gap: 12px;
          text-decoration: none;
        }
        .login-logo-mark {
          width: 38px; height: 38px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .login-logo-mark span { color: #fff; font-size: 19px; }
        .login-logo-name {
          font-family: 'Inter', serif;
          font-size: 20px; font-weight: 500;
          color: #fff; letter-spacing: 0.04em;
        }

        .login-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 72px 0 40px; }
        .login-step-label {
          font-family: 'Inter', monospace;
          font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--accent); margin-bottom: 22px;
          display: flex; align-items: center; gap: 10px;
        }
        .login-eyebrow::before { content:''; display:block; width:28px; height:1px; background:var(--accent); }
        .login-h1 {
          font-family: 'Inter', serif;
          font-size: clamp(42px,5vw,62px); font-weight: 300;
          color: #fff; line-height: 1.09; letter-spacing: -0.01em; margin-bottom: 24px;
        }
        .login-h1 em { font-style: italic; color: var(--accent); }
        .login-sub { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.8; max-width: 320px; font-weight: 300; }

        .login-rule { width: 100%; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%); margin: 36px 0; }

        .login-trust { display: flex; align-items: center; gap: 16px; }
        .login-avatars { display: flex; }
        .login-av { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--primary); object-fit: cover; }
        .login-av + .login-av { margin-left: -9px; }
        .login-trust-text { font-size: 11px; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .login-trust-text strong { color: rgba(255,255,255,0.85); font-weight: 500; }

        .login-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px; width: fit-content;
          backdrop-filter: blur(8px);
        }
        .login-badge span.mat { font-size: 17px; color: var(--accent); }
        .login-badge p { font-size: 11px; color: rgba(255,255,255,0.6); margin: 0; letter-spacing: 0.02em; }

        /* ── RIGHT PANEL ── */
        .login-right {
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 60px;
        overflow-y: auto;
        min-height: 100vh;
        }
        @media(max-width:600px){ .login-right { padding: 40px 24px; } }

        .login-right-inner {
          width: 100%;
          max-width: 380px;
        }

        .login-right-header { margin-bottom: 32px; }
        .login-header h1 {
          font-family: 'Inter', serif;
          font-size: 34px; font-weight: 400;
          color: var(--on-surface); letter-spacing: -0.01em; margin: 0 0 6px;
        }
        .login-right-header p { font-size: 13px; color: var(--on-surface-var); font-weight: 300; margin: 0; }

        .login-error {
          background: var(--error-bg); border-left: 3px solid var(--error);
          padding: 12px 16px; border-radius: 6px;
          font-size: 13px; color: var(--error); font-weight: 500; margin-bottom: 24px;
        }

        /* Role cards */
        .login-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .login-role-card {
          border: 1px solid var(--outline); border-radius: 12px; padding: 15px 16px;
          cursor: pointer; transition: all 0.18s;
          display: flex; align-items: center; gap: 12px;
          background: var(--surface);
        }
        .login-role-card:hover { border-color: var(--primary); background: var(--surface-container); }
        .login-role-card.active {
          border-color: var(--primary); background: var(--surface-container);
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .login-role-card input { display: none; }
        .login-role-icon {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: var(--outline-var); transition: background 0.18s; flex-shrink: 0;
        }
        .login-role-card.active .login-role-icon { background: rgba(29,78,216,0.1); }
        .login-role-icon span { font-size: 18px; color: var(--on-surface-var); transition: color 0.18s; }
        .login-role-card.active .login-role-icon span { color: var(--primary); }
        .login-role-text p {
          font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--on-surface-var); margin: 0 0 2px; transition: color 0.18s;
        }
        .login-role-card.active .login-role-text p { color: var(--primary); }
        .login-role-text small { font-size: 11px; color: var(--outline); }

        .login-divider {
          display: flex; align-items: center; gap: 12px; margin: 0 0 20px;
        }
        .login-divider::before, .login-divider::after { content:''; flex:1; height:1px; background:var(--outline-var); }
        .login-divider span {
          font-family: 'DM Mono', monospace;
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #94A3B8;
        }

        /* Fields */
        .login-field { margin-bottom: 16px; }
        .login-field-label {
          font-family: 'Inter', monospace;
          font-size: 9px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--on-surface-var); display: block; margin-bottom: 8px;
        }
        .login-field-wrap { position: relative; }
        .login-field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          font-size: 19px; color: #94A3B8; pointer-events: none; transition: color 0.15s;
        }
        .login-field-wrap:focus-within .login-field-icon { color: var(--primary); }
        .login-field-wrap input {
          width: 100%; padding: 13px 14px 13px 44px;
          border: 1px solid var(--outline); border-radius: 10px;
          font-family: 'Inter', sans-serif; font-size: 14px;
          color: var(--on-surface); background: var(--surface); outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .login-field-wrap input:focus {
          border-color: var(--primary); background: #fff;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .login-field-wrap input::placeholder { color: #94A3B8; }
        .login-field-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .login-forgot { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); text-decoration: none; }
        .login-forgot:hover { color: var(--primary-dark); }
        .login-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94A3B8; padding: 0;
        }
        .login-eye:hover { color: var(--on-surface-var); }

        /* Submit */
        .login-submit {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          border: none; border-radius: 12px; color: #fff;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0.03em;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 8px;
          box-shadow: 0 6px 24px rgba(29,78,216,0.22);
        }
        .login-submit:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(29,78,216,0.3); }
        .login-submit:active { transform: scale(0.99); }
        .login-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }
        .login-submit-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
          display: inline-block; transition: transform 0.3s; flex-shrink: 0;
        }
        .login-submit:hover .login-submit-dot { transform: scale(1.6); }
        .login-submit .arr { font-size: 18px; transition: transform 0.2s; }
        .login-submit:hover .arr { transform: translateX(3px); }

        .login-footer-link { margin-top: 20px; text-align: center; font-size: 13px; color: var(--on-surface-var); }
        .login-footer-link a { color: var(--primary); font-weight: 500; text-decoration: none; margin-left: 4px; }
        .login-footer-link a:hover { text-decoration: underline; text-underline-offset: 3px; }

        .login-bottom {
          margin-top: 36px; padding-top: 20px;
          border-top: 1px solid var(--outline-var);
          display: flex; justify-content: space-between; align-items: center;
        }
        .login-bottom button {
          font-family: 'DM Sans', sans-serif; background: none; border: none;
          font-size: 11px; color: #94A3B8; cursor: pointer; display: flex; align-items: center; gap: 6px;
        }
        .login-bottom-links { display: flex; gap: 20px; }
        .login-bottom-links a {
          font-family: 'DM Mono', monospace;
          font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8; text-decoration: none;
        }
        .login-bottom-links a:hover { color: var(--on-surface-var); }
      `}</style>

      <div className="login-root">
        {/* LEFT */}
        <div className="login-left">
          <div className="login-left-noise"></div>
          <div className="login-left-glow"></div>
          <div className="login-left-glow2"></div>

          <Link href="/" className="login-logo">
            <div className="login-logo-mark">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
            </div>
            <span className="login-logo-name">Atelier Health</span>
          </Link>

          <div className="login-hero">
            <p className="login-eyebrow">Clinical Portal</p>
            <h1 className="login-h1">The art of<br />modern <em>medicine.</em></h1>
            <p className="login-sub">A curated management experience for healthcare providers. Where clinical precision meets thoughtful design.</p>
            <div className="login-rule"></div>
            <div className="login-trust">
              <div className="login-avatars">
                <img className="login-av" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSBuTanRfUWbTFIpAixxA29CO_XRVCnfST6Lc7BsfRmU1yEjarvf1jjUn4ryBnL8y7I5nASv-_D_cNTMqAubXSuDmSUtxKcFEeYAnP62hgqDzQ6OhgywmbqAbYeNQCBIbamNolwalum0G55AvdNpedt18o-yyt6LTrs7ZRLkZGxtG-J56tHFUq_0XZPrI1mzTMXfn800I18jvWQgipAEqvwXMWO3phfT032DI18YxHsSFSC3LGkLZ8mhn27PYRNhVb2hEcS58SPZbo" alt="" />
                <img className="login-av" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-DZi-LdCp4NNz4POiX296XCCvpA45k87jToe4PxbpTa6iDJ4wwNM093cT3MExHRpmoX9ah7Kfk10Qrf5VNmL2VxqQkvRRTwaEh8-JRW8op1Ar-cdOWK-A8efklgahsN-_JNulpfc0T4kirYiDSI6CcHi047Gvo9mpnxQM58N759VipZ6Xtc6NnSjSK060xsnSwab9HIyWcMsSUlLISvevALdhapKVVA8kWjgVXLzjuXLnCgPyBx5E2cqh1NAvuYnI47vi-Ft78AkH" alt="" />
                <img className="login-av" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu0WJiJcDYlGYH-Nh8oXf7Jb0VQa84A-Xp2yK7YicGDP_XvHUi2BK5Iz3lPrn_lpHa81C5fMCFMXaTbDbeSP4IZB0Z6le1-xk-cypjdIe2OxS8PDps9TzGGTU7GK0VK1YEQrJndLwzBWfIjr1b8kJ_lbAuSRtoY33G4oftBbuHu1r5QPeiiAclgLD1I5hM8XMp_LBz5tWf2BEEG74c-h2lJWIi4NqI0bp1KEqHhQLhxD8HZty3vWc2dWeZSkAQEeqi2kRdCBlsEjxj" alt="" />
              </div>
              <div className="login-trust-text">
                <strong>+12,000 clinicians</strong> across<br />140 health networks
              </div>
            </div>
          </div>

          <div className="login-badge">
            <span className="material-symbols-outlined mat" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <p>HIPAA Compliant &amp; SOC 2 Type II Certified</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="login-right-inner">
            <div className="login-right-header">
              <h2>Welcome back.</h2>
              <p>Select your role to access the portal.</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            {/* Role */}
            <div className="login-role-grid">
              <label
                className={`login-role-card${role === 'patient' ? ' active' : ''}`}
                onClick={() => setRole('patient')}
              >
                <input type="radio" name="role" value="patient" checked={role === 'patient'} onChange={() => setRole('patient')} />
                <div className="login-role-icon"><span className="material-symbols-outlined">person_outline</span></div>
                <div className="login-role-text"><p>Patient</p><small>Member portal</small></div>
              </label>
              <label
                className={`login-role-card${role === 'doctor' ? ' active' : ''}`}
                onClick={() => setRole('doctor')}
              >
                <input type="radio" name="role" value="doctor" checked={role === 'doctor'} onChange={() => setRole('doctor')} />
                <div className="login-role-icon"><span className="material-symbols-outlined">stethoscope</span></div>
                <div className="login-role-text"><p>Clinician</p><small>Provider access</small></div>
              </label>
            </div>

            <div className="login-divider"><span>credentials</span></div>

            <form onSubmit={handleLogin}>
              <div className="login-field">
                <label className="login-field-label">Email address</label>
                <div className="login-field-wrap">
                  <span className="material-symbols-outlined login-field-icon">alternate_email</span>
                  <input type="email" placeholder="name@hospital.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field-row">
                  <label className="login-field-label" style={{ marginBottom: 0 }}>Password</label>
                  <a href="#" className="login-forgot">Forgot password?</a>
                </div>
                <div className="login-field-wrap" style={{ marginTop: 8 }}>
                  <span className="material-symbols-outlined login-field-icon">lock_open</span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••" required
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" className="login-eye" onClick={() => setShowPwd(v => !v)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit">
                <span className="login-submit-dot"></span>
                <span>{loading ? 'Authenticating…' : 'Access Clinical Portal'}</span>
                <span className="material-symbols-outlined arr">arrow_forward</span>
              </button>
            </form>

            <p className="login-footer-link">
              Don&apos;t have an account?<Link href="/register">Register your practice</Link>
            </p>

            <div className="login-bottom">
              <button><span className="material-symbols-outlined" style={{ fontSize: 14 }}>language</span> English (US)</button>
              <div className="login-bottom-links">
                <a href="#">Legal</a>
                <a href="#">Privacy</a>
                <a href="#">Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}