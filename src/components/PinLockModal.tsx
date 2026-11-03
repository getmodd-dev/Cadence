import React, { useState, useEffect } from 'react';
import { Lock, Delete, Shield, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface PinLockModalProps {
  onUnlockSuccess: () => void;
  isPinConfigured: boolean;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  onUnlockSuccess,
  isPinConfigured,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // If no PIN is configured, allow quick unlock button
  const handleQuickUnlock = () => {
    onUnlockSuccess();
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length >= 4) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const verify = async (candidate: string) => {
    if (!isPinConfigured) {
      onUnlockSuccess();
      return;
    }
    setIsVerifying(true);
    try {
      const ok = await api.verifyPin(candidate);
      if (ok) {
        onUnlockSuccess();
      } else {
        if (candidate.length >= 4) {
          setError('Incorrect passcode');
          setPin('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Keyboard support for typing digits directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        verify(pin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isPinConfigured]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 mx-auto shadow-md">
          <Lock className="w-5 h-5" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">
            Cadence Protected
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isPinConfigured
              ? 'Enter your private passcode to access contemporaneous records'
              : 'Screen is locked. Click unlock below to resume session.'}
          </p>
        </div>

        {/* PIN Indicator dots */}
        {isPinConfigured && (
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  pin.length > idx
                    ? 'bg-indigo-500 scale-110 shadow-sm shadow-indigo-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        {isPinConfigured ? (
          <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-lg font-semibold text-slate-200 transition-colors flex items-center justify-center"
              >
                {digit}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-lg font-semibold text-slate-200 transition-colors flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800/60 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleQuickUnlock}
            className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide transition-colors"
          >
            Unlock Session
          </button>
        )}

        <div className="pt-4 text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>Self-Hosted & Stored Exclusively on Local Volume</span>
        </div>
      </div>
    </div>
  );
};
