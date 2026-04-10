import React from 'react';
import { Stethoscope, Globe, Phone, Mail, MessageCircle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                hospital.ms.ai
              </span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              Empowering global healthcare through state-of-the-art artificial intelligence and elegant software design.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-zinc-400 hover:text-blue-500 transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="text-zinc-400 hover:text-blue-500 transition-colors"><Phone className="w-5 h-5" /></a>
              <a href="#" className="text-zinc-400 hover:text-blue-500 transition-colors"><Mail className="w-5 h-5" /></a>
              <a href="#" className="text-zinc-400 hover:text-white transition-colors"><MessageCircle className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Integrations</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Careers</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Blog</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Security</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} hospital.ms.ai. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
