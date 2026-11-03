import React from 'react';
import {
  PenLine,
  Clock,
  BarChart2,
  FileText,
  Server,
  EyeOff,
  Eye,
  Lock,
  Settings,
  Shield,
  FileWarning,
  Calendar,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  stealthMode: boolean;
  setStealthMode: (stealth: boolean) => void;
  onLock: () => void;
  onOpenSettings: () => void;
  isPinConfigured: boolean;
  totalIncidents: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  stealthMode,
  setStealthMode,
  onLock,
  onOpenSettings,
  isPinConfigured,
  totalIncidents,
}) => {
  return (
    <div className="no-print sticky top-0 z-40">
      {/* 1. Main Title Bar (Uncluttered Brand & Essential Privacy Utilities) */}
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand Wordmark & Descriptor */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <button
              onClick={() => setActiveTab('home')}
              className="text-left group cursor-pointer focus:outline-none flex items-baseline gap-2"
            >
              <span className="text-base font-bold tracking-tight text-slate-100 group-hover:text-indigo-300 transition-colors whitespace-nowrap font-mono">
                CADENCE
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
                Workplace Interaction Journal
              </span>
            </button>
          </div>

          {/* Right Privacy & Security Utilities and New Incident CTA */}
          <div className="flex items-center gap-2">
            {/* Stealth Blur toggle */}
            <button
              onClick={() => setStealthMode(!stealthMode)}
              title="Stealth Mode (Esc) - Blurs sensitive text if a colleague walks by"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                stealthMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {stealthMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden md:inline text-xs">
                {stealthMode ? 'Stealth Active' : 'Stealth (Esc)'}
              </span>
            </button>

            {/* Quick Lock */}
            <button
              onClick={onLock}
              title={isPinConfigured ? 'Lock App with Passcode' : 'Lock Session'}
              className="p-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              title="Privacy & Coworker Profile Settings"
              className="p-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* New Incident Primary CTA in Title Bar */}
            <button
              onClick={() => setActiveTab('custom_report')}
              className="ml-1 sm:ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>New Incident</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Sub-Bar Navigation (Dedicated Tab Selector Below Title Bar) */}
      <nav className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'home'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <PenLine className="w-3.5 h-3.5 text-indigo-400" />
            <span>Daily Log</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'calendar'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'timeline'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums ml-0.5">
              ({totalIncidents})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'analytics'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Patterns</span>
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'dossier'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>HR Dossier</span>
          </button>

          <button
            onClick={() => setActiveTab('unraid')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'unraid'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                : 'hover:text-slate-200 hover:bg-slate-950/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Unraid Server</span>
          </button>

          {activeTab === 'custom_report' && (
            <span className="ml-auto px-2.5 py-1 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[11px] font-mono flex items-center gap-1 shrink-0">
              <FileWarning className="w-3 h-3" />
              <span>Incident Report Editor Active</span>
            </span>
          )}
        </div>
      </nav>
    </div>
  );
};
