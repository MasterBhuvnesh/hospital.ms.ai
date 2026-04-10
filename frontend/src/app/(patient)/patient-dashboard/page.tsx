/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
'use client';
import React, { useEffect, useState } from 'react';
import ReportUploader from '@/components/ReportUploader';
import ChatWidget from '@/components/ChatWidget';
import PharmacyStore from '@/components/PharmacyStore';
import BillingPanel from '@/components/BillingPanel';

export default function PatientDashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchReports = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/v1/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports);
        }
      } catch (e) {
        console.error("Failed to fetch reports");
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col md:flex-row">
      
      {/* SideNavBar */}
      <aside className="bg-slate-50 dark:bg-slate-950 h-screen w-64 fixed left-0 top-0 overflow-y-auto z-40 hidden md:block border-r border-slate-200/30">
        <div className="flex flex-col h-full p-4 space-y-2 pt-8">
          <div className="px-2 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 vitality-gradient rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
              </div>
              <div>
                <h2 className="text-lg font-black text-blue-900 dark:text-blue-100 leading-tight">Atelier Health</h2>
                <p className="text-xs text-on-surface-variant font-medium">Patient Portal</p>
              </div>
            </div>
          </div>
          <nav className="space-y-1">
            <a href="#" className="bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 rounded-lg shadow-sm font-bold flex items-center gap-3 px-4 py-3 transition-all duration-200">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm">Overview</span>
            </a>
            <a href="#reports" className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-4 py-3 rounded-lg hover:translate-x-1 transition-transform duration-200">
              <span className="material-symbols-outlined">folder_shared</span>
              <span className="text-sm">Medical Records</span>
            </a>
            <a href="#simplifier" className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-4 py-3 rounded-lg hover:translate-x-1 transition-transform duration-200">
              <span className="material-symbols-outlined">auto_awesome</span>
              <span className="text-sm">AI Simplifier</span>
            </a>
            <a href="#pharmacy" className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-4 py-3 rounded-lg hover:translate-x-1 transition-transform duration-200">
              <span className="material-symbols-outlined">local_pharmacy</span>
              <span className="text-sm">E-Pharmacy</span>
            </a>
            <a href="#billing" className="text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center gap-3 px-4 py-3 rounded-lg hover:translate-x-1 transition-transform duration-200">
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="text-sm">Billing</span>
            </a>
          </nav>
          <div className="pt-8 px-2">
            <button className="w-full vitality-gradient text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform">
              <span className="material-symbols-outlined">add</span>
              New Entry
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 flex-1 flex flex-col w-full min-h-screen">
        {/* TopNavBar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm shadow-blue-900/5 sticky top-0 z-30 flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-8">
            <span className="md:hidden text-xl font-bold tracking-tighter text-blue-800 dark:text-blue-300">Atelier</span>
            <div className="hidden md:flex items-center bg-surface-container-low px-3 py-2 rounded-full border border-outline-variant/10">
              <span className="material-symbols-outlined text-outline text-sm ml-1 mr-2">search</span>
              <input type="text" placeholder="Search records, medicines..." className="bg-transparent border-none focus:ring-0 text-sm w-64 outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">notifications</button>
            <div className="w-9 h-9 rounded-full vitality-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user ? user.email.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 flex-1 space-y-10">
          <header className="mb-8">
            <span className="text-sm font-bold uppercase tracking-widest text-primary mb-2 block">Patient Dashboard</span>
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">Welcome back{user ? `, ${user.email.split('@')[0]}` : ''}.</h1>
            <p className="text-on-surface-variant mt-2 max-w-md">Your health metrics and records are synchronized.</p>
          </header>

          <div className="bento-grid">
            
            {/* Medical Records (Large Bento Card) */}
            <div id="reports" className="col-span-12 lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5 text-on-surface">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Historical Records</h3>
                <span className="px-3 py-1 bg-surface-container text-xs font-semibold text-on-surface-variant rounded-full cursor-pointer hover:bg-surface-container-high transition-colors">View All</span>
              </div>
              
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <div className="p-6 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30 text-center text-on-surface-variant text-sm font-medium">
                    No historical reports available. Try uploading one with the AI Simplifier!
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 flex justify-between items-center transition-all hover:bg-white hover:shadow-md cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface">Medical Document</p>
                          <p className="text-xs text-on-surface-variant">{new Date(report.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button className="text-primary text-sm font-bold hover:underline" onClick={() => alert(report.simplifiedResult)}>View Report AI</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Simplifier (Bento Card) */}
            <div id="simplifier" className="col-span-12 lg:col-span-5 bg-surface-container-low p-6 rounded-2xl relative overflow-hidden group shadow-sm">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                <h3 className="text-lg font-bold text-on-surface">AI Report Simplifier</h3>
              </div>
              <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border border-white/50 relative z-10 shadow-sm">
                <ReportUploader />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider relative z-10">
                <span>Upload PDF or Image</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>

            {/* E-Pharmacy Section */}
            <div id="pharmacy" className="col-span-12 lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5">
              <div className="flex items-center gap-2 mb-6 text-secondary">
                <span className="material-symbols-outlined">vaccines</span>
                <h3 className="text-xl font-bold text-on-surface">E-Pharmacy</h3>
              </div>
              <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden text-on-surface">
                <PharmacyStore />
              </div>
            </div>

            {/* Billing Section */}
            <div id="billing" className="col-span-12 lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5">
              <div className="flex items-center gap-2 mb-6 text-slate-600">
                <span className="material-symbols-outlined">receipt_long</span>
                <h3 className="text-xl font-bold text-on-surface">Invoices &amp; Billing</h3>
              </div>
              <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden text-on-surface">
                <BillingPanel />
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Chatbot Component */}
      <ChatWidget />
      
    </div>
  );
}
