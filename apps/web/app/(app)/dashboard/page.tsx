"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  FileText,
  Radio,
  ReceiptText,
} from "lucide-react";
import { api, tokenStore, type Appointment, type Token } from "@/lib/api";
import Banner from "@/components/Banner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PanelTitle } from "@/components/ui/panel";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A"
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unread, setUnread] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [liveToken, setLiveToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(tokenStore.getUser()?.fullName ?? "");
    setError(null);

    api.comms
      .notifications()
      .then((r) => setUnread(r.unreadCount))
      .catch(() => setUnread(0));

    api.scheduling
      .appointments()
      .then(setAppointments)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your data."));
  }, []);

  useEffect(() => {
    if (!appointments) return;
    const now = Date.now();
    const candidates = appointments.filter(
      (a) =>
        a.tokenId &&
        (a.status === "BOOKED" || a.status === "CONFIRMED") &&
        new Date(a.startsAt).getTime() > now - 6 * 3600_000,
    );
    if (candidates.length === 0) return;
    let alive = true;
    Promise.all(
      candidates.slice(0, 5).map((a) => api.scheduling.token(a.tokenId as string).catch(() => null)),
    ).then((tokens) => {
      if (!alive) return;
      const active =
        tokens.find(
          (t): t is Token => !!t && ["WAITING", "CALLED", "IN_CONSULTATION"].includes(t.status),
        ) ?? null;
      setLiveToken(active);
    });
    return () => {
      alive = false;
    };
  }, [appointments]);

  return (
    <>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <Button variant="cta" size="lg" onClick={() => router.push("/appointments")}>
          <CalendarPlus data-icon="inline-start" aria-hidden />
          Book appointment
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        {error && (
          <Banner kind="warn" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {liveToken && (
          <Banner kind={liveToken.position != null && liveToken.position <= 3 ? "success" : "info"}>
            <strong>Token #{liveToken.tokenNumber} is live.</strong>{" "}
            {liveToken.status === "IN_CONSULTATION"
              ? "You are in consultation now."
              : liveToken.status === "CALLED"
                ? "You are being called in."
                : `Position ${liveToken.position ?? "-"} - about ${liveToken.etaMinutes ?? "?"} min to go.`}{" "}
            <Link href={`/visits-queue/${liveToken.id}`} className="font-[400] underline underline-offset-2">
              Track it
            </Link>
          </Banner>
        )}
      </div>

      <div className="mx-auto mb-8 mt-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-sm font-[450] text-muted-foreground ring-1 ring-border">
            {initials(name)}
          </div>
          <p className="text-[26px] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
            Welcome, {(name.split(/\s+/)[0] || "there").replace(/^\w/, (c) => c.toUpperCase())}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StepCard href="/appointments" title="Book" caption="3 steps" visual={<MockSlots />} body="Book a visit with the doctor of your choice and pick a slot from their live availability." />

        <StepCard
          href={liveToken ? `/visits-queue/${liveToken.id}` : "/appointments"}
          title="Live queue"
          caption={liveToken ? `Token #${liveToken.tokenNumber}` : "Live now"}
          visual={<MockQueue token={liveToken} />}
          body={
            liveToken
              ? `Token #${liveToken.tokenNumber} - position ${liveToken.position ?? "-"}, about ${liveToken.etaMinutes ?? "?"} min to go.`
              : "Register at the desk or book a visit, then watch your queue position update in real time."
          }
        />

        <StepCard href="/records" title="Records" caption="1 step" visual={<MockDocs />} body="Upload reports and scans once. Every hospital sees them only with your permission." />

        <StepCard href="/payments" title="Bills" caption="2 steps" visual={<MockInvoice />} body="Bills appear here after your consultation - pay online in a couple of taps." />

        <StepCard href="/prescriptions" title="Prescriptions" caption="1 step" visual={<MockRx />} body="Signed prescriptions land here as tamper-evident PDFs you can save or share." />

        <StepCard
          href="/copilot"
          title="Copilot"
          caption={unread && unread > 0 ? `${unread} unread` : "Optional"}
          visual={<MockCopilot />}
          body="Ask about your visits, medicines or lab results in plain words."
        />
      </div>
    </>
  );
}

function StepCard({
  href,
  title,
  caption,
  visual,
  body,
}: {
  href: string;
  title: string;
  caption: string;
  visual: ReactNode;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
    >
      <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm transition-colors duration-160 ease-out group-hover:bg-muted/70">
        <div className="px-3 py-2">
          <PanelTitle title={title} />
        </div>
        <div className="rounded-xl bg-card p-4">
          <div className="flex h-36 items-center justify-center rounded-md bg-muted/60 p-4">
            {visual}
          </div>
          <p className="mt-3 text-sm font-[350] leading-[1.55] text-foreground">{body}</p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[11px] font-[350] text-muted-foreground">{caption}</p>
        </div>
      </Card>
    </Link>
  );
}

function MockSlots() {
  return (
    <div className="w-full max-w-[190px]">
      <div className="rounded-md border border-border bg-background p-2 shadow-subtle">
        <div className="mb-1.5 h-1.5 w-16 rounded-full bg-zinc-200" />
        <div className="grid grid-cols-3 gap-1">
          {["09:00", "09:15", "09:30", "09:45", "10:00", "10:15"].map((t, i) => (
            <span
              key={t}
              className={`rounded-sm px-1 py-0.5 text-center text-[9px] font-[450] ${
                i === 2
                  ? "bg-primary text-primary-foreground"
                  : i === 4
                    ? "bg-secondary text-secondary-foreground/40 line-through"
                    : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md border border-border bg-background shadow-subtle">
          <CalendarPlus className="size-3.5 text-foreground" />
        </div>
      </div>
    </div>
  );
}

function MockQueue({ token }: { token: Token | null }) {
  const num = token?.tokenNumber ?? 42;
  const pos = typeof token?.position === "number" ? token.position : null;
  return (
    <div className="w-full max-w-[170px] rounded-lg border border-border bg-background p-3 text-center shadow-subtle">
      <div className="mb-1 flex items-center justify-center gap-1.5">
        <Radio className="size-3 animate-pulse text-success" />
        <span className="text-[9px] font-semibold tracking-wide text-success">LIVE</span>
      </div>
      <p className="text-xl font-[600] tabular-nums tracking-tight text-foreground">#{num}</p>
      <p className="text-[10px] font-[350] text-muted-foreground">
        {pos === 0 ? "your turn" : pos != null ? `${pos} ahead` : "3 ahead"}
      </p>
    </div>
  );
}

function MockDocs() {
  return (
    <div className="w-full max-w-[190px] space-y-1.5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 shadow-subtle"
        >
          <FileText className="size-3 text-info" />
          <div className="h-1.5 flex-1 rounded-full bg-zinc-200" />
        </div>
      ))}
      <div className="mx-auto mt-1 flex size-6 items-center justify-center rounded-md border border-border bg-background shadow-subtle">
        <CalendarPlus className="size-3 rotate-180 text-foreground" />
      </div>
    </div>
  );
}

function MockInvoice() {
  return (
    <div className="w-full max-w-[180px] rounded-lg border border-border bg-background p-2.5 shadow-subtle">
      <div className="mb-1.5 flex items-center justify-between">
        <ReceiptText className="size-3 text-warning" />
        <span className="rounded-sm border border-warning-border bg-warning-background px-1 text-[8px] font-semibold text-warning">
          DUE
        </span>
      </div>
      <div className="h-1.5 w-20 rounded-full bg-zinc-200" />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] font-[450] text-foreground">500 INR</span>
        <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[8px] font-semibold text-primary-foreground">
          Pay
        </span>
      </div>
    </div>
  );
}

function MockRx() {
  return (
    <div className="w-full max-w-[180px] rounded-lg border border-border bg-background p-2.5 shadow-subtle">
      <div className="mb-1.5 flex items-center gap-1.5">
        <FileText className="size-3 text-success" />
        <span className="rounded-sm border border-success-border bg-success-background px-1 text-[8px] font-semibold text-success">
          SIGNED
        </span>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-24 rounded-full bg-zinc-200" />
        <div className="h-1.5 w-16 rounded-full bg-zinc-200" />
      </div>
    </div>
  );
}

function MockCopilot() {
  return (
    <div className="w-full max-w-[190px] space-y-1.5">
      <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-primary px-2 py-1 text-[9px] text-primary-foreground">
        What does this medicine do?
      </div>
      <div className="w-fit max-w-[90%] rounded-lg rounded-bl-sm border border-border bg-background px-2 py-1 text-[9px] font-[350] leading-snug text-zinc-700">
        It is an antihistamine that helps with allergies...
      </div>
    </div>
  );
}

