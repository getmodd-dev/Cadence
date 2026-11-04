import React, { useState, useEffect } from 'react';
import {
  DailyCheckin,
  DailyTieInType,
  DailyOverallClimate,
  CoworkerProfile,
} from '../types';
import {
  formatDisplayDate,
  shiftDateStr,
  getLocalTodayDate,
  isToday,
} from '../utils/dateUtils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Check,
  Trash2,
  AlertTriangle,
  FileWarning,
} from 'lucide-react';

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  coworkers: CoworkerProfile[];
  dailyLogs: DailyCheckin[];
  onSaveDailyLog: (log: Omit<DailyCheckin, 'id' | 'recordedAt'> & { id?: string }) => Promise<void>;
  onDeleteDailyLog: (idOrDate: string, coworkerId?: string) => Promise<void>;
  onOpenCustomReport?: (prefill?: { date: string; coworkerId: string; notes?: string }) => void;
  stealthMode: boolean;
}

const TIE_IN_TYPES: DailyTieInType[] = [
  'Daily Standup / Team Sync',
  'Shared Project / Task Dependency',
  'Sprint Planning / Backlog Review',
  'Code / Design Review',
  'Ad-hoc Work Handoff',
  'Unsolicited Non-Work Approach',
  'None - Casual / Unrelated to Work',
];

const CLIMATE_OPTIONS: { value: DailyOverallClimate; label: string; desc: string; color: string }[] = [
  { value: 'peaceful_neutral', label: 'Neutral / Routine', desc: 'Standard business demeanor', color: 'border-slate-700 text-slate-300' },
  { value: 'cordial_positive', label: 'Cordial / Productive', desc: 'Positive collaboration', color: 'border-emerald-500/50 text-emerald-300' },
  { value: 'cold_avoidant', label: 'Cold / Avoidant', desc: 'Aloof, silent treatment', color: 'border-sky-500/50 text-sky-300' },
  { value: 'tense_friction', label: 'Tense / Friction', desc: 'Passive hostility, sharp tone', color: 'border-amber-500/50 text-amber-300' },
  { value: 'confrontational', label: 'Hostile / Disruption', desc: 'Direct conflict, outburst', color: 'border-rose-500/50 text-rose-300' },
];

