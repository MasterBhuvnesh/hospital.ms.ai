"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FolderOpen,
  Pill,
  Receipt,
  Bell,
  Bot,
} from "lucide-react";
import { api, tokenStore, type Appointment, type Doctor, type Token } from "@/lib/api";
import { greeting, fmtDate, fmtTime } from "@/lib/format";
import Banner from "@/components/Banner";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TILES = [
  { href: "/appointments", icon: CalendarDays, title: "Appointments", body: "Book, reschedule or cancel visits" },
  { href: "/records", icon: FolderOpen, title: "Records", body: "Allergies, labs with trends & documents" },
  { href: "/prescriptions", icon: Pill, title: "Prescriptions", body: "Signed prescriptions and PDFs" },
  { href: "/payments", icon: Receipt, title: "Payments", body: "Invoices, bills and history" },
  { href: "/notifications", icon: Bell, title: "Notifications", body: "Everything that happened while away" },
  { href: "/copilot", icon: Bot, title: "AI copilot", body: "Ask about your care in plain words" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unread, setUnread] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [liveToken, setLiveToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(tokenStore.getUser()?.fullName ?? "");
    setError(null);

    api.comms
      .notifications()
      .then((r) => setUnread(r.unreadCount))
      .catch(() => setUnread(0));

    Promise.all([api.scheduling.appointments(), api.directory.doctors()])
      .then(([appts, docs]) => {
        setAppointments(appts);
        setDoctors(docs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your data."));
  }, []);

  // find an active token among upcoming appointments
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

  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.fullName ?? "your doctor";

  const now = Date.now();
  const nextVisit = appointments
    ?.filter(
      (a) =>
        (a.status === "BOOKED" || a.status === "CONFIRMED") && new Date(a.startsAt).getTime() >= now,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">
            {greeting()}, {name.split(/\s+/)[0] || "there"}
          </h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            Here is where your care stands today.
          </p>
        </div>
        <Link href="/notifications" className={buttonClassName("outline", "default")}>
          Inbox{unread ? ` (${unread} unread)` : ""}
        </Link>
      </div>

      {error && (
        <Banner kind="warn" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {liveToken && (
        <Banner kind={liveToken.position != null && liveToken.position <= 3 ? "success" : "info"}>
          <strong>Your queue token #{liveToken.tokenNumber} is live.</strong>{" "}
          {liveToken.status === "IN_CONSULTATION"
            ? "You are in consultation now."
            : liveToken.status === "CALLED"
              ? "You are being called in."
              : `Position ${liveToken.position ?? "-"} - about ${liveToken.etaMinutes ?? "?"} min to go.`}{" "}
          <Link href={`/visits-queue/${liveToken.id}`} className="font-[400] underline underline-offset-2">
            Track it live
          </Link>
        </Banner>
      )}

      {!appointments && !error && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-44 bg-surface-muted" />
          <Skeleton className="h-28 w-full bg-surface-muted" />
        </div>
      )}

      {appointments && (
        <Card className="rounded-lg border-border shadow-none">
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-5">
            <div className="space-y-1">
              <CardDescription>Next visit</CardDescription>
              {nextVisit ? (
                <>
                  <CardTitle>{doctorName(nextVisit.doctorId)}</CardTitle>
                  <p className="text-sm font-[350] text-muted-foreground">
                    {fmtDate(nextVisit.startsAt)} at {fmtTime(nextVisit.startsAt)}
                    {nextVisit.reason ? ` - ${nextVisit.reason}` : ""}
                  </p>
                </>
              ) : (
                <CardTitle>No upcoming visit booked yet.</CardTitle>
              )}
            </div>
            <Link href="/appointments" className={buttonClassName("default", "sm")}>
              {nextVisit ? "Manage" : "Book now"}
            </Link>
          </CardHeader>
        </Card>
      )}

      <section aria-label="Quick access" className="mt-8">
        <h2 className="mb-3 text-heading-2 font-[500] tracking-[-0.01em]">Quick access</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2">
              <Card className="rounded-lg border-border shadow-none transition-colors duration-160 ease-out group-hover:bg-surface-subtle">
                <CardContent className="p-5 pt-5 font-[350]">
                  <div className="mb-4 grid size-9 place-items-center rounded-md bg-surface-muted text-muted-foreground">
                    <t.icon className="size-4" aria-hidden />
                  </div>
                  <h3 className="text-base font-[500] leading-[1.35] tracking-[-0.01em]">{t.title}</h3>
                  <p className="mt-1.5 text-sm font-[350] leading-[1.55] text-muted-foreground">{t.body}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-1 text-center text-caption font-[350] text-subtle">
        Signed in on this device? Use the user menu (top right) to sign out.{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            router.refresh();
          }}
          className="font-[400] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Refresh data
        </a>
      </p>
    </>
  );
}
