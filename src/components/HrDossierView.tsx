import React, { useState, useMemo } from 'react';
import { Interaction, CoworkerProfile, DailyCheckin } from '../types';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Check,
  Copy,
  Users,
  Paperclip,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

interface HrDossierViewProps {
  interactions: Interaction[];
  dailyLogs: DailyCheckin[];
  coworkers: CoworkerProfile[];
}

type DateFilterMode = 'all' | 'month' | 'custom' | 'last30' | 'last90';

export const HrDossierView: React.FC<HrDossierViewProps> = ({
  interactions,
  dailyLogs,
  coworkers,
}) => {
  // Date filtering state
  const [filterMode, setFilterMode] = useState<DateFilterMode>('month');

  // Available months from data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    // Add current month by default
    const nowStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    set.add(nowStr);

    dailyLogs.forEach((d) => {
      if (d.date) set.add(d.date.slice(0, 7));
    });
    interactions.forEach((i) => {
      if (i.timestamp) set.add(i.timestamp.slice(0, 7));
    });

    return Array.from(set).sort().reverse();
  }, [dailyLogs, interactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().slice(0, 7)
  );

  // Custom date range
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [customStartDate, setCustomStartDate] = useState(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Content configuration toggles
  const [includeDailyLogs, setIncludeDailyLogs] = useState(true);
  const [includeIncidents, setIncludeIncidents] = useState(true);
  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState(false);
  const [includeWitnessSummary, setIncludeWitnessSummary] = useState(true);
  const [includeEvidenceCatalog, setIncludeEvidenceCatalog] = useState(true);

  // Reporter & statement customization
  const [employeeName, setEmployeeName] = useState('Employee / Reporter');
  const [employeeTitle, setEmployeeTitle] = useState('Contributor / Team Member');
  const [notesOrStatement, setNotesOrStatement] = useState(
    'This document constitutes an official contemporaneous, chronologically recorded log of workplace interactions and incidents documented on a private self-hosted database at or near the time of occurrence.'
  );

  const [copiedText, setCopiedText] = useState(false);

  const primaryCoworker = coworkers.find((c) => c.isPrimarySubject) || coworkers[0] || {
    alias: 'Subject Coworker',
    role: 'Colleague',
    department: 'Organization',
    relationship: 'Peer',
  };

  // Filter Daily Logs by Date
  const filteredDailyLogs = useMemo(() => {
    return dailyLogs
      .filter((d) => {
        if (filterMode === 'all') return true;
        if (filterMode === 'month') {
          return d.date.startsWith(selectedMonth);
        }
        if (filterMode === 'last30') {
          const cut = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
          return d.date >= cut;
        }
        if (filterMode === 'last90') {
          const cut = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
          return d.date >= cut;
        }
        if (filterMode === 'custom') {
          return d.date >= customStartDate && d.date <= customEndDate;
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dailyLogs, filterMode, selectedMonth, customStartDate, customEndDate]);

  // Filter Incidents by Date & Flag
  const filteredIncidents = useMemo(() => {
    return interactions
      .filter((item) => {
        if (filterFlaggedOnly && !item.isFlaggedForHR) return false;

        const dateStr = item.timestamp.slice(0, 10);
        if (filterMode === 'all') return true;
        if (filterMode === 'month') {
          return dateStr.startsWith(selectedMonth);
        }
        if (filterMode === 'last30') {
          const cut = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
          return dateStr >= cut;
        }
        if (filterMode === 'last90') {
          const cut = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
          return dateStr >= cut;
        }
        if (filterMode === 'custom') {
          return dateStr >= customStartDate && dateStr <= customEndDate;
        }
        return true;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [interactions, filterFlaggedOnly, filterMode, selectedMonth, customStartDate, customEndDate]);

  // Statistics for Executive Summary
  const stats = useMemo(() => {
    const totalDaysLogged = filteredDailyLogs.length;
    const daysWithInteraction = filteredDailyLogs.filter((d) => d.hadInteraction).length;
    const daysWithoutInteraction = filteredDailyLogs.filter((d) => !d.hadInteraction).length;
    const daysWithTieIn = filteredDailyLogs.filter((d) => d.hadDailyTieIn).length;

    const climateCounts = {
      peaceful_neutral: filteredDailyLogs.filter((d) => d.overallClimate === 'peaceful_neutral').length,
      cordial_positive: filteredDailyLogs.filter((d) => d.overallClimate === 'cordial_positive').length,
      cold_avoidant: filteredDailyLogs.filter((d) => d.overallClimate === 'cold_avoidant').length,
      tense_friction: filteredDailyLogs.filter((d) => d.overallClimate === 'tense_friction').length,
      confrontational: filteredDailyLogs.filter((d) => d.overallClimate === 'confrontational').length,
    };

    const totalIncidents = filteredIncidents.length;
    const severeIncidents = filteredIncidents.filter((i) => i.severity === 'severe').length;
    const moderateIncidents = filteredIncidents.filter((i) => i.severity === 'moderate').length;

    const soloIncidents = filteredIncidents.filter((i) =>
      i.witnesses.some((w) => w.toLowerCase().includes('private') || w.toLowerCase().includes('none'))
    ).length;

    const evidenceCount = filteredIncidents.filter(
      (i) => i.evidence.length > 0 && !i.evidence.includes('None')
    ).length;

    return {
      totalDaysLogged,
      daysWithInteraction,
      daysWithoutInteraction,
      daysWithTieIn,
      climateCounts,
      totalIncidents,
      severeIncidents,
      moderateIncidents,
      soloIncidents,
      evidenceCount,
    };
  }, [filteredDailyLogs, filteredIncidents]);

  // Aggregate Witnesses
  const witnessSummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredIncidents.forEach((inc) => {
      inc.witnesses.forEach((w) => {
        const clean = w.trim();
        if (clean && !clean.toLowerCase().includes('none') && !clean.toLowerCase().includes('private')) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredIncidents]);

  // Aggregate Evidence
  const evidenceCatalog = useMemo(() => {
    const list: { type: string; description: string; incidentDate: string; incidentId: string }[] = [];
    filteredIncidents.forEach((inc) => {
      if (inc.evidence && !inc.evidence.includes('None')) {
        inc.evidence.forEach((ev) => {
          list.push({
            type: ev,
            description: inc.evidenceDescription || 'Archived on local host for review',
            incidentDate: new Date(inc.timestamp).toLocaleString(),
            incidentId: inc.id,
          });
        });
      }
    });
    return list;
  }, [filteredIncidents]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (filterMode === 'custom') {
      return `${customStartDate} to ${customEndDate}`;
    }
    if (filterMode === 'last30') return 'Past 30 Days';
    if (filterMode === 'last90') return 'Past 90 Days';
    return 'All Time History';
  }, [filterMode, selectedMonth, customStartDate, customEndDate]);

  const handlePrint = () => {
    window.print();
  };

  // Export filtered CSV (Combined Daily Logs + Incidents)
  const handleExportFilteredCsv = () => {
    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    let csvContent = `HR WORKPLACE DOSSIER - ${dateRangeLabel}\r\n`;
    csvContent += `Subject: ${primaryCoworker.alias} (${primaryCoworker.role})\r\n`;
    csvContent += `Reporter: ${employeeName}\r\n\r\n`;

    // Part 1: Daily Logs
    if (includeDailyLogs) {
      csvContent += `SECTION 1: DAILY INTERACTION LEDGER\r\n`;
      csvContent += `Date,Interaction_Occurred,Work_Tie_In,Tie_In_Context,Overall_Climate,Quick_Notes\r\n`;
      filteredDailyLogs.forEach((d) => {
        csvContent += [
          escapeCsv(d.date),
          escapeCsv(d.hadInteraction ? 'YES' : 'NO CONTACT'),
          escapeCsv(d.hadDailyTieIn ? 'YES' : 'NO'),
          escapeCsv(d.tieInType || ''),
          escapeCsv(d.overallClimate),
          escapeCsv(d.quickNotes),
        ].join(',') + '\r\n';
      });
      csvContent += `\r\n`;
    }

    // Part 2: Incidents
    if (includeIncidents) {
      csvContent += `SECTION 2: DETAILED INCIDENTS\r\n`;
      csvContent += `Incident_Date,Logged_At,Channel,Location,Type,Severity,Witnesses,Evidence,Facts_Quotes,Impact,Action_Taken,Flagged_HR\r\n`;
      filteredIncidents.forEach((i) => {
        csvContent += [
          escapeCsv(i.timestamp),
          escapeCsv(i.recordedAt),
          escapeCsv(i.medium),
          escapeCsv(i.location),
          escapeCsv(i.type),
          escapeCsv(i.severity),
          escapeCsv(i.witnesses),
          escapeCsv(i.evidence),
          escapeCsv(i.objectiveFacts),
          escapeCsv(i.impactNotes),
          escapeCsv(i.actionTaken),
          escapeCsv(i.isFlaggedForHR ? 'YES' : 'NO'),
        ].join(',') + '\r\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr_dossier_${filterMode}_${dateRangeLabel.replace(/[\s,]+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export filtered JSON
  const handleExportFilteredJson = () => {
    const data = {
      dossierTitle: 'Workplace Contemporaneous Interaction Record',
      period: dateRangeLabel,
      generatedAt: new Date().toISOString(),
      reporter: { name: employeeName, title: employeeTitle },
      subject: primaryCoworker,
      statistics: stats,
      dailyLogs: includeDailyLogs ? filteredDailyLogs : [],
      incidents: includeIncidents ? filteredIncidents : [],
      witnessSummary: witnessSummary.map(([w, count]) => ({ witness: w, count })),
      evidenceCatalog,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr_dossier_${dateRangeLabel.replace(/[\s,]+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    const text = `CONTEMPORANEOUS WORKPLACE DOSSIER SUMMARY
Reporting Period: ${dateRangeLabel}
Subject: ${primaryCoworker.alias} (${primaryCoworker.role} · ${primaryCoworker.department || primaryCoworker.relationship})
Reporter: ${employeeName}

SUMMARY METRICS:
- Days Recorded in Period: ${stats.totalDaysLogged}
- Days with Contact: ${stats.daysWithInteraction} | Days without Contact: ${stats.daysWithoutInteraction}
- Days with Work Tie-Ins (Meetings/Tasks): ${stats.daysWithTieIn}
- Climate Breakdown: ${stats.climateCounts.peaceful_neutral} Neutral, ${stats.climateCounts.cold_avoidant} Avoidant, ${stats.climateCounts.tense_friction} Tense, ${stats.climateCounts.confrontational} Hostile
- Specific Incidents Filed: ${stats.totalIncidents} (Severe: ${stats.severeIncidents}, Moderate: ${stats.moderateIncidents})
- Unwitnessed (Solo) Incidents: ${stats.soloIncidents}
- Evidence Items Preserved: ${stats.evidenceCount}

ATTESTATION:
"${notesOrStatement}"
`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* 1. TOP CONTROL PANEL (Hidden on Print) */}
      <div className="no-print bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Contemporaneous HR Dossier Builder</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Compile evidentiary reports of daily interactions and incidents by month or custom date range.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportFilteredCsv}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportFilteredJson}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Dossier</span>
            </button>
          </div>
        </div>

        {/* TIME RANGE SELECTION CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Timeframe Mode Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reporting Timeframe:</span>
            </label>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filterMode === 'month'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                By Month
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('custom')}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filterMode === 'custom'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Date Range
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('last30')}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filterMode === 'last30'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Past 30 Days
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('last90')}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filterMode === 'last90'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Past 90 Days
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filterMode === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All History
              </button>
            </div>

            {/* Dynamic Context Input based on Filter Mode */}
            {filterMode === 'month' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400">Select Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {availableMonths.map((m) => {
                    const [y, mon] = m.split('-');
                    const d = new Date(parseInt(y, 10), parseInt(mon, 10) - 1, 1);
                    return (
                      <option key={m} value={m}>
                        {d.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {filterMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">Start Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">End Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dossier Section Toggles */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dossier Inclusions:</span>
            </label>

            <div className="flex flex-wrap gap-2 text-xs">
              <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDailyLogs}
                  onChange={(e) => setIncludeDailyLogs(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Daily Contact Ledger ({filteredDailyLogs.length})</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIncidents}
                  onChange={(e) => setIncludeIncidents(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Detailed Incidents ({filteredIncidents.length})</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterFlaggedOnly}
                  onChange={(e) => setFilterFlaggedOnly(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Flagged Incidents Only</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWitnessSummary}
                  onChange={(e) => setIncludeWitnessSummary(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Witness Corroboration Index</span>
              </label>

              <label className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEvidenceCatalog}
                  onChange={(e) => setIncludeEvidenceCatalog(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span className="text-slate-300">Preserved Evidence Catalog</span>
              </label>
            </div>
          </div>
        </div>

        {/* Reporter Header Details */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 text-[11px]">Your Full Name (Reporter):</label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 text-[11px]">Your Job Title & Department:</label>
            <input
              type="text"
              value={employeeTitle}
              onChange={(e) => setEmployeeTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* 2. FORMAL DOSSIER SHEET (Styled for Screen & 1:1 Clean Print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-10 text-slate-100 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 space-y-8">
        {/* DOCUMENT HEADER */}
        <div className="border-b-2 border-slate-700 print:border-black pb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase print:text-black font-sans">
                Contemporaneous Workplace Interaction Record
              </h2>
              <div className="text-xs text-slate-400 print:text-gray-600 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span>Reporting Scope: <strong>{dateRangeLabel}</strong></span>
                <span>·</span>
                <span>Document Generated: {new Date().toLocaleDateString()}</span>
                <span>·</span>
                <span>Integrity: Self-Hosted Contemporaneous Audit Record</span>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs font-mono text-slate-400 print:text-gray-700 bg-slate-950 print:bg-gray-100 p-2.5 rounded border border-slate-800 print:border-gray-300 shrink-0">
              <div>Days Logged: <strong className="text-slate-200 print:text-black">{stats.totalDaysLogged}</strong></div>
              <div>Incidents Recorded: <strong className="text-rose-400 print:text-black">{stats.totalIncidents}</strong></div>
            </div>
          </div>

          {/* Metadata Block: Subject vs Reporter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-slate-400 print:text-gray-500 block uppercase font-mono text-[10px]">
                Subject Individual
              </span>
              <span className="font-semibold text-slate-100 print:text-black text-sm">
                {primaryCoworker.alias}
              </span>
              <span className="block text-slate-400 print:text-gray-600 text-xs">
                {primaryCoworker.role || 'Colleague'} ({primaryCoworker.department || primaryCoworker.relationship})
              </span>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-500 block uppercase font-mono text-[10px]">
                Reporting Individual
              </span>
              <span className="font-semibold text-slate-100 print:text-black text-sm">
                {employeeName}
              </span>
              <span className="block text-slate-400 print:text-gray-600 text-xs">
                {employeeTitle}
              </span>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-500 block uppercase font-mono text-[10px]">
                Data Provenance & System
              </span>
              <span className="font-semibold text-slate-100 print:text-black text-sm">
                Self-Hosted Private Database
              </span>
              <span className="block text-slate-400 print:text-gray-600 text-xs">
                Audited Timestamps & Preserved Records
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 print:bg-gray-100 rounded border border-slate-800 print:border-gray-300 text-xs text-slate-300 print:text-gray-800 italic leading-relaxed">
            &ldquo;{notesOrStatement}&rdquo;
          </div>
        </div>

        {/* EXECUTIVE PATTERN SUMMARY & METRICS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
            I. Executive Pattern & Behavioral Frequency Analysis ({dateRangeLabel})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Interaction Frequency</span>
              <span className="text-lg font-bold font-mono text-slate-100 print:text-black">
                {stats.daysWithInteraction} / {stats.totalDaysLogged} days
              </span>
              <span className="text-[10px] text-slate-400 print:text-gray-500 block mt-0.5">
                ({stats.totalDaysLogged > 0 ? Math.round((stats.daysWithInteraction / stats.totalDaysLogged) * 100) : 0}% of days recorded)
              </span>
            </div>

            <div className="p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Days with Work Tie-Ins</span>
              <span className="text-lg font-bold font-mono text-indigo-300 print:text-black">
                {stats.daysWithTieIn} days
              </span>
              <span className="text-[10px] text-slate-400 print:text-gray-500 block mt-0.5">
                Standups, deliverables, reviews
              </span>
            </div>

            <div className="p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">High Friction / Hostility</span>
              <span className="text-lg font-bold font-mono text-rose-400 print:text-black">
                {stats.climateCounts.tense_friction + stats.climateCounts.confrontational} days
              </span>
              <span className="text-[10px] text-slate-400 print:text-gray-500 block mt-0.5">
                Tense or confrontational climate
              </span>
            </div>

            <div className="p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-300">
              <span className="text-slate-400 print:text-gray-600 block text-[11px]">Unobserved Ratio</span>
              <span className="text-lg font-bold font-mono text-amber-300 print:text-black">
                {stats.totalIncidents > 0 ? Math.round((stats.soloIncidents / stats.totalIncidents) * 100) : 0}%
              </span>
              <span className="text-[10px] text-slate-400 print:text-gray-500 block mt-0.5">
                {stats.soloIncidents} solo / unwitnessed encounters
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: DAILY INTERACTION LEDGER */}
        {includeDailyLogs && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
                II. Daily Interaction & Contact Ledger ({filteredDailyLogs.length} Records)
              </h3>
              <span className="text-xs text-slate-400 print:text-gray-600 font-mono">
                Continuous Daily Pulse Log
              </span>
            </div>

            {filteredDailyLogs.length === 0 ? (
              <p className="text-xs text-slate-400 print:text-gray-600 italic p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-200">
                No daily check-in pulses recorded for {dateRangeLabel}.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-800 print:border-gray-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700">
                      <th className="py-2.5 px-3 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Interaction Occurred?</th>
                      <th className="py-2.5 px-3 font-semibold">Daily Tie-In Context</th>
                      <th className="py-2.5 px-3 font-semibold">Demeanor / Tone</th>
                      <th className="py-2.5 px-3 font-semibold">Contemporaneous Daily Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 print:divide-gray-200 font-sans text-xs">
                    {filteredDailyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                        <td className="py-2 px-3 font-mono text-slate-200 print:text-black whitespace-nowrap font-medium">
                          {log.date}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {log.hadInteraction ? (
                            <span className="text-indigo-300 print:text-black font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 print:text-gray-700 inline" />
                              Yes, Interacted
                            </span>
                          ) : (
                            <span className="text-slate-400 print:text-gray-600 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-slate-500 inline" />
                              No Contact / Avoided
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-300 print:text-black">
                          {log.hadDailyTieIn ? (
                            <span className="font-medium text-slate-200 print:text-black">
                              {log.tieInType || 'Shared Work Task'}
                            </span>
                          ) : (
                            <span className="text-slate-500 print:text-gray-500">None / Casual</span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap capitalize">
                          <span
                            className={
                              log.overallClimate === 'confrontational'
                                ? 'text-rose-400 font-bold'
                                : log.overallClimate === 'tense_friction'
                                ? 'text-amber-400 font-medium'
                                : log.overallClimate === 'cold_avoidant'
                                ? 'text-sky-300'
                                : 'text-slate-300 print:text-black'
                            }
                          >
                            {log.overallClimate.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 print:text-black leading-relaxed">
                          {log.quickNotes ? log.quickNotes : <span className="text-slate-500 italic">No notes</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: DETAILED CONTEMPORANEOUS INCIDENT RECORDS */}
        {includeIncidents && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-gray-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
                III. Detailed Incident Records & Verbatim Statements ({filteredIncidents.length} Events)
              </h3>
              <span className="text-xs text-slate-400 print:text-gray-600 font-mono">
                Specific Contemporaneous Evidence Entries
              </span>
            </div>

            {filteredIncidents.length === 0 ? (
              <p className="text-xs text-slate-400 print:text-gray-600 italic p-3 bg-slate-950 print:bg-gray-50 rounded border border-slate-800 print:border-gray-200">
                No formal incident reports recorded for {dateRangeLabel}.
              </p>
            ) : (
              <div className="space-y-5">
                {filteredIncidents.map((inc, idx) => (
                  <div
                    key={inc.id}
                    className="p-4 sm:p-5 rounded-lg bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300 space-y-3 break-inside-avoid"
                  >
                    {/* Header bar of incident */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 print:border-gray-200 pb-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-rose-400 print:text-black text-xs">
                          Incident #{idx + 1}
                        </span>
                        <span className="text-slate-600 font-mono">·</span>
                        <span className="font-semibold text-slate-100 print:text-black">
                          {new Date(inc.timestamp).toLocaleString()}
                        </span>
                        <span className="text-slate-600 font-mono">·</span>
                        <span className="text-slate-300 print:text-gray-700">
                          {inc.medium} {inc.location ? `(${inc.location})` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            inc.severity === 'severe'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40 font-bold'
                              : inc.severity === 'moderate'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {inc.severity}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 print:text-gray-500">
                          Audit Entry: {new Date(inc.recordedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Verbatim Statements */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 print:text-gray-600 block mb-1">
                        Verbatim Statements & Objective Observable Facts:
                      </span>
                      <div className="p-3 bg-slate-900 print:bg-white rounded border border-slate-800 print:border-gray-200 text-xs text-slate-200 print:text-black leading-relaxed whitespace-pre-wrap font-sans">
                        {inc.objectiveFacts}
                      </div>
                    </div>

                    {/* Impact & Action */}
                    {(inc.impactNotes || inc.actionTaken) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {inc.impactNotes && (
                          <div className="p-2.5 bg-slate-900/40 print:bg-white rounded border border-slate-800/60 print:border-gray-200">
                            <span className="text-[10px] uppercase text-slate-400 print:text-gray-600 block font-semibold">
                              Impact On Deliverables & Operations:
                            </span>
                            <span className="text-slate-300 print:text-black text-xs leading-normal">
                              {inc.impactNotes}
                            </span>
                          </div>
                        )}

                        {inc.actionTaken && (
                          <div className="p-2.5 bg-slate-900/40 print:bg-white rounded border border-slate-800/60 print:border-gray-200">
                            <span className="text-[10px] uppercase text-slate-400 print:text-gray-600 block font-semibold">
                              Action Taken:
                            </span>
                            <span className="text-slate-300 print:text-black text-xs leading-normal">
                              {inc.actionTaken}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer: Witnesses & Evidence */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 print:text-gray-600 pt-1 border-t border-slate-800/40">
                      <div>
                        <strong className="text-slate-300 print:text-black">Witnesses Present: </strong>
                        {inc.witnesses.join(', ')}
                      </div>
                      <div>
                        <strong className="text-slate-300 print:text-black">Corroborating Evidence: </strong>
                        {inc.evidence.join(', ')}
                        {inc.evidenceDescription ? ` (${inc.evidenceDescription})` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: WITNESS CORROBORATION INDEX */}
        {includeWitnessSummary && witnessSummary.length > 0 && (
          <div className="space-y-3 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
              IV. Witness & Third-Party Observer Index
            </h3>
            <div className="border border-slate-800 print:border-gray-300 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700">
                    <th className="py-2 px-3 font-semibold">Witness Name / Role</th>
                    <th className="py-2 px-3 font-semibold">Incidents Observed</th>
                    <th className="py-2 px-3 font-semibold">Corroboration Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200 text-xs">
                  {witnessSummary.map(([witness, count]) => (
                    <tr key={witness}>
                      <td className="py-2 px-3 font-medium text-slate-200 print:text-black">
                        {witness}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300 print:text-black">
                        {count} incident{count !== 1 ? 's' : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-400 print:text-gray-600">
                        Present during documented observable statements
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: PRESERVED EVIDENCE CATALOG */}
        {includeEvidenceCatalog && evidenceCatalog.length > 0 && (
          <div className="space-y-3 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black">
              V. Preserved Digital Evidence Catalog
            </h3>
            <div className="border border-slate-800 print:border-gray-300 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 print:bg-gray-100 border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-700">
                    <th className="py-2 px-3 font-semibold">Evidence Type</th>
                    <th className="py-2 px-3 font-semibold">Incident Timestamp</th>
                    <th className="py-2 px-3 font-semibold">Archive Description & Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200 text-xs">
                  {evidenceCatalog.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-indigo-300 print:text-black whitespace-nowrap">
                        {item.type}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300 print:text-black whitespace-nowrap">
                        {item.incidentDate}
                      </td>
                      <td className="py-2 px-3 text-slate-400 print:text-gray-600">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 5: LEGAL / HR ATTESTATION & SIGNATURE */}
        <div className="pt-8 border-t-2 border-slate-700 print:border-black space-y-6 break-inside-avoid">
          <div className="text-xs text-slate-400 print:text-gray-700 italic leading-relaxed">
            I hereby attest that the daily interaction records and incident reports compiled within this dossier for <strong>{dateRangeLabel}</strong> are contemporaneous, truthful records of my personal observations and workplace experiences, recorded on my private self-hosted system at or near the time of occurrence.
          </div>

          <div className="grid grid-cols-2 gap-10 text-xs pt-4">
            <div>
              <div className="border-b border-slate-600 print:border-black h-10 mb-1" />
              <div className="font-semibold text-slate-200 print:text-black">{employeeName}</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">{employeeTitle}</div>
            </div>

            <div>
              <div className="border-b border-slate-600 print:border-black h-10 mb-1" />
              <div className="font-semibold text-slate-200 print:text-black">Date of Submission</div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
