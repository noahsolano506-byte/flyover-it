import type { SaveData, UpgradeId } from './types';

const KEY = 'flyoverit-save-v1';

const DEFAULT_UPGRADES: Record<UpgradeId, number> = {
  engine: 0,
  wings: 0,
  fuel: 0,
  hull: 0,
  cash: 0,
};

export function defaultSave(): SaveData {
  return {
    money: 0,
    bestDistance: 0,
    upgrades: { ...DEFAULT_UPGRADES },
    totalFlights: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      money: Math.max(0, Number(parsed.money) || 0),
      bestDistance: Math.max(0, Number(parsed.bestDistance) || 0),
      upgrades: { ...DEFAULT_UPGRADES, ...(parsed.upgrades ?? {}) },
      totalFlights: Math.max(0, Number(parsed.totalFlights) || 0),
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}
