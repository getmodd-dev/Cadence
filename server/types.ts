export type InteractionMedium =
  | '1-on-1 In Person'
  | 'Team Meeting'
  | 'Slack / Teams / Chat'
  | 'Email'
  | 'Phone / Video Call'
  | 'Hallway / Common Area'
  | 'Off-site / Social'
  | 'Other';

export type InteractionType =
  | 'routine_neutral'
  | 'cordial_positive'
  | 'passive_aggressive'
  | 'dismissive_interrupt'
  | 'condescending'
  | 'hostile_confrontational'
  | 'inappropriate_remark'
  | 'micromanagement'
  | 'exclusion_isolation'
  | 'unreasonable_demand'
  | 'boundary_violation'
  | 'other';

export type SeverityLevel = 'neutral' | 'minor' | 'moderate' | 'severe';

export type InitiatorType = 'coworker' | 'self' | 'scheduled_meeting' | 'third_party';

export type EvidenceType =
  | 'Email Saved'
  | 'Screenshot Saved'
  | 'Chat Log Exported'
  | 'Audio / Transcript'
  | 'Meeting Notes / Agenda'
  | 'Witness Confirmation'
  | 'None';

export interface Interaction {
  id: string;
  coworkerId: string;
  coworkerName: string;
  timestamp: string; // ISO string of when interaction occurred
  recordedAt: string; // ISO string of when log was entered
  updatedAt?: string;
  medium: InteractionMedium;
  type: InteractionType;
  severity: SeverityLevel;
  initiator: InitiatorType;
  location: string;
  witnesses: string[];
  objectiveFacts: string; // What happened, exact quotes, who said what
  impactNotes?: string; // Emotional response, impact on work, health, or projects
  actionTaken?: string; // e.g. "Sent recap email", "Informed manager", "No action"
  evidence: EvidenceType[];
  evidenceDescription?: string;
  tags: string[];
  isFlaggedForHR?: boolean;
}

export interface CoworkerProfile {
  id: string;
  alias: string; // e.g. "Coworker J" or actual name
  role: string; // e.g. "Senior Engineer"
  department: string; // e.g. "Product Engineering"
  relationship: 'Peer' | 'Manager' | 'Direct Report' | 'Cross-functional' | 'Executive' | 'External';
  notes?: string;
  isPrimarySubject: boolean;
  createdAt: string;
}

export interface SystemSettings {
  pinHash: string | null; // hashed PIN or null if no lock
  pinEnabled: boolean;
  autoLockMinutes: number; // 0 = disabled, 5, 15, 30
  stealthBlurDefault: boolean;
  anonymizeInView: boolean; // hide actual names with aliases
  coworkerDefaultAlias: string;
}

export type DailyTieInType =
  | 'None - Casual / Unrelated to Work'
  | 'Daily Standup / Team Sync'
  | 'Shared Project / Task Dependency'
  | 'Sprint Planning / Backlog Review'
  | 'Code / Design Review'
  | 'Ad-hoc Work Handoff'
  | 'Unsolicited Non-Work Approach';

export type DailyOverallClimate =
  | 'peaceful_neutral'
  | 'cordial_positive'
  | 'cold_avoidant'
  | 'tense_friction'
  | 'confrontational';

export interface DailyCheckin {
  id: string;
  date: string; // YYYY-MM-DD
  coworkerId: string;
  coworkerName: string;
  hadInteraction: boolean; // was there an interaction
  hadDailyTieIn: boolean; // was there a daily tie-in
  tieInType?: DailyTieInType;
  overallClimate: DailyOverallClimate;
  quickNotes: string; // quick notes
  recordedAt: string;
  updatedAt?: string;
  associatedIncidentId?: string;
}

export interface EncryptionInfo {
  enabled: boolean;
  algo: string;
  kdf: string;
  isEncryptedOnDisk: boolean;
  status: string;
}

export interface DatabaseState {
  version: number;
  coworkers: CoworkerProfile[];
  interactions: Interaction[];
  dailyLogs: DailyCheckin[];
  settings: SystemSettings;
  lastBackupDate?: string;
}

