import React, { useState, useEffect } from 'react';
import {
  InteractionMedium,
  InteractionType,
  SeverityLevel,
  InitiatorType,
  EvidenceType,
  CoworkerProfile,
  Interaction,
} from '../types';
import {
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle,
  FileCheck,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface QuickLoggerProps {
  coworkers: CoworkerProfile[];
  onSave: (entry: Omit<Interaction, 'id' | 'recordedAt'>) => Promise<void>;
  onCancel?: () => void;
  initialData?: Interaction | null;
  prefill?: { date: string; coworkerId: string; notes?: string } | null;
}

const MEDIUMS: InteractionMedium[] = [
  '1-on-1 In Person',
  'Team Meeting',
  'Slack / Teams / Chat',
  'Email',
  'Phone / Video Call',
  'Hallway / Common Area',
  'Off-site / Social',
  'Other',
];

const INTERACTION_TYPES: { value: InteractionType; label: string; tone: 'neutral' | 'caution' | 'warning' | 'danger' }[] = [
  { value: 'routine_neutral', label: 'Routine / Neutral', tone: 'neutral' },
  { value: 'cordial_positive', label: 'Cordial / Positive', tone: 'neutral' },
  { value: 'dismissive_interrupt', label: 'Dismissive / Cut Off', tone: 'caution' },
  { value: 'passive_aggressive', label: 'Passive-Aggressive', tone: 'warning' },
  { value: 'condescending', label: 'Condescending', tone: 'warning' },
  { value: 'micromanagement', label: 'Micromanagement', tone: 'warning' },
  { value: 'exclusion_isolation', label: 'Exclusion / Omission', tone: 'warning' },
  { value: 'unreasonable_demand', label: 'Unreasonable Demand', tone: 'warning' },
  { value: 'hostile_confrontational', label: 'Hostile / Confrontational', tone: 'danger' },
  { value: 'inappropriate_remark', label: 'Inappropriate Remark', tone: 'danger' },
  { value: 'boundary_violation', label: 'Boundary Violation', tone: 'danger' },
  { value: 'other', label: 'Other', tone: 'neutral' },
];

const SEVERITIES: { value: SeverityLevel; label: string; desc: string }[] = [
  { value: 'neutral', label: 'Neutral', desc: 'No negative impact' },
  { value: 'minor', label: 'Minor', desc: 'Slight friction or annoyance' },
  { value: 'moderate', label: 'Moderate', desc: 'Clear disruption / pattern' },
  { value: 'severe', label: 'Severe', desc: 'Blatant policy / harassment' },
];

const INITIATORS: { value: InitiatorType; label: string }[] = [
  { value: 'coworker', label: 'Coworker Initiated' },
  { value: 'self', label: 'I Initiated' },
  { value: 'scheduled_meeting', label: 'Scheduled Meeting' },
  { value: 'third_party', label: 'Third Party / Group' },
];

const EVIDENCE_OPTIONS: EvidenceType[] = [
  'Email Saved',
  'Screenshot Saved',
  'Chat Log Exported',
  'Meeting Notes / Agenda',
  'Audio / Transcript',
  'Witness Confirmation',
  'None',
];

interface QuickPreset {
  label: string;
  medium: InteractionMedium;
  type: InteractionType;
  severity: SeverityLevel;
  initiator: InitiatorType;
  location: string;
  sampleText: string;
  isFlaggedForHR: boolean;
}

const PRESETS: QuickPreset[] = [
  {
    label: 'Meeting Interruption',
    medium: 'Team Meeting',
    type: 'dismissive_interrupt',
    severity: 'minor',
    initiator: 'scheduled_meeting',
    location: 'Conference Room / Video Call',
    sampleText: 'During my update on [Project/Topic], [Name] cut in after ~30 seconds stating: "[Quote exact words]". Did not allow me to finish point until [Colleague/Self] intervened.',
    isFlaggedForHR: false,
  },
  {
    label: 'Passive-Aggressive Remark',
    medium: '1-on-1 In Person',
    type: 'passive_aggressive',
    severity: 'moderate',
    initiator: 'coworker',
    location: 'Hallway / Breakroom',
    sampleText: '[Name] approached me and said: "[Exact quote]". Walked away before a substantive clarification could occur.',
    isFlaggedForHR: true,
  },
  {
    label: 'Email Thread Exclusion',
    medium: 'Email',
    type: 'exclusion_isolation',
    severity: 'moderate',
    initiator: 'coworker',
    location: 'Corporate Email',
    sampleText: '[Name] sent key decisions/updates regarding [Project/Topic] to management without including or CCing me, despite my role as owner of the initiative.',
    isFlaggedForHR: true,
  },
  {
    label: 'Hostile / Confrontational Outburst',
    medium: '1-on-1 In Person',
    type: 'hostile_confrontational',
    severity: 'severe',
    initiator: 'coworker',
    location: 'Office / Common Area',
    sampleText: '[Name] raised voice and stated: "[Exact words]". Physical posture was aggressive and confrontational.',
    isFlaggedForHR: true,
  },
  {
    label: 'Routine Professional Sync',
    medium: 'Slack / Teams / Chat',
    type: 'routine_neutral',
    severity: 'neutral',
    initiator: 'self',
    location: 'Slack Direct Message',
    sampleText: 'Standard work handoff regarding [Task]. [Name] acknowledged and agreed with standard timeline. No conflict.',
    isFlaggedForHR: false,
  },
];

export const QuickLogger: React.FC<QuickLoggerProps> = ({
  coworkers,
  onSave,
  onCancel,
  initialData,
  prefill,
}) => {
  const primaryCoworker = coworkers.find((c) => c.isPrimarySubject) || coworkers[0] || {
    id: 'cw_primary_default',
    alias: 'Primary Coworker',
  };

  const getInitialTimestamp = () => {
    if (initialData?.timestamp) {
      return new Date(initialData.timestamp).toISOString().slice(0, 16);
    }
    if (prefill?.date) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${prefill.date}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    return new Date().toISOString().slice(0, 16);
  };

  const [coworkerId, setCoworkerId] = useState(
    initialData?.coworkerId || prefill?.coworkerId || primaryCoworker.id
  );
  const [timestamp, setTimestamp] = useState(getInitialTimestamp());
  const [medium, setMedium] = useState<InteractionMedium>(initialData?.medium || '1-on-1 In Person');
  const [type, setType] = useState<InteractionType>(initialData?.type || 'routine_neutral');
  const [severity, setSeverity] = useState<SeverityLevel>(initialData?.severity || 'neutral');
  const [initiator, setInitiator] = useState<InitiatorType>(initialData?.initiator || 'coworker');
  const [location, setLocation] = useState(initialData?.location || '');
  
  // Witnesses
  const [isSoloPrivate, setIsSoloPrivate] = useState(
    initialData ? initialData.witnesses.some((w) => w.toLowerCase().includes('private') || w.toLowerCase().includes('none')) : false
  );
  const [witnessInput, setWitnessInput] = useState(
    initialData ? initialData.witnesses.filter((w) => !w.toLowerCase().includes('private') && !w.toLowerCase().includes('none')).join(', ') : ''
  );

  // Notes
  const [objectiveFacts, setObjectiveFacts] = useState(
    initialData?.objectiveFacts || (prefill?.notes ? `[Report for ${prefill.date}]\n${prefill.notes}` : '')
  );
  const [impactNotes, setImpactNotes] = useState(initialData?.impactNotes || '');
  const [actionTaken, setActionTaken] = useState(initialData?.actionTaken || '');

  // Evidence
  const [evidence, setEvidence] = useState<EvidenceType[]>(initialData?.evidence || ['None']);
  const [evidenceDescription, setEvidenceDescription] = useState(initialData?.evidenceDescription || '');
  const [isFlaggedForHR, setIsFlaggedForHR] = useState(initialData?.isFlaggedForHR || false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Set time to current minute
  const handleSetToNow = () => {
    const now = new Date();
    // Local time formatting for input datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setTimestamp(localIso);
  };

  const handleApplyPreset = (preset: QuickPreset) => {
    setMedium(preset.medium);
    setType(preset.type);
    setSeverity(preset.severity);
    setInitiator(preset.initiator);
    if (!location) setLocation(preset.location);
    if (!objectiveFacts || objectiveFacts.trim().length === 0) {
      const selectedCw = coworkers.find((c) => c.id === coworkerId);
      const name = selectedCw ? selectedCw.alias : 'Coworker';
      setObjectiveFacts(preset.sampleText.replace(/\[Name\]/g, name));
    }
    setIsFlaggedForHR(preset.isFlaggedForHR);
  };

  const handleEvidenceToggle = (item: EvidenceType) => {
    if (item === 'None') {
      setEvidence(['None']);
      return;
    }
    const filtered = evidence.filter((e) => e !== 'None');
    if (filtered.includes(item)) {
      const next = filtered.filter((e) => e !== item);
      setEvidence(next.length === 0 ? ['None'] : next);
    } else {
      setEvidence([...filtered, item]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!objectiveFacts.trim()) {
      setValidationError('Please record objective facts of the interaction (quotes, actions).');
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const finalWitnesses: string[] = [];
      if (isSoloPrivate) {
        finalWitnesses.push('None / Private (1-on-1)');
      }
      if (witnessInput.trim()) {
        finalWitnesses.push(...witnessInput.split(',').map((w) => w.trim()).filter(Boolean));
      }
      if (finalWitnesses.length === 0) {
        finalWitnesses.push('None specified');
      }

      const selectedCw = coworkers.find((c) => c.id === coworkerId) || primaryCoworker;

      await onSave({
        coworkerId,
        coworkerName: selectedCw.alias,
        timestamp: new Date(timestamp).toISOString(),
        medium,
        type,
        severity,
        initiator,
        location: location.trim() || 'Workplace',
        witnesses: finalWitnesses,
        objectiveFacts: objectiveFacts.trim(),
        impactNotes: impactNotes.trim(),
        actionTaken: actionTaken.trim(),
        evidence,
        evidenceDescription: evidenceDescription.trim(),
        tags: [type.replace('_', ' '), medium],
        isFlaggedForHR,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (!initialData) {
          // Reset form for next entry
          setObjectiveFacts('');
          setImpactNotes('');
          setActionTaken('');
          setEvidenceDescription('');
          setEvidence(['None']);
          handleSetToNow();
        }
      }, 1500);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [objectiveFacts, coworkerId, timestamp, medium, type, severity, initiator, isSoloPrivate, witnessInput, impactNotes, actionTaken, evidence]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header & Contemporaneous Guarantee Notice */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>
              {initialData
                ? 'Edit Incident Record'
                : prefill
                ? `Custom Incident Report (${prefill.date})`
                : 'Custom Incident Report'}
            </span>
            <span className="text-xs font-normal text-rose-400 font-mono">
              [Contemporaneous Evidence]
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detailed incident documentation with verbatim quotes, witnesses, and corroborating evidence stored in your private database.
          </p>
        </div>

        {/* Quick Presets Carousel */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Quick presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-3 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Contemporaneous interaction logged successfully.</p>
            <p className="text-xs text-emerald-300/80">
              Audit timestamp captured and stored in your self-hosted database volume.
            </p>
          </div>
        </div>
      )}

      {validationError && (
        <div className="mb-6 p-3.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs">{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ROW 1: Coworker & Date/Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Coworker / Subject
            </label>
            <select
              value={coworkerId}
              onChange={(e) => setCoworkerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {coworkers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias} {c.role ? `(${c.role} · ${c.department || c.relationship})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Date & Exact Time of Incident
              </label>
              <button
                type="button"
                onClick={handleSetToNow}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
              >
                <Clock className="w-3 h-3" />
                Set to Now
              </button>
            </div>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* TOGGLE SECTION 1: Communication Medium */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Communication Channel / Medium
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MEDIUMS.map((m) => {
              const active = medium === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMedium(m)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-all ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* TOGGLE SECTION 2: Interaction Nature / Tone */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interaction Nature & Tone
            </label>
            <span className="text-xs text-slate-400">Select one primary category</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {INTERACTION_TYPES.map((t) => {
              const active = type === t.value;
              let activeColor = 'bg-indigo-600 text-white border-indigo-500';
              if (t.tone === 'warning') {
                activeColor = 'bg-amber-600 text-white border-amber-500';
              } else if (t.tone === 'danger') {
                activeColor = 'bg-rose-600 text-white border-rose-500';
              } else if (t.tone === 'neutral' && t.value === 'cordial_positive') {
                activeColor = 'bg-emerald-600 text-white border-emerald-500';
              }

              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-all flex items-center justify-between ${
                    active
                      ? activeColor
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white ml-1.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 3: Severity & Initiator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Severity */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Severity Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map((s) => {
                const active = severity === s.value;
                let activeBorder = 'bg-slate-800 border-indigo-500 text-indigo-300';
                if (s.value === 'moderate') activeBorder = 'bg-slate-800 border-amber-500 text-amber-300';
                if (s.value === 'severe') activeBorder = 'bg-slate-800 border-rose-500 text-rose-300';

                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`p-2.5 rounded-md border text-left transition-colors ${
                      active
                        ? activeBorder
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initiator */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Initiator
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INITIATORS.map((init) => {
                const active = initiator === init.value;
                return (
                  <button
                    key={init.value}
                    type="button"
                    onClick={() => setInitiator(init.value)}
                    className={`px-3 py-3 text-xs font-medium rounded-md border text-center transition-colors ${
                      active
                        ? 'bg-slate-800 text-slate-100 border-indigo-500'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {init.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Location & Witnesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Specific Location / Context
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Conference Room 3B, Slack #proj-ops, Kitchen, My Desk"
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Witnesses Present
              </label>
              <button
                type="button"
                onClick={() => setIsSoloPrivate(!isSoloPrivate)}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  isSoloPrivate
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isSoloPrivate ? 'Marked: 1-on-1 (No Witnesses)' : 'Set as Private 1-on-1'}
              </button>
            </div>
            {!isSoloPrivate ? (
              <input
                type="text"
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                placeholder="Names or roles (comma separated, e.g. Pat L., Team Lead)"
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            ) : (
              <div className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-900/40 rounded px-3 py-2">
                Recorded as an unobserved private encounter with no third-party witnesses.
              </div>
            )}
          </div>
        </div>

        {/* PRIMARY NOTES SECTION */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Objective Facts (Required)
              </label>
              <span className="text-xs text-slate-400">
                Document quotes & direct actions verbatim
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
              Legal/HR best practice: Stick strictly to observable facts and direct quotes (&ldquo;He said: &lsquo;...&rsquo;&rdquo;), avoiding speculative judgments (&ldquo;He was malicious&rdquo;).
            </p>
            <textarea
              rows={5}
              required
              value={objectiveFacts}
              onChange={(e) => setObjectiveFacts(e.target.value)}
              placeholder="What happened? Record exact words spoken, tone, gestures, physical actions, and sequence of events..."
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 leading-relaxed font-sans"
            />
          </div>

          {/* Impact Notes (Collapsible or visible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Impact On Work & Well-Being (Optional)
              </label>
              <textarea
                rows={3}
                value={impactNotes}
                onChange={(e) => setImpactNotes(e.target.value)}
                placeholder="Disrupted sprint delivery, project delay, emotional stress, health impact..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Action Taken / Response (Optional)
              </label>
              <textarea
                rows={3}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g. Sent email recap for written record, informed manager, logged here without escalation..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* EVIDENCE TOGGLES & HR DOSSIER FLAG */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Corroborating Evidence Preserved
          </label>
          <div className="flex flex-wrap gap-2">
            {EVIDENCE_OPTIONS.map((item) => {
              const active = evidence.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleEvidenceToggle(item)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    active
                      ? 'bg-indigo-900/60 text-indigo-200 border-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {evidence.some((e) => e !== 'None') && (
            <input
              type="text"
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              placeholder="Notes on where evidence is kept (e.g. Saved to Unraid /documents/hr-evidence/email_03.eml)"
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 mt-2"
            />
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isFlaggedForHR}
                onChange={(e) => setIsFlaggedForHR(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 bg-slate-950 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-300">
                Flag for Inclusion in HR Incident Dossier
              </span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              Audit Record Timestamp: Automatic
            </span>
          </div>
        </div>

        {/* SUBMISSION FOOTER */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Enter</kbd> to save
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Writing to Self-Hosted DB...' : initialData ? 'Update Record' : 'Save Contemporaneous Entry'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
