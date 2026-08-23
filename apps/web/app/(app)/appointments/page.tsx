"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, type Appointment, type Doctor, type Hospital } from "@/lib/api";
import { fmtDate, fmtTime, money } from "@/lib/format";
import Banner from "@/components/Banner";
import Modal from "@/components/Modal";
import SlotPicker from "@/components/SlotPicker";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelTitle, MoreButton } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BookStep = 1 | 2 | 3;

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // book dialog
  const [bookOpen, setBookOpen] = useState(false);
  const [step, setStep] = useState<BookStep>(1);
  const [hospitals, setHospitals] = useState<Hospital[] | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [docSearch, setDocSearch] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);

  // reschedule / cancel
  const [reschedAppt, setReschedAppt] = useState<Appointment | null>(null);
  const [reschedSlot, setReschedSlot] = useState<string | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.scheduling.appointments(), api.directory.doctors()])
      .then(([appts, docs]) => {
        setAppointments(appts);
        setDoctors(docs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load appointments."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doctorName = (id: string) =>
    doctors.find((d) => d.id === id)?.fullName ?? `Doctor ${id.slice(0, 6)}`;

  const now = Date.now();
  const { upcoming, history } = useMemo(() => {
    const all = [...(appointments ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      upcoming: all.filter(
        (a) =>
          (a.status === "BOOKED" || a.status === "CONFIRMED") &&
          new Date(a.startsAt).getTime() >= now - 3600_000,
      ),
      history: all
        .filter((a) => !upcomingFilter(a, now))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    };
  }, [appointments]);

  function openBook() {
    setBookOpen(true);
    setStep(1);
    setHospitalId(null);
    setDoctorId(null);
    setSlotIso(null);
    setReason("");
    setDocSearch("");
    if (hospitals === null) {
      api
        .directory.hospitals()
        .then(setHospitals)
        .catch(() => setHospitals([]));
    }
  }

  function resetBook() {
    setBookOpen(false);
    setStep(1);
    setDoctorId(null);
    setSlotIso(null);
  }

  async function confirmBooking() {
    if (!doctorId || !slotIso) return;
    setBooking(true);
    setError(null);
    try {
      const appt = await api.scheduling.bookAppointment({
        doctorId,
        startsAt: slotIso,
        reason: reason.trim() || undefined,
      });
      let tokenId = appt.tokenId;
      if (!tokenId) {
        try {
          tokenId = (await api.scheduling.mintToken(appt.id)).id;
        } catch {
          /* token can be minted later */
        }
      }
      resetBook();
      load();
      if (tokenId) router.push(`/visits-queue/${tokenId}`);
      else setNotice(`Appointment booked for ${fmtDate(slotIso)} at ${fmtTime(slotIso)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed.");
    } finally {
      setBooking(false);
    }
  }

  async function confirmReschedule() {
    if (!reschedAppt || !reschedSlot) return;
    setActing(true);
    try {
      await api.scheduling.reschedule(reschedAppt.id, reschedSlot);
      setReschedAppt(null);
      setNotice("Appointment rescheduled.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reschedule failed.");
    } finally {
      setActing(false);
    }
  }

  async function confirmCancel() {
    if (!cancelAppt) return;
    setActing(true);
    try {
      await api.scheduling.cancel(cancelAppt.id);
      setCancelAppt(null);
      setNotice("Appointment cancelled.");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed.");
    } finally {
      setActing(false);
    }
  }

  const selectedHospital = hospitals?.find((h) => h.id === hospitalId) ?? null;
  const filteredDoctors = doctors.filter(
    (d) =>
      (!hospitalId || d.hospitalIds.includes(hospitalId)) &&
      (docSearch.trim() === "" ||
        d.fullName.toLowerCase().includes(docSearch.toLowerCase()) ||
        d.specializations.join(" ").toLowerCase().includes(docSearch.toLowerCase())),
  );
  const selectedDoctor = doctors.find((d) => d.id === doctorId) ?? null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            Book ahead or manage what is coming up. Walk-ins mint tokens instantly.
          </p>
        </div>
        <Button variant="cta" size="lg" onClick={openBook}>
          <Plus data-icon="inline-start" aria-hidden />
          Book appointment
        </Button>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {!appointments && !error && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-44 bg-surface-muted" />
          <Skeleton className="h-24 w-full bg-surface-muted" />
          <Skeleton className="h-40 w-full bg-surface-muted" />
        </div>
      )}

      {appointments && (
        <>
          <section>
            <h2 className="mb-3 text-heading-2 font-[500] tracking-[-0.01em]">Upcoming</h2>
            {upcoming.length === 0 ? (
              <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
                <CardContent className="p-0 font-[350]">
                  <p className="text-sm text-muted-foreground">
                    Nothing booked yet. Use the button above to book your first visit.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <Card key={a.id} className="rounded-lg border-border shadow-none">
                    <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5">
                      <div className="min-w-48 grow basis-56 font-[350]">
                        <div className="font-[450] text-foreground">{doctorName(a.doctorId)}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {fmtDate(a.startsAt)} at {fmtTime(a.startsAt)}
                          {a.reason ? ` - ${a.reason}` : ""}
                          {a.feeSnapshot
                            ? ` - ${money(a.feeSnapshot.amount, a.feeSnapshot.currency)}`
                            : ""}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          a.tokenId &&
                            "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
                        )}
                      >
                        {a.tokenId ? "Token issued" : a.status}
                      </Badge>
                      {a.tokenId && (
                        <Link href={`/visits-queue/${a.tokenId}`} className={buttonClassName("default", "sm")}>
                          Live queue
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReschedAppt(a);
                          setReschedSlot(null);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-danger-border bg-background text-danger hover:bg-danger-background"
                        onClick={() => setCancelAppt(a)}
                      >
                        Cancel
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-heading-2 font-[500] tracking-[-0.01em]">History</h2>
            {history.length === 0 ? (
              <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
                <CardContent className="p-0 font-[350]">
                  <p className="text-sm text-muted-foreground">No past visits yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="gap-0 bg-muted/50 p-1 ring-0 shadow-sm">
                <div className="flex items-center justify-between px-3 py-2">
                  <PanelTitle title="All appointments" />
                  <MoreButton />
                </div>
                <div className="overflow-hidden rounded-xl bg-card py-2">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>When</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Queue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.slice(0, 30).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap font-mono">
                            {fmtDate(a.startsAt)}, {fmtTime(a.startsAt)}
                          </TableCell>
                          <TableCell className="font-medium">{doctorName(a.doctorId)}</TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          <TableCell>
                            {a.tokenId ? (
                              <Link href={`/visits-queue/${a.tokenId}`} className="underline-offset-2 hover:underline">
                                View token
                              </Link>
                            ) : (
                              <span className="text-subtle">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </section>
        </>
      )}

      {/* ---------- book dialog ---------- */}
      <Modal open={bookOpen} onClose={resetBook} title="Book an appointment" wide>
        <StepsIndicator step={step} />

        {step === 1 && (
          <>
            {!hospitals ? (
              <div className="py-2">
                <Skeleton className="h-12 w-full bg-surface-muted" />
              </div>
            ) : (
              <PickList>
                {hospitals.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    aria-pressed={hospitalId === h.id}
                    className={pickItemClass(hospitalId === h.id)}
                    onClick={() => {
                      setHospitalId(h.id);
                      setStep(2);
                    }}
                  >
                    <span className="min-w-0 grow">
                      <span className="block font-[450]">{h.name}</span>
                      <span className="block text-sm text-muted-foreground">{h.city}</span>
                    </span>
                    <span aria-hidden className="text-muted-foreground">
                      &rsaquo;
                    </span>
                  </button>
                ))}
                {hospitals.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No hospitals found.</p>
                )}
              </PickList>
            )}
          </>
        )}

        {step === 2 && hospitalId && (
          <>
            <Input
              placeholder="Search by name or specialty..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
            />
            <div className="mt-3">
              <PickList>
                {filteredDoctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={doctorId === d.id}
                    className={pickItemClass(doctorId === d.id)}
                    onClick={() => {
                      setDoctorId(d.id);
                      setSlotIso(null);
                      setStep(3);
                    }}
                  >
                    <span
                      aria-hidden
                      className="grid size-8 flex-none place-items-center rounded-full border border-border bg-surface-muted text-xs font-[500]"
                    >
                      {d.fullName[0]}
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block font-[450]">Dr. {d.fullName.replace(/^Dr\.?\s*/i, "")}</span>
                      <span className="block text-caption text-muted-foreground">
                        {d.specializations.join(", ")}
                        {d.experienceYears != null ? ` - ${d.experienceYears} yrs` : ""}
                      </span>
                    </span>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {money(d.feeConfig.amount, d.feeConfig.currency)}
                    </Badge>
                  </button>
                ))}
                {filteredDoctors.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No doctors match here{selectedHospital ? `, ${selectedHospital.city}` : ""}. Try clearing
                    search or another hospital.
                  </p>
                )}
              </PickList>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </>
        )}

        {step === 3 && doctorId && selectedDoctor && (
          <div className="space-y-4">
            <p className="text-sm font-[350]">
              <strong className="text-foreground">Dr. {selectedDoctor.fullName}</strong>{" "}
              <span className="text-muted-foreground">
                ({selectedDoctor.specializations.join(", ")}) -{" "}
                {money(selectedDoctor.feeConfig.amount, selectedDoctor.feeConfig.currency)} per visit
              </span>
            </p>
            <SlotPicker doctorId={doctorId} value={slotIso} onSelect={setSlotIso} />
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for visit (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. follow-up, fever, checkup"
              />
            </div>
            {slotIso && (
              <Banner kind="info">
                Selected: <strong>{fmtDate(slotIso)}</strong> at <strong>{fmtTime(slotIso)}</strong>. Confirm to
                get your live queue token.
              </Banner>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button disabled={!slotIso || booking} onClick={confirmBooking}>
                {booking ? "Booking..." : "Confirm booking"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- reschedule dialog ---------- */}
      <Modal
        open={!!reschedAppt}
        onClose={() => setReschedAppt(null)}
        title={`Reschedule - ${reschedAppt ? doctorName(reschedAppt.doctorId) : ""}`}
      >
        {reschedAppt && (
          <div className="space-y-4">
            <SlotPicker doctorId={reschedAppt.doctorId} value={reschedSlot} onSelect={setReschedSlot} />
            {reschedSlot && (
              <Banner kind="info">
                New time: <strong>{fmtDate(reschedSlot)}</strong> at <strong>{fmtTime(reschedSlot)}</strong>.
              </Banner>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReschedAppt(null)}>
                Keep current
              </Button>
              <Button disabled={!reschedSlot || acting} onClick={confirmReschedule}>
                {acting ? "Saving..." : "Confirm reschedule"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- cancel dialog ---------- */}
      <Modal
        open={!!cancelAppt}
        onClose={() => setCancelAppt(null)}
        title="Cancel appointment?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelAppt(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={acting} onClick={confirmCancel}>
              {acting ? "Cancelling..." : "Yes, cancel"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This releases your slot and queue token for{" "}
          <strong className="text-foreground">
            {cancelAppt ? `${fmtDate(cancelAppt.startsAt)} at ${fmtTime(cancelAppt.startsAt)}` : ""}
          </strong>
          . The action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function StepsIndicator({ step }: { step: BookStep }) {
  return (
    <div className="mb-5 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && <span aria-hidden className="h-px flex-1 bg-border" />}
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className={cn(
                "grid size-6 place-items-center rounded-full text-caption font-[500]",
                step >= n
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted-foreground",
              )}
            >
              {step > n ? "+" : n}
            </span>
            <span className={step >= n ? "font-[450] text-foreground" : "font-[350] text-subtle"}>
              {["Hospital", "Doctor", "Slot"][i]}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

function PickList({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 font-[350]">{children}</div>
  );
}

function pickItemClass(selected: boolean) {
  return cn(
    "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2",
    selected
      ? "border-foreground bg-surface-subtle"
      : "border-border bg-background hover:bg-surface-muted",
  );
}

function upcomingFilter(a: Appointment, nowMs: number) {
  return (
    (a.status === "BOOKED" || a.status === "CONFIRMED") &&
    new Date(a.startsAt).getTime() >= nowMs - 3600_000
  );
}
