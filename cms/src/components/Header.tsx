import React, { useState, useEffect } from 'react';
import { Film, UploadCloud, Shield, User, Tv, CheckCircle2 } from 'lucide-react';
import { getActiveRole, setActiveRole } from '../api/client';

interface HeaderProps {
  activeTab: 'shows' | 'publish';
  setActiveTab: (tab: 'shows' | 'publish') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [role, setRole] = useState<'admin' | 'editor'>(getActiveRole());

  useEffect(() => {
    const handleRoleChange = () => setRole(getActiveRole());
    window.addEventListener('peblo-role-changed', handleRoleChange);
    return () => window.removeEventListener('peblo-role-changed', handleRoleChange);
  }, []);

  const handleRoleToggle = (newRole: 'admin' | 'editor') => {
    setActiveRole(newRole);
    setRole(newRole);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('shows')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Tv className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  PEBLO TV
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  CMS Mini
                </span>
              </div>
              <p className="text-xs text-slate-400">Editorial & Publishing Pipeline</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center space-x-1 pl-6 border-l border-slate-800">
            <button
              onClick={() => setActiveTab('shows')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 ${
                activeTab === 'shows'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <span>Shows & Catalogue</span>
            </button>

            <button
              onClick={() => setActiveTab('publish')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 ${
                activeTab === 'publish'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Publish Console</span>
            </button>
          </nav>
        </div>

        {/* Right side: Role Switcher & Viewer Link */}
        <div className="flex items-center space-x-4">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
          >
            <span>Open Consumer Viewer</span>
            <span className="text-slate-500">↗</span>
          </a>

          {/* Live RBAC Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
            <span className="text-xs text-slate-400 px-2.5 flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Role:</span>
            </span>
            <button
              onClick={() => handleRoleToggle('editor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                role === 'editor'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Editor has full CRUD access, but cannot publish"
            >
              Editor
            </button>
            <button
              onClick={() => handleRoleToggle('admin')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                role === 'admin'
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Admin has full CRUD access + can trigger atomic publish"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
