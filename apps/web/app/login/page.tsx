"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ADMIN_ROLES, ApiError, type ApiUser } from "@/lib/api";
import Banner from "@/components/Banner";

const DEMO = [
  { label: "Patient", email: "patient@atelier.local", password: "Demo@12345" },
  { label: "Hospital admin", email: "hadmin@atelier.local", password: "Demo@12345" },
  { label: "Platform admin", email: "admin@atelier.local", password: "Admin@12345" },
];

function destination(user: ApiUser): string {
  const next =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next")
      : null;
  if (next && next.startsWith("/")) return next;
  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r.role as never));
  return isAdmin ? "/admin" : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // password mode
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // register
  const [registering, setRegistering] = useState(false);
  const [fullName, setFullName] = useState("");

  // otp mode
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (tokenPresent()) router.replace("/dashboard");
  }, [router]);

  function tokenPresent() {
    try {
      return !!(localStorage.getItem("atelier_access") || localStorage.getItem("atelier_refresh"));
    } catch {
      return false;
    }
  }

  function go(user: ApiUser) {
    router.replace(destination(user));
    router.refresh();
  }

  async function submitPassword(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (registering) {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        const user = await api.auth.register({ fullName: fullName.trim(), email: identifier.trim(), password });
        go(user);
      } else {
        const user = await api.auth.login(identifier.trim(), password);
        go(user);
      }
    } catch (e2) {
      const msg = e2 instanceof ApiError ? e2.message : e2 instanceof Error ? e2.message : "Sign-in failed.";
      setErr(
        e2 instanceof ApiError && e2.code === "NETWORK"
          ? msg
          : `${msg} (Demo backend may be waking up - retry in a minute.)`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await api.auth.requestOtp(phone.trim(), "LOGIN");
      setOtpSent(true);
      setInfo(
        res.devCode
          ? `Code sent to ${phone.trim()}. Dev code: ${res.devCode}`
          : `Code sent to ${phone.trim()}. Check your messages.`,
      );
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const data = await api.auth.verifyOtp({ destination: phone.trim(), code: code.trim(), purpose: "LOGIN" });
      if (data.user && data.tokens) go(data.user);
      else setErr("OTP verified but no session was returned. Try password sign-in.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Link href="/" className="brand">
            <span className="brand-dot" />
            Atelier Health
          </Link>
        </div>

        <div className="mode-tabs" role="tablist">
          <button className={mode === "password" ? "on" : ""} onClick={() => setMode("password")} type="button">
            Email &amp; password
          </button>
          <button className={mode === "otp" ? "on" : ""} onClick={() => setMode("otp")} type="button">
            Phone OTP
          </button>
        </div>

        {err && <Banner kind="error" onDismiss={() => setErr(null)}>{err}</Banner>}
        {info && <Banner kind="info" onDismiss={() => setInfo(null)}>{info}</Banner>}

        {mode === "password" ? (
          <form onSubmit={submitPassword}>
            {registering && (
              <div className="field">
                <label className="label" htmlFor="fullName">
                  Full name
                </label>
                <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ramesh Kumar" />
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="identifier">
                Email or phone
              </label>
              <input
                id="identifier"
                className="input"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete={registering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy || !identifier || !password}>
              {busy ? "Signing in..." : registering ? "Create account" : "Sign in"}
            </button>
            <p className="center small muted mt16">
              {registering ? "Already have an account? " : "New here? "}
              <a href="#" onClick={(e) => { e.preventDefault(); setRegistering((v) => !v); }}>
                {registering ? "Sign in instead" : "Create an account"}
              </a>
            </p>

            {!registering && (
              <div className="demo-logins">
                <p className="tiny faint mb8">Demo accounts - tap to fill:</p>
                <div className="row" style={{ gap: 6 }}>
                  {DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      className="chip"
                      onClick={() => {
                        setIdentifier(d.email);
                        setPassword(d.password);
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : requestOtp}>
            <div className="field">
              <label className="label" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                className="input"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
              />
            </div>
            {otpSent ? (
              <>
                <div className="field">
                  <label className="label" htmlFor="code">
                    Verification code
                  </label>
                  <input
                    id="code"
                    className="input"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                  />
                </div>
                <button className="btn btn-primary btn-block btn-lg" disabled={busy || !code}>
                  {busy ? "Verifying..." : "Verify & sign in"}
                </button>
                <p className="center small muted mt16">
                  <a href="#" onClick={(e) => { e.preventDefault(); setOtpSent(false); setInfo(null); }}>
                    Use a different number
                  </a>
                </p>
              </>
            ) : (
              <button className="btn btn-primary btn-block btn-lg" disabled={busy || phone.trim().length < 8}>
                {busy ? "Sending..." : "Send code"}
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
