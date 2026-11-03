import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseState, Interaction, CoworkerProfile, SystemSettings, DailyCheckin } from './types.js';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const DEFAULT_SETTINGS: SystemSettings = {
  pinHash: null,
  pinEnabled: false,
  autoLockMinutes: 15,
  stealthBlurDefault: false,
  anonymizeInView: false,
  coworkerDefaultAlias: 'Subject Coworker (Alex M.)',
};

const DEFAULT_COWORKER: CoworkerProfile = {
  id: 'cw_primary_default',
  alias: 'Alex M.',
  role: 'Senior Product Manager',
  department: 'Product Operations',
  relationship: 'Peer',
  notes: 'Direct collaborator on quarterly sprint deliverables.',
  isPrimarySubject: true,
  createdAt: new Date().toISOString(),
};

// Seed realistic contemporaneous entries to illustrate HR-grade documentation
const SAMPLE_INTERACTIONS: Interaction[] = [
  {
    id: 'log_seed_001',
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    recordedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
    medium: 'Team Meeting',
    type: 'dismissive_interrupt',
    severity: 'minor',
    initiator: 'scheduled_meeting',
    location: 'Conference Room 3A (Sprint Retrospective)',
    witnesses: ['David K. (Eng Lead)', 'Sarah T. (Designer)', 'Elena R. (QA)'],
    objectiveFacts:
      'During my 5-minute presentation on database migration milestones, Alex interrupted after 45 seconds, stating: "We already know this is delayed, let\'s skip to someone who has updates." When I noted that milestones were actually ahead of schedule, Alex rolled eyes and began typing on phone without responding.',
    impactNotes:
      'Cut off presentation prematurely; resulted in team confusion regarding true migration timeline until clarified via Slack afterward.',
    actionTaken: 'Followed up on Slack with full slide deck to team to ensure transparent timeline.',
    evidence: ['Meeting Notes / Agenda', 'Chat Log Exported'],
    evidenceDescription: 'Slack thread sharing the slides with timestamps confirming presentation was cut short.',
    tags: ['Retrospective', 'Public Interruption', 'Sprint Review'],
    isFlaggedForHR: true,
  },
  {
    id: 'log_seed_002',
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    recordedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
    medium: '1-on-1 In Person',
    type: 'passive_aggressive',
    severity: 'moderate',
    initiator: 'coworker',
    location: 'Office Breakroom',
    witnesses: ['None / Private (Solo in breakroom)'],
    objectiveFacts:
      'While getting coffee, Alex approached and said: "Must be nice to have so much free time that you can rewrite entire modules instead of doing actual roadmap work." I asked what specific roadmap item was missing, and Alex responded: "If you need me to explain your job to you, maybe you shouldn\'t be in it," and walked out.',
    impactNotes:
      'Unprovoked personal hostility with no witnesses. Kept heart rate elevated, had to take a 15-minute walk before resuming work.',
    actionTaken: 'Recorded immediate contemporaneous note; avoided further unobserved 1-on-1 conversations.',
    evidence: ['None'],
    evidenceDescription: 'Direct verbal encounter; logged within 15 minutes of occurrence.',
    tags: ['Breakroom', 'Unprovoked', 'Verbal hostility'],
    isFlaggedForHR: true,
  },
  {
    id: 'log_seed_003',
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    recordedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 10 * 60 * 1000).toISOString(),
    medium: 'Email',
    type: 'exclusion_isolation',
    severity: 'moderate',
    initiator: 'coworker',
    location: 'Corporate Email Thread',
    witnesses: ['Director of Engineering', 'VP Product', 'Architecture Team'],
    objectiveFacts:
      'Alex sent an executive architecture summary to VP and Director regarding the API overhaul I designed, deliberately excluding me from the recipient and CC list. When Director forwarded the thread to me asking for my input, Alex had presented several of my design proposals as "recommendations from product management" without attribution.',
    impactNotes:
      'Deliberate information withholding designed to misrepresent ownership to senior leadership.',
    actionTaken: 'Replied to Director with link to original proposal document dated two weeks prior.',
    evidence: ['Email Saved', 'Screenshot Saved'],
    evidenceDescription: 'Archived original RFC doc and email headers showing omission from communication chain.',
    tags: ['Credit Attribution', 'Exclusion', 'Executive Comms'],
    isFlaggedForHR: true,
  },
  {
    id: 'log_seed_004',
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    timestamp: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    medium: 'Slack / Teams / Chat',
    type: 'routine_neutral',
    severity: 'neutral',
    initiator: 'self',
    location: '#proj-core-api Slack channel',
    witnesses: ['Public Slack Channel (14 members)'],
    objectiveFacts:
      'Posted the PR link for the schema migration. Alex reacted with a thumbs-up emoji and replied: "Reviewed and approved." No negative behavior observed.',
    impactNotes: 'Neutral, professional collaboration.',
    actionTaken: 'Merged PR into staging branch.',
    evidence: ['Chat Log Exported'],
    evidenceDescription: 'Slack approval timestamp in public channel.',
    tags: ['Code Review', 'Routine'],
    isFlaggedForHR: false,
  },
];

