import Link from "next/link";

const FEATURES = [
  {
    icon: "#",
    title: "Live queue tokens",
    body: "Book or walk in and get a real queue token with live position and ETA - watch your turn approach instead of sitting in a waiting room.",
  },
  {
    icon: ">>",
    title: "Instant walk-ins",
    body: "No appointment? Mint a walk-in token at any hospital in seconds and join the same live queue as everyone else.",
  },
  {
    icon: "Rx",
    title: "Signed prescription PDFs",
    body: "Every consultation ends with an immutable, doctor-signed prescription - content-hashed and downloadable as a PDF.",
  },
  {
    icon: "Lab",
    title: "Released-only lab results",
    body: "Lab orders move through ordered, collected and entered states - but you only ever see results after they are formally released.",
  },
  {
    icon: "=",
    title: "Bills & payments",
    body: "Fee-snapshotted invoices with itemised line items, one-tap payment capture and a full payment history you can audit.",
  },
  {
    icon: "AI",
    title: "AI copilot",
    body: "Ask about your visits, records and bills in plain language - backed by your own patient sheet, with memory you can erase anytime.",
  },
];

const STEPS = [
  {
    title: "Book or walk in",
    body: "Pick a hospital and doctor, choose from live availability slots, or mint an instant walk-in token on arrival.",
  },
  {
    title: "Track your live token",
    body: "Your token shows real-time position, estimated wait, and status - waiting, called, in consultation, completed.",
  },
  {
    title: "Consultation & beyond",
    body: "Get a signed prescription PDF, released lab results with trends, an itemised invoice - all in one timeline.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Atelier Health
          </Link>
          <nav className="nav" aria-label="Main" />
          <Link href="/login" className="btn btn-primary btn-sm">
            Sign in
          </Link>
        </div>
      </header>

      <section className="hero container">
        <h1>
          Your hospital visit, <em>minus the waiting room</em>
        </h1>
        <p className="sub">
          Atelier Health is a queue-first hospital system. Book or walk in, hold a live
          queue token that tells you exactly where you stand, and walk straight into
          your consultation when it is your turn.
        </p>
        <div className="hero-ctas">
          <Link href="/login" className="btn btn-primary btn-lg">
            Get started
          </Link>
          <Link href="/appointments" className="btn btn-lg">
            See how it works
          </Link>
        </div>
        <p className="hero-note">
          Live demo connected to a shared demo backend (free tier - first load may take
          up to a minute while the server wakes up).
        </p>
      </section>

      <section className="container feature-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="card feature-card card-hover">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="container section">
        <h2 style={{ textAlign: "center", marginBottom: 6 }}>How it works</h2>
        <p className="muted center small">Three steps from doorstep to doctor.</p>
        <div className="hiw mt16">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card">
              <div className="hiw-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p className="muted small mt8">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-cols">
          <div>
            <div className="brand" style={{ marginBottom: 10 }}>
              <span className="brand-dot" />
              Atelier Health
            </div>
            <p>
              A multi-hospital, queue-first hospital management system demo. This site talks to a
              public demo backend; data resets periodically.
            </p>
          </div>
          <div>
            <h4>Demo logins</h4>
            <ul>
              <li>patient@atelier.local / Demo&#64;12345</li>
              <li>admin@atelier.local / Admin&#64;12345</li>
              <li>hadmin@atelier.local / Demo&#64;12345</li>
            </ul>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li>
                <Link href="/login">Sign in</Link>
              </li>
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>
              <li>
                <a href="https://backend-demo-hms.onrender.com/api/config/app" target="_blank" rel="noreferrer">
                  Demo API health
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
