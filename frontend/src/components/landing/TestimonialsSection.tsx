"use client";
import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "This platform genuinely revolutionized how our emergency department operates. The predictive scheduling reduced wait times by over 40%.",
    author: "Dr. Sarah Chen",
    role: "Chief of Medicine, Metro General",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    quote: "Finally, an EMR system that doesn't feel like it was built in the 1990s. Our staff required almost no training to get up to speed.",
    author: "Marcus Johnson",
    role: "Hospital Administrator",
    avatar: "https://i.pravatar.cc/150?u=marcus"
  },
  {
    quote: "The AI diagnostic assistant catches subtle anomalies that are easily missed during long shifts. It's an indispensable tool.",
    author: "Dr. Emily Rodriguez",
    role: "Lead Radiologist",
    avatar: "https://i.pravatar.cc/150?u=emily"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-black overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Trusted by top healthcare professionals
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            See how hospital.ms.ai is making a difference on the frontlines of modern healthcare.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ amount: 0.1 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-8 italic">
                  "{test.quote}"
                </p>
              </div>
              <div className="flex items-center gap-4">
                <img 
                  src={test.avatar} 
                  alt={test.author} 
                  className="w-12 h-12 rounded-full border-2 border-white dark:border-zinc-800"
                  loading="lazy"
                />
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{test.author}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{test.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
