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
  Unlock,
  Key,
  Terminal,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2,
  Code2,
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
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [activeTab, setActiveTab] = useState<'persistence' | 'deployment' | 'encryption' | 'ghcr'>('persistence');

  // GHCR state
  const [ghUsername, setGhUsername] = useState('your-github-username');

  // Key generator state
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{
    hexKey: string;
    suggestedPassphrase: string;
    sampleEnv: string;
  } | null>(null);

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

  const showNotice = (text: string, isError = false) => {
    setNotice({ text, isError });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const handleGenerateKey = async () => {
    try {
      setGeneratingKey(true);
      const creds = await api.generateEncryptionKey();
      setGeneratedKey(creds);
      showNotice('Cryptographic key generated successfully.');
    } catch (err: any) {
      showNotice('Failed to generate encryption key: ' + err.message, true);
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await api.triggerBackup();
      setBackupSuccess(`Backup created: ${res.filename} (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      fetchStatus();
      setTimeout(() => setBackupSuccess(null), 4000);
    } catch (err: any) {
      showNotice(err.message || 'Failed to create backup', true);
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
      showNotice('Database restored successfully from backup file!');
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
      showNotice('All interaction records cleared.');
    } catch (err: any) {
      showNotice(err.message, true);
    }
  };

  const cleanGhUser = ghUsername.trim() || 'your-github-username';
  const ghcrImageTag = `ghcr.io/${cleanGhUser.toLowerCase()}/cadence:latest`;

  const dockerComposeSnippet = `services:
  cadence:
    image: ${ghcrImageTag}
    container_name: cadence
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DATA_DIR=/data
      - NODE_ENV=production
      # Optional: AES-256-GCM encryption at rest for database.json & snapshots
      # - ENCRYPTION_PASSPHRASE=your-strong-passphrase-here
    volumes:
      # Map to Unraid appdata share for private, parity-protected storage
      - /mnt/user/appdata/cadence:/data
`;

  const ghActionsWorkflowSnippet = `name: Build and Push Docker Image to GHCR

on:
  push:
    branches: [ "main", "master" ]
    tags: [ 'v*.*.*' ]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up QEMU (multi-platform amd64 & arm64)
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=raw,value=latest,enable=\${{ github.ref == format('refs/heads/{0}', github.event.repository.default_branch) }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Overview Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span>Cadence Deployment & Security Engine</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Zero third-party tracking or cloud telemetry. Host your private workplace documentation on your Unraid server with transparent AES-256-GCM encryption and GitHub Container Registry distribution.
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
              <span className="text-slate-400 block">Encryption at Rest</span>
              <span className="block mt-0.5">
                {status.encryption?.enabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <Lock className="w-3 h-3" />
                    AES-256-GCM Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                    <Unlock className="w-3 h-3" />
                    Plaintext (No key set)
                  </span>
                )}
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
              <span>Download Backup</span>
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
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{backupSuccess}</span>
          </div>
        )}

        {restoreError && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded text-xs text-rose-300">
            {restoreError}
          </div>
        )}
        {notice && (
          <div
            className={`p-3 rounded text-xs flex items-center justify-between border ${
              notice.isError
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100 ml-2">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Guide Section Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('persistence')}
            className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'persistence'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Docker Persistence & Safe Updates</span>
            <span className="text-[10px] bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
              Fix Data Loss
            </span>
          </button>

          <button
            onClick={() => setActiveTab('deployment')}
            className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'deployment'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>1. Unraid Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('encryption')}
            className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'encryption'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>2. Server-Side Encryption</span>
          </button>

          <button
            onClick={() => setActiveTab('ghcr')}
            className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'ghcr'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>3. Build & Push to GHCR</span>
          </button>
        </div>
      </div>

      {/* TAB 0: PERSISTENCE & SAFE DOCKER UPDATES */}
      {activeTab === 'persistence' && (
        <div className="space-y-6">
          {/* Diagnostic Alert Box */}
          <div className="p-4 sm:p-5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Why Data Gets Lost When Updating Docker & How It Is Solved</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When Docker updates a container (via <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">docker stop &amp;&amp; docker rm</code>, or clicking &quot;Update&quot; in Unraid), Docker <strong>deletes the old container</strong> and replaces it with a brand-new image layer. If your database is stored inside the container instead of a mapped host folder, your data disappears.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-rose-300 block">1. Missing Volume Mount</span>
                <p className="text-slate-400 text-[11px]">
                  Running without <code className="text-indigo-300">-v /mnt/user/appdata/cadence:/data</code> writes to temporary container storage that is destroyed on update.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-amber-300 block">2. Host Permissions (UID 99)</span>
                <p className="text-slate-400 text-[11px]">
                  Unraid shares are owned by <code className="text-indigo-300">nobody:users</code>. The updated container includes an entrypoint that automatically sets write permissions so saves never fail.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-300 block">3. Automated Pre-Update Snapshots</span>
                <p className="text-slate-400 text-[11px]">
                  Cadence now automatically creates a safety snapshot in <code className="text-indigo-300">/data/backups/</code> every time the container starts up.
                </p>
              </div>
            </div>
          </div>

          {/* Solution 1: Unraid XML Template */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    ✓
                  </span>
                  <span>Permanent Fix for Unraid: Community Applications Template</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  The official <code className="text-indigo-300">cadence.xml</code> template locks your volume mapping permanently into Unraid so clicking &quot;Update Container&quot; never loses data.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={api.getUnraidTemplateUrl()}
                  download="cadence.xml"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download cadence.xml</span>
                </a>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-2 text-xs">
              <span className="text-slate-300 font-semibold block">How to install the template into Unraid:</span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  Place the downloaded <code className="text-indigo-300">cadence.xml</code> file onto your Unraid flash drive at:
                  <br />
                  <code className="text-emerald-400 font-mono bg-slate-900 px-2 py-0.5 rounded mt-0.5 inline-block">
                    /boot/config/plugins/dockerMan/templates-user/my-cadence.xml
                  </code>
                </li>
                <li>
                  In your Unraid WebGUI, go to <strong>Docker &gt; Add Container</strong>.
                </li>
                <li>
                  In the <strong>Template</strong> dropdown at the top, select <strong>cadence</strong>.
                </li>
                <li>
                  Unraid will automatically fill in the permanent host volume mapping:
                  <div className="font-mono text-indigo-300 mt-1 pl-3 border-l-2 border-indigo-500/50">
                    Host Path: /mnt/user/appdata/cadence &lt;---&gt; Container Path: /data (Mode: RW)
                  </div>
                </li>
                <li>
                  Click <strong>Apply</strong>. Now when you click &quot;Update&quot; on the Docker page, Unraid will preserve your data across every update!
                </li>
              </ol>
            </div>
          </div>

          {/* Solution 2: Correct docker run command */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span>Docker CLI: Safe Update Workflow</span>
              </h3>

              <button
                onClick={() =>
                  handleCopy(
                    `# 1. Pull latest image\\ndocker pull ${ghcrImageTag}\\n\\n# 2. Stop and remove container (Host data is preserved!)\\ndocker stop cadence\\ndocker rm cadence\\n\\n# 3. Launch with host volume mounted\\ndocker run -d \\\\\\n  --name cadence \\\\\\n  --restart unless-stopped \\\\\\n  -p 3000:3000 \\\\\\n  -v /mnt/user/appdata/cadence:/data \\\\\\n  -e DATA_DIR=/data \\\\\\n  -e PORT=3000 \\\\\\n  ${ghcrImageTag}`,
                    'cli-update'
                  )
                }
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
              >
                {copiedSnippet === 'cli-update' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Commands</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`# 1. Pull the updated image
docker pull ${ghcrImageTag}

# 2. Stop and remove the old container (Host data in /mnt/user/appdata/cadence is 100% safe!)
docker stop cadence
docker rm cadence

# 3. Launch the new container with the exact volume flag -v /mnt/user/appdata/cadence:/data
docker run -d \\
  --name cadence \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v /mnt/user/appdata/cadence:/data \\
  -e DATA_DIR=/data \\
  -e PORT=3000 \\
  ${ghcrImageTag}`}
            </pre>
          </div>

          {/* Solution 3: Docker Compose */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Docker Compose: Zero-Downtime Safe Updates</span>
              </h3>
              <button
                onClick={() => handleCopy('docker compose pull && docker compose up -d', 'compose-update')}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
              >
                {copiedSnippet === 'compose-update' ? (
                  <span className="text-emerald-400">Copied</span>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              If you run Cadence via Docker Compose on Unraid or Linux, updating without data loss requires just a single command:
            </p>
            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-emerald-400">
              docker compose pull &amp;&amp; docker compose up -d
            </pre>
          </div>
        </div>
      )}

      {/* TAB 1: UNRAID DEPLOYMENT */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
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
              In Unraid, container storage resides in your <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">/mnt/user/appdata</code> share. This guarantees that your log entries are protected by your Unraid parity array and automatically covered by the Community Applications Appdata Backup plugin.
            </p>

            <div className="bg-slate-950 p-3 rounded border border-slate-800/80 text-xs font-mono space-y-1">
              <div className="text-slate-400">Container Path: <span className="text-emerald-400">/data</span></div>
              <div className="text-slate-400">Host Path (Unraid): <span className="text-indigo-400">/mnt/user/appdata/cadence</span></div>
              <div className="text-slate-400">Container Port: <span className="text-amber-400">3000</span> (Web UI)</div>
            </div>
          </div>

          {/* Step 2: Docker Compose */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Docker Compose Configuration (docker-compose.yml)
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
                Unraid GUI Setup (Docker &gt; Add Container)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              If deploying via the standard Unraid WebGUI, configure the following container values:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block font-semibold">Name</span>
                <span className="text-slate-200 font-mono">cadence</span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block font-semibold">Repository</span>
                <span className="text-slate-200 font-mono">{ghcrImageTag}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block font-semibold">Network Type</span>
                <span className="text-slate-200 font-mono">Bridge</span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block font-semibold">WebUI Port (Port 3000)</span>
                <span className="text-slate-200 font-mono">Host: 3000 | Container: 3000</span>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 block font-semibold">Data Volume (Path 1)</span>
                <span className="text-slate-200 font-mono">
                  Host Path: /mnt/user/appdata/cadence | Container Path: /data
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVER-SIDE ENCRYPTION */}
      {activeTab === 'encryption' && (
        <div className="space-y-6">
          {/* Encryption Overview Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  How Server-Side Encryption Works
                </h3>
              </div>
              <div className="text-xs">
                {status?.encryption?.enabled ? (
                  <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-mono flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    AES-256-GCM Active
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5" />
                    Plaintext on Disk
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To guarantee total privacy of sensitive coworker notes and contemporaneous workplace records, Cadence supports two complementary layers of server-side encryption:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>Layer 1: Built-In AES-256-GCM (Application Level)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cadence encrypts <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">database.json</code> and snapshot archives before writing them to the file system using <strong>AES-256-GCM authenticated encryption</strong> with <strong>scrypt key derivation</strong>. Even if someone inspects the raw files in your appdata share or takes a backup tarball, they cannot read any text without the passphrase.
                </p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Enabling: Set container env <code className="text-emerald-400">ENCRYPTION_PASSPHRASE</code>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
                  <Layers className="w-4 h-4" />
                  <span>Layer 2: Unraid Native LUKS (Disk Level)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unraid natively supports full array or cache pool encryption via <strong>LUKS (XFS encrypted)</strong>. Data is encrypted transparently on physical disk sectors with hardware <strong>AES-NI</strong> acceleration. If physical hard drives or your server are stolen, the drives cannot be mounted or read without the Unraid array master passphrase.
                </p>
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Enabling: Format Unraid cache/data drives as <code className="text-sky-300">xfs - encrypted</code>
                </div>
              </div>
            </div>
          </div>

          {/* Passphrase Generator Tool */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Generate High-Entropy Encryption Passphrase
                </h3>
              </div>
              <button
                onClick={handleGenerateKey}
                disabled={generatingKey}
                className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generatingKey ? 'Generating...' : 'Generate New Credentials'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Click to generate a cryptographically secure 256-bit hex key and a readable high-entropy passphrase. You can supply either format to <code className="text-indigo-300">ENCRYPTION_PASSPHRASE</code>.
            </p>

            {generatedKey && (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Suggested Passphrase (Memorizable / Diceware)
                    </span>
                    <button
                      onClick={() => handleCopy(generatedKey.suggestedPassphrase, 'phrase')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      {copiedSnippet === 'phrase' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'phrase' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 bg-slate-900/80 p-2 rounded break-all select-all">
                    {generatedKey.suggestedPassphrase}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Raw 256-bit Hex Key (Direct 32-byte key)
                    </span>
                    <button
                      onClick={() => handleCopy(generatedKey.hexKey, 'hex')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      {copiedSnippet === 'hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'hex' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-300 bg-slate-900/80 p-2 rounded break-all select-all">
                    {generatedKey.hexKey}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Docker Environment Variable Line
                    </span>
                    <button
                      onClick={() => handleCopy(generatedKey.sampleEnv, 'env')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono"
                    >
                      {copiedSnippet === 'env' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSnippet === 'env' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-amber-300 bg-slate-900/80 p-2 rounded break-all select-all">
                    {generatedKey.sampleEnv}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* How to configure on Unraid */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                !
              </span>
              <span>Enabling Encryption in Unraid Container Settings</span>
            </h3>

            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>In your Unraid WebGUI, open the <strong>Docker</strong> tab.</li>
              <li>Click on the <strong>cadence</strong> container icon and select <strong>Edit</strong>.</li>
              <li>Scroll to the bottom and click <strong>&ldquo;Add another Path, Port, Variable, label or device&rdquo;</strong>.</li>
              <li>Set <strong>Config Type</strong> to <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">Variable</code>.</li>
              <li>Set <strong>Name</strong> to <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">Encryption Passphrase</code>.</li>
              <li>Set <strong>Key</strong> to <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">ENCRYPTION_PASSPHRASE</code>.</li>
              <li>Paste your generated passphrase into <strong>Value</strong> and click <strong>Save</strong>.</li>
              <li>Click <strong>Apply</strong> to restart the container.</li>
            </ol>

            <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded text-xs text-indigo-300 mt-3">
              <strong>Seamless Zero-Loss Migration:</strong> If you already have existing records saved in plaintext, Cadence automatically detects them on startup, verifies the data, and transparently upgrades the file to AES-256-GCM encryption on the next write!
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BUILD & PUSH TO GHCR */}
      {activeTab === 'ghcr' && (
        <div className="space-y-6">
          {/* GHCR Intro */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                GitHub Container Registry (ghcr.io) Overview
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              GitHub Container Registry (<code className="text-indigo-300">ghcr.io</code>) is the official Docker image registry built into GitHub. It gives you <strong>free private or public container image hosting</strong> directly attached to your GitHub repo, with no rate-limiting or 6-month inactivity image deletion (unlike Docker Hub free tier).
            </p>

            <div className="pt-2 flex items-center gap-3">
              <div className="flex-1 max-w-sm">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Your GitHub Username / Organization:
                </label>
                <input
                  type="text"
                  value={ghUsername}
                  onChange={(e) => setGhUsername(e.target.value)}
                  placeholder="e.g. johndoe"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="text-xs text-slate-400 pt-5">
                Target Image: <code className="text-emerald-400 font-mono font-semibold">{ghcrImageTag}</code>
              </div>
            </div>
          </div>

          {/* Step 1: Create GitHub PAT */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                Create a GitHub Personal Access Token (PAT)
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              To push Docker images from your local machine terminal to GHCR, create a personal access token:
            </p>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Open GitHub &gt; <strong>Settings</strong> &gt; <strong>Developer Settings</strong> &gt; <strong>Personal Access Tokens (Tokens classic)</strong>.</li>
              <li>Click <strong>Generate new token (classic)</strong>.</li>
              <li>Select the <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded font-mono">write:packages</code> and <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded font-mono">read:packages</code> scopes.</li>
              <li>Click <strong>Generate token</strong> and copy the token string (starts with <code className="text-slate-400">ghp_...</code>).</li>
            </ol>
          </div>

          {/* Step 2: Docker Login */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Log in to GitHub Container Registry via CLI
                </h3>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `export CR_PAT=YOUR_GITHUB_PAT\necho $CR_PAT | docker login ghcr.io -u ${cleanGhUser} --password-stdin`,
                    'cli-login'
                  )
                }
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                {copiedSnippet === 'cli-login' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet === 'cli-login' ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
              {`export CR_PAT=YOUR_GITHUB_PAT\necho $CR_PAT | docker login ghcr.io -u ${cleanGhUser} --password-stdin`}
            </pre>
          </div>

          {/* Step 3: Build & Push Image */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-semibold text-slate-200">
                  Build and Push the Image
                </h3>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `# Build image from local Dockerfile\ndocker build -t ${ghcrImageTag} .\n\n# Push image to GitHub Container Registry\ndocker push ${ghcrImageTag}`,
                    'cli-build-push'
                  )
                }
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                {copiedSnippet === 'cli-build-push' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet === 'cli-build-push' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {`# Build image from local Dockerfile\ndocker build -t ${ghcrImageTag} .\n\n# Push image to GitHub Container Registry\ndocker push ${ghcrImageTag}`}
            </pre>
          </div>

          {/* Step 4: Setting Package Visibility */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h3 className="text-sm font-semibold text-slate-200">
                Make Package Public for Unraid (Or Authenticate Unraid)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              By default, newly pushed GHCR packages are private. You have two convenient options:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-emerald-400 font-semibold block mb-1">Option A: Make Package Public (Easiest for Unraid)</span>
                <p className="text-slate-400 leading-relaxed">
                  Go to your GitHub Profile &gt; <strong>Packages</strong> &gt; click <strong>cadence</strong> &gt; <strong>Package settings</strong> &gt; scroll to bottom &gt; <strong>Change package visibility</strong> &gt; select <strong>Public</strong>. Now Unraid can pull the image without any Docker credentials.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                <span className="text-indigo-400 font-semibold block mb-1">Option B: Keep Package Private</span>
                <p className="text-slate-400 leading-relaxed">
                  Log in on your Unraid server terminal once: <code className="text-slate-300">echo $PAT | docker login ghcr.io -u {cleanGhUser} --password-stdin</code>. Unraid will store the credential in its Docker daemon and pull private images automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Automated CI/CD Workflow */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Automated GitHub Actions CI/CD Workflow Included
                </h3>
              </div>
              <button
                onClick={() => handleCopy(ghActionsWorkflowSnippet, 'workflow')}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                {copiedSnippet === 'workflow' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet === 'workflow' ? 'Copied' : 'Copy Workflow'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              This repository already contains <code className="text-indigo-300">.github/workflows/docker-publish.yml</code>. Whenever you push code to GitHub or create a version tag, GitHub Actions automatically builds multi-arch (<code className="text-slate-300">amd64</code> &amp; <code className="text-slate-300">arm64</code>) and pushes to GHCR with zero manual commands:
            </p>
            <pre className="p-3.5 bg-slate-950 rounded border border-slate-800 text-xs font-mono text-slate-400 overflow-x-auto leading-relaxed max-h-56">
              {ghActionsWorkflowSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
