"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  type ClinicalItem,
  type LabOrder,
  type PatientDocument,
  type PatientRecord,
} from "@/lib/api";
import { fmtDateShort, sizeBytes } from "@/lib/format";
import Banner from "@/components/Banner";
import Modal from "@/components/Modal";
import Sparkline from "@/components/Sparkline";

export default function RecordsPage() {
  const [patient, setPatient] = useState<PatientRecord | null | undefined>(undefined);
  const [allergies, setAllergies] = useState<ClinicalItem[]>([]);
  const [conditions, setConditions] = useState<ClinicalItem[]>([]);
  const [medications, setMedications] = useState<ClinicalItem[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // create-record form
  const [fullName, setFullName] = useState("");
  const [creating, setCreating] = useState(false);

  // upload
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<PatientDocument | null>(null);

  const loadAll = useCallback((p: PatientRecord) => {
    const id = p.id;
    api.clinical.allergies(id).then(setAllergies).catch(() => {});
    api.clinical.conditions(id).then(setConditions).catch(() => {});
    api.clinical.medications(id).then(setMedications).catch(() => {});
    api.clinical.labOrders(id).then(setLabs).catch(() => {});
    api.clinical.documents(id).then(setDocuments).catch(() => {});
  }, []);

  useEffect(() => {
    setError(null);
    api.clinical
      .me()
      .then((p) => {
        setPatient(p);
        if (p) loadAll(p);
      })
      .catch((e) => {
        setPatient(null);
        setError(e instanceof Error ? e.message : "Could not load records.");
      });
  }, [loadAll]);

  async function createRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setCreating(true);
    try {
      const p = await api.clinical.createSelf({ fullName: fullName.trim() });
      setPatient(p);
      loadAll(p);
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Could not create your record.");
    } finally {
      setCreating(false);
    }
  }

  // ---- labs grouped per parameter with numeric trend ----
  const labTrends = (() => {
    const released = labs.filter((l) => l.status === "RELEASED").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const byParam = new Map<
      string,
      { unit?: string; range?: string; flag?: string; history: { at: string; num: number | null; raw: string }[] }
    >();
    for (const order of released) {
      for (const r of order.results ?? []) {
        const entry = byParam.get(r.parameter) ?? {
          unit: r.unit,
          range: r.referenceRange,
          flag: undefined,
          history: [],
        };
        const num = parseFloat(String(r.value).replace(/[^\d.-]/g, ""));
        entry.history.push({ at: order.releasedAt ?? order.createdAt, num: Number.isNaN(num) ? null : num, raw: r.value });
        if (r.flag) entry.flag = r.flag;
        byParam.set(r.parameter, entry);
      }
    }
    return [...byParam.entries()];
  })();

  function itemLabel(i: ClinicalItem): string {
    return String(i.name ?? i.substance ?? i.code ?? i.drug ?? i.id ?? "item");
  }
  function itemMeta(i: ClinicalItem): string {
    const parts: string[] = [];
    if (i.severity) parts.push(`severity: ${String(i.severity)}`);
    if (i.dose) parts.push(`${i.dose}${i.frequency ? ` - ${i.frequency}` : ""}`);
    else if (i.frequency) parts.push(String(i.frequency));
    if (i.status) parts.push(String(i.status));
    if (i.notedAt) parts.push(`noted ${fmtDateShort(String(i.notedAt))}`);
    return parts.join(" - ");
  }

  async function onUpload(file: File) {
    if (!patient) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });
      await api.clinical.uploadDocument({
        patientId: patient.id,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        label: file.name.replace(/\.[^.]+$/, ""),
        dataBase64: dataUrl.split(",")[1] ?? "",
      });
      setDocuments(await api.clinical.documents(patient.id));
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openDoc(doc: PatientDocument, share: boolean) {
    try {
      const full = await api.clinical.document(doc.id);
      const url = full.downloadUrl || full.publicUrl;
      if (!url) throw new Error("No downloadable URL available for this document.");
      window.open(url, share ? "_blank" : "_self");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open document.");
    }
  }

  async function confirmDelete() {
    if (!deleteDoc || !patient) return;
    setBusy(true);
    try {
      await api.clinical.deleteDocument(deleteDoc.id);
      setDocuments(await api.clinical.documents(patient.id));
      setDeleteDoc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  if (patient === undefined) {
    return (
      <div className="stack">
        <div className="skeleton title" />
        <div className="skeleton block" />
        <div className="skeleton block" />
      </div>
    );
  }

  if (patient === null) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h1>Records</h1>
        <p className="muted small mt8 mb16">
          You do not have a patient record yet. Create one to keep allergies, labs and documents in
          one place.
        </p>
        {error && (
          <Banner kind="error" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        <form className="card" onSubmit={createRecord}>
          <div className="field">
            <label className="label" htmlFor="pname">
              Full name
            </label>
            <input id="pname" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your legal name" />
          </div>
          <button className="btn btn-primary btn-block" disabled={creating || !fullName.trim()}>
            {creating ? "Creating..." : "Create my record"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Records</h1>
          <p>
            {patient.fullName}
            {patient.bloodGroup ? ` - ${patient.bloodGroup}` : ""}
            {patient.dob ? ` - born ${fmtDateShort(patient.dob)}` : ""}
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <button className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading..." : "+ Upload document"}
          </button>
        </div>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="grid-3">
        <ClinicalCard title="Allergies" items={allergies} label={itemLabel} meta={itemMeta} />
        <ClinicalCard title="Conditions" items={conditions} label={itemLabel} meta={itemMeta} />
        <ClinicalCard title="Medications" items={medications} label={itemLabel} meta={itemMeta} />
      </div>

      <section className="section">
        <h2>Laboratory results</h2>
        <p className="muted tiny">
          Only formally released results are shown. Trends plot each parameter across releases.
        </p>
        {labTrends.length === 0 ? (
          <div className="card empty mt16">No released lab results yet.</div>
        ) : (
          <div className="grid-2 mt16">
            {labTrends.map(([param, data]) => {
              const latest = data.history[data.history.length - 1];
              return (
                <div key={param} className="card card-hover">
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="bold">{param}</div>
                      <div className="small muted">
                        Latest:{" "}
                        <strong>
                          {latest.raw}
                          {data.unit ? ` ${data.unit}` : ""}
                        </strong>
                        {data.range ? ` (ref ${data.range})` : ""}
                      </div>
                    </div>
                    {data.flag && (
                      <span className={`badge ${/high|abnormal|critical/i.test(data.flag) ? "badge-red" : "badge-green"}`}>
                        {data.flag}
                      </span>
                    )}
                  </div>
                  <div className="mt8">
                    <Sparkline values={data.history.map((h) => h.num ?? 0)} width={220} height={40} />
                  </div>
                  <div className="tiny faint mt8">
                    {data.history.length} release{data.history.length === 1 ? "" : "s"} - latest{" "}
                    {fmtDateShort(latest.at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Documents</h2>
        {documents.length === 0 ? (
          <div className="card empty mt16">
            No documents uploaded. Use &quot;Upload document&quot; to add reports or scans.
          </div>
        ) : (
          <div className="list-card mt16">
            {documents.map((d) => (
              <div key={d.id} className="list-row">
                <span aria-hidden style={{ fontSize: 18 }}>
                  Doc
                </span>
                <div className="grow truncate">
                  <div className="bold truncate">{d.label || d.fileName}</div>
                  <div className="tiny muted truncate">
                    {d.fileName} - {d.contentType} - {sizeBytes(d.sizeBytes)} - {fmtDateShort(d.createdAt)}
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => openDoc(d, false)}>
                  Open
                </button>
                <button className="btn btn-sm" onClick={() => openDoc(d, true)}>
                  Share
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteDoc(d)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Delete document?"
        footer={
          <>
            <button className="btn" onClick={() => setDeleteDoc(null)}>
              Keep it
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={confirmDelete}>
              {busy ? "Deleting..." : "Yes, delete"}
            </button>
          </>
        }
      >
        <p className="muted small">
          <strong>{deleteDoc?.label || deleteDoc?.fileName}</strong> will be removed permanently and the
          deletion is audited.
        </p>
      </Modal>
    </>
  );
}

function ClinicalCard({
  title,
  items,
  label,
  meta,
}: {
  title: string;
  items: ClinicalItem[];
  label: (i: ClinicalItem) => string;
  meta: (i: ClinicalItem) => string;
}) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {items.length === 0 ? (
        <p className="muted small">None on record.</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((i) => (
            <div key={i.id}>
              <div className="bold small">{label(i)}</div>
              {meta(i) && <div className="tiny muted">{meta(i)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
