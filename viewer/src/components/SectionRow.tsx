import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CatalogShow } from '../types';
import { ShowCard } from './ShowCard';

interface SectionRowProps {
  sectionTitle: string;
  shows: CatalogShow[];
  onOpenDetails: (show: CatalogShow) => void;
  onPlayTrailer: (show: CatalogShow) => void;
}

export const SectionRow: React.FC<SectionRowProps> = ({
  sectionTitle,
  shows,
  onOpenDetails,
  onPlayTrailer,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -450 : 450;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!shows || shows.length === 0) return null;

  return (
    <div className="space-y-3 px-6 sm:px-12 py-3 group relative">
      {/* Section Header */}
      <h2 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight flex items-center space-x-2">
        <span>{sectionTitle}</span>
        <span className="text-xs text-slate-500 font-normal">({shows.length})</span>
      </h2>

      {/* Horizontal Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-black/70 hover:bg-black/90 text-white rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Row of Poster Cards */}
        <div
          ref={rowRef}
          className="flex space-x-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
        >
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              onOpenDetails={onOpenDetails}
              onPlayTrailer={onPlayTrailer}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-24 bg-black/70 hover:bg-black/90 text-white rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
