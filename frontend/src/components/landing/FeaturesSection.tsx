"use client";
import React from 'react';
import { Stethoscope, Clock, ShieldAlert, Cpu, HeartPulse, LineChart } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "AI Diagnostics",
    description: "Leverage state-of-the-art machine learning models to assist doctors in analyzing scans and reports rapidly.",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Smart Scheduling",
    description: "Eliminate double-booking and optimize physician availability with automated, priority-based appointment scheduling.",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  {
    icon: <ShieldAlert className="w-6 h-6" />,
    title: "Secure Health Records",
    description: "Fully compliant, end-to-end encrypted storage for electronic medical records (EMR) accessible anywhere.",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
  },
  {
    icon: <HeartPulse className="w-6 h-6" />,
    title: "Patient Portal App",
    description: "Empower patients with a seamless portal for viewings test results, communicating with staff, and paying bills.",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
  },
  {
    icon: <Stethoscope className="w-6 h-6" />,
    title: "Telemedicine Ready",
    description: "Integrated secure video communication channels for virtual consultations and remote patient monitoring.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  {
    icon: <LineChart className="w-6 h-6" />,
    title: "Hospital Analytics",
    description: "Comprehensive dashboard providing real-time insights into hospital operations, staff load, and resource utilization.",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-3xl mx-auto text-center mb-16"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Everything you need to run a modern facility
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Our platform replaces fragmented, legacy software with a unified, AI-driven experience that doctors and administrators love.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ amount: 0.1 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="group p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:-translate-y-1 ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