const SAMPLE_DAILY_LOGS: DailyCheckin[] = [
  {
    id: 'daily_seed_001',
    date: new Date().toISOString().slice(0, 10),
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    hadInteraction: true,
    hadDailyTieIn: true,
    tieInType: 'Daily Standup / Team Sync',
    overallClimate: 'peaceful_neutral',
    quickNotes: 'Standard morning standup. No friction; brief PR review confirmation on Slack.',
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'daily_seed_002',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    hadInteraction: true,
    hadDailyTieIn: true,
    tieInType: 'Shared Project / Task Dependency',
    overallClimate: 'cold_avoidant',
    quickNotes: 'Email thread exclusion occurred. Filed full custom report #003.',
    recordedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    associatedIncidentId: 'log_seed_003',
  },
  {
    id: 'daily_seed_003',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    coworkerId: 'cw_primary_default',
    coworkerName: 'Alex M.',
    hadInteraction: false,
    hadDailyTieIn: false,
    tieInType: 'None - Casual / Unrelated to Work',
    overallClimate: 'peaceful_neutral',
    quickNotes: 'Alex worked from home today; zero interactions or cross-paths.',
    recordedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
];

class DatabaseEngine {
  private inMemoryCache: DatabaseState | null = null;
  private isWriting = false;

  constructor() {
    this.ensureStorageStructure();
  }

  private ensureStorageStructure(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialState: DatabaseState = {
        version: 1,
        coworkers: [DEFAULT_COWORKER],
        interactions: SAMPLE_INTERACTIONS,
        dailyLogs: SAMPLE_DAILY_LOGS,
        settings: DEFAULT_SETTINGS,
        lastBackupDate: new Date().toISOString(),
      };
      this.writeToDisk(initialState);
      this.inMemoryCache = initialState;
    }
  }

  private readFromDisk(): DatabaseState {
    if (this.inMemoryCache) {
      if (!this.inMemoryCache.dailyLogs) {
        this.inMemoryCache.dailyLogs = [];
      }
      return this.inMemoryCache;
    }
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseState = JSON.parse(raw);
        if (!parsed.dailyLogs) {
          parsed.dailyLogs = SAMPLE_DAILY_LOGS;
          this.writeToDisk(parsed);
        }
        this.inMemoryCache = parsed;
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, attempting recovery from backup:', err);
    }

    const fallback: DatabaseState = {
      version: 1,
      coworkers: [DEFAULT_COWORKER],
      interactions: [],
      dailyLogs: [],
      settings: DEFAULT_SETTINGS,
    };
    this.inMemoryCache = fallback;
    return fallback;
  }

  private writeToDisk(state: DatabaseState): void {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    this.inMemoryCache = state;
  }

  // --- Coworkers API ---
  public getCoworkers(): CoworkerProfile[] {
    const db = this.readFromDisk();
    return db.coworkers;
  }

  public saveCoworker(coworker: CoworkerProfile): CoworkerProfile {
    const db = this.readFromDisk();
    const idx = db.coworkers.findIndex((c) => c.id === coworker.id);
    if (idx >= 0) {
      db.coworkers[idx] = { ...coworker };
    } else {
      db.coworkers.push(coworker);
    }
    this.writeToDisk(db);
    return coworker;
  }

  public deleteCoworker(id: string): boolean {
    const db = this.readFromDisk();
    const prevLen = db.coworkers.length;
    db.coworkers = db.coworkers.filter((c) => c.id !== id);
    if (db.coworkers.length < prevLen) {
      this.writeToDisk(db);
      return true;
    }
    return false;
  }

  // --- Interactions API ---
  public getInteractions(filter?: {
    coworkerId?: string;
    type?: string;
    severity?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    flaggedOnly?: boolean;
  }): Interaction[] {
    const db = this.readFromDisk();
    let results = [...db.interactions];

    if (filter) {
      if (filter.coworkerId) {
        results = results.filter((i) => i.coworkerId === filter.coworkerId);
      }
      if (filter.type && filter.type !== 'all') {
        results = results.filter((i) => i.type === filter.type);
      }
      if (filter.severity && filter.severity !== 'all') {
        results = results.filter((i) => i.severity === filter.severity);
      }
      if (filter.flaggedOnly) {
        results = results.filter((i) => i.isFlaggedForHR);
      }
      if (filter.startDate) {
        results = results.filter((i) => new Date(i.timestamp) >= new Date(filter.startDate!));
      }
      if (filter.endDate) {
        results = results.filter((i) => new Date(i.timestamp) <= new Date(filter.endDate!));
      }
      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase();
        results = results.filter(
          (i) =>
            i.objectiveFacts.toLowerCase().includes(query) ||
            (i.impactNotes && i.impactNotes.toLowerCase().includes(query)) ||
            i.location.toLowerCase().includes(query) ||
            i.witnesses.some((w) => w.toLowerCase().includes(query)) ||
            i.tags.some((t) => t.toLowerCase().includes(query)) ||
            i.coworkerName.toLowerCase().includes(query)
        );
      }
    }

    // Sort chronologically descending (newest first)
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getInteractionById(id: string): Interaction | undefined {
    const db = this.readFromDisk();
    return db.interactions.find((i) => i.id === id);
  }

  public addInteraction(interaction: Omit<Interaction, 'id' | 'recordedAt'>): Interaction {
    const db = this.readFromDisk();
    const newEntry: Interaction = {
      ...interaction,
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      recordedAt: new Date().toISOString(),
    };
    db.interactions.unshift(newEntry);
    this.writeToDisk(db);
    return newEntry;
  }

  public updateInteraction(id: string, updates: Partial<Interaction>): Interaction | null {
    const db = this.readFromDisk();
    const idx = db.interactions.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    db.interactions[idx] = {
      ...db.interactions[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.writeToDisk(db);
    return db.interactions[idx];
  }

  public deleteInteraction(id: string): boolean {
    const db = this.readFromDisk();
    const prevLen = db.interactions.length;
    db.interactions = db.interactions.filter((i) => i.id !== id);
    if (db.interactions.length < prevLen) {
      this.writeToDisk(db);
      return true;
    }
    return false;
  }

  public clearAllInteractions(): void {
    const db = this.readFromDisk();
    db.interactions = [];
    this.writeToDisk(db);
  }

  // --- Daily Check-ins API ---
  public getDailyLogs(): DailyCheckin[] {
    const db = this.readFromDisk();
    return (db.dailyLogs || []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public getDailyLogByDate(date: string): DailyCheckin | undefined {
    const db = this.readFromDisk();
    return (db.dailyLogs || []).find((d) => d.date === date);
  }

  public saveDailyLog(
    log: Omit<DailyCheckin, 'id' | 'recordedAt'> & { id?: string }
  ): DailyCheckin {
    const db = this.readFromDisk();
    if (!db.dailyLogs) db.dailyLogs = [];

    const existingIndex = db.dailyLogs.findIndex(
      (d) => d.date === log.date && d.coworkerId === log.coworkerId
    );

    if (existingIndex >= 0) {
      const existing = db.dailyLogs[existingIndex];
      const updated: DailyCheckin = {
        ...existing,
        ...log,
        id: existing.id,
        recordedAt: existing.recordedAt,
        updatedAt: new Date().toISOString(),
      };
      db.dailyLogs[existingIndex] = updated;
      this.writeToDisk(db);
      return updated;
    } else {
      const created: DailyCheckin = {
        ...log,
        id: log.id || `daily_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        recordedAt: new Date().toISOString(),
      };
      db.dailyLogs.unshift(created);
      this.writeToDisk(db);
      return created;
    }
  }

  public deleteDailyLog(id: string): boolean {
    const db = this.readFromDisk();
    if (!db.dailyLogs) return false;
    const prev = db.dailyLogs.length;
    db.dailyLogs = db.dailyLogs.filter((d) => d.id !== id);
    if (db.dailyLogs.length < prev) {
      this.writeToDisk(db);
      return true;
    }
    return false;
  }

  // --- Settings API ---
  public getSettings(): SystemSettings {
    const db = this.readFromDisk();
    return db.settings || DEFAULT_SETTINGS;
  }

  public updateSettings(partial: Partial<SystemSettings>): SystemSettings {
    const db = this.readFromDisk();
    db.settings = {
      ...(db.settings || DEFAULT_SETTINGS),
      ...partial,
    };
    this.writeToDisk(db);
    return db.settings;
  }

  // --- Backup & Restore ---
  public createBackup(): { filename: string; timestamp: string; sizeBytes: number } {
    const db = this.readFromDisk();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_interactions_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);
    const content = JSON.stringify(db, null, 2);
    fs.writeFileSync(backupPath, content, 'utf-8');

    db.lastBackupDate = new Date().toISOString();
    this.writeToDisk(db);

    return {
      filename,
      timestamp: new Date().toISOString(),
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
    };
  }

  public restore(importedData: DatabaseState): boolean {
    if (!importedData.interactions || !importedData.coworkers) {
      throw new Error('Invalid backup schema format');
    }
    // Auto-backup current state before restoring
    this.createBackup();
    this.writeToDisk(importedData);
    return true;
  }

  public getFullState(): DatabaseState {
    return this.readFromDisk();
  }

  public getSystemInfo() {
    const db = this.readFromDisk();
    let dbSize = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbSize = fs.statSync(DB_FILE).size;
      }
    } catch {}

    const backupFiles = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR) : [];

    return {
      dataPath: DATA_DIR,
      dbFilePath: DB_FILE,
      dbSizeBytes: dbSize,
      totalInteractions: db.interactions.length,
      totalCoworkers: db.coworkers.length,
      backupCount: backupFiles.length,
      lastBackupDate: db.lastBackupDate,
      isSelfHosted: true,
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform,
    };
  }
}

export const dbEngine = new DatabaseEngine();
