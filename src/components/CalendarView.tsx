import React, { useState } from 'react';
import { DailyCheckin, Interaction, CoworkerProfile } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertTriangle,
  FileWarning,
  Clock,
  Plus,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CalendarViewProps {
  dailyLogs: DailyCheckin[];
  interactions: Interaction[];
  coworkers: CoworkerProfile[];
  onSelectDateForLog: (dateStr: string) => void;
  onOpenCustomReport: (prefill?: { date: string; coworkerId: string; notes?: string }) => void;
  stealthMode: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  dailyLogs,
  interactions,
  coworkers,
  onSelectDateForLog,
  onOpenCustomReport,
  stealthMode,
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));

  const primaryCoworker = coworkers.find((c) => c.isPrimarySubject) || coworkers[0] || {
    id: 'cw_primary_default',
    alias: 'Primary Coworker',
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now.toISOString().slice(0, 10));
  };

  // Generate calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Month stats
  const logsThisMonth = dailyLogs.filter((d) => {
    const dObj = new Date(d.date);
    return dObj.getFullYear() === year && dObj.getMonth() === month;
  });

  const incidentsThisMonth = interactions.filter((i) => {
    const dObj = new Date(i.timestamp);
    return dObj.getFullYear() === year && dObj.getMonth() === month;
  });

  const interactionDaysCount = logsThisMonth.filter((d) => d.hadInteraction).length;
  const tieInDaysCount = logsThisMonth.filter((d) => d.hadDailyTieIn).length;
  const tenseDaysCount = logsThisMonth.filter(
    (d) => d.overallClimate === 'tense_friction' || d.overallClimate === 'confrontational'
  ).length;

  // Selected date details
  const selectedLog = dailyLogs.find((d) => d.date === selectedDate);
  const selectedDayIncidents = interactions.filter((i) => i.timestamp.slice(0, 10) === selectedDate);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Month Navigation & Metrics Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Month Navigator */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{monthName}</span>
              <span className="text-xs font-normal text-slate-400 font-mono">
                Workplace Interaction Calendar
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any calendar day to inspect daily check-in pulses, tie-ins, and timestamped incidents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors"
          >
            Today
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Days Logged This Month</div>
          <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-0.5">
            {logsThisMonth.length}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Interactions Occurred</div>
          <div className="text-xl font-bold text-indigo-300 font-mono tabular-nums mt-0.5">
            {interactionDaysCount} days
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Work Tie-Ins (Tasks/Meetings)</div>
          <div className="text-xl font-bold text-sky-300 font-mono tabular-nums mt-0.5">
            {tieInDaysCount} days
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Specific Incidents Filed</div>
          <div className="text-xl font-bold text-rose-300 font-mono tabular-nums mt-0.5">
            {incidentsThisMonth.length} events
          </div>
        </div>
      </div>

      {/* Main Grid & Selected Day Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols on large screen) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-800/80">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="min-h-[75px] sm:min-h-[88px] p-1.5 rounded-lg bg-slate-950/30 border border-slate-900/50 text-slate-600 text-xs select-none opacity-40"
                >
                  <span className="font-mono text-[11px]">{dayNum}</span>
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
              const isToday = dateStr === today.toISOString().slice(0, 10);
              const isSelected = dateStr === selectedDate;

              const log = dailyLogs.find((d) => d.date === dateStr);
              const dayIncidents = interactions.filter((i) => i.timestamp.slice(0, 10) === dateStr);

              // Determine tone border / background color
              let cellBorder = 'border-slate-800/80 hover:border-slate-700';
              let climateDot = null;

              if (log) {
                if (log.overallClimate === 'confrontational') {
                  climateDot = 'bg-rose-500';
                  cellBorder = 'border-rose-500/40 bg-rose-950/20';
                } else if (log.overallClimate === 'tense_friction') {
                  climateDot = 'bg-amber-500';
                  cellBorder = 'border-amber-500/40 bg-amber-950/20';
                } else if (log.overallClimate === 'cold_avoidant') {
                  climateDot = 'bg-sky-400';
                  cellBorder = 'border-sky-500/30 bg-sky-950/20';
                } else if (log.hadInteraction) {
                  climateDot = 'bg-indigo-400';
                  cellBorder = 'border-indigo-500/30 bg-indigo-950/20';
                } else {
                  climateDot = 'bg-slate-500';
                  cellBorder = 'border-slate-800 bg-slate-950/60';
                }
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[75px] sm:min-h-[88px] p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-indigo-500 shadow-md ' : ''
                  }${cellBorder} ${!log ? 'bg-slate-950/70' : ''}`}
                >
                  {/* Top Day Number & Climate Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {climateDot && (
                      <span className={`w-2 h-2 rounded-full ${climateDot}`} title={log?.overallClimate} />
                    )}
                  </div>

                  {/* Badges / Micro status */}
                  <div className="space-y-1 w-full mt-1">
                    {log && (
                      <div className="text-[10px] truncate leading-tight">
                        {log.hadInteraction ? (
                          <span className="text-indigo-300 font-medium">
                            {log.hadDailyTieIn ? 'Tie-In' : 'Interacted'}
                          </span>
                        ) : (
                          <span className="text-slate-400">No Contact</span>
                        )}
                      </div>
                    )}

                    {dayIncidents.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-300 font-mono bg-rose-950/80 border border-rose-500/40 px-1 py-0.5 rounded truncate">
                        <FileWarning className="w-2.5 h-2.5 shrink-0 text-rose-400" />
                        <span>{dayIncidents.length} event{dayIncidents.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Color Legend */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 pt-3 border-t border-slate-800">
            <span className="text-slate-400 text-[11px] uppercase font-semibold">Legend:</span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Interacted
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> No Contact
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Tense Friction
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Hostile / Incident
            </span>
          </div>
        </div>

        {/* Selected Date Inspector Panel (1 col on right) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Selected Day Inspector
              </span>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
            </div>

            <button
              onClick={() => onSelectDateForLog(selectedDate)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-1"
            >
              <span>{selectedLog ? 'Edit Daily' : 'Log Daily'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Daily Check-in Summary */}
          {selectedLog ? (
            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Daily Pulse</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Logged
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Interaction:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedLog.hadInteraction ? 'Yes, Interacted' : 'No Contact / Avoided'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Work Tie-in:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedLog.hadDailyTieIn ? 'Yes, Shared Task/Sync' : 'None / Casual'}
                  </span>
                </div>

                {selectedLog.tieInType && !selectedLog.tieInType.startsWith('None') && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tie-in Context:</span>
                    <span className="font-mono text-indigo-300 truncate max-w-[150px]">
                      {selectedLog.tieInType}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">Climate:</span>
                  <span className="capitalize font-semibold text-slate-200">
                    {selectedLog.overallClimate.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {selectedLog.quickNotes && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block text-[11px] mb-1 font-semibold">
                    Quick Notes:
                  </span>
                  <p className={`text-slate-300 text-xs italic ${stealthMode ? 'blur-sm select-none' : ''}`}>
                    &ldquo;{selectedLog.quickNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800/80 text-center space-y-2 text-xs">
              <Clock className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-slate-400">No daily interaction pulse logged for this date.</p>
              <button
                onClick={() => onSelectDateForLog(selectedDate)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Log daily check-in for {selectedDate}
              </button>
            </div>
          )}

          {/* Specific Incidents for this Date */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                <span>Timestamped Incidents ({selectedDayIncidents.length})</span>
              </h3>

              <button
                onClick={() =>
                  onOpenCustomReport({
                    date: selectedDate,
                    coworkerId: primaryCoworker.id,
                  })
                }
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>File Incident</span>
              </button>
            </div>

            {selectedDayIncidents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No specific conflict or contemporaneous incident reports logged on this day.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 capitalize">
                        {inc.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 uppercase bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">
                        {inc.severity}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {inc.medium}
                    </div>

                    <p className={`text-slate-300 text-xs line-clamp-2 ${stealthMode ? 'blur-sm select-none' : ''}`}>
                      {inc.objectiveFacts}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
