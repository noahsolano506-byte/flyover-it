import { useEffect, useId, useRef, useState } from 'react';
import { UPGRADES } from '../game/upgrades';
import type { SaveData, UpgradeId } from '../game/types';

const SECRET = 'iamtheturtle';
const UNLOCK_KEY = 'flyoverit-turtle-unlocked';

export interface CheatFlags {
  turtleShell: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  save: SaveData;
  onSave: (next: SaveData | ((prev: SaveData) => SaveData)) => void;
  cheats: CheatFlags;
  onCheats: (next: CheatFlags) => void;
}

function wasUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function CheatPad({ open, onClose, save, onSave, cheats, onCheats }: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(wasUnlocked);
  const [error, setError] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCode('');
      setError(false);
      setFlash(null);
      return;
    }
    if (!unlocked) {
      queueMicrotask(() => inputRef.current?.focus());
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, unlocked, onClose]);

  if (!open) return null;

  const tryUnlock = () => {
    if (code.trim() === SECRET) {
      markUnlocked();
      setUnlocked(true);
      setError(false);
      setCode('');
      return;
    }
    setError(true);
  };

  const bump = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1600);
  };

  const grantCash = () => {
    onSave((prev) => ({ ...prev, money: prev.money + 50_000 }));
    bump('+ $50,000');
  };

  const maxUpgrades = () => {
    onSave((prev) => {
      const upgrades = { ...prev.upgrades };
      for (const u of UPGRADES) {
        upgrades[u.id as UpgradeId] = u.maxLevel;
      }
      return { ...prev, upgrades };
    });
    bump('Upgrades maxed');
  };

  const fatRecord = () => {
    onSave((prev) => ({
      ...prev,
      bestDistance: Math.max(prev.bestDistance, 99_999),
    }));
    bump('Best set to 99,999 m');
  };

  const toggleShell = () => {
    const next = !cheats.turtleShell;
    onCheats({ ...cheats, turtleShell: next });
    bump(next ? 'Turtle shell ON' : 'Turtle shell OFF');
  };

  return (
    <div
      className="cheat-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cheat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cheat-head">
          <h2 id={titleId}>{unlocked ? 'Turtle cheats' : 'Code pad'}</h2>
          <button
            type="button"
            className="text-btn advertise-close"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {!unlocked ? (
          <>
            <p className="cheat-lead">Enter the access code.</p>
            <form
              className="cheat-form"
              onSubmit={(e) => {
                e.preventDefault();
                tryUnlock();
              }}
            >
              <input
                ref={inputRef}
                className={`cheat-input${error ? ' cheat-input-bad' : ''}`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={code}
                placeholder="Code"
                aria-invalid={error}
                aria-describedby={error ? 'cheat-err' : undefined}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(false);
                }}
              />
              <button type="submit" className="ctl-btn ctl-primary">
                Unlock
              </button>
            </form>
            {error && (
              <p id="cheat-err" className="cheat-error" role="alert">
                Wrong code.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="cheat-lead">
              Bank ${save.money.toLocaleString()} · Best {save.bestDistance.toLocaleString()} m
            </p>
            <div className="cheat-grid">
              <button type="button" className="ctl-btn ctl-primary" onClick={grantCash}>
                + $50,000
              </button>
              <button type="button" className="ctl-btn" onClick={maxUpgrades}>
                Max upgrades
              </button>
              <button type="button" className="ctl-btn" onClick={fatRecord}>
                Best 99,999 m
              </button>
              <button
                type="button"
                className={`ctl-btn${cheats.turtleShell ? ' ctl-accent' : ''}`}
                onClick={toggleShell}
                aria-pressed={cheats.turtleShell}
              >
                Turtle shell {cheats.turtleShell ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="cheat-hint">
              Turtle shell: infinite fuel and shrug-off hits on the next flights.
            </p>
            {flash && (
              <p className="cheat-flash" role="status">
                {flash}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
