"use client";

import { useEffect, useState } from "react";
import { api, type PatientRecord, type Prescription } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";

export default function PrescriptionsPage() {
  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined);
  const [items, setItems] = useState<Prescription[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.clinical
      .me()
      .then(async (p) => {
        setPatient(p);
        if (!p) {
          setItems([]);
          return;
        }
        try {
          setItems(await api.clinical.prescriptions(p.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not load prescriptions.");
          setItems([]);
        }
      })
      .catch((e) => {
        setPatient(null);
        setItems([]);
        setError(e instanceof Error ? e.message : "Could not load prescriptions.");
      });
  }, []);

  async function openPdf(rx: Prescription) {
    try {
      const full = await api.clinical.prescription(rx.id);
      const url = full.downloadUrl || full.pdfUrl;
      if (!url) throw new Error("The signed PDF is not available yet - try again later.");
      window.open(url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open PDF.");
    }
  }

  if (patient === undefined || items === null) {
    return (
      <div className="stack">
        <div className="skeleton title" />
        <div className="skeleton block" />
        <div className="skeleton block" />
      </div>
    );
  }

  const visible = items.filter((r) => r.status !== "DRAFT");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Prescriptions</h1>
          <p>Signed by your doctor, content-hashed and immutable.</p>
        </div>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      {patient === null && (
        <Banner kind="info">Create your patient record first (see Records) to view prescriptions.</Banner>
      )}

      {visible.length === 0 && patient && (
        <div className="card empty">
          <div className="empty-icon">Rx</div>
          No prescriptions yet. After a consultation, the signed prescription appears here.
        </div>
      )}

      <div className="stack">
        {visible.map((rx) => (
          <details key={rx.id} className="acc" open={visible.length <= 3}>
            <summary>
              <span className="badge badge-green">{rx.status}</span>
              <span className="bold small grow">
                Prescription {rx.id.slice(0, 8)}
                {rx.doctorSnapshot ? ` - Dr. ${rx.doctorSnapshot.name}` : ""}
              </span>
              <span className="tiny muted nowrap">{fmtDateTime(rx.signedAt)}</span>
              <span className="acc-caret" aria-hidden>
                v
              </span>
            </summary>
            <div className="acc-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Dose</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {(rx.items ?? []).map((it, i) => (
                    <tr key={`${rx.id}-${i}`}>
                      <td className="bold">{it.drug}</td>
                      <td>{it.dose}</td>
                      <td>{it.frequency}</td>
                      <td>{it.durationDays} d</td>
                      <td className="muted">{it.instructions || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rx.notes && <p className="small muted mt16">Notes: {rx.notes}</p>}
              {rx.contentHash && (
                <p className="tiny faint mt8 truncate mono">hash: {rx.contentHash.slice(0, 32)}...</p>
              )}

              <div className="row mt16">
                <button className="btn btn-primary btn-sm" onClick={() => openPdf(rx)}>
                  Open PDF
                </button>
                {rx.fulfilledAt && <span className="badge badge-violet">Dispensed</span>}
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
