import { useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/context/SessionContext";
import { Updates } from "@/components/Updates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Login(): React.JSX.Element {
  const { signIn, signInWithOtp } = useSession();
  const [mode, setMode] = useState<"password" | "otp">("password");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submitPassword(): Promise<void> {
    if (!identifier || !password) return setErr("Enter your email/phone and password.");
    setBusy(true);
    setErr(null);
    try {
      await signIn(identifier.trim(), password);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(): Promise<void> {
    if (!phone) return setErr("Enter your phone number first.");
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await api.auth.requestOtp(phone.trim(), "LOGIN");
      setOtpSent(true);
      if (res.devCode) setDevCode(res.devCode);
      else setInfo(`Code sent to ${phone.trim()}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(): Promise<void> {
    if (code.length !== 6) return setErr("Enter the 6-digit code.");
    setBusy(true);
    setErr(null);
    try {
      await signInWithOtp(phone.trim(), code);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not verify OTP.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "flex w-full items-center rounded-md border border-input bg-muted/40 px-3 font-[350] shadow-none";

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <Updates />
      <Card className="w-full max-w-sm rounded-xl border-border p-6 shadow-subtle sm:p-8">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary">
            <HeartPulse className="size-6 text-primary-foreground" />
          </div>
          <p className="mt-3 text-[15px] font-[500] tracking-[-0.01em] text-foreground">
            Atelier Health
          </p>
          <p className="text-xs font-[350] text-muted-foreground">Staff workstation</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5 text-xs font-[450]">
          {(["password", "otp"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErr(null);
              }}
              className={cn(
                "rounded-md py-1.5",
                mode === m ? "bg-card shadow-xs" : "text-muted-foreground",
              )}
            >
              {m === "password" ? "Password" : "Phone OTP"}
            </button>
          ))}
        </div>

        {err && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-xs font-[350] text-destructive">{err}</p>
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-md border border-success-border bg-success-background px-3 py-2">
            <p className="text-xs font-[350] text-success">{info}</p>
          </div>
        )}

        {mode === "password" ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-[450]">
                Email or phone
              </Label>
              <Input
                id="identifier"
                className={cn(field, "h-9")}
                placeholder="name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitPassword()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-[450]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                className={cn(field, "h-9")}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submitPassword()}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => void submitPassword()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {!otpSent ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-[450]">
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    className={cn(field, "h-9")}
                    placeholder="+91 phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={busy}
                  onClick={() => void sendOtp()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {busy ? "Sending..." : "Send code"}
                </Button>
              </>
            ) : (
              <>
                {devCode && (
                  <p className="text-xs font-[450] text-info">Demo code: {devCode}</p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-[450]">
                    6-digit code
                  </Label>
                  <Input
                    id="code"
                    className={cn(field, "h-9 tracking-[6px]")}
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={busy}
                  onClick={() => void verifyOtp()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {busy ? "Verifying..." : "Verify and sign in"}
                </Button>
              </>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] font-[350] text-subtle">
          Demo: patient@atelier.local / Demo@12345
        </p>
      </Card>
    </main>
  );
}


