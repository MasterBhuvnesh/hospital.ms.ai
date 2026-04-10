"use client";
import React from 'react';
import { ArrowRight, Activity, CalendarPlus, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-black pt-[120px] pb-[110px] lg:pt-[150px]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] dark:bg-blue-600/20" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-600/20" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="max-w-[800px] mx-auto text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ amount: 0.1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm border border-blue-100 dark:border-blue-800/50">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
            Elevating Healthcare with AI
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-6 leading-tight">
            The Intelligent OS for <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Modern Hospitals</span>
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-[600px] mx-auto leading-relaxed">
            Streamline workflows, enhance patient care, and reduce administrative overhead with our state-of-the-art AI-powered platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="h-14 px-8 w-full sm:w-auto rounded-full bg-blue-600 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 group">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="h-14 px-8 w-full sm:w-auto rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-semibold text-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center justify-center">
              Book a Demo
            </button>
          </div>
        </motion.div>

        <motion.div 
          className="mt-20 flex justify-center"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ amount: 0.1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-blue-500/5 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
             <div className="h-12 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2">
               <div className="flex gap-1.5">
                 <div className="w-3 h-3 rounded-full bg-rose-500" />
                 <div className="w-3 h-3 rounded-full bg-amber-500" />
                 <div className="w-3 h-3 rounded-full bg-emerald-500" />
               </div>
               <div className="mx-auto bg-white dark:bg-black rounded-md px-3 py-1 flex items-center shadow-sm text-xs text-zinc-500 truncate w-64 justify-center">
                 app.hospital.ms.ai
               </div>
             </div>
             <div className="p-8 aspect-video flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950/50">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl opacity-80">
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                   <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                     <Activity className="w-5 h-5"/>
                   </div>
                   <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                   <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                     <CalendarPlus className="w-5 h-5"/>
                   </div>
                   <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                   <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                     <ShieldCheck className="w-5 h-5"/>
                   </div>
                   <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                   <div className="h-2 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                 </div>
               </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
