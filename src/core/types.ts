// Shared data types (kept in core to avoid world<->core import cycles).

export type PlanetType =
  | 'rocheuse'
  | 'glacee'
  | 'gazeuse'
  | 'ocean'
  | 'lave'
  | 'terrestre';

export interface Composition {
  fer: number;
  silicates: number;
  eau: number;
  methane: number;
  rares: number;
  autre: number;
}

export interface ScanRecord {
  planetId: string;
  systemId: string;
  name: string;
  type: PlanetType;
  composition: Composition;
  habitability: number;
  scienceValue: number;
  price: number;
  scannedAt: number;
}
