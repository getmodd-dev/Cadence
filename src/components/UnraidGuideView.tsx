import React, { useState, useEffect } from 'react';
import { SystemStatus } from '../types';
import { api } from '../services/api';
import {
  Server,
  HardDrive,
  Shield,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FolderLock,
  Lock,
  AlertTriangle,
} from 'lucide-react';

interface UnraidGuideViewProps {
  onRefreshData: () => Promise<void>;
}

export const UnraidGuideView: React.FC<UnraidGuideViewProps> = ({ onRefreshData }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getSystemStatus();
      setStatus(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleCreateBackup = async () => {
    try {
      const res = await api.triggerBackup();
      setBackupSuccess(`Backup created: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      fetchStatus();
      setTimeout(() => setBackupSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create backup');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setRestoreError(null);
      const text = await file.text();
      const json = JSON.parse(text);
      await api.restoreDatabase(json);
      await onRefreshData();
      await fetchStatus();
      alert('Database restored successfully from backup file!');
    } catch (err: any) {
      setRestoreError('Invalid backup file: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllInteractions();
      await onRefreshData();
      await fetchStatus();
      setConfirmClear(false);
      alert('All interaction records cleared.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const dockerComposeSnippet = `services:
  cadence:
    image: cadence:latest
    container_name: cadence
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DATA_DIR=/data
      - NODE_ENV=production
    volumes:
      # Map to Unraid appdata share for private, parity-protected storage
      - /mnt/user/appdata/cadence:/data
`;

  const dockerRunSnippet = `docker run -d \\
  --name=cadence \\
  --restart=unless-stopped \\
  -p 3000:3000 \\
  -e PORT=3000 \\
  -e DATA_DIR=/data \\
  -e NODE_ENV=production \\
  -v /mnt/user/appdata/cadence:/data \\
  cadence:latest`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Overview */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span>Unraid Server & Self-Hosted Database</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Zero third-party tracking. Your sensitive workplace documentation resides entirely within your private home network or homelab.
        </p>
      </div>

      {/* Live Self-Hosted DB Metrics */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            Live Database Volume Status
          </h2>
          <button
            onClick={fetchStatus}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Data Path</span>
              <span className="font-mono text-slate-200 truncate block mt-0.5" title={status.dataPath}>
                {status.dataPath}
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Database Size</span>
              <span className="font-mono text-slate-200 block mt-0.5">
                {(status.dbSizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Logged Records</span>
              <span className="font-mono text-slate-200 block mt-0.5">
                {status.totalInteractions} interactions
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 block">Local Backups</span>
              <span className="font-mono text-slate-200 block mt-0.5">
                {status.backupCount} snapshots
              </span>
            </div>
          </div>
        )}

        {/* Database Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCreateBackup}
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <FolderLock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Take Local Snapshot</span>
            </button>

            <label className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Restore From JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>

            <a
              href={api.getJsonExportUrl()}
              download
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Full Backup</span>
            </a>
          </div>

          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 p-1.5 rounded">
                <span className="text-rose-200 text-xs">Clear all records?</span>
                <button
                  onClick={handleClearAll}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs"
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-0.5 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Sample Records</span>
              </button>
            )}
          </div>
        </div>

        {backupSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-xs text-emerald-300">
            {backupSuccess}
          </div>
        )}

        {restoreError && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-xs text-rose-300">
            {restoreError}
          </div>
        )}
      </div>

      {/* Unraid Step-by-Step Setup Instructions */}
      <div className="space-y-6">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>Unraid Server Deployment Guide</span>
        </h2>

        {/* Step 1: Volume Mapping */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-semibold text-slate-200">
              Unraid Appdata Share & Volume Mapping
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            In Unraid, persistent container files should reside in your <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">/mnt/user/appdata</code> share. This ensures that every entry you log is protected by your Unraid parity array and automatically included in CA Appdata Backup.
          </p>

          <div className="bg-slate-950 p-3 rounded border border-slate-800/80 text-xs font-mono space-y-1">
            <div className="text-slate-400">Container Path: <span className="text-emerald-400">/data</span></div>
            <div className="text-slate-400">Host Path (Unraid): <span className="text-indigo-400">/mnt/user/appdata/cadence</span></div>
            <div className="text-slate-400">Container Port: <span className="text-amber-400">3000</span> (or any available port on host)</div>
          </div>
        </div>

        {/* Step 2: Docker Run / Compose Command */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                Docker Compose Configuration (Unraid Docker Compose Plugin)
              </h3>
            </div>
            <button
              onClick={() => handleCopy(dockerComposeSnippet, 'compose')}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            >
              {copiedSnippet === 'compose' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy YAML</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {dockerComposeSnippet}
          </pre>
        </div>

        {/* Step 3: Unraid Docker GUI Fields */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="text-sm font-semibold text-slate-200">
              Unraid GUI Setup (Add Container)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            If using Unraid&apos;s standard &ldquo;Add Container&rdquo; web interface, configure the following parameters:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block font-semibold">Name</span>
              <span className="text-slate-200 font-mono">cadence</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block font-semibold">Repository</span>
              <span className="text-slate-200 font-mono">cadence:latest</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block font-semibold">Network Type</span>
              <span className="text-slate-200 font-mono">Bridge</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-400 block font-semibold">Port 1 (Web UI)</span>
              <span className="text-slate-200 font-mono">Host: 3000 | Container: 3000</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800 sm:col-span-2">
              <span className="text-slate-400 block font-semibold">Path 1 (Persistent Database)</span>
              <span className="text-slate-200 font-mono">
                Host Path: /mnt/user/appdata/cadence | Container Path: /data
              </span>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Best Practices */}
        <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Workplace Privacy & Security Best Practices</span>
          </div>

          <ul className="text-xs text-indigo-200/80 space-y-2 list-disc list-inside leading-relaxed">
            <li>
              <strong>Never port forward to the public internet:</strong> Keep this service accessible only via your local home Wi-Fi or securely over Tailscale/WireGuard.
            </li>
            <li>
              <strong>Do not access from corporate VPN without split-tunneling:</strong> If logging incidents during the workday, use a personal device (phone/tablet) connected to your Unraid host, or ensure corporate network inspection cannot observe your private traffic.
            </li>
            <li>
              <strong>Enable Passcode Lock:</strong> Set a 4-6 digit PIN in the top right menu to prevent curious household members or colleagues from viewing your logs.
            </li>
            <li>
              <strong>Use the &ldquo;Stealth&rdquo; shortcut (Esc):</strong> Immediately blurs names and text if someone approaches your screen.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
