import React, { useState, useEffect } from 'react';
import { Tv, Search, Film, Globe, Sparkles, X } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'search';
  setCurrentTab: (tab: 'home' | 'search') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-6 sm:px-12 py-3.5 flex items-center justify-between ${
        isScrolled ? 'cinema-glass bg-[#05070c]/90 shadow-2xl' : 'bg-gradient-to-b from-[#05070c]/90 to-transparent'
      }`}
    >
      {/* Brand Logo & Links */}
      <div className="flex items-center space-x-8">
        <div
          onClick={() => {
            setCurrentTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg red-glow group-hover:scale-105 transition-transform">
            <Tv className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-heading font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-rose-500 to-white">
            PEBLO
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <button
            onClick={() => setCurrentTab('home')}
            className={`transition ${currentTab === 'home' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentTab('search')}
            className={`transition ${currentTab === 'search' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Explore & Search
          </button>
        </div>
      </div>

      {/* Right side: Search Bar & Admin CMS link */}
      <div className="flex items-center space-x-4">
        {/* Quick Search */}
        <div className="relative">
          {currentTab !== 'search' ? (
            <button
              onClick={() => setCurrentTab('search')}
              className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition"
              title="Search catalogue"
            >
              <Search className="w-5 h-5" />
            </button>
          ) : (
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Titles, episodes, genres..."
                autoFocus
                className="bg-slate-900/90 border border-slate-700/80 rounded-full pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-44 sm:w-64 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Link to CMS Portal */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition"
          title="Open Editorial CMS Console"
        >
          <Film className="w-3.5 h-3.5 text-brand-400" />
          <span>CMS Portal</span>
          <span className="text-[10px] text-slate-400">↗</span>
        </a>
      </div>
    </nav>
  );
};
