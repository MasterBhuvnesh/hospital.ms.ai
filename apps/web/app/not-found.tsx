import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <div className="card center" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#208aef" }}>404</div>
        <h1 className="mt8" style={{ fontSize: 20 }}>
          Page not found
        </h1>
        <p className="muted small mt8">
          The page you are looking for does not exist or has moved.
        </p>
        <Link href="/" className="btn btn-primary mt16">
          Back to home
        </Link>
      </div>
    </main>
  );
}
