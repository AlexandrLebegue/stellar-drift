export type ShipClass = 'sparrow' | 'mule' | 'falcon' | 'prototype';

export interface ShipDef {
  cls: ShipClass;
  name: string;
  price: number;
  desc: string;
  maxSpeed: number;
  maxThrust: number;
  turn: number;
  hold: number;
  jumpRange: number;
  scanRange: number;
  scanTime: number;
  fuelCap: number;
  hullMax: number;
}

export const SHIPS: Record<ShipClass, ShipDef> = {
  prototype: {
    cls: 'prototype',
    name: 'Prototype',
    price: 0,
    desc: 'Vaisseau de test fourni. Correct sur le papier.',
    maxSpeed: 150,
    maxThrust: 60,
    turn: 1.0,
    hold: 16,
    jumpRange: 10,
    scanRange: 2500,
    scanTime: 3.0,
    fuelCap: 100,
    hullMax: 100,
  },
  sparrow: {
    cls: 'sparrow',
    name: 'Sparrow',
    price: 25000,
    desc: 'Petit et agile, soute 8. Le chasseur favori des patrouilleurs.',
    maxSpeed: 175,
    maxThrust: 78,
    turn: 1.3,
    hold: 8,
    jumpRange: 10,
    scanRange: 2500,
    scanTime: 3.0,
    fuelCap: 100,
    hullMax: 100,
  },
  mule: {
    cls: 'mule',
    name: 'Mule',
    price: 45000,
    desc: 'Cargo lent mais soute 64. Il pue un peu le frein.',
    maxSpeed: 110,
    maxThrust: 46,
    turn: 0.8,
    hold: 64,
    jumpRange: 12,
    scanRange: 2000,
    scanTime: 3.5,
    fuelCap: 130,
    hullMax: 140,
  },
  falcon: {
    cls: 'falcon',
    name: 'Falcon',
    price: 80000,
    desc: 'Explorateur : grande portée de saut, excellent scanner.',
    maxSpeed: 145,
    maxThrust: 62,
    turn: 1.05,
    hold: 20,
    jumpRange: 18,
    scanRange: 4500,
    scanTime: 2.0,
    fuelCap: 160,
    hullMax: 120,
  },
};

export type ModuleType = 'moteur' | 'fsd' | 'soute' | 'scanner' | 'reservoir' | 'coque';

export interface ModuleDef {
  type: ModuleType;
  name: string;
  base: number;
  max: number;
}

export const MODULES: ModuleDef[] = [
  { type: 'moteur', name: 'Moteur', base: 3000, max: 3 },
  { type: 'fsd', name: 'Réacteur de saut (FSD)', base: 4000, max: 3 },
  { type: 'soute', name: 'Soute', base: 2500, max: 3 },
  { type: 'scanner', name: 'Scanner', base: 3500, max: 3 },
  { type: 'reservoir', name: 'Réservoir', base: 2000, max: 3 },
  { type: 'coque', name: 'Coque', base: 2800, max: 3 },
];

export const PAINTS = [
  '#b8bec8',
  '#c05a4a',
  '#5aa05a',
  '#4a7ec0',
  '#e8e2d0',
  '#2b2f38',
];

// cost of buying level (1-based) of a module
export function moduleCost(def: ModuleDef, level: number): number {
  return def.base * (level + 1);
}
