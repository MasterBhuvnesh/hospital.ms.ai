'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import React, { useState, useEffect } from 'react';

export default function PharmacyStore() {
  const [medicines, setMedicines] = useState<any[]>([]);

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/v1/pharmacy/medicines', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Provide some mock data if DB is empty to make it look active
          if (data.medicines.length === 0) {
            setMedicines([
              { id: '1', name: 'Amoxicillin 500mg', description: 'Broad-spectrum antibiotic', price: 15.99, stock: 100 },
              { id: '2', name: 'Ibuprofen 400mg', description: 'Pain relief and anti-inflammatory', price: 8.50, stock: 50 },
              { id: '3', name: 'Lisinopril 10mg', description: 'Blood pressure medication', price: 22.00, stock: 30 }
            ]);
          } else {
            setMedicines(data.medicines);
          }
        }
      } catch (e) {}
    };
    fetchMeds();
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full max-h-[400px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-slate-800">E-Pharmacy Catalog</h2>
      <div className="space-y-4">
        {medicines.length === 0 ? (
          <p className="text-sm text-slate-500">No medicines currently in stock.</p>
        ) : (
          medicines.map((med) => (
            <div key={med.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center transition-all hover:-translate-y-1 hover:shadow-md">
               <div>
                  <p className="font-bold text-indigo-900">{med.name}</p>
                  <p className="text-xs text-slate-500">{med.description}</p>
               </div>
               <div className="text-right">
                  <p className="font-semibold text-slate-800">${med.price.toFixed(2)}</p>
                  <button onClick={() => alert('Added to cart (Mock)!')} className="mt-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-200">Buy</button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
