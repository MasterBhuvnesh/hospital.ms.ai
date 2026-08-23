"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Invoice, type Payment } from "@/lib/api";
import { fmtDateTime, money } from "@/lib/format";
import Banner from "@/components/Banner";

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
      <div className="stack">
        <div className="skeleton title" />
        <div className="skeleton block" />
        <div className="skeleton block" />
      </div>
    );
  }

  const unpaidCount = invoices.filter((i) => i.status === "UNPAID").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>
            {unpaidCount > 0
              ? `${unpaidCount} unpaid invoice${unpaidCount === 1 ? "" : "s"} - the demo gateway captures instantly.`
              : "All settled. Nothing outstanding."}
          </p>
        </div>
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
        <div className="card empty">
          <div className="empty-icon">Pay</div>
          No invoices yet. Invoices are generated automatically after each visit.
        </div>
      ) : (
        <div>
          {invoices.map((inv) => (
            <details key={inv.id} className="acc" open={inv.status === "UNPAID"}>
              <summary>
                <span className={`badge ${inv.status === "UNPAID" ? "badge-amber" : inv.status === "PAID" ? "badge-green" : "badge-zinc"}`}>
                  {inv.status}
                </span>
                <span className="bold small">{inv.invoiceNo}</span>
                <span className="muted small grow">{fmtDateTime(inv.createdAt)}</span>
                <span className="bold nowrap">{money(inv.total, inv.currency)}</span>
                <span className="acc-caret" aria-hidden>
                  v
                </span>
              </summary>
              <div className="acc-body">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.lineItems ?? []).map((li, i) => (
                      <tr key={`${inv.id}-li-${i}`}>
                        <td>{li.description}</td>
                        <td className="right mono">{money(li.amount, li.currency)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="bold">Total</td>
                      <td className="right bold mono">{money(inv.total, inv.currency)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="row mt16">
                  {inv.status === "UNPAID" && (
                    <button className="btn btn-primary btn-sm" disabled={paying === inv.id} onClick={() => pay(inv)}>
                      {paying === inv.id ? "Processing..." : `Pay ${money(inv.total, inv.currency)}`}
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => openInvoicePdf(inv)}>
                    Invoice PDF
                  </button>
                  {inv.paidAt && <span className="tiny muted">Paid {fmtDateTime(inv.paidAt)}</span>}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {payments.length > 0 && (
        <section className="section">
          <h2>Payment history</h2>
          <div className="table-wrap mt16">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDateTime(p.capturedAt)}</td>
                    <td className="mono">{money(p.amount, p.currency)}</td>
                    <td>
                      <span className={`badge ${p.status === "CAPTURED" ? "badge-green" : p.status === "PENDING" ? "badge-amber" : "badge-zinc"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="mono tiny truncate" style={{ maxWidth: 160 }}>
                      {p.orderId.slice(0, 14)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
