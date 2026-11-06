import type { UpgradeDef, UpgradeId } from './types';

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'engine',
    name: 'Turbofan',
    blurb: 'More thrust and top speed off the hill.',
    maxLevel: 8,
    baseCost: 40,
    costScale: 1.55,
  },
  {
    id: 'wings',
    name: 'Wing Kit',
    blurb: 'Sharper climb and dive response.',
    maxLevel: 8,
    baseCost: 35,
    costScale: 1.5,
  },
  {
    id: 'fuel',
    name: 'Fuel Cell',
    blurb: 'Stay airborne longer before the glide.',
    maxLevel: 10,
    baseCost: 30,
    costScale: 1.45,
  },
  {
    id: 'hull',
    name: 'Hull Plating',
    blurb: 'Block charges to shrug off obstacles.',
    maxLevel: 6,
    baseCost: 55,
    costScale: 1.7,
  },
  {
    id: 'cash',
    name: 'Sponsor Decals',
    blurb: 'Bigger payout per meter flown.',
    maxLevel: 8,
    baseCost: 50,
    costScale: 1.6,
  },
];

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costScale, level));
}

export function statsFromUpgrades(levels: Record<UpgradeId, number>) {
  const engine = levels.engine ?? 0;
  const wings = levels.wings ?? 0;
  const fuel = levels.fuel ?? 0;
  const hull = levels.hull ?? 0;
  const cash = levels.cash ?? 0;

  return {
    thrust: 2.4 + engine * 0.35,
    maxSpeed: 6.2 + engine * 0.55,
    climbRate: 0.11 + wings * 0.025,
    fuelMax: 5.5 + fuel * 0.95,
    blockCharges: hull,
    moneyMult: 1 + cash * 0.22,
  };
}
