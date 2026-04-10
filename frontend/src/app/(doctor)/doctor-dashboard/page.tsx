/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState } from 'react';
import RadiologyUploader from '@/components/RadiologyUploader';

export default function DoctorDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="bg-background font-body text-on-surface antialiased flex min-h-screen">
      
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-slate-50 flex flex-col p-4 space-y-2 z-40 border-r border-outline-variant/10">
        <div className="flex items-center space-x-3 px-2 py-4 mb-6">
          <div className="w-10 h-10 rounded-lg vitality-gradient flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>clinical_notes</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-blue-900 leading-none">Atelier Health</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Clinical Portal</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          <a href="#" className="flex items-center px-4 py-3 bg-white text-blue-700 rounded-lg shadow-sm font-bold ease-in-out transition-all duration-200">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            <span className="text-sm font-medium">Overview</span>
          </a>
          <a href="#appointments" className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-200/50 rounded-lg ease-in-out transition-all hover:translate-x-1 duration-200">
            <span className="material-symbols-outlined mr-3">calendar_month</span>
            <span className="text-sm font-medium">Appointments</span>
          </a>
          <a href="#radiology" className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-200/50 rounded-lg ease-in-out transition-all hover:translate-x-1 duration-200">
            <span className="material-symbols-outlined mr-3">view_in_ar</span>
            <span className="text-sm font-medium">Radiology Analysis</span>
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-slate-600 hover:bg-slate-200/50 rounded-lg ease-in-out transition-all hover:translate-x-1 duration-200">
            <span className="material-symbols-outlined mr-3">folder_shared</span>
            <span className="text-sm font-medium">Patient Records</span>
          </a>
        </nav>
        
        <button className="vitality-gradient text-white rounded-lg py-3 px-4 flex items-center justify-center font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all mt-4">
          <span className="material-symbols-outlined mr-2">add</span>
          New Appointment
        </button>
      </aside>

      {/* Main Container */}
      <main className="ml-64 w-full min-h-screen flex flex-col">
        {/* TopNavBar */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 flex justify-between items-center w-full px-8 py-4 shadow-sm shadow-blue-900/5 border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
             <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input type="text" placeholder="Search patients, results..." className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm w-80 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 border-l border-slate-200 pl-6">
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-white"></span>
              </button>
              
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                    {user ? `Dr. ${user.email.split('@')[0]}` : 'Doctor'}
                  </p>
                  <p className="text-[10px] text-slate-500">Chief Resident</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shadow-sm">
                  {user ? user.email.charAt(0).toUpperCase() : 'D'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-[1600px] mx-auto w-full">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-headline font-bold text-slate-900 tracking-tight">Clinical Overview</h2>
              <p className="text-on-surface-variant mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} — Pending reviews.</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Appointments */}
              <section id="appointments" className="bg-surface-container-lowest rounded-xl p-6 shadow-sm shadow-blue-900/5 border border-outline-variant/10 text-on-surface">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Today&apos;s Appointment Queue</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { time: '09:00', name: 'Marcus Sterling', type: 'Post-operative Follow-up', status: 'Confirmed', style: 'bg-secondary-container text-on-secondary-container' },
                    { time: '10:30', name: 'Elena Rodriguez', type: 'General Consultation', status: 'In Progress', style: 'bg-primary-fixed text-on-primary-fixed' },
                  ].map((appt, i) => (
                    <div key={i} className="flex items-center p-4 bg-surface-container-low rounded-lg group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-outline-variant/20">
                      <div className={`w-12 h-12 rounded-lg ${i === 1 ? 'vitality-gradient text-white' : 'bg-primary/10 text-primary'} flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {appt.time}
                      </div>
                      <div className="ml-6 flex-1">
                        <h4 className="font-bold">{appt.name}</h4>
                        <p className="text-xs text-on-surface-variant">{appt.type}</p>
                      </div>
                      <div className="flex gap-4 items-center">
                        <span className={`px-3 py-1 ${appt.style} text-[10px] font-bold rounded-full uppercase tracking-wider`}>{appt.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Radiology Panel */}
              <section id="radiology" className="bg-surface-container-lowest rounded-xl p-6 shadow-sm shadow-blue-900/5 border border-outline-variant/10">
                 <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary text-2xl">view_in_ar</span>
                  <h3 className="text-xl font-bold text-slate-900">AI Radiology Analysis</h3>
                </div>
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 text-on-surface">
                  <RadiologyUploader />
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Lab Alerts */}
              <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm shadow-blue-900/5 border border-outline-variant/10 flex flex-col text-on-surface">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">AI Analysis Alerts</h3>
                  <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded text-[10px] font-black uppercase">1 Critical</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-error-container/30 rounded-lg border-l-4 border-error">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-error uppercase tracking-wider">Critical • Blood Panel</span>
                      <span className="text-[10px] text-slate-500 font-bold">Just Now</span>
                    </div>
                    <h4 className="text-sm font-bold">Arthur Morgan</h4>
                    <p className="text-xs text-on-surface-variant mt-1">Significant decrease from baseline.</p>
                  </div>
                 
                  <div className="p-4 bg-surface-container-low rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Routine • Imaging</span>
                      <span className="text-[10px] text-slate-500 font-bold">2h ago</span>
                    </div>
                    <h4 className="text-sm font-bold">Sarah Jenkins</h4>
                    <p className="text-xs text-on-surface-variant mt-1">Abdominal Ultrasound uploaded.</p>
                  </div>
                </div>
              </section>

              {/* Patient Records Action */}
              <button className="w-full bg-surface-container-lowest p-6 rounded-xl shadow-sm border-t-4 border-primary text-left group hover:-translate-y-1 transition-all">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">folder_shared</span>
                </div>
                <span className="block text-sm font-bold text-slate-900">Access Global Patient Directory</span>
              </button>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
