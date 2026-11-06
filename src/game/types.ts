export type Screen = 'landing' | 'play' | 'shop' | 'result';

export type FlightMode = 'casual' | 'record';

export type UpgradeId =
  | 'engine'
  | 'wings'
  | 'fuel'
  | 'hull'
  | 'cash';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  blurb: string;
  maxLevel: number;
  baseCost: number;
  costScale: number;
}

export interface SaveData {
  money: number;
  bestDistance: number;
  upgrades: Record<UpgradeId, number>;
  totalFlights: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'bird' | 'balloon' | 'cloud';
  vy: number;
  hit: boolean;
}

export interface FlightResult {
  distance: number;
  earnings: number;
  mode: FlightMode;
  isRecord: boolean;
  crashed: boolean;
  blocked: number;
}
