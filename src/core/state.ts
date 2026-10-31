// Game state machine + persistence (localStorage).
import type { ScanRecord } from './types';

export type Phase =
  | 'title'
  | 'flying'
  | 'paused'
  | 'docking'
  | 'docked'
  | 'map'
  | 'hyperspace';

export interface PlayerState {
  credits: number;
  systemId: string;
  scans: Record<string, ScanRecord>;
  cargo: Record<string, number>;
  fuel: number;
  hull: number;
  shipsOwned: string[];
  currentShip: string;
  modules: Record<string, number>;
  paint: string;
  pos?: number[];
  quat?: number[];
  // étape 12 rareties: discovered anomalies (visited / long-range scan)
  // and one-shot wreck rewards already claimed.
  visited?: string[];
  sensed?: string[];
  loot?: string[];
}

const SAVE_KEY = 'stellar-drift.save.v1';

export class Game {
  phase: Phase = 'title';
  player: PlayerState = {
    credits: 10000,
    systemId: 'sys0',
    scans: {},
    cargo: {},
    fuel: 100,
    hull: 100,
    shipsOwned: [],
    currentShip: 'prototype',
    modules: {},
    paint: '#b8bec8',
    visited: [],
    sensed: [],
    loot: [],
  };
  systemName = 'Système inconnu';

  save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ v: 1, phase: this.phase, player: this.player }),
      );
    } catch {
      // storage unavailable: ignore
    }
  }

  static clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // storage unavailable: ignore
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d && d.player) {
        Object.assign(this.player, d.player);
        if (!this.player.scans) this.player.scans = {};
        if (!this.player.cargo) this.player.cargo = {};
        if (!this.player.shipsOwned) this.player.shipsOwned = [];
        if (!this.player.modules) this.player.modules = {};
        if (this.player.fuel === undefined) this.player.fuel = 100;
        if (this.player.hull === undefined) this.player.hull = 100;
        if (!Array.isArray(this.player.visited)) this.player.visited = [];
        if (!Array.isArray(this.player.sensed)) this.player.sensed = [];
        if (!Array.isArray(this.player.loot)) this.player.loot = [];
      }
      return true;
    } catch {
      return false;
    }
  }
}
