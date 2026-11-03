/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActiveTab, Interaction, CoworkerProfile, SystemSettings, DailyCheckin } from './types';
import { api } from './services/api';
import { TopBar } from './components/TopBar';
import { DailyHomeScreen } from './components/DailyHomeScreen';
import { CalendarView } from './components/CalendarView';
import { QuickLogger } from './components/QuickLogger';
import { TimelineView } from './components/TimelineView';
import { AnalyticsView } from './components/AnalyticsView';
import { HrDossierView } from './components/HrDossierView';
import { UnraidGuideView } from './components/UnraidGuideView';
import { PinLockModal } from './components/PinLockModal';
import { SettingsModal } from './components/SettingsModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Home screen opens by default with basic daily interactions
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyCheckin[]>([]);
  const [coworkers, setCoworkers] = useState<CoworkerProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    pinEnabled: false,
    autoLockMinutes: 15,
    stealthBlurDefault: false,
    anonymizeInView: false,
    coworkerDefaultAlias: 'Subject Coworker',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security & Stealth states
  const [isLocked, setIsLocked] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [customReportPrefill, setCustomReportPrefill] = useState<{
    date: string;
    coworkerId: string;
    notes?: string;
  } | null>(null);

  // Auto-lock idle timer tracking
  const lastActivityRef = useRef<number>(Date.now());

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [allInteractions, allDailyLogs, allCoworkers, currentSettings] = await Promise.all([
        api.getInteractions(),
        api.getDailyLogs(),
        api.getCoworkers(),
        api.getSettings(),
      ]);
      setInteractions(allInteractions);
      setDailyLogs(allDailyLogs);
      setCoworkers(allCoworkers);
      setSettings(currentSettings);
      if (currentSettings.stealthBlurDefault) {
        setStealthMode(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to local database server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle idle timer for auto-lock
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    const interval = setInterval(() => {
      if (!isLocked && settings.autoLockMinutes > 0) {
        const idleDurationMs = Date.now() - lastActivityRef.current;
        if (idleDurationMs > settings.autoLockMinutes * 60 * 1000) {
          setIsLocked(true);
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearInterval(interval);
    };
  }, [isLocked, settings.autoLockMinutes]);

  // Global hotkeys (Esc for Stealth Blur, Ctrl/Cmd+L for Lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Toggle stealth blur quickly
        setStealthMode((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        setIsLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save handler for daily basic check-in
  const handleSaveDailyLog = async (
    entry: Omit<DailyCheckin, 'id' | 'recordedAt'> & { id?: string }
  ) => {
    const saved = await api.saveDailyLog(entry);
    setDailyLogs((prev) => {
      const idx = prev.findIndex(
        (d) =>
          d.id === saved.id || (d.date === saved.date && d.coworkerId === saved.coworkerId)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  // Open custom serious incident report
  const handleOpenCustomReport = (prefill?: {
    date: string;
    coworkerId: string;
    notes?: string;
  }) => {
    setCustomReportPrefill(prefill || null);
    setEditingInteraction(null);
    setActiveTab('custom_report');
  };

  // Save handler for detailed custom incident report
  const handleSaveInteraction = async (entry: Omit<Interaction, 'id' | 'recordedAt'>) => {
    if (editingInteraction) {
      const updated = await api.updateInteraction(editingInteraction.id, entry);
      setInteractions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingInteraction(null);
      setActiveTab('timeline');
    } else {
      const created = await api.createInteraction(entry);
      setInteractions((prev) => [created, ...prev]);
      setCustomReportPrefill(null);
      setActiveTab('timeline');
    }
  };

  // Delete handler for interactions
  const handleDeleteInteraction = async (id: string) => {
    await api.deleteInteraction(id);
    setInteractions((prev) => prev.filter((i) => i.id !== id));
  };

  // Open edit modal for an existing incident
  const handleEditClick = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setCustomReportPrefill(null);
    setActiveTab('custom_report');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-mono">Initializing self-hosted data store...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* PIN Lock Screen if locked */}
      {isLocked && (
        <PinLockModal
          onUnlockSuccess={() => setIsLocked(false)}
          isPinConfigured={settings.pinEnabled}
        />
      )}

      {/* Top Bar with Top Bar Contract Compliance & Navigation Sub-Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'custom_report' && !editingInteraction) {
            setCustomReportPrefill(null);
          }
          if (tab !== 'custom_report' && editingInteraction) {
            setEditingInteraction(null);
          }
          setActiveTab(tab);
        }}
        stealthMode={stealthMode}
        setStealthMode={setStealthMode}
        onLock={() => setIsLocked(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isPinConfigured={settings.pinEnabled}
        totalIncidents={interactions.length}
      />

      {/* Error notification banner if any */}
      {error && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 text-rose-200 text-xs px-4 py-2.5 text-center font-mono">
          {error}
        </div>
      )}

      {/* Stealth Notice Bar if active */}
      {stealthMode && (
        <div className="no-print bg-amber-950/70 border-b border-amber-500/40 text-amber-300 text-xs px-4 py-1.5 flex items-center justify-center gap-2 font-mono">
          <span>Stealth Privacy Mode Active (Text Blurred)</span>
          <span className="text-amber-400">·</span>
          <button
            onClick={() => setStealthMode(false)}
            className="underline hover:text-white"
          >
            Disable (Esc)
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
        {/* TAB 1: Daily Log Home Screen (No calendar, clean daily check-in) */}
        {activeTab === 'home' && (
          <DailyHomeScreen
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            coworkers={coworkers}
            dailyLogs={dailyLogs}
            onSaveDailyLog={handleSaveDailyLog}
            onOpenCustomReport={handleOpenCustomReport}
            onEditInteraction={handleEditClick}
            onDeleteInteraction={handleDeleteInteraction}
            recentIncidents={interactions}
            stealthMode={stealthMode}
          />
        )}

        {/* TAB 2: Dedicated Calendar Section */}
        {activeTab === 'calendar' && (
          <CalendarView
            dailyLogs={dailyLogs}
            interactions={interactions}
            coworkers={coworkers}
            onSelectDateForLog={(date) => {
              setSelectedDate(date);
              setActiveTab('home');
            }}
            onOpenCustomReport={handleOpenCustomReport}
            stealthMode={stealthMode}
          />
        )}

        {/* TAB 3: Custom / Serious Incident Report */}
        {activeTab === 'custom_report' && (
          <QuickLogger
            coworkers={coworkers}
            onSave={handleSaveInteraction}
            initialData={editingInteraction}
            prefill={customReportPrefill}
            onCancel={() => {
              setEditingInteraction(null);
              setCustomReportPrefill(null);
              setActiveTab('home');
            }}
          />
        )}

        {/* TAB 4: Chronological Timeline of All Records */}
        {activeTab === 'timeline' && (
          <TimelineView
            interactions={interactions}
            coworkers={coworkers}
            onEdit={handleEditClick}
            onDelete={handleDeleteInteraction}
            onNewClick={() => handleOpenCustomReport()}
            stealthMode={stealthMode}
          />
        )}

        {/* TAB 5: Pattern Analytics */}
        {activeTab === 'analytics' && <AnalyticsView interactions={interactions} />}

        {/* TAB 6: Formal HR Dossier & Print Generator */}
        {activeTab === 'dossier' && (
          <HrDossierView
            interactions={interactions}
            dailyLogs={dailyLogs}
            coworkers={coworkers}
          />
        )}

        {/* TAB 7: Unraid Host Server Guide & Backups */}
        {activeTab === 'unraid' && <UnraidGuideView onRefreshData={loadData} />}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          coworkers={coworkers}
          onRefreshCoworkers={loadData}
        />
      )}

      {/* Quiet Footer */}
      <footer className="no-print border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-400 font-mono">
        CADENCE · Private Workplace Interaction & Incident Journal · Self-Hosted Local Engine · Port 3000
      </footer>
    </div>
  );
}
