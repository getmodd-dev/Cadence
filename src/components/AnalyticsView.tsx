import React from 'react';
import { Interaction } from '../types';
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

interface AnalyticsViewProps {
  interactions: Interaction[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ interactions }) => {
  if (interactions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-200">No Pattern Data Available Yet</h2>
        <p className="text-xs text-slate-400 mt-1">
          Pattern analytics will compute once you log 2 or more workplace interactions.
        </p>
      </div>
    );
  }

  // 1. By Day of Week
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts: Record<string, { total: number; negative: number }> = {
    Mon: { total: 0, negative: 0 },
    Tue: { total: 0, negative: 0 },
    Wed: { total: 0, negative: 0 },
    Thu: { total: 0, negative: 0 },
    Fri: { total: 0, negative: 0 },
    Sat: { total: 0, negative: 0 },
    Sun: { total: 0, negative: 0 },
  };

  interactions.forEach((item) => {
    const d = new Date(item.timestamp);
    const dayName = days[d.getDay()];
    if (dayCounts[dayName]) {
      dayCounts[dayName].total += 1;
      if (item.severity === 'moderate' || item.severity === 'severe') {
        dayCounts[dayName].negative += 1;
      }
    }
  });

  const maxDayTotal = Math.max(...Object.values(dayCounts).map((c) => c.total), 1);

  // 2. By Communication Medium
  const mediumCounts: Record<string, number> = {};
  interactions.forEach((i) => {
    mediumCounts[i.medium] = (mediumCounts[i.medium] || 0) + 1;
  });
  const sortedMediums = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1]);

  // 3. Severity Distribution
  const severityCounts = {
    neutral: interactions.filter((i) => i.severity === 'neutral').length,
    minor: interactions.filter((i) => i.severity === 'minor').length,
    moderate: interactions.filter((i) => i.severity === 'moderate').length,
    severe: interactions.filter((i) => i.severity === 'severe').length,
  };

  // 4. Witness Isolation Metric
  const soloPrivateCount = interactions.filter((i) =>
    i.witnesses.some((w) => w.toLowerCase().includes('private') || w.toLowerCase().includes('none'))
  ).length;
  const soloRatio = Math.round((soloPrivateCount / interactions.length) * 100);

  // 5. Interaction Types Breakdown
  const typeCounts: Record<string, number> = {};
  interactions.forEach((i) => {
    const label = i.type.replace('_', ' ');
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Overview Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <span>Workplace Interaction Pattern Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Objective behavioral recurrence data useful for HR documentation, legal counsel review, and mediation.
        </p>
      </div>

      {/* High-Level Finding Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Isolation factor */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Unwitnessed Ratio</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">
            {soloRatio}%
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {soloPrivateCount} of {interactions.length} interactions took place without third-party witnesses (private 1-on-1s or solo encounters).
          </p>
        </div>

        {/* Severe friction count */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Moderate / Severe</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 font-mono tabular-nums">
            {severityCounts.moderate + severityCounts.severe}
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Incidents involving active hostility, public interruption, or policy-level friction.
          </p>
        </div>

        {/* Evidentiary rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider">Preserved Evidence</span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono tabular-nums">
            {Math.round(
              (interactions.filter((i) => i.evidence.length > 0 && !i.evidence.includes('None')).length /
                interactions.length) *
                100
            )}
            %
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Percentage of documented incidents supported by archived emails, logs, or chat screenshots.
          </p>
        </div>
      </div>

      {/* Grid: Day of Week & Medium Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of Week Recurrence */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Day of Week Distribution
          </h2>
          <div className="space-y-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => {
              const data = dayCounts[day];
              const pct = Math.round((data.total / maxDayTotal) * 100);
              return (
                <div key={day} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{day}</span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      {data.total} encounters {data.negative > 0 ? `(${data.negative} friction)` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-indigo-500 h-2 rounded-l-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Medium / Channel Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Communication Medium Breakdown
          </h2>
          <div className="space-y-3">
            {sortedMediums.map(([med, count]) => {
              const pct = Math.round((count / interactions.length) * 100);
              return (
                <div key={med} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-[200px]">{med}</span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interaction Types & Severity Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interaction Category Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Top Interaction Behaviors
          </h2>
          <div className="space-y-2.5">
            {sortedTypes.map(([typeLabel, count]) => (
              <div key={typeLabel} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <span className="text-slate-200 capitalize">{typeLabel}</span>
                <span className="font-mono text-slate-400 tabular-nums font-semibold">
                  {count} time{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Severity Spectrum */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            Severity Classification
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Severe / Policy Violation</span>
                <span className="text-rose-400 font-mono tabular-nums">{severityCounts.severe}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div
                  className="bg-rose-500 h-2 rounded-full"
                  style={{ width: `${(severityCounts.severe / interactions.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Moderate Disruption</span>
                <span className="text-amber-400 font-mono tabular-nums">{severityCounts.moderate}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${(severityCounts.moderate / interactions.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Minor Friction</span>
                <span className="text-sky-400 font-mono tabular-nums">{severityCounts.minor}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div
                  className="bg-sky-500 h-2 rounded-full"
                  style={{ width: `${(severityCounts.minor / interactions.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Neutral / Routine</span>
                <span className="text-slate-400 font-mono tabular-nums">{severityCounts.neutral}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2">
                <div
                  className="bg-slate-600 h-2 rounded-full"
                  style={{ width: `${(severityCounts.neutral / interactions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