export const DailyLogModal: React.FC<DailyLogModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  coworkers,
  dailyLogs,
  onSaveDailyLog,
  onDeleteDailyLog,
  onOpenCustomReport,
  stealthMode,
}) => {
  const primaryCoworker = coworkers.find((c) => c.isPrimarySubject) || coworkers[0] || {
    id: 'cw_primary_default',
    alias: 'Primary Coworker',
  };

  const [coworkerId, setCoworkerId] = useState(primaryCoworker.id);

  // Form state
  const [hadInteraction, setHadInteraction] = useState<boolean>(true);
  const [hadDailyTieIn, setHadDailyTieIn] = useState<boolean>(true);
  const [tieInType, setTieInType] = useState<DailyTieInType>('Daily Standup / Team Sync');
  const [overallClimate, setOverallClimate] = useState<DailyOverallClimate>('peaceful_neutral');
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Sync form when selectedDate or coworkerId changes
  useEffect(() => {
    const existing = dailyLogs.find((d) => d.date === selectedDate && d.coworkerId === coworkerId);
    if (existing) {
      setHadInteraction(existing.hadInteraction);
      setHadDailyTieIn(existing.hadDailyTieIn);
      setTieInType(existing.tieInType || 'None - Casual / Unrelated to Work');
      setOverallClimate(existing.overallClimate || 'peaceful_neutral');
      setQuickNotes(existing.quickNotes || '');
    } else {
      setHadInteraction(true);
      setHadDailyTieIn(true);
      setTieInType('Daily Standup / Team Sync');
      setOverallClimate('peaceful_neutral');
      setQuickNotes('');
    }
    setConfirmClear(false);
  }, [selectedDate, coworkerId, dailyLogs]);

  if (!isOpen) return null;

  const existingLog = dailyLogs.find((d) => d.date === selectedDate && d.coworkerId === coworkerId);

  const handlePrevDay = () => {
    onSelectDate(shiftDateStr(selectedDate, -1));
  };

  const handleNextDay = () => {
    onSelectDate(shiftDateStr(selectedDate, 1));
  };

  const handleToday = () => {
    onSelectDate(getLocalTodayDate());
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const selectedCw = coworkers.find((c) => c.id === coworkerId) || primaryCoworker;
      await onSaveDailyLog({
        id: existingLog?.id,
        date: selectedDate,
        coworkerId,
        coworkerName: selectedCw.alias,
        hadInteraction,
        hadDailyTieIn,
        tieInType: hadDailyTieIn ? tieInType : 'None - Casual / Unrelated to Work',
        overallClimate,
        quickNotes: quickNotes.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to save daily log');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsDeleting(true);
    try {
      if (existingLog) {
        await onDeleteDailyLog(existingLog.id, coworkerId);
      } else {
        await onDeleteDailyLog(selectedDate, coworkerId);
      }
      setHadInteraction(true);
      setHadDailyTieIn(true);
      setTieInType('Daily Standup / Team Sync');
      setOverallClimate('peaceful_neutral');
      setQuickNotes('');
      setConfirmClear(false);
    } catch (err: any) {
      alert(err.message || 'Failed to clear daily log');
    } finally {
      setIsDeleting(false);
    }
  };

  const quickNoteChips = [
    'No interaction; worked remotely.',
    'Brief pleasant exchange during standup.',
    'Aloof/cold demeanor, avoided eye contact.',
    'Interrupted my update during team sync.',
    'Smooth handoff; polite email exchange.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with Date Navigation (Back, Today, Forward) */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                  Daily Interaction Log
                  {existingLog ? (
                    <span className="text-[11px] font-sans font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3 h-3" /> Logged
                    </span>
                  ) : (
                    <span className="text-[11px] font-sans text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Unlogged
                    </span>
                  )}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Controls Row: Back, Today, Forward, Date picker, Coworker */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            {/* Prev / Today / Next Date buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevDay}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleToday}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  isToday(selectedDate)
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white'
                }`}
                title="Jump to Today"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNextDay}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                title="Next Day"
              >
                <span>Forward</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Date text & Native date picker */}
              <label className="relative flex items-center cursor-pointer ml-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) onSelectDate(e.target.value);
                  }}
                  className="sr-only"
                />
                <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900/60 transition-colors">
                  {formatDisplayDate(selectedDate, { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })}
                </span>
              </label>
            </div>

            {/* Subject Coworker selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Subject:</span>
              <select
                value={coworkerId}
                onChange={(e) => setCoworkerId(e.target.value)}
                className={`bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 ${
                  stealthMode ? 'blur-sm select-none' : ''
                }`}
              >
                {coworkers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.alias}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Was there an interaction? */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                1. Was there an interaction?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHadInteraction(true)}
                  className={`py-2 px-3 rounded-lg border font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    hadInteraction
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Yes, Interacted</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHadInteraction(false);
                    setHadDailyTieIn(false);
                    setTieInType('None - Casual / Unrelated to Work');
                  }}
                  className={`py-2 px-3 rounded-lg border font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    !hadInteraction
                      ? 'bg-slate-800 text-slate-100 border-slate-700'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>No Contact</span>
                </button>
              </div>
            </div>

            {/* 2. Was there a daily tie-in? */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                2. Was there a daily tie-in?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHadDailyTieIn(true)}
                  className={`py-2 px-3 rounded-lg border font-medium transition-all ${
                    hadDailyTieIn
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Yes — Work Tie-in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHadDailyTieIn(false);
                    setTieInType('None - Casual / Unrelated to Work');
                  }}
                  className={`py-2 px-3 rounded-lg border font-medium transition-all ${
                    !hadDailyTieIn
                      ? 'bg-slate-800 text-slate-200 border-slate-700 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  No Work Tie-in
                </button>
              </div>
            </div>
          </div>

          {/* Tie-in Type pills if Yes */}
          {hadDailyTieIn && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Daily Tie-in Context:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIE_IN_TYPES.filter((t) => !t.startsWith('None')).map((typeOption) => (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setTieInType(typeOption)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      tieInType === typeOption
                        ? 'bg-indigo-600 text-white border-indigo-500 font-medium'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {typeOption}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overall Demeanor */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              General Daily Demeanor / Climate
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {CLIMATE_OPTIONS.map((c) => {
                const active = overallClimate === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setOverallClimate(c.value)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      active
                        ? 'bg-slate-800 ' + c.color + ' ring-1 ring-indigo-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">{c.label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{c.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Daily Quick Notes
            </label>
            <textarea
              rows={2}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Brief observations on tone, interactions, or reason for no contact..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Quick-fill:
              </span>
              {quickNoteChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuickNotes(chip)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer: Clear Entry, File Incident, Save Button */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Left side: Clear Daily Log button */}
            <div>
              {existingLog ? (
                confirmClear ? (
                  <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/50 p-1.5 rounded-lg">
                    <span className="text-[11px] text-rose-300 font-medium">Clear entry for {selectedDate}?</span>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleClear}
                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors"
                    >
                      {isDeleting ? 'Clearing...' : 'Confirm Clear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs flex items-center gap-1.5 transition-colors"
                    title="Clear and remove this daily log entry"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Clear Daily Log</span>
                  </button>
                )
              ) : (
                <span className="text-[11px] text-slate-500 italic">No entry saved for this date</span>
              )}
            </div>

            {/* Right side: Save button & Incident shortcut */}
            <div className="flex items-center gap-2 justify-end">
              {onOpenCustomReport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomReport({
                      date: selectedDate,
                      coworkerId,
                      notes: quickNotes,
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                  <span>File Incident</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : existingLog ? 'Update Daily Log' : 'Save Daily Log'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
