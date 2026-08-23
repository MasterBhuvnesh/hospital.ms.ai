import Link from "next/link";
import {
  CalendarClock,
  ClipboardSignature,
  FlaskConical,
  ListOrdered,
  Receipt,
  Bot,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const FEATURES = [
  {
    icon: ListOrdered,
    title: "Live queue tokens",
    body: "Book or walk in and get a real queue token with live position and ETA - watch your turn approach instead of sitting in a waiting room.",
  },
  {
    icon: CalendarClock,
    title: "Instant walk-ins",
    body: "No appointment? Mint a walk-in token at any hospital in seconds and join the same live queue as everyone else.",
  },
  {
    icon: ClipboardSignature,
    title: "Signed prescription PDFs",
    body: "Every consultation ends with an immutable, doctor-signed prescription - content-hashed and downloadable as a PDF.",
  },
  {
    icon: FlaskConical,
    title: "Released-only lab results",
    body: "Lab orders move through ordered, collected and entered states - but you only ever see results after they are formally released.",
  },
  {
    icon: Receipt,
    title: "Bills & payments",
    body: "Fee-snapshotted invoices with itemised line items, one-tap payment capture and a full payment history you can audit.",
  },
  {
    icon: Bot,
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
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] font-[500] tracking-[-0.02em]"
          >
            <span aria-hidden className="size-2.5 rounded-full bg-ink" />
            Atelier Health
          </Link>
          <Link href="/login" className={buttonClassName("default", "sm")}>
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-display font-[500] leading-[1.15] tracking-[-0.02em]">
          Your hospital visit, minus the waiting room
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-body-large font-[350] leading-[1.55] text-muted-foreground">
          Atelier Health is a queue-first hospital system. Book or walk in, hold a live queue
          token that tells you exactly where you stand, and walk straight into your
          consultation when it is your turn.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={buttonClassName("default", "lg")}>
            Get started
          </Link>
          <Link href="/appointments" className={buttonClassName("outline", "lg")}>
            See how it works
          </Link>
        </div>
        <p className="mt-5 text-caption font-[350] text-subtle">
          Live demo connected to a shared demo backend (free tier - first load may take up to a
          minute while the server wakes up).
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="rounded-lg border-border shadow-none">
              <CardContent className="p-5 pt-5 font-[350]">
                <div className="mb-4 grid size-9 place-items-center rounded-md bg-surface-muted text-muted-foreground">
                  <f.icon className="size-4" aria-hidden />
                </div>
                <h2 className="text-base font-[500] leading-[1.35] tracking-[-0.01em]">{f.title}</h2>
                <p className="mt-1.5 text-sm font-[350] leading-[1.55] text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-heading-2 font-[500] tracking-[-0.01em]">How it works</h2>
        <p className="mt-1.5 text-center text-sm font-[350] text-muted-foreground">
          Three steps from doorstep to doctor.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="rounded-lg border-border shadow-none">
              <CardContent className="p-5 pt-5 font-[350]">
                <span
                  aria-hidden
                  className="mb-3 grid size-7 place-items-center rounded-full bg-ink text-xs font-[500] text-primary-foreground"
                >
                  {i + 1}
                </span>
                <h3 className="text-heading-4 font-[500] leading-[1.35]">{s.title}</h3>
                <p className="mt-1.5 text-sm font-[350] leading-[1.55] text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 pb-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="mb-2.5 flex items-center gap-2 text-[15px] font-[500] tracking-[-0.02em]">
              <span aria-hidden className="size-2.5 rounded-full bg-ink" />
              Atelier Health
            </div>
            <p className="max-w-md text-sm font-[350] text-muted-foreground">
              A multi-hospital, queue-first hospital management system demo. This site talks to a
              public demo backend; data resets periodically.
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-label font-[450] uppercase tracking-[0.05em] text-muted-foreground">
              Demo logins
            </h4>
            <ul className="space-y-1.5 text-sm font-[350] text-muted-foreground">
              <li>patient@atelier.local / Demo&#64;12345</li>
              <li>admin@atelier.local / Admin&#64;12345</li>
              <li>hadmin@atelier.local / Demo&#64;12345</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-label font-[450] uppercase tracking-[0.05em] text-muted-foreground">
              Links
            </h4>
            <ul className="space-y-1.5 text-sm font-[350] text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground hover:underline">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground hover:underline">
                  Dashboard
                </Link>
              </li>
              <li>
                <a
                  href="https://backend-demo-hms.onrender.com/api/config/app"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground hover:underline"
                >
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
