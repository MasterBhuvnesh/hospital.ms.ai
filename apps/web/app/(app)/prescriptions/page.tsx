"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api, type PatientRecord, type Prescription } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, badgeSemantic } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="space-y-3">
        <Skeleton className="h-6 w-44 bg-surface-muted" />
        <Skeleton className="h-28 w-full bg-surface-muted" />
        <Skeleton className="h-40 w-full bg-surface-muted" />
      </div>
    );
  }

  const visible = items.filter((r) => r.status !== "DRAFT");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Prescriptions</h1>
        <p className="mt-1 text-sm font-[350] text-muted-foreground">
          Signed by your doctor, content-hashed and immutable.
        </p>
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
        <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
          <CardContent className="p-0 font-[350]">
            <p className="text-sm text-muted-foreground">
              No prescriptions yet. After a consultation, the signed prescription appears here.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 font-[350]">
        {visible.map((rx) => (
          <details key={rx.id} open={visible.length <= 3} className="group rounded-lg border border-border bg-card shadow-none">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 transition-colors duration-120 ease-out hover:bg-surface-subtle sm:px-5 [&::-webkit-details-marker]:hidden">
              <Badge variant="outline" className={badgeSemantic.success}>
                {rx.status}
              </Badge>
              <span className="min-w-0 grow truncate text-sm font-[450] text-foreground">
                Prescription {rx.id.slice(0, 8)}
                {rx.doctorSnapshot ? ` - Dr. ${rx.doctorSnapshot.name}` : ""}
              </span>
              <span className="whitespace-nowrap text-caption text-muted-foreground">
                {fmtDateTime(rx.signedAt)}
              </span>
              <ChevronDown
                aria-hidden
                className="size-4 flex-none text-subtle transition-transform duration-160 ease-out group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-border-subtle p-4 sm:p-5">
              {(rx.items ?? []).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drug</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Instructions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rx.items ?? []).map((it, i) => (
                      <TableRow key={`${rx.id}-${i}`}>
                        <TableCell className="font-[450]">{it.drug}</TableCell>
                        <TableCell>{it.dose}</TableCell>
                        <TableCell>{it.frequency}</TableCell>
                        <TableCell>{it.durationDays} d</TableCell>
                        <TableCell className="text-muted-foreground">{it.instructions || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {rx.notes && <p className="mt-4 text-sm text-muted-foreground">Notes: {rx.notes}</p>}
              {rx.contentHash && (
                <p className="mt-3 truncate font-mono text-caption text-subtle">
                  hash: {rx.contentHash.slice(0, 32)}...
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={() => openPdf(rx)}>
                  Open PDF
                </Button>
                {rx.fulfilledAt && <Badge variant="outline">Dispensed</Badge>}
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
