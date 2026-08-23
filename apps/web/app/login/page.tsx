"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ADMIN_ROLES, ApiError, type ApiUser } from "@/lib/api";
import Banner from "@/components/Banner";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm rounded-lg border-border p-6 shadow-none sm:p-8">
        <div className="mb-5 flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-[500] tracking-[-0.02em]">
            <span aria-hidden className="size-2.5 rounded-full bg-ink" />
            Atelier Health
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1" role="tablist">
          <Button
            variant={mode === "password" ? "default" : "ghost"}
            onClick={() => setMode("password")}
            role="tab"
            aria-selected={mode === "password"}
            className="h-8 px-3 text-xs"
          >
            Email &amp; password
          </Button>
          <Button
            variant={mode === "otp" ? "default" : "ghost"}
            onClick={() => setMode("otp")}
            role="tab"
            aria-selected={mode === "otp"}
            className="h-8 px-3 text-xs"
          >
            Phone OTP
          </Button>
        </div>

        {err && <Banner kind="error" onDismiss={() => setErr(null)}>{err}</Banner>}
        {info && <Banner kind="info" onDismiss={() => setInfo(null)}>{info}</Banner>}

        {mode === "password" ? (
          <form onSubmit={submitPassword} className="space-y-4">
            {registering && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ramesh Kumar" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input
                id="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <Button size="lg" className="w-full" disabled={busy || !identifier || !password}>
              {busy ? "Signing in..." : registering ? "Create account" : "Sign in"}
            </Button>
            <p className="pt-1 text-center text-body-small font-[350] text-muted-foreground">
              {registering ? "Already have an account? " : "New here? "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setRegistering((v) => !v);
                }}
                className="font-[400] text-foreground underline-offset-2 hover:underline"
              >
                {registering ? "Sign in instead" : "Create an account"}
              </a>
            </p>

            {!registering && (
              <div className="border-t border-dashed border-border pt-4">
                <p className="mb-2 text-caption font-[350] text-subtle">Demo accounts - tap to fill:</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      className={cn(buttonClassName("outline", "sm"), "h-7 px-2.5")}
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
          <form onSubmit={otpSent ? verifyOtp : requestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
              />
            </div>
            {otpSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                  />
                </div>
                <Button size="lg" className="w-full" disabled={busy || !code}>
                  {busy ? "Verifying..." : "Verify & sign in"}
                </Button>
                <p className="text-center text-body-small font-[350] text-muted-foreground">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setOtpSent(false);
                      setInfo(null);
                    }}
                    className="font-[400] text-foreground underline-offset-2 hover:underline"
                  >
                    Use a different number
                  </a>
                </p>
              </>
            ) : (
              <Button size="lg" className="w-full" disabled={busy || phone.trim().length < 8}>
                {busy ? "Sending..." : "Send code"}
              </Button>
            )}
          </form>
        )}
      </Card>
    </main>
  );
}
