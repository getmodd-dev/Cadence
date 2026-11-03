import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { dbEngine } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Helper for hashing PIN
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin + '_workplace_logger_salt').digest('hex');
}

// ================= API ROUTES =================

// --- Interactions ---
app.get('/api/interactions', (req: Request, res: Response) => {
  try {
    const { coworkerId, type, severity, search, startDate, endDate, flaggedOnly } = req.query;
    const items = dbEngine.getInteractions({
      coworkerId: coworkerId as string,
      type: type as string,
      severity: severity as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      flaggedOnly: flaggedOnly === 'true',
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/interactions/:id', (req: Request, res: Response) => {
  try {
    const item = dbEngine.getInteractionById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/interactions', (req: Request, res: Response) => {
  try {
    const {
      coworkerId,
      coworkerName,
      timestamp,
      medium,
      type,
      severity,
      initiator,
      location,
      witnesses,
      objectiveFacts,
      impactNotes,
      actionTaken,
      evidence,
      evidenceDescription,
      tags,
      isFlaggedForHR,
    } = req.body;

    if (!objectiveFacts || !objectiveFacts.trim()) {
      return res.status(400).json({ success: false, error: 'Objective notes are required' });
    }

    const created = dbEngine.addInteraction({
      coworkerId: coworkerId || 'cw_primary_default',
      coworkerName: coworkerName || 'Primary Coworker',
      timestamp: timestamp || new Date().toISOString(),
      medium: medium || '1-on-1 In Person',
      type: type || 'routine_neutral',
      severity: severity || 'neutral',
      initiator: initiator || 'coworker',
      location: location || '',
      witnesses: Array.isArray(witnesses) ? witnesses : [],
      objectiveFacts: objectiveFacts.trim(),
      impactNotes: impactNotes ? impactNotes.trim() : '',
      actionTaken: actionTaken ? actionTaken.trim() : '',
      evidence: Array.isArray(evidence) ? evidence : ['None'],
      evidenceDescription: evidenceDescription || '',
      tags: Array.isArray(tags) ? tags : [],
      isFlaggedForHR: Boolean(isFlaggedForHR),
    });

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/interactions/:id', (req: Request, res: Response) => {
  try {
    const updated = dbEngine.updateInteraction(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/interactions/:id', (req: Request, res: Response) => {
  try {
    const success = dbEngine.deleteInteraction(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Interaction not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/interactions', (_req: Request, res: Response) => {
  try {
    dbEngine.clearAllInteractions();
    res.json({ success: true, message: 'All interaction records cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Daily Check-ins ---
app.get('/api/daily-logs', (_req: Request, res: Response) => {
  try {
    const logs = dbEngine.getDailyLogs();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/daily-logs/:date', (req: Request, res: Response) => {
  try {
    const log = dbEngine.getDailyLogByDate(req.params.date);
    res.json({ success: true, data: log || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/daily-logs', (req: Request, res: Response) => {
  try {
    const {
      date,
      coworkerId,
      coworkerName,
      hadInteraction,
      hadDailyTieIn,
      tieInType,
      overallClimate,
      quickNotes,
      associatedIncidentId,
    } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }
    const saved = dbEngine.saveDailyLog({
      date,
      coworkerId: coworkerId || 'cw_primary_default',
      coworkerName: coworkerName || 'Primary Coworker',
      hadInteraction: Boolean(hadInteraction),
      hadDailyTieIn: Boolean(hadDailyTieIn),
      tieInType: tieInType || 'None - Casual / Unrelated to Work',
      overallClimate: overallClimate || 'peaceful_neutral',
      quickNotes: (quickNotes || '').trim(),
      associatedIncidentId,
    });
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/daily-logs/:id', (req: Request, res: Response) => {
  try {
    const ok = dbEngine.deleteDailyLog(req.params.id);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Coworkers ---
app.get('/api/coworkers', (_req: Request, res: Response) => {
  try {
    const list = dbEngine.getCoworkers();
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/coworkers', (req: Request, res: Response) => {
  try {
    const { id, alias, role, department, relationship, notes, isPrimarySubject } = req.body;
    if (!alias) {
      return res.status(400).json({ success: false, error: 'Alias or name is required' });
    }
    const coworker = dbEngine.saveCoworker({
      id: id || `cw_${Date.now()}`,
      alias,
      role: role || '',
      department: department || '',
      relationship: relationship || 'Peer',
      notes: notes || '',
      isPrimarySubject: Boolean(isPrimarySubject),
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, data: coworker });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/coworkers/:id', (req: Request, res: Response) => {
  try {
    const success = dbEngine.deleteCoworker(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Settings & Security ---
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = dbEngine.getSettings();
    // Do not return raw hash to client, only whether PIN is enabled
    res.json({
      success: true,
      data: {
        pinEnabled: Boolean(settings.pinHash),
        autoLockMinutes: settings.autoLockMinutes,
        stealthBlurDefault: settings.stealthBlurDefault,
        anonymizeInView: settings.anonymizeInView,
        coworkerDefaultAlias: settings.coworkerDefaultAlias,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const { autoLockMinutes, stealthBlurDefault, anonymizeInView, coworkerDefaultAlias } = req.body;
    const updated = dbEngine.updateSettings({
      autoLockMinutes: Number(autoLockMinutes),
      stealthBlurDefault: Boolean(stealthBlurDefault),
      anonymizeInView: Boolean(anonymizeInView),
      coworkerDefaultAlias,
    });
    res.json({
      success: true,
      data: {
        pinEnabled: Boolean(updated.pinHash),
        autoLockMinutes: updated.autoLockMinutes,
        stealthBlurDefault: updated.stealthBlurDefault,
        anonymizeInView: updated.anonymizeInView,
        coworkerDefaultAlias: updated.coworkerDefaultAlias,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/security/set-pin', (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.trim().length === 0) {
      // Remove PIN
      dbEngine.updateSettings({ pinHash: null, pinEnabled: false });
      return res.json({ success: true, message: 'Passcode removed' });
    }
    if (pin.length < 4) {
      return res.status(400).json({ success: false, error: 'Passcode must be at least 4 digits' });
    }
    const hash = hashPin(pin.trim());
    dbEngine.updateSettings({ pinHash: hash, pinEnabled: true });
    res.json({ success: true, message: 'Passcode successfully configured' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/security/verify-pin', (req: Request, res: Response) => {
  try {
    const { pin } = req.body;
    const settings = dbEngine.getSettings();
    if (!settings.pinHash) {
      return res.json({ success: true, verified: true });
    }
    const candidateHash = hashPin((pin || '').trim());
    const match = candidateHash === settings.pinHash;
    res.json({ success: true, verified: match });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Exports & Backups ---
app.get('/api/export/json', (_req: Request, res: Response) => {
  try {
    const fullState = dbEngine.getFullState();
    const filename = `workplace_interactions_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(fullState, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/export/csv', (_req: Request, res: Response) => {
  try {
    const interactions = dbEngine.getInteractions();
    const headers = [
      'ID',
      'Occurred_At',
      'Contemporaneous_Logged_At',
      'Coworker',
      'Medium',
      'Interaction_Type',
      'Severity',
      'Initiator',
      'Location',
      'Witnesses',
      'Objective_Facts',
      'Impact_Notes',
      'Action_Taken',
      'Evidence_Types',
      'Evidence_Description',
      'Flagged_For_HR',
      'Tags',
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = interactions.map((i) =>
      [
        escapeCsv(i.id),
        escapeCsv(i.timestamp),
        escapeCsv(i.recordedAt),
        escapeCsv(i.coworkerName),
        escapeCsv(i.medium),
        escapeCsv(i.type),
        escapeCsv(i.severity),
        escapeCsv(i.initiator),
        escapeCsv(i.location),
        escapeCsv(i.witnesses),
        escapeCsv(i.objectiveFacts),
        escapeCsv(i.impactNotes),
        escapeCsv(i.actionTaken),
        escapeCsv(i.evidence),
        escapeCsv(i.evidenceDescription),
        escapeCsv(i.isFlaggedForHR ? 'YES' : 'NO'),
        escapeCsv(i.tags),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `workplace_incident_dossier_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backup', (_req: Request, res: Response) => {
  try {
    const result = dbEngine.createBackup();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/restore', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    dbEngine.restore(payload);
    res.json({ success: true, message: 'Database successfully restored from backup' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- System Info & Unraid Stats ---
app.get('/api/system/status', (_req: Request, res: Response) => {
  try {
    const status = dbEngine.getSystemInfo();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= VITE DEV / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Logbook Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
