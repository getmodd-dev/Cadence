import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseState, Interaction, CoworkerProfile, SystemSettings, DailyCheckin, EncryptionInfo } from './types.js';
import { encryptPayload, decryptPayload, isEncryptedContent } from './crypto.js';

function resolveDataDir(): string {
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
    return path.resolve(process.env.DATA_DIR.trim());
  }
  if (fs.existsSync('/data')) {
    return '/data';
  }
  return path.resolve(process.cwd(), 'data');
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_BAK_FILE = path.join(DATA_DIR, 'database.json.bak');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const ENCRYPTION_PASSPHRASE = (process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_PASSPHRASE || '').trim();

const DEFAULT_SETTINGS: SystemSettings = {
  pinHash: null,
  pinEnabled: false,
  autoLockMinutes: 15,
  stealthBlurDefault: false,
  anonymizeInView: false,
  coworkerDefaultAlias: 'Primary Coworker',
};

const DEFAULT_COWORKER: CoworkerProfile = {
  id: 'cw_primary_default',
  alias: 'Primary Coworker',
  role: '',
  department: '',
  relationship: 'Peer',
  notes: '',
  isPrimarySubject: true,
  createdAt: new Date().toISOString(),
};

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

    // Auto-detect and migrate database from legacy / alternate mount paths
    if (!fs.existsSync(DB_FILE)) {
      const candidatePaths = [
        path.join(process.cwd(), 'data', 'database.json'),
        '/data/database.json',
        '/app/data/database.json',
        DB_BAK_FILE,
      ];

      let migrated = false;
      for (const cand of candidatePaths) {
        if (cand !== DB_FILE && fs.existsSync(cand)) {
          try {
            const content = fs.readFileSync(cand, 'utf-8');
            if (content.length > 20) {
              fs.writeFileSync(DB_FILE, content, 'utf-8');
              console.log(`[Cadence Migration] Successfully preserved database from ${cand} -> ${DB_FILE}`);
              migrated = true;
              break;
            }
          } catch (err: any) {
            console.error(`[Cadence Migration] Could not migrate from ${cand}:`, err.message);
          }
        }
      }

      // Check for candidate backups in BACKUPS_DIR if still not found
      if (!migrated && fs.existsSync(BACKUPS_DIR)) {
        try {
          const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
          if (files.length > 0) {
            const latestBackup = path.join(BACKUPS_DIR, files[0]);
            const content = fs.readFileSync(latestBackup, 'utf-8');
            if (content.length > 20) {
              fs.writeFileSync(DB_FILE, content, 'utf-8');
              console.log(`[Cadence Recovery] Restored database from most recent snapshot: ${latestBackup}`);
              migrated = true;
            }
          }
        } catch (bErr) {
          console.error('[Cadence Recovery] Could not restore from backups:', bErr);
        }
      }

      // Initialize completely empty database
      if (!migrated && !fs.existsSync(DB_FILE)) {
        const initialState: DatabaseState = {
          version: 1,
          coworkers: [DEFAULT_COWORKER],
          interactions: [],
          dailyLogs: [],
          settings: DEFAULT_SETTINGS,
          lastBackupDate: new Date().toISOString(),
        };
        this.writeToDisk(initialState);
        this.inMemoryCache = initialState;
        return;
      }
    }

    // If DB_FILE exists, create an automated pre-update startup safety snapshot
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw.length > 20) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const startupBackupFile = path.join(BACKUPS_DIR, `pre_update_snapshot_${ts}.json`);
          fs.writeFileSync(startupBackupFile, raw, 'utf-8');
          console.log(`[Cadence Safety] Pre-update safety snapshot created: ${startupBackupFile}`);

          // Keep up to 20 most recent startup snapshots
          const snapshots = fs.readdirSync(BACKUPS_DIR)
            .filter((f) => f.startsWith('pre_update_snapshot_'))
            .sort();
          if (snapshots.length > 20) {
            snapshots.slice(0, snapshots.length - 20).forEach((oldSnap) => {
              try { fs.unlinkSync(path.join(BACKUPS_DIR, oldSnap)); } catch {}
            });
          }
        }
      } catch (err: any) {
        console.error('[Cadence Safety] Failed to create pre-update snapshot:', err.message);
      }
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
        let parsed: DatabaseState;

        if (isEncryptedContent(raw)) {
          const decrypted = decryptPayload(raw, ENCRYPTION_PASSPHRASE);
          parsed = JSON.parse(decrypted);
        } else {
          parsed = JSON.parse(raw);
          // If a passphrase is newly supplied for a plaintext DB, encrypt on next write or auto-encrypt now
          if (ENCRYPTION_PASSPHRASE) {
            console.log('[Cadence Security] Transparently upgrading plaintext database to AES-256-GCM encryption.');
            this.writeToDisk(parsed);
          }
        }

        if (!parsed.dailyLogs) {
          parsed.dailyLogs = [];
          this.writeToDisk(parsed);
        }
        this.inMemoryCache = parsed;
        return parsed;
      }
    } catch (err: any) {
      console.error('[Cadence Database] Error reading database file:', err.message || err);
      // Re-throw if it's a security/decryption failure to avoid overwriting or silently ignoring encrypted data
      if (
        (err.message && err.message.includes('ENCRYPTION_PASSPHRASE')) ||
        (err.message && err.message.includes('Decryption failed'))
      ) {
        throw new Error(
          'Database is encrypted with AES-256-GCM. Please pass ENCRYPTION_PASSPHRASE environment variable to unlock your records.'
        );
      }

      // Attempt recovery from .bak file
      if (fs.existsSync(DB_BAK_FILE)) {
        try {
          console.warn('[Cadence Recovery] Attempting restore from database.json.bak...');
          const bakRaw = fs.readFileSync(DB_BAK_FILE, 'utf-8');
          const bakParsed = JSON.parse(
            isEncryptedContent(bakRaw) ? decryptPayload(bakRaw, ENCRYPTION_PASSPHRASE) : bakRaw
          );
          this.writeToDisk(bakParsed);
          this.inMemoryCache = bakParsed;
          return bakParsed;
        } catch (bakErr: any) {
          console.error('[Cadence Recovery] .bak recovery failed:', bakErr.message);
        }
      }

      // If DB_FILE exists with data, NEVER wipe it silently with empty fallback
      if (fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).size > 50) {
        throw new Error(
          `Critical error reading database file at ${DB_FILE}: ${err.message}. Refusing to overwrite existing file.`
        );
      }
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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(state, null, 2);
    const content = ENCRYPTION_PASSPHRASE ? encryptPayload(payload, ENCRYPTION_PASSPHRASE) : payload;

    try {
      // 1. Write to temporary file
      fs.writeFileSync(tempFile, content, 'utf-8');

      // 2. Preserve immediate prior copy as .bak if DB_FILE exists
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, DB_BAK_FILE);
        } catch {}
      }

      // 3. Atomic rename with cross-filesystem fallback
      try {
        fs.renameSync(tempFile, DB_FILE);
      } catch (renameErr) {
        fs.copyFileSync(tempFile, DB_FILE);
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }

      this.inMemoryCache = state;
    } catch (err: any) {
      console.error('[Cadence Database] Critical failure writing database to disk:', err.message);
      // Emergency direct write
      try {
        fs.writeFileSync(DB_FILE, content, 'utf-8');
        this.inMemoryCache = state;
      } catch (directErr: any) {
        console.error('[Cadence Database] Emergency direct write failed:', directErr.message);
        throw err;
      }
    }
  }

  public flushAndBackup(reason: string = 'manual'): string {
    const db = this.readFromDisk();
    this.writeToDisk(db);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot_${reason}_${timestamp}.json`;
    const targetFile = path.join(BACKUPS_DIR, filename);
    const payload = JSON.stringify(db, null, 2);
    const content = ENCRYPTION_PASSPHRASE ? encryptPayload(payload, ENCRYPTION_PASSPHRASE) : payload;
    fs.writeFileSync(targetFile, content, 'utf-8');
    return targetFile;
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
    db.dailyLogs = [];
    this.writeToDisk(db);
  }

  public resetToEmpty(): DatabaseState {
    const emptyState: DatabaseState = {
      version: 1,
      coworkers: [DEFAULT_COWORKER],
      interactions: [],
      dailyLogs: [],
      settings: DEFAULT_SETTINGS,
      lastBackupDate: new Date().toISOString(),
    };
    this.writeToDisk(emptyState);
    return emptyState;
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

  public deleteDailyLog(idOrDate: string): boolean {
    const db = this.readFromDisk();
    if (!db.dailyLogs) return false;
    const prev = db.dailyLogs.length;
    db.dailyLogs = db.dailyLogs.filter((d) => d.id !== idOrDate && d.date !== idOrDate);
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
  public createBackup(): { filename: string; timestamp: string; sizeBytes: number; isEncrypted: boolean } {
    const db = this.readFromDisk();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_interactions_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);
    const rawJson = JSON.stringify(db, null, 2);
    const content = ENCRYPTION_PASSPHRASE ? encryptPayload(rawJson, ENCRYPTION_PASSPHRASE) : rawJson;
    fs.writeFileSync(backupPath, content, 'utf-8');

    db.lastBackupDate = new Date().toISOString();
    this.writeToDisk(db);

    return {
      filename,
      timestamp: new Date().toISOString(),
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      isEncrypted: Boolean(ENCRYPTION_PASSPHRASE),
    };
  }

  public restore(importedData: any): boolean {
    let state = importedData;
    if (typeof importedData === 'string') {
      try {
        state = JSON.parse(importedData);
      } catch {}
    }
    if (state && state._encrypted === true) {
      const decrypted = decryptPayload(JSON.stringify(state), ENCRYPTION_PASSPHRASE);
      state = JSON.parse(decrypted);
    }
    if (!state || !state.interactions || !state.coworkers) {
      throw new Error('Invalid backup schema format');
    }
    // Auto-backup current state before restoring
    this.createBackup();
    this.writeToDisk(state as DatabaseState);
    return true;
  }

  public getFullState(): DatabaseState {
    return this.readFromDisk();
  }

  public getSystemInfo() {
    const db = this.readFromDisk();
    let dbSize = 0;
    let isEncrypted = false;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbSize = fs.statSync(DB_FILE).size;
        const snippet = fs.readFileSync(DB_FILE, 'utf-8').slice(0, 200);
        isEncrypted = snippet.includes('"_encrypted": true');
      }
    } catch {}

    const backupFiles = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR) : [];

    const encryption: EncryptionInfo = {
      enabled: Boolean(ENCRYPTION_PASSPHRASE),
      algo: 'AES-256-GCM',
      kdf: 'scrypt',
      isEncryptedOnDisk: isEncrypted,
      status: Boolean(ENCRYPTION_PASSPHRASE)
        ? (isEncrypted ? 'Active (AES-256-GCM)' : 'Passphrase Active (Encrypting on next save)')
        : (isEncrypted ? 'Locked (Passphrase Required)' : 'Disabled (Plaintext Storage)'),
    };

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
      encryption,
    };
  }
}

export const dbEngine = new DatabaseEngine();
