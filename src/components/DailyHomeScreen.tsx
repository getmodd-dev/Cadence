import React, { useState, useEffect } from 'react';
import {
  DailyCheckin,
  DailyTieInType,
  DailyOverallClimate,
  CoworkerProfile,
  Interaction,
} from '../types';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertTriangle,
  FileWarning,
  Sparkles,
  ArrowRight,
  Clock,
  ShieldCheck,
  Check,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Users,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  formatDisplayDate,
  shiftDateStr,
  getLocalTodayDate,
  isToday,
} from '../utils/dateUtils';

interface DailyHomeScreenProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  coworkers: CoworkerProfile[];
  dailyLogs: DailyCheckin[];
  onSaveDailyLog: (log: Omit<DailyCheckin, 'id' | 'recordedAt'> & { id?: string }) => Promise<void>;
  onDeleteDailyLog?: (idOrDate: string, coworkerId?: string) => Promise<void>;
  onOpenCustomReport: (prefill?: { date: string; coworkerId: string; notes?: string }) => void;
  onEditInteraction: (interaction: Interaction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  recentIncidents: Interaction[];
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

export const DailyHomeScreen: React.FC<DailyHomeScreenProps> = ({
  selectedDate,
  onSelectDate,
  coworkers,
  dailyLogs,
  onSaveDailyLog,
  onDeleteDailyLog,
  onOpenCustomReport,
  onEditInteraction,
  onDeleteInteraction,
  recentIncidents,
  stealthMode,
}) => {
  const primaryCoworker = coworkers.find((c) => c.isPrimarySubject) || coworkers[0] || {
    id: 'cw_primary_default',
    alias: 'Primary Coworker',
  };

  const [coworkerId, setCoworkerId] = useState(primaryCoworker.id);

  // Form state for selected date
  const [hadInteraction, setHadInteraction] = useState<boolean>(true);
  const [hadDailyTieIn, setHadDailyTieIn] = useState<boolean>(true);
  const [tieInType, setTieInType] = useState<DailyTieInType>('Daily Standup / Team Sync');
  const [overallClimate, setOverallClimate] = useState<DailyOverallClimate>('peaceful_neutral');
  const [quickNotes, setQuickNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCheckinCollapsed, setIsCheckinCollapsed] = useState(false);
  const [isClearingDaily, setIsClearingDaily] = useState(false);
  const [confirmClearDaily, setConfirmClearDaily] = useState(false);

  // Reset clear confirmation when date or coworker changes
  useEffect(() => {
    setConfirmClearDaily(false);
  }, [selectedDate, coworkerId]);

  // Load existing log for selected date
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
  }, [selectedDate, coworkerId, dailyLogs]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const selectedCw = coworkers.find((c) => c.id === coworkerId) || primaryCoworker;
      await onSaveDailyLog({
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
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save daily log');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDailyLog = async () => {
    setIsClearingDaily(true);
    try {
      if (onDeleteDailyLog) {
        if (existingLog) {
          await onDeleteDailyLog(existingLog.id, coworkerId);
        } else {
          await onDeleteDailyLog(selectedDate, coworkerId);
        }
      }
      setHadInteraction(true);
      setHadDailyTieIn(true);
      setTieInType('Daily Standup / Team Sync');
      setOverallClimate('peaceful_neutral');
      setQuickNotes('');
      setConfirmClearDaily(false);
    } catch (err: any) {
      alert(err.message || 'Failed to clear daily log');
    } finally {
      setIsClearingDaily(false);
    }
  };

  const existingLog = dailyLogs.find((d) => d.date === selectedDate && d.coworkerId === coworkerId);
  
  // Incidents for selected date sorted chronologically
  const dayIncidents = recentIncidents
    .filter((i) => i.timestamp.slice(0, 10) === selectedDate)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleCopyFormatted = (item: Interaction) => {
    const formatted = `[INCIDENT TIMELINE ENTRY - ${new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
Subject: ${item.coworkerName} | Channel: ${item.medium} | Severity: ${item.severity.toUpperCase()}
Location: ${item.location}
Witnesses: ${item.witnesses.join(', ')}

FACTS & QUOTES:
${item.objectiveFacts}

IMPACT:
${item.impactNotes || 'None'}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickNoteChips = [
    'No interaction; worked remotely.',
    'Brief pleasant exchange during standup.',
    'Aloof/cold demeanor, avoided eye contact.',
    'Interrupted my update during team sync.',
    'Smooth handoff; polite email exchange.',
  ];

  const selectedDateFormatted = formatDisplayDate(selectedDate);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* View Header: Selected Date Context, Back / Today / Forward Navigation & Coworker */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 font-mono">
              {selectedDateFormatted}
            </h1>
            {existingLog ? (
              <span className="text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <Check className="w-3 h-3" />
                Checked-in
              </span>
            ) : (
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Unlogged
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Contemporaneous workplace interactions, daily pulse, and chronological timeline.
          </p>
        </div>

        {/* Date Navigation (Back, Today, Forward) & Coworker Subject */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {/* Day Navigation Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => onSelectDate(shiftDateStr(selectedDate, -1))}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Previous Day (Back)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSelectDate(getLocalTodayDate())}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                isToday(selectedDate)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Jump to Today"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => onSelectDate(shiftDateStr(selectedDate, 1))}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Next Day (Forward)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Picker */}
          <label className="relative flex items-center cursor-pointer" title="Jump to date">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="sr-only"
            />
            <span className="text-xs font-mono font-medium text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{selectedDate}</span>
            </span>
          </label>

          {/* Coworker Dropdown */}
          <select
            value={coworkerId}
            onChange={(e) => setCoworkerId(e.target.value)}
            className={`bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 ${
              stealthMode ? 'blur-sm select-none' : ''
            }`}
          >
            {coworkers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.alias} {c.role ? `· ${c.role}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: DAILY INTERACTION & TIE-IN STATUS (Collapsible or visible) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div
          onClick={() => setIsCheckinCollapsed(!isCheckinCollapsed)}
          className="p-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Daily Interaction & Tie-in Status
            </h2>
            <span className="text-[11px] text-slate-400 font-normal">
              ({hadInteraction ? (hadDailyTieIn ? 'Interacted with Tie-in' : 'Interacted, No Tie-in') : 'No Contact'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            <button className="text-slate-400 hover:text-slate-200">
              {isCheckinCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCheckinCollapsed && (
          <form onSubmit={handleSave} className="p-5 space-y-5">
            {/* 1. Was there an interaction? */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  1. Was there an interaction?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHadInteraction(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
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
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  2. Was there a daily tie-in?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHadDailyTieIn(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
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
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
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
                <span className="text-[11px] font-semibold text-slate-400 block uppercase">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                General Daily Climate / Demeanor
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Daily Quick Notes
              </label>
              <textarea
                rows={2}
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Brief observations on demeanor, interactions, or reason for no contact..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
              />

              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Quick-fill:
                </span>
                {quickNoteChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setQuickNotes(chip)}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              {/* Clear Daily Log Button / Confirmation */}
              <div>
                {existingLog ? (
                  confirmClearDaily ? (
                    <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 p-1.5 rounded-lg">
                      <span className="text-[11px] text-rose-300 font-medium">Clear entry for {selectedDate}?</span>
                      <button
                        type="button"
                        disabled={isClearingDaily}
                        onClick={handleClearDailyLog}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                      >
                        {isClearingDaily ? 'Clearing...' : 'Yes, Clear'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearDaily(false)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearDaily(true)}
                      className="px-3 py-2 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors self-start"
                      title="Clear and reset this day's daily check-in"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Clear Daily Log Entry</span>
                    </button>
                  )
                ) : (
                  <span className="text-xs text-slate-500 italic">No daily check-in saved for this date.</span>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors self-end"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : existingLog ? 'Update Daily Check-in' : 'Save Daily Check-in'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 2: PROMINENT REPORT OPTIONS CARD */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
            <FileWarning className="w-4 h-4 text-rose-400" />
            <span>Report Option: File Specific Incident</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Document specific friction, verbatim statements, unprovoked hostility, interruptions, or meetings where evidence was collected.
          </p>
        </div>

        <button
          onClick={() =>
            onOpenCustomReport({
              date: selectedDate,
              coworkerId,
              notes: quickNotes,
            })
          }
          className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shrink-0 shadow-md whitespace-nowrap"
        >
          <span>File Incident Report for This Day</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* SECTION 3: DAILY TIMELINE VIEW FOR THIS DATE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Chronological Timeline for {selectedDate}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({dayIncidents.length} event{dayIncidents.length !== 1 ? 's' : ''})
            </span>
          </div>

          <button
            onClick={() =>
              onOpenCustomReport({
                date: selectedDate,
                coworkerId,
              })
            }
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event to Timeline</span>
          </button>
        </div>

        {dayIncidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium">No timestamped incidents logged for this date.</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              If an incident, interruption, or notable encounter took place on this day, click below to log the contemporaneous record.
            </p>
            <button
              onClick={() =>
                onOpenCustomReport({
                  date: selectedDate,
                  coworkerId,
                })
              }
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
            >
              + Record Incident for Timeline
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {dayIncidents.map((inc, idx) => {
              const incTime = new Date(inc.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={inc.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-indigo-500 shadow-sm" />

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 transition-colors hover:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-indigo-400 font-bold text-xs">{incTime}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs font-semibold text-slate-200 capitalize">
                          {inc.type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">{inc.medium}</span>
                        {inc.location && (
                          <>
                            <span className="text-slate-600">·</span>
                            <span className="text-xs text-slate-400 truncate max-w-[180px]">
                              {inc.location}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            inc.severity === 'severe'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : inc.severity === 'moderate'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {inc.severity}
                        </span>

                        {inc.isFlaggedForHR && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 font-mono">
                            HR Flag
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verbatim Facts */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                        Facts & Statements:
                      </span>
                      <div
                        className={`text-xs text-slate-200 leading-relaxed p-2.5 rounded bg-slate-900 border border-slate-800/80 whitespace-pre-wrap font-sans ${
                          stealthMode ? 'blur-md select-none' : ''
                        }`}
                      >
                        {inc.objectiveFacts}
                      </div>
                    </div>

                    {/* Impact or Action */}
                    {(inc.impactNotes || inc.actionTaken) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {inc.impactNotes && (
                          <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                              Impact:
                            </span>
                            <span className="text-slate-300">{inc.impactNotes}</span>
                          </div>
                        )}
                        {inc.actionTaken && (
                          <div className="p-2 rounded bg-slate-900/40 border border-slate-800/60">
                            <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                              Action Taken:
                            </span>
                            <span className="text-slate-300">{inc.actionTaken}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Row: Witnesses & Evidence & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/50 text-xs">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span className={stealthMode ? 'blur-sm select-none' : ''}>
                            {inc.witnesses.join(', ')}
                          </span>
                        </span>

                        {inc.evidence.length > 0 && !inc.evidence.includes('None') && (
                          <span className="flex items-center gap-1 text-indigo-300">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{inc.evidence.join(', ')}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyFormatted(inc)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                        >
                          {copiedId === inc.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onEditInteraction(inc)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        {deleteConfirmId === inc.id ? (
                          <div className="flex items-center gap-1 bg-rose-950 p-1 rounded border border-rose-500/50">
                            <span className="text-[10px] text-rose-300">Delete?</span>
                            <button
                              onClick={() => {
                                onDeleteInteraction(inc.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px]"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1 py-0.5 text-slate-400 text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(inc.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
