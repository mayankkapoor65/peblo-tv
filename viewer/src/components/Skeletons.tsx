import React from 'react';

export const HeroSkeleton: React.FC = () => (
  <div className="relative w-full h-[70vh] min-h-[500px] bg-cinema-900 animate-pulse overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-cinema-900/40 to-cinema-900/80" />
    <div className="absolute bottom-16 left-6 sm:left-12 max-w-xl space-y-4">
      <div className="h-5 w-32 bg-slate-800 rounded-full" />
      <div className="h-10 sm:h-14 w-80 bg-slate-800 rounded-xl" />
      <div className="h-16 w-full bg-slate-800/80 rounded-xl" />
      <div className="flex items-center space-x-3 pt-2">
        <div className="h-11 w-32 bg-slate-700 rounded-xl" />
        <div className="h-11 w-32 bg-slate-800 rounded-xl" />
      </div>
    </div>
  </div>
);

export const SectionRowSkeleton: React.FC = () => (
  <div className="space-y-3 px-6 sm:px-12 py-4">
    <div className="h-6 w-48 bg-slate-800 rounded-md animate-pulse" />
    <div className="flex space-x-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="w-36 sm:w-48 aspect-[2/3] bg-cinema-850 rounded-xl border border-slate-800/60 animate-pulse shrink-0"
        />
      ))}
    </div>
  </div>
);
