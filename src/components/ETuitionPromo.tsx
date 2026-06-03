import React from 'react';
import { MapPin, Users } from 'lucide-react';

interface ETuitionPromoProps {
  className?: string;
  compact?: boolean;
}

export default function ETuitionPromo({ className = "", compact = false }: ETuitionPromoProps) {
  return (
    <div className={`mt-6 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white shadow-md relative overflow-hidden ${className}`}>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-900 opacity-20 rounded-full blur-2xl"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-1">
              etuition.app <span className="bg-blue-900/50 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ml-2 border border-blue-400/30">Sponsored</span>
            </h3>
            <p className={`text-blue-50 font-medium ${compact ? 'text-sm mt-1' : 'text-base mt-2'}`}>
              আপনার আশেপাশের সেরা শিক্ষক খুঁজে নিন খুব সহজেই। 
            </p>
            {!compact && (
              <p className="text-blue-200 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1">
                <MapPin size={12} /> Location Based Tutor Platform
              </p>
            )}
          </div>
        </div>
        
        <a 
          href="https://etuition.app" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white hover:bg-blue-50 text-blue-700 font-bold py-2.5 px-6 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          শিক্ষক খুঁজুন
        </a>
      </div>
    </div>
  );
}
