"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api, type Invoice, type Payment } from "@/lib/api";
import { fmtDateTime, money } from "@/lib/format";
import Banner from "@/components/Banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([api.commerce.invoices(), api.commerce.myPayments().catch(() => [])])
      .then(([inv, pays]) => {
        setInvoices(inv);
        setPayments(pays);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load billing data."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(invoice: Invoice) {
    setPaying(invoice.id);
    setError(null);
    try {
      const intent = await api.commerce.paymentIntent(invoice.id);
      await api.commerce.capturePayment(intent.id);
      setNotice(`Payment of ${money(invoice.total, invoice.currency)} captured for ${invoice.invoiceNo}.`);
      load();
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}${!e.message.includes("wak") ? " (demo gateway - retry if the server was waking up)" : ""}`
          : "Payment failed.",
      );
    } finally {
      setPaying(null);
    }
  }

  async function openInvoicePdf(inv: Invoice) {
    try {
      const full = await api.commerce.invoice(inv.id);
      const url = full.downloadUrl;
      if (!url) throw new Error("Invoice PDF is not available yet.");
      window.open(url, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open invoice PDF.");
    }
  }

  if (!invoices) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-44 bg-surface-muted" />
        <Skeleton className="h-28 w-full bg-surface-muted" />
        <Skeleton className="h-40 w-full bg-surface-muted" />
      </div>
    );
  }

  const unpaidCount = invoices.filter((i) => i.status === "UNPAID").length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-heading-1 font-[500] tracking-[-0.02em]">Payments</h1>
        <p className="mt-1 text-sm font-[350] text-muted-foreground">
          {unpaidCount > 0
            ? `${unpaidCount} unpaid invoice${unpaidCount === 1 ? "" : "s"} - the demo gateway captures instantly.`
            : "All settled. Nothing outstanding."}
        </p>
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

      {invoices.length === 0 ? (
        <Card className="rounded-lg border-border px-6 py-10 text-center shadow-none">
          <CardContent className="p-0 font-[350]">
            <p className="text-sm text-muted-foreground">
              No invoices yet. Invoices are generated automatically after each visit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 font-[350]">
          {invoices.map((inv) => (
            <details key={inv.id} open={inv.status === "UNPAID"} className="group rounded-lg border border-border bg-card shadow-none">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 transition-colors duration-120 ease-out hover:bg-surface-subtle sm:px-5 [&::-webkit-details-marker]:hidden">
                <Badge variant="outline" className={inv.status === "UNPAID" ? badgeSemantic.warning : inv.status === "PAID" ? badgeSemantic.success : ""}>
                  {inv.status}
                </Badge>
                <span className="text-sm font-[450] text-foreground">{inv.invoiceNo}</span>
                <span className="min-w-0 grow truncate text-sm text-muted-foreground">{fmtDateTime(inv.createdAt)}</span>
                <span className="whitespace-nowrap font-[450] text-foreground">{money(inv.total, inv.currency)}</span>
                <ChevronDown
                  aria-hidden
                  className="size-4 flex-none text-subtle transition-transform duration-160 ease-out group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-border-subtle p-4 sm:p-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inv.lineItems ?? []).map((li, i) => (
                      <TableRow key={`${inv.id}-li-${i}`}>
                        <TableCell>{li.description}</TableCell>
                        <TableCell className="text-right font-mono text-body-small">{money(li.amount, li.currency)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="[&>*]:font-[450] [&>*]:text-foreground hover:bg-transparent">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">{money(inv.total, inv.currency)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {inv.status === "UNPAID" && (
                    <Button size="sm" disabled={paying === inv.id} onClick={() => pay(inv)}>
                      {paying === inv.id ? "Processing..." : `Pay ${money(inv.total, inv.currency)}`}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openInvoicePdf(inv)}>
                    Invoice PDF
                  </Button>
                  {inv.paidAt && <span className="text-caption text-muted-foreground">Paid {fmtDateTime(inv.paidAt)}</span>}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {payments.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-heading-2 font-[500] tracking-[-0.01em]">Payment history</h2>
          <Table className={cn("font-[350]")}>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{fmtDateTime(p.capturedAt)}</TableCell>
                  <TableCell className="font-mono text-body-small">{money(p.amount, p.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.status === "CAPTURED" ? badgeSemantic.success : p.status === "PENDING" ? badgeSemantic.warning : ""}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-caption">
                    {p.orderId.slice(0, 14)}...
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </>
  );
}
