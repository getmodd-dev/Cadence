import { Interaction, CoworkerProfile, SystemSettings, SystemStatus, DailyCheckin } from '../types';

export const api = {
  // Interactions
  async getInteractions(filters?: {
    coworkerId?: string;
    type?: string;
    severity?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    flaggedOnly?: boolean;
  }): Promise<Interaction[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.coworkerId) params.append('coworkerId', filters.coworkerId);
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.flaggedOnly) params.append('flaggedOnly', 'true');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/interactions${query}`);
    if (!res.ok) throw new Error('Failed to fetch interactions');
    const data = await res.json();
    return data.data;
  },

  async createInteraction(payload: Omit<Interaction, 'id' | 'recordedAt'>): Promise<Interaction> {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record interaction');
    }
    const data = await res.json();
    return data.data;
  },

  async updateInteraction(id: string, updates: Partial<Interaction>): Promise<Interaction> {
    const res = await fetch(`/api/interactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update interaction');
    const data = await res.json();
    return data.data;
  },

  async deleteInteraction(id: string): Promise<boolean> {
    const res = await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete interaction');
    const data = await res.json();
    return data.success;
  },

  async clearAllInteractions(): Promise<boolean> {
    const res = await fetch('/api/interactions', { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear interactions');
    const data = await res.json();
    return data.success;
  },

  // Daily Check-ins
  async getDailyLogs(): Promise<DailyCheckin[]> {
    const res = await fetch('/api/daily-logs');
    if (!res.ok) throw new Error('Failed to fetch daily logs');
    const data = await res.json();
    return data.data;
  },

  async getDailyLogByDate(date: string): Promise<DailyCheckin | null> {
    const res = await fetch(`/api/daily-logs/${date}`);
    if (!res.ok) throw new Error('Failed to fetch daily log');
    const data = await res.json();
    return data.data;
  },

  async saveDailyLog(
    payload: Omit<DailyCheckin, 'id' | 'recordedAt'> & { id?: string }
  ): Promise<DailyCheckin> {
    const res = await fetch('/api/daily-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save daily log');
    }
    const data = await res.json();
    return data.data;
  },

  async deleteDailyLog(id: string): Promise<boolean> {
    const res = await fetch(`/api/daily-logs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete daily log');
    const data = await res.json();
    return data.success;
  },

  // Coworkers
  async getCoworkers(): Promise<CoworkerProfile[]> {
    const res = await fetch('/api/coworkers');
    if (!res.ok) throw new Error('Failed to fetch coworkers');
    const data = await res.json();
    return data.data;
  },

  async saveCoworker(coworker: Partial<CoworkerProfile>): Promise<CoworkerProfile> {
    const res = await fetch('/api/coworkers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coworker),
    });
    if (!res.ok) throw new Error('Failed to save coworker profile');
    const data = await res.json();
    return data.data;
  },

  async deleteCoworker(id: string): Promise<boolean> {
    const res = await fetch(`/api/coworkers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete coworker');
    const data = await res.json();
    return data.success;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    const data = await res.json();
    return data.data;
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    const data = await res.json();
    return data.data;
  },

  // Security
  async verifyPin(pin: string): Promise<boolean> {
    const res = await fetch('/api/security/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error('Failed to verify PIN');
    const data = await res.json();
    return Boolean(data.verified);
  },

  async setPin(pin: string): Promise<boolean> {
    const res = await fetch('/api/security/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update passcode');
    }
    const data = await res.json();
    return data.success;
  },

  // Backup & Restore & System Status
  async triggerBackup(): Promise<{ filename: string; timestamp: string; sizeBytes: number }> {
    const res = await fetch('/api/backup', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate backup');
    const data = await res.json();
    return data.data;
  },

  async restoreDatabase(payload: any): Promise<boolean> {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to restore database');
    }
    const data = await res.json();
    return data.success;
  },

  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch('/api/system/status');
    if (!res.ok) throw new Error('Failed to fetch system status');
    const data = await res.json();
    return data.data;
  },

  getJsonExportUrl(): string {
    return '/api/export/json';
  },

  getCsvExportUrl(): string {
    return '/api/export/csv';
  },

  getUnraidTemplateUrl(): string {
    return '/api/unraid/template';
  },

  async generateEncryptionKey(): Promise<{
    hexKey: string;
    suggestedPassphrase: string;
    sampleEnv: string;
  }> {
    const res = await fetch('/api/security/generate-key');
    if (!res.ok) throw new Error('Failed to generate encryption key');
    const data = await res.json();
    return data.data;
  },
};

