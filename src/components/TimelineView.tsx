import React, { useState } from 'react';
import { Interaction, CoworkerProfile } from '../types';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  AlertCircle,
  Clock,
  ShieldAlert,
  MapPin,
  Users,
  Paperclip,
  BookmarkCheck,
} from 'lucide-react';

interface TimelineViewProps {
  interactions: Interaction[];
  coworkers: CoworkerProfile[];
  onEdit: (interaction: Interaction) => void;
  onDelete: (id: string) => Promise<void>;
  onNewClick: () => void;
  stealthMode: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  interactions,
  coworkers,
  onEdit,
  onDelete,
  onNewClick,
  stealthMode,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([interactions[0]?.id].filter(Boolean)));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyFormatted = (item: Interaction) => {
    const formatted = `[CONTEMPORANEOUS LOG]
Incident Time: ${new Date(item.timestamp).toLocaleString()}
Recorded At: ${new Date(item.recordedAt).toLocaleString()}
Subject: ${item.coworkerName}
Channel: ${item.medium} | Location: ${item.location}
Type: ${item.type.replace('_', ' ').toUpperCase()} | Severity: ${item.severity.toUpperCase()}
Witnesses: ${item.witnesses.join(', ')}
Evidence: ${item.evidence.join(', ')}

OBJECTIVE FACTS:
${item.objectiveFacts}

IMPACT:
${item.impactNotes || 'None recorded'}

ACTION TAKEN:
${item.actionTaken || 'None recorded'}
`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items
  const filtered = interactions.filter((item) => {
    if (flaggedOnly && !item.isFlaggedForHR) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        item.objectiveFacts.toLowerCase().includes(q) ||
        (item.impactNotes && item.impactNotes.toLowerCase().includes(q)) ||
        item.coworkerName.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Calculate contemporaneous delay helper
  const getDelayString = (occurred: string, recorded: string) => {
    const diffMs = new Date(recorded).getTime() - new Date(occurred).getTime();
    if (diffMs < 0) return 'Concurrent entry';
    const mins = Math.round(diffMs / (1000 * 60));
    if (mins < 60) return `Logged ${mins}m after event`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Logged ${hours}h after event`;
    const days = Math.round(hours / 24);
    return `Logged ${days}d after event`;
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'text-rose-400 border border-rose-500/30 bg-rose-950/30';
      case 'moderate':
        return 'text-amber-400 border border-amber-500/30 bg-amber-950/30';
      case 'minor':
        return 'text-sky-400 border border-sky-500/30 bg-sky-950/30';
      default:
        return 'text-slate-400 border border-slate-700 bg-slate-900/50';
    }
  };

  const formatTypeName = (typeStr: string) => {
    return typeStr
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search statements, quotes, locations, tags, witnesses..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Flagged filter toggle */}
            <button
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                flaggedOnly
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Flagged for HR ({interactions.filter((i) => i.isFlaggedForHR).length})</span>
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Interaction Types</option>
            <option value="dismissive_interrupt">Dismissive / Cut Off</option>
            <option value="passive_aggressive">Passive-Aggressive</option>
            <option value="hostile_confrontational">Hostile / Confrontational</option>
            <option value="exclusion_isolation">Exclusion / Omission</option>
            <option value="micromanagement">Micromanagement</option>
            <option value="inappropriate_remark">Inappropriate Remark</option>
            <option value="unreasonable_demand">Unreasonable Demand</option>
            <option value="routine_neutral">Routine / Neutral</option>
            <option value="cordial_positive">Cordial / Positive</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="neutral">Neutral</option>
            <option value="minor">Minor Friction</option>
            <option value="moderate">Moderate Concern</option>
            <option value="severe">Severe / Violation</option>
          </select>

          {(search || selectedType !== 'all' || selectedSeverity !== 'all' || flaggedOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('all');
                setSelectedSeverity('all');
                setFlaggedOnly(false);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Total Encounters</div>
          <div className="text-xl font-bold text-slate-100 font-mono tabular-nums mt-0.5">
            {interactions.length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Flagged For Review</div>
          <div className="text-xl font-bold text-indigo-300 font-mono tabular-nums mt-0.5">
            {interactions.filter((i) => i.isFlaggedForHR).length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Unobserved (Solo 1:1)</div>
          <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-0.5">
            {
              interactions.filter((i) =>
                i.witnesses.some((w) => w.toLowerCase().includes('private') || w.toLowerCase().includes('none'))
              ).length
            }
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
          <div className="text-slate-400">Evidence Preserved</div>
          <div className="text-xl font-bold text-emerald-300 font-mono tabular-nums mt-0.5">
            {interactions.filter((i) => i.evidence.length > 0 && !i.evidence.includes('None')).length}
          </div>
        </div>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-slate-800/80 rounded-lg bg-slate-900/30">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">No interaction records match your filter.</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or log a new workplace encounter.
          </p>
          <button
            onClick={onNewClick}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Log First Interaction
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            const delayText = getDelayString(item.timestamp, item.recordedAt);

            return (
              <div
                key={item.id}
                className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden transition-all hover:border-slate-700/80"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="p-4 cursor-pointer select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/30 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      type="button"
                      className="mt-0.5 sm:mt-0 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold text-slate-100 ${stealthMode ? 'blur-sm select-none' : ''}`}>
                          {item.coworkerName}
                        </span>
                        <span className="text-slate-600 font-mono">·</span>
                        <span className="text-xs font-medium text-slate-300">
                          {formatTypeName(item.type)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${getSeverityBadgeClass(item.severity)}`}>
                          {item.severity.toUpperCase()}
                        </span>
                        {item.isFlaggedForHR && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-medium">
                            HR Flag
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.medium}</span>
                        {item.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[200px]">{item.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-emerald-400/80 font-mono bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded">
                      {delayText}
                    </span>
                  </div>
                </div>

                {/* Collapsed Preview if not expanded */}
                {!isExpanded && (
                  <div
                    onClick={() => toggleExpand(item.id)}
                    className="px-4 pb-3 cursor-pointer text-xs text-slate-400 line-clamp-2"
                  >
                    <span className={stealthMode ? 'blur-sm select-none' : ''}>
                      {item.objectiveFacts}
                    </span>
                  </div>
                )}

                {/* Expanded Full Details */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-slate-800/60 space-y-4 text-xs">
                    {/* Contemporaneous Proof Bar */}
                    <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Incident: {new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-400">
                        System Audit Entry: {new Date(item.recordedAt).toLocaleString()} ({delayText})
                      </div>
                    </div>

                    {/* Objective Facts Statement */}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                        Objective Facts & Quotes
                      </div>
                      <div className={`p-3.5 rounded bg-slate-950 border border-slate-800/80 text-slate-200 leading-relaxed font-sans text-sm whitespace-pre-wrap ${stealthMode ? 'blur-md select-none' : ''}`}>
                        {item.objectiveFacts}
                      </div>
                    </div>

                    {/* Impact & Action */}
                    {(item.impactNotes || item.actionTaken) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {item.impactNotes && (
                          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                            <div className="font-semibold text-slate-400 mb-1">
                              Impact On Deliverables & Well-Being:
                            </div>
                            <div className={`text-slate-300 leading-normal ${stealthMode ? 'blur-sm select-none' : ''}`}>
                              {item.impactNotes}
                            </div>
                          </div>
                        )}
                        {item.actionTaken && (
                          <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                            <div className="font-semibold text-slate-400 mb-1">
                              Follow-Up Action Taken:
                            </div>
                            <div className={`text-slate-300 leading-normal ${stealthMode ? 'blur-sm select-none' : ''}`}>
                              {item.actionTaken}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Witnesses & Evidence */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/50">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Witnesses */}
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>Witnesses:</span>
                          <span className={`text-slate-200 font-medium ${stealthMode ? 'blur-sm select-none' : ''}`}>
                            {item.witnesses.join(', ')}
                          </span>
                        </div>

                        {/* Evidence */}
                        {item.evidence.length > 0 && !item.evidence.includes('None') && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Evidence:</span>
                            <span className="text-indigo-300">
                              {item.evidence.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyFormatted(item)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                          title="Copy standardized log statement to clipboard"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Excerpt</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onEdit(item)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {deleteConfirmId === item.id ? (
                          <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 p-1 rounded">
                            <span className="text-rose-200 text-xs px-1">Delete?</span>
                            <button
                              onClick={() => {
                                onDelete(item.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded text-xs hover:bg-rose-500"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 text-slate-400 hover:text-white text-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
