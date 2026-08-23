"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  type Appointment,
  type Doctor,
  type Hospital,
} from "@/lib/api";
import { fmtDate, fmtTime, money } from "@/lib/format";
import Banner from "@/components/Banner";
import Modal from "@/components/Modal";
import SlotPicker from "@/components/SlotPicker";

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

  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.fullName ?? `Doctor ${id.slice(0, 6)}`;

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
      <div className="page-head">
        <div>
          <h1>Appointments</h1>
          <p>Book ahead or manage what is coming up. Walk-ins mint tokens instantly.</p>
        </div>
        <button className="btn btn-primary" onClick={openBook}>
          + Book appointment
        </button>
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
        <div className="stack">
          <div className="skeleton title" />
          <div className="skeleton block" />
          <div className="skeleton block" />
        </div>
      )}

      {appointments && (
        <>
          <section>
            <h2>Upcoming</h2>
            {upcoming.length === 0 ? (
              <div className="card empty">
                <div className="empty-icon">Cal</div>
                Nothing booked yet. Use the button above to book your first visit.
              </div>
            ) : (
              <div className="list-card">
                {upcoming.map((a) => (
                  <div key={a.id} className="list-row">
                    <div className="grow">
                      <div className="bold">{doctorName(a.doctorId)}</div>
                      <div className="muted small">
                        {fmtDate(a.startsAt)} at {fmtTime(a.startsAt)}
                        {a.reason ? ` - ${a.reason}` : ""}
                        {a.feeSnapshot ? ` - ${money(a.feeSnapshot.amount, a.feeSnapshot.currency)}` : ""}
                      </div>
                    </div>
                    <span className={`badge badge-${a.tokenId ? "green" : "zinc"}`}>
                      {a.tokenId ? "Token issued" : a.status}
                    </span>
                    {a.tokenId && (
                      <Link href={`/visits-queue/${a.tokenId}`} className="btn btn-sm btn-primary">
                        Live queue
                      </Link>
                    )}
                    <button className="btn btn-sm" onClick={() => { setReschedAppt(a); setReschedSlot(null); }}>
                      Reschedule
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setCancelAppt(a)}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <h2>History</h2>
            {history.length === 0 ? (
              <div className="card empty">No past visits yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Queue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 30).map((a) => (
                      <tr key={a.id}>
                        <td className="nowrap">
                          {fmtDate(a.startsAt)}, {fmtTime(a.startsAt)}
                        </td>
                        <td>{doctorName(a.doctorId)}</td>
                        <td>
                          <StatusBadge status={a.status} />
                        </td>
                        <td>
                          {a.tokenId ? (
                            <Link href={`/visits-queue/${a.tokenId}`} className="small">
                              View token
                            </Link>
                          ) : (
                            <span className="faint small">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ---------- book dialog ---------- */}
      <Modal open={bookOpen} onClose={resetBook} title="Book an appointment" wide>
        <div className="steps">
          {[1, 2, 3].map((n, i) => (
            <span key={n} style={{ display: "contents" }}>
              {i > 0 && <span className="step-line" />}
              <span className={`step-pill${step >= n ? " on" : ""}`}>
                <span className="step-num">{step > n ? "+" : n}</span>
                {["Hospital", "Doctor", "Slot"][i]}
              </span>
            </span>
          ))}
        </div>

        {step === 1 && (
          <>
            {!hospitals ? (
              <div className="loading-pane">
                <div className="spinner" />
              </div>
            ) : (
              <div className="pick-list">
                {hospitals.map((h) => (
                  <button
                    key={h.id}
                    className={`pick-item${hospitalId === h.id ? " on" : ""}`}
                    onClick={() => {
                      setHospitalId(h.id);
                      setStep(2);
                    }}
                  >
                    <div className="grow">
                      <div className="bold">{h.name}</div>
                      <div className="muted small">{h.city}</div>
                    </div>
                    <span aria-hidden>&rsaquo;</span>
                  </button>
                ))}
                {hospitals.length === 0 && <p className="empty">No hospitals found.</p>}
              </div>
            )}
          </>
        )}

        {step === 2 && hospitalId && (
          <>
            <input
              className="input mb16"
              placeholder="Search by name or specialty..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
            />
            <div className="pick-list">
              {filteredDoctors.map((d) => (
                <button
                  key={d.id}
                  className={`pick-item${doctorId === d.id ? " on" : ""}`}
                  onClick={() => {
                    setDoctorId(d.id);
                    setSlotIso(null);
                    setStep(3);
                  }}
                >
                  <span className="avatar">{d.fullName[0]}</span>
                  <div className="grow">
                    <div className="bold">
                      Dr. {d.fullName.replace(/^Dr\.?\s*/i, "")}
                    </div>
                    <div className="muted tiny">
                      {d.specializations.join(", ")}
                      {d.experienceYears != null ? ` - ${d.experienceYears} yrs` : ""}
                    </div>
                  </div>
                  <span className="badge badge-blue nowrap">
                    {money(d.feeConfig.amount, d.feeConfig.currency)}
                  </span>
                </button>
              ))}
              {filteredDoctors.length === 0 && (
                <p className="empty">No doctors match here{selectedHospital ? `, ${selectedHospital.city}` : ""}. Try clearing search or another hospital.</p>
              )}
            </div>
            <div className="row mt16">
              <button className="btn" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          </>
        )}

        {step === 3 && doctorId && selectedDoctor && (
          <>
            <p className="mb8">
              <strong>Dr. {selectedDoctor.fullName}</strong>{" "}
              <span className="muted small">
                ({selectedDoctor.specializations.join(", ")}) -{" "}
                {money(selectedDoctor.feeConfig.amount, selectedDoctor.feeConfig.currency)} per visit
              </span>
            </p>
            <SlotPicker doctorId={doctorId} value={slotIso} onSelect={setSlotIso} />
            <div className="field mt16">
              <label className="label" htmlFor="reason">
                Reason for visit (optional)
              </label>
              <input
                id="reason"
                className="input"
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
            <div className="row mt8">
              <button className="btn" onClick={() => setStep(2)}>
                Back
              </button>
              <span className="grow" />
              <button className="btn btn-primary" disabled={!slotIso || booking} onClick={confirmBooking}>
                {booking ? "Booking..." : "Confirm booking"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ---------- reschedule dialog ---------- */}
      <Modal
        open={!!reschedAppt}
        onClose={() => setReschedAppt(null)}
        title={`Reschedule - ${reschedAppt ? doctorName(reschedAppt.doctorId) : ""}`}
      >
        {reschedAppt && (
          <>
            <SlotPicker doctorId={reschedAppt.doctorId} value={reschedSlot} onSelect={setReschedSlot} />
            {reschedSlot && (
              <Banner kind="info">
                New time: <strong>{fmtDate(reschedSlot)}</strong> at <strong>{fmtTime(reschedSlot)}</strong>.
              </Banner>
            )}
            <div className="row mt16">
              <span className="grow" />
              <button className="btn" onClick={() => setReschedAppt(null)}>
                Keep current
              </button>
              <button className="btn btn-primary" disabled={!reschedSlot || acting} onClick={confirmReschedule}>
                {acting ? "Saving..." : "Confirm reschedule"}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ---------- cancel dialog ---------- */}
      <Modal
        open={!!cancelAppt}
        onClose={() => setCancelAppt(null)}
        title="Cancel appointment?"
        footer={
          <>
            <button className="btn" onClick={() => setCancelAppt(null)}>
              Keep it
            </button>
            <button className="btn btn-danger" disabled={acting} onClick={confirmCancel}>
              {acting ? "Cancelling..." : "Yes, cancel"}
            </button>
          </>
        }
      >
        <p className="muted small">
          This releases your slot and queue token for{" "}
          <strong>
            {cancelAppt ? `${fmtDate(cancelAppt.startsAt)} at ${fmtTime(cancelAppt.startsAt)}` : ""}
          </strong>
          . The action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

function upcomingFilter(a: Appointment, nowMs: number) {
  return (
    (a.status === "BOOKED" || a.status === "CONFIRMED") &&
    new Date(a.startsAt).getTime() >= nowMs - 3600_000
  );
}

function StatusBadge({ status }: { status: Appointment["status"] }) {
  const map: Record<Appointment["status"], string> = {
    BOOKED: "badge-blue",
    CONFIRMED: "badge-green",
    CANCELLED: "badge-zinc",
    COMPLETED: "badge-violet",
    NO_SHOW: "badge-red",
  };
  return <span className={`badge ${map[status]}`}>{status.replace("_", " ")}</span>;
}
