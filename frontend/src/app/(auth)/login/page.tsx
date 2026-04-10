/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/patient-dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Decorative Atmospheric Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] vitality-gradient rounded-full opacity-5 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary rounded-full opacity-5 blur-[100px]"></div>
      
      <main className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-12 gap-0 shadow-sm shadow-primary/5 rounded-xl overflow-hidden bg-surface-container-low z-10">
        {/* Left: Branding & Visual Content */}
        <div className="hidden md:flex md:col-span-6 flex-col justify-between p-12 vitality-gradient relative">
          <div className="z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">Atelier Health</span>
            </div>
          </div>
          <div className="z-10 space-y-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              The Clinical <br/><span className="text-secondary-container">Atelier.</span>
            </h1>
            <p className="text-primary-fixed text-lg font-medium max-w-md leading-relaxed opacity-90">
              A curated management experience for modern healthcare providers. Where surgical precision meets luxury wellness.
            </p>
            <div className="pt-4 flex items-center gap-4">
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-primary object-cover" alt="Doctor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSBuTanRfUWbTFIpAixxA29CO_XRVCnfST6Lc7BsfRmU1yEjarvf1jjUn4ryBnL8y7I5nASv-_D_cNTMqAubXSuDmSUtxKcFEeYAnP62hgqDzQ6OhgywmbqAbYeNQCBIbamNolwalum0G55AvdNpedt18o-yyt6LTrs7ZRLkZGxtG-J56tHFUq_0XZPrI1mzTMXfn800I18jvWQgipAEqvwXMWO3phfT032DI18YxHsSFSC3LGkLZ8mhn27PYRNhVb2hEcS58SPZbo"/>
                <img className="w-10 h-10 rounded-full border-2 border-primary object-cover" alt="Surgeon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-DZi-LdCp4NNz4POiX296XCCvpA45k87jToe4PxbpTa6iDJ4wwNM093cT3MExHRpmoX9ah7Kfk10Qrf5VNmL2VxqQkvRRTwaEh8-JRW8op1Ar-cdOWK-A8efklgahsN-_JNulpfc0T4kirYiDSI6CcHi047Gvo9mpnxQM58N759VipZ6Xtc6NnSjSK060xsnSwab9HIyWcMsSUlLISvevALdhapKVVA8kWjgVXLzjuXLnCgPyBx5E2cqh1NAvuYnI47vi-Ft78AkH"/>
                <img className="w-10 h-10 rounded-full border-2 border-primary object-cover" alt="Researcher" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu0WJiJcDYlGYH-Nh8oXf7Jb0VQa84A-Xp2yK7YicGDP_XvHUi2BK5Iz3lPrn_lpHa81C5fMCFMXaTbDbeSP4IZB0Z6le1-xk-cypjdIe2OxS8PDps9TzGGTU7GK0VK1YEQrJndLwzBWfIjr1b8kJ_lbAuSRtoY33G4oftBbuHu1r5QPeiiAclgLD1I5hM8XMp_LBz5tWf2BEEG74c-h2lJWIi4NqI0bp1KEqHhQLhxD8HZty3vWc2dWeZSkAQEeqi2kRdCBlsEjxj"/>
              </div>
              <span className="text-primary-fixed text-sm font-semibold tracking-wide uppercase">+12k Clinicians trust us</span>
            </div>
          </div>
          <div className="z-10">
            <div className="bg-white/10 glass-panel p-4 rounded-lg flex items-center gap-4">
              <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
              <span className="text-white text-sm font-medium">HIPAA Compliant &amp; Secure Data Architecture</span>
            </div>
          </div>
          {/* Decorative Image Texture Overlay */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay">
            <img className="w-full h-full object-cover" alt="Hospital Building" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4WA4lijYC3wARrrZKTCvKDotZuh1gFJyCMghftv2QyEIyVljqrH34pc0WiT31h_bmyzLZMqZzNIacNdLHIUdyvt7kSChuuvl7b_OzWrBXbJ5JhATUVqUmNALAhc5XAnuYAsgFT2tUYYDBjk-NchVeJB-04ub0swQivgBeL2e8m9G6CKyb7A0S1WFjZujQVF_MRApP25RquuzhN1uewNfeoB36Z0C-JKHoVqIKGgrHV_0zeGB1gK7tncIHSOSsfVskLh8D4reVU0Me"/>
          </div>
        </div>
        
        {/* Right: Login Form */}
        <div className="md:col-span-6 bg-surface-container-lowest p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10 block md:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter text-primary">Atelier Health</span>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Welcome Back</h2>
            <p className="text-on-surface-variant text-sm font-medium">Select your role to access the management suite.</p>
          </div>
          
          {error && <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg text-sm font-bold border-l-4 border-error">{error}</div>}
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Role Selection (Visual Only - backend determines role via JWT) */}
            <div className="grid grid-cols-3 gap-3">
              <label className="group cursor-pointer">
                <input type="radio" name="role" className="peer sr-only" defaultChecked />
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-low peer-checked:bg-primary-container/10 peer-checked:ring-2 peer-checked:ring-primary transition-all duration-200">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:scale-110 transition-transform peer-checked:text-primary mb-1">person</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant peer-checked:text-primary">Patient</span>
                </div>
              </label>
              <label className="group cursor-pointer">
                <input type="radio" name="role" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-low peer-checked:bg-primary-container/10 peer-checked:ring-2 peer-checked:ring-primary transition-all duration-200">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:scale-110 transition-transform peer-checked:text-primary mb-1">medical_information</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant peer-checked:text-primary">Doctor</span>
                </div>
              </label>
              <label className="group cursor-pointer">
                <input type="radio" name="role" className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-low peer-checked:bg-primary-container/10 peer-checked:ring-2 peer-checked:ring-primary transition-all duration-200">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:scale-110 transition-transform peer-checked:text-primary mb-1">admin_panel_settings</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant peer-checked:text-primary">Admin</span>
                </div>
              </label>
            </div>
            
            {/* Input Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email Address</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-xl group-focus-within:text-primary transition-colors">alternate_email</span>
                  <input 
                    type="email" 
                    id="email" 
                    placeholder="name@hospital.com" 
                    required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-highest rounded-lg border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 text-on-surface placeholder:text-outline/60 font-medium outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
                  <a href="#" className="text-[11px] font-bold text-primary hover:text-primary-container transition-colors uppercase tracking-wider">Forgot Password?</a>
                </div>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-xl group-focus-within:text-primary transition-colors">lock_open</span>
                  <input 
                    type="password" 
                    id="password" 
                    placeholder="••••••••" 
                    required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-surface-container-highest rounded-lg border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 text-on-surface placeholder:text-outline/60 font-medium outline-none"
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline hover:text-on-surface transition-colors">visibility</button>
                </div>
              </div>
            </div>
            
            {/* Primary CTA */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 rounded-lg vitality-gradient text-white font-bold tracking-tight shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:scale-100"
            >
              <span>{loading ? 'Authenticating...' : 'Access Clinical Portal'}</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            
            {/* Footer Links */}
            <div className="pt-4 text-center">
              <p className="text-sm text-on-surface-variant">
                Don&apos;t have an account? 
                <Link href="/register" className="text-primary ml-1 font-bold hover:underline decoration-2 underline-offset-4">Register your practice</Link>
              </p>
            </div>
          </form>
          
          {/* Language/Support Footer */}
          <div className="mt-12 pt-8 flex items-center justify-between border-t border-outline-variant/10">
            <button className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-base">language</span>
              <span>English (US)</span>
            </button>
            <div className="flex gap-4">
              <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface transition-colors">Legal</a>
              <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
