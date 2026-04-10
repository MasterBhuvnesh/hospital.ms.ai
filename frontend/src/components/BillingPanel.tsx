'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import React, { useState, useEffect } from 'react';

export default function BillingPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/v1/billing/invoices', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Mock some invoices if DB is empty for demo purposes
          if (data.invoices.length === 0) {
            setInvoices([
              { id: 'inv1', description: 'General Consultation', amount: 150.00, status: 'UNPAID', issuedAt: new Date().toISOString() },
              { id: 'inv2', description: 'Blood Work Panel', amount: 85.50, status: 'PAID', issuedAt: new Date(Date.now() - 86400000 * 5).toISOString() }
            ]);
          } else {
            setInvoices(data.invoices);
          }
        }
      } catch (e) {}
    };
    fetchInvoices();
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full max-h-[400px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">Billing & Invoices</h2>
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No pending invoices.</p>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center transition-all hover:bg-white hover:border-slate-200 hover:shadow-sm">
               <div>
                  <p className="font-bold text-slate-800">{inv.description}</p>
                  <p className="text-xs text-slate-500">Issued: {new Date(inv.issuedAt).toLocaleDateString()}</p>
               </div>
               <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-bold text-rose-600">${inv.amount.toFixed(2)}</p>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {inv.status}
                  </span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
