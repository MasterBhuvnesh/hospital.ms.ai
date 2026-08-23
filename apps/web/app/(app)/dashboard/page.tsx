"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, tokenStore, type Appointment, type Doctor, type Token } from "@/lib/api";
import { greeting, fmtDate, fmtTime } from "@/lib/format";
import Banner from "@/components/Banner";

const TILES = [
  { href: "/appointments", icon: "Cal", title: "Appointments", body: "Book, reschedule or cancel visits" },
  { href: "/records", icon: "Rec", title: "Records", body: "Allergies, labs with trends & documents" },
  { href: "/prescriptions", icon: "Rx", title: "Prescriptions", body: "Signed prescriptions and PDFs" },
  { href: "/payments", icon: "Pay", title: "Payments", body: "Invoices, bills and history" },
  { href: "/notifications", icon: "Bell", title: "Notifications", body: "Everything that happened while away" },
  { href: "/copilot", icon: "AI", title: "AI copilot", body: "Ask about your care in plain words" },
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
      <div className="page-head">
        <div>
          <h1>
            {greeting()}, {name.split(/\s+/)[0] || "there"}
          </h1>
          <p>Here is where your care stands today.</p>
        </div>
        <Link href="/notifications" className="btn">
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
          <Link href={`/visits-queue/${liveToken.id}`}>Track it live</Link>
        </Banner>
      )}

      {!appointments && !error && (
        <div className="stack">
          <div className="skeleton title" />
          <div className="skeleton block" />
        </div>
      )}

      {appointments && (
        <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 26 }} aria-hidden>
            Cal
          </div>
          <div className="grow">
            <div className="stat-label">Next visit</div>
            {nextVisit ? (
              <>
                <div className="bold" style={{ fontSize: 16 }}>
                  {doctorName(nextVisit.doctorId)}
                </div>
                <div className="muted small">
                  {fmtDate(nextVisit.startsAt)} at {fmtTime(nextVisit.startsAt)}
                  {nextVisit.reason ? ` - ${nextVisit.reason}` : ""}
                </div>
              </>
            ) : (
              <div className="muted small mt8">No upcoming visit booked yet.</div>
            )}
          </div>
          <Link href="/appointments" className="btn btn-primary btn-sm">
            {nextVisit ? "Manage" : "Book now"}
          </Link>
        </div>
      )}

      <h2 className="section">Quick access</h2>
      <div className="grid-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card tile card-hover">
            <div className="tile-icon">{t.icon}</div>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
          </Link>
        ))}
      </div>

      <p className="center muted tiny section">
        Signed in on this device? Use the user menu (top right) to sign out.
        {" "}
        <a href="#" onClick={(e) => { e.preventDefault(); router.refresh(); }}>
          Refresh data
        </a>
      </p>
    </>
  );
}
