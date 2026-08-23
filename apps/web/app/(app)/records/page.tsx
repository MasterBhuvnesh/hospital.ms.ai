"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Share2, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, badgeSemantic } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="space-y-3">
        <Skeleton className="h-6 w-44 bg-surface-muted" />
        <Skeleton className="h-28 w-full bg-surface-muted" />
        <Skeleton className="h-40 w-full bg-surface-muted" />
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="max-w-md">
        <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Records</h1>
        <p className="mb-6 mt-1 text-sm font-[350] text-muted-foreground">
          You do not have a patient record yet. Create one to keep allergies, labs and documents in
          one place.
        </p>
        {error && (
          <Banner kind="error" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        <Card className="rounded-lg border-border shadow-none">
          <CardContent className="p-5 pt-5 font-[350]">
            <form onSubmit={createRecord} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pname">Full name</Label>
                <Input id="pname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your legal name" />
              </div>
              <Button type="submit" className="w-full" disabled={creating || !fullName.trim()}>
                {creating ? "Creating..." : "Create my record"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Records</h1>
          <p className="mt-1 text-sm font-[350] text-muted-foreground">
            {patient.fullName}
            {patient.bloodGroup ? ` - ${patient.bloodGroup}` : ""}
            {patient.dob ? ` - born ${fmtDateShort(patient.dob)}` : ""}
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading..." : "Upload document"}
          </Button>
        </div>
      </div>

      {error && (
        <Banner kind="error" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ClinicalCard title="Allergies" items={allergies} label={itemLabel} meta={itemMeta} />
        <ClinicalCard title="Conditions" items={conditions} label={itemLabel} meta={itemMeta} />
        <ClinicalCard title="Medications" items={medications} label={itemLabel} meta={itemMeta} />
      </div>

      <section className="mt-8">
        <h2 className="text-heading-2 font-[500] tracking-[-0.01em]">Laboratory results</h2>
        <p className="mt-1 text-caption font-[350] text-muted-foreground">
          Only formally released results are shown. Trends plot each parameter across releases.
        </p>
        {labTrends.length === 0 ? (
          <Card className="mt-4 rounded-lg border-border px-6 py-10 text-center shadow-none">
            <CardContent className="p-0 font-[350]">
              <p className="text-sm text-muted-foreground">No released lab results yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {labTrends.map(([param, data]) => {
              const latest = data.history[data.history.length - 1];
              return (
                <Card key={param} className="rounded-lg border-border shadow-none">
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-5 pb-3">
                    <div className="space-y-1">
                      <CardTitle>{param}</CardTitle>
                      <CardDescription>
                        Latest:{" "}
                        <span className="font-[400] text-foreground">
                          {latest.raw}
                          {data.unit ? ` ${data.unit}` : ""}
                        </span>
                        {data.range ? ` (ref ${data.range})` : ""}
                      </CardDescription>
                    </div>
                    {data.flag && (
                      <Badge variant="outline" className={/high|abnormal|critical/i.test(data.flag) ? badgeSemantic.error : badgeSemantic.success}>
                        {data.flag}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Sparkline values={data.history.map((h) => h.num ?? 0)} width={220} height={40} />
                    <p className="mt-3 text-caption font-[350] text-subtle">
                      {data.history.length} release{data.history.length === 1 ? "" : "s"} - latest{" "}
                      {fmtDateShort(latest.at)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-heading-2 font-[500] tracking-[-0.01em]">Documents</h2>
        {documents.length === 0 ? (
          <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
            <CardContent className="p-0 font-[350]">
              <p className="text-sm text-muted-foreground">
                No documents uploaded. Use &quot;Upload document&quot; to add reports or scans.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-0 rounded-lg border-border shadow-none">
            <ul className="divide-y divide-border-subtle font-[350]">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                  <span
                    aria-hidden
                    className="grid size-9 flex-none place-items-center rounded-md border border-border bg-background text-muted-foreground"
                  >
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 grow basis-48">
                    <span className="block truncate font-[450]">{d.label || d.fileName}</span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {d.fileName} - {d.contentType} - {sizeBytes(d.sizeBytes)} - {fmtDateShort(d.createdAt)}
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => openDoc(d, false)}>
                      Open
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openDoc(d, true)} aria-label={`Share ${d.label || d.fileName}`}>
                      <Share2 />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-danger hover:text-danger"
                      onClick={() => setDeleteDoc(d)}
                      aria-label={`Delete ${d.label || d.fileName}`}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <Modal
        open={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        title="Delete document?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteDoc(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
              {busy ? "Deleting..." : "Yes, delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{deleteDoc?.label || deleteDoc?.fileName}</strong> will be removed
          permanently and the deletion is audited.
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
    <Card className="rounded-lg border-border shadow-none">
      <CardHeader className="p-5 pb-3">
        <CardDescription className="text-label font-[450] uppercase tracking-[0.05em]">{title}</CardDescription>
      </CardHeader>
      <CardContent className="font-[350]">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None on record.</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((i) => (
              <li key={i.id}>
                <div className="text-sm font-[450]">{label(i)}</div>
                {meta(i) && <div className="text-caption text-muted-foreground">{meta(i)}</div>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
