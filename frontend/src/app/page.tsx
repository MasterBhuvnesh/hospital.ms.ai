import React from 'react';
import Link from 'next/link';

/*
  THEME TOKENS (blue palette)
  --primary:       #1D4ED8  (vivid royal blue)
  --primary-dark:  #1E3A8A  (deep navy)
  --primary-mid:   #2563EB  (bright mid-blue)
  --primary-light: #DBEAFE  (pale blue tint)
  --accent:        #60A5FA  (sky accent)
  --surface:       #F8FAFF  (off-white blue tint)
  --on-surface:    #0F172A  (near-black)
  --on-surface-var:#475569  (slate)
  --outline:       #CBD5E1

  FONTS: Cormorant Garamond (display) + DM Sans (body)
*/

export default function Home() {
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
        }

        .home-root {
          font-family: 'Inter', sans-serif;
          background: var(--surface);
          color: var(--on-surface);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Background glows */
        .home-glow-1 {
          position: absolute;
          top: -20%;
          left: -10%;
          width: 55%;
          height: 55%;
          background: radial-gradient(circle, rgba(29,78,216,0.1) 0%, transparent 65%);
          pointer-events: none;
        }
        .home-glow-2 {
          position: absolute;
          bottom: -10%;
          right: -10%;
          width: 45%;
          height: 45%;
          background: radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        /* Header */
        .home-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 48px;
          position: relative;
          z-index: 10;
        }
        @media(max-width:768px){ .home-header { padding: 20px 24px; } }

        .home-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .home-logo-mark {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(29,78,216,0.3);
          transition: transform 0.2s;
        }
        .home-logo:hover .home-logo-mark { transform: scale(1.06); }
        .home-logo-mark span { color: #fff; font-size: 22px; }
        .home-logo-name {
          font-family: 'Inter', serif;
          font-size: 22px;
          font-weight: 500;
          color: var(--primary-dark);
          letter-spacing: 0.04em;
        }

        .home-nav {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        @media(max-width:768px){ .home-nav { display: none; } }
        .home-nav a {
          font-family: 'Inter', monospace;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--on-surface-var);
          text-decoration: none;
          transition: color 0.15s;
        }
        .home-nav a:hover { color: var(--primary); }

        .home-header-ctas {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .home-signin {
          font-family: 'Inter', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--primary);
          text-decoration: none;
          font-weight: 400;
          transition: color 0.15s;
        }
        .home-signin:hover { color: var(--primary-dark); }
        .home-get-started {
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          color: #fff;
          padding: 11px 24px;
          border-radius: 100px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(29,78,216,0.25);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .home-get-started:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(29,78,216,0.32); }
        .home-get-started:active { transform: scale(0.98); }

        /* Hero */
        .home-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 24px 0;
          position: relative;
          z-index: 10;
        }

        .home-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          border-radius: 100px;
          background: var(--primary-light);
          border: 1px solid rgba(29,78,216,0.2);
          margin-bottom: 32px;
        }
        .home-badge span.mat { font-size: 14px; color: var(--primary); }
        .home-badge p {
          font-family: 'Inter', monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--primary);
          margin: 0;
        }

        .home-h1 {
          font-family: 'Inter', serif;
          font-size: clamp(52px, 8vw, 88px);
          font-weight: 300;
          color: var(--on-surface);
          line-height: 1.06;
          letter-spacing: -0.02em;
          margin: 0 0 24px;
        }
        .home-h1 em {
          font-style: italic;
          color: var(--primary);
        }

        .home-sub {
          max-width: 560px;
          font-size: 16px;
          color: var(--on-surface-var);
          line-height: 1.8;
          font-weight: 300;
          margin: 0 auto 40px;
        }

        .home-ctas {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin-bottom: 80px;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-mid) 100%);
          color: #fff;
          padding: 15px 32px;
          border-radius: 100px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(29,78,216,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(29,78,216,0.36); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary .mat { font-size: 18px; transition: transform 0.2s; }
        .btn-primary:hover .mat { transform: translateX(3px); }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          padding: 15px 32px;
          border-radius: 100px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          color: var(--on-surface);
          background: #fff;
          border: 1px solid var(--outline);
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-secondary:hover { background: var(--surface-container); border-color: var(--primary); color: var(--primary); }

        /* Feature cards */
        .home-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 960px;
          margin: 0 auto 80px;
          width: 100%;
          padding: 0 24px;
          position: relative;
          z-index: 10;
        }
        @media(max-width:768px){ .home-features { grid-template-columns: 1fr; } }

        .home-feature-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid var(--outline-var);
          border-radius: 18px;
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .home-feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(29,78,216,0.1); }

        .home-feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .icon-blue { background: var(--primary-light); }
        .icon-blue span { color: var(--primary); font-size: 26px; }
        .icon-accent { background: #EFF6FF; }
        .icon-accent span { color: var(--accent); font-size: 26px; }

        .home-feature-card h3 {
          font-family: 'Inter', serif;
          font-size: 20px;
          font-weight: 500;
          color: var(--on-surface);
          margin: 0 0 10px;
        }
        .home-feature-card p {
          font-size: 13px;
          color: var(--on-surface-var);
          line-height: 1.7;
          font-weight: 300;
          margin: 0;
        }
      `}</style>

      <div className="home-root">
        <div className="home-glow-1"></div>
        <div className="home-glow-2"></div>

        {/* Header */}
        <header className="home-header">
          <Link href="/" className="home-logo">
            <div className="home-logo-mark">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
            </div>
            <span className="home-logo-name">Atelier Health</span>
          </Link>

          <nav className="home-nav">
            <Link href="#solutions">Solutions</Link>
            <Link href="#about">About Us</Link>
            <Link href="#contact">Contact</Link>
          </nav>

          <div className="home-header-ctas">
            <Link href="/login" className="home-signin">Sign In</Link>
            <Link href="/register" className="home-get-started">Get Started</Link>
          </div>
        </header>

        {/* Hero */}
        <main className="home-hero">
          <div className="home-badge">
            <span className="material-symbols-outlined mat">auto_awesome</span>
            <p>AI-Augmented Healthcare</p>
          </div>

          <h1 className="home-h1">
            The Clinical<br/>
            <em>Atelier.</em>
          </h1>

          <p className="home-sub">
            A premium hospital management platform engineered for modern healthcare providers. Where surgical precision meets luxury wellness experiences.
          </p>

          <div className="home-ctas">
            <Link href="/register" className="btn-primary">
              <span>Join the Experience</span>
              <span className="material-symbols-outlined mat">arrow_forward</span>
            </Link>
            <Link href="/login" className="btn-secondary">
              Access Portal
            </Link>
          </div>
        </main>

        {/* Feature cards */}
        <div className="home-features">
          <div className="home-feature-card">
            <div className="home-feature-icon icon-blue">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>view_in_ar</span>
            </div>
            <h3>AI Radiology</h3>
            <p>Instant, high-fidelity AI-assisted diagnostic reports integration.</p>
          </div>
          <div className="home-feature-card">
            <div className="home-feature-icon icon-accent">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
            </div>
            <h3>HIPAA Compliant</h3>
            <p>Bank-grade encryption ensuring patient data privacy and integrity.</p>
          </div>
          <div className="home-feature-card">
            <div className="home-feature-icon icon-blue">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
            </div>
            <h3>Unified Records</h3>
            <p>A synchronized global directory connecting patients and specialists seamlessly.</p>
          </div>
        </div>
      </div>
    </>
  );
}