import React, { useState } from 'react';
import { CoworkerProfile, SystemSettings } from '../types';
import { api } from '../services/api';
import {
  X,
  Lock,
  User,
  Shield,
  EyeOff,
  Check,
  Plus,
  Trash2,
  Clock,
  KeyRound,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  coworkers: CoworkerProfile[];
  onRefreshCoworkers: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  settings,
  onUpdateSettings,
  coworkers,
  onRefreshCoworkers,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'security' | 'coworkers'>('security');

  // PIN settings state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // General settings state
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings.autoLockMinutes);
  const [stealthBlurDefault, setStealthBlurDefault] = useState(settings.stealthBlurDefault);

  // Coworker editor state
  const [editingCoworker, setEditingCoworker] = useState<Partial<CoworkerProfile> | null>(null);
  const [isAddingCoworker, setIsAddingCoworker] = useState(false);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin && settings.pinEnabled) {
      // Remove PIN
      await api.setPin('');
      setPinMessage({ text: 'Passcode removed successfully' });
      onUpdateSettings({ ...settings, pinEnabled: false });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ text: 'PIN must be at least 4 digits', error: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'PINs do not match', error: true });
      return;
    }
    try {
      await api.setPin(newPin);
      setPinMessage({ text: 'Passcode successfully configured!' });
      setNewPin('');
      setConfirmPin('');
      onUpdateSettings({ ...settings, pinEnabled: true });
    } catch (err: any) {
      setPinMessage({ text: err.message, error: true });
    }
  };

  const handleSaveGeneralSettings = async () => {
    try {
      const updated = await api.updateSettings({
        autoLockMinutes: Number(autoLockMinutes),
        stealthBlurDefault: Boolean(stealthBlurDefault),
      });
      onUpdateSettings(updated);
      alert('Preferences saved');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCoworker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoworker?.alias) return;
    try {
      await api.saveCoworker(editingCoworker);
      await onRefreshCoworkers();
      setEditingCoworker(null);
      setIsAddingCoworker(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCoworker = async (id: string) => {
    if (coworkers.length <= 1) {
      alert('You must have at least one coworker profile.');
      return;
    }
    if (confirm('Delete this coworker profile?')) {
      await api.deleteCoworker(id);
      await onRefreshCoworkers();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Privacy, Passcode & Coworker Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('security')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'security'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Passcode & Privacy</span>
          </button>
          <button
            onClick={() => setActiveSubTab('coworkers')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'coworkers'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Coworker Profiles ({coworkers.length})</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs flex-1">
          {activeSubTab === 'security' && (
            <div className="space-y-6">
              {/* Passcode Lock Setup */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                      PIN Lock Passcode
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {settings.pinEnabled
                        ? 'Passcode protection is currently ACTIVE.'
                        : 'No passcode currently set. Anyone with network access can view records.'}
                    </p>
                  </div>
                  {settings.pinEnabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono">
                      ENABLED
                    </span>
                  )}
                </div>

                <form onSubmit={handleSavePin} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">
                        {settings.pinEnabled ? 'New Passcode (4-6 digits):' : 'Set Passcode (4-6 digits):'}
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono tracking-widest text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Confirm Passcode:</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono tracking-widest text-center"
                      />
                    </div>
                  </div>

                  {pinMessage && (
                    <div
                      className={`p-2 rounded text-[11px] ${
                        pinMessage.error
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {pinMessage.text}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    {settings.pinEnabled && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Remove passcode lock completely?')) {
                            await api.setPin('');
                            onUpdateSettings({ ...settings, pinEnabled: false });
                            setPinMessage({ text: 'Passcode removed' });
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[11px]"
                      >
                        Disable Passcode
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!newPin}
                      className="ml-auto px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors"
                    >
                      Save Passcode
                    </button>
                  </div>
                </form>
              </div>

              {/* General Privacy & Auto-lock */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-slate-200 text-xs">
                  Session & Stealth Preferences
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Auto-Lock Idle Timeout:
                    </label>
                    <select
                      value={autoLockMinutes}
                      onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                    >
                      <option value={0}>Disabled (Never auto-lock)</option>
                      <option value={5}>5 minutes idle</option>
                      <option value={15}>15 minutes idle (Recommended)</option>
                      <option value={30}>30 minutes idle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      Stealth Blur on Launch:
                    </label>
                    <label className="flex items-center gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stealthBlurDefault}
                        onChange={(e) => setStealthBlurDefault(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span className="text-slate-300 text-xs">
                        Start session with sensitive text blurred
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={handleSaveGeneralSettings}
                    className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'coworkers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-200 text-xs">
                    Tracked Coworker Profiles
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Define the subject&apos;s alias, job title, and reporting relationship for formal logs.
                  </p>
                </div>
                {!editingCoworker && !isAddingCoworker && (
                  <button
                    onClick={() => {
                      setIsAddingCoworker(true);
                      setEditingCoworker({
                        id: `cw_${Date.now()}`,
                        alias: '',
                        role: '',
                        department: '',
                        relationship: 'Peer',
                        isPrimarySubject: false,
                      });
                    }}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coworker</span>
                  </button>
                )}
              </div>

              {/* Coworker edit / add form */}
              {editingCoworker && (
                <form
                  onSubmit={handleSaveCoworker}
                  className="bg-slate-950 border border-indigo-500/50 rounded-lg p-4 space-y-3"
                >
                  <h4 className="font-semibold text-indigo-300 text-xs">
                    {isAddingCoworker ? 'Add New Coworker' : 'Edit Coworker Profile'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">
                        Alias / Name (Required):
                      </label>
                      <input
                        type="text"
                        required
                        value={editingCoworker.alias || ''}
                        onChange={(e) =>
                          setEditingCoworker({ ...editingCoworker, alias: e.target.value })
                        }
                        placeholder="e.g. Alex M. or Coworker J"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Role / Job Title:</label>
                      <input
                        type="text"
                        value={editingCoworker.role || ''}
                        onChange={(e) =>
                          setEditingCoworker({ ...editingCoworker, role: e.target.value })
                        }
                        placeholder="e.g. Senior Product Manager"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Department / Team:</label>
                      <input
                        type="text"
                        value={editingCoworker.department || ''}
                        onChange={(e) =>
                          setEditingCoworker({ ...editingCoworker, department: e.target.value })
                        }
                        placeholder="e.g. Product Engineering"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Relationship:</label>
                      <select
                        value={editingCoworker.relationship || 'Peer'}
                        onChange={(e) =>
                          setEditingCoworker({
                            ...editingCoworker,
                            relationship: e.target.value as any,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                      >
                        <option value="Peer">Peer</option>
                        <option value="Manager">Manager / Supervisor</option>
                        <option value="Direct Report">Direct Report</option>
                        <option value="Cross-functional">Cross-functional</option>
                        <option value="Executive">Executive</option>
                        <option value="External">External / Contractor</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCoworker.isPrimarySubject || false}
                        onChange={(e) =>
                          setEditingCoworker({
                            ...editingCoworker,
                            isPrimarySubject: e.target.checked,
                          })
                        }
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span className="text-slate-300 text-xs">
                        Set as Primary Subject for new logs
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCoworker(null);
                          setIsAddingCoworker(false);
                        }}
                        className="px-3 py-1 rounded bg-slate-900 text-slate-400 hover:text-slate-200 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
                      >
                        Save Profile
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Coworker list */}
              <div className="space-y-2">
                {coworkers.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">{c.alias}</span>
                        {c.isPrimarySubject && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-mono">
                            Primary
                          </span>
                        )}
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400 text-xs">{c.relationship}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {c.role || 'No title set'} {c.department ? `· ${c.department}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setIsAddingCoworker(false);
                          setEditingCoworker(c);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCoworker(c.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
