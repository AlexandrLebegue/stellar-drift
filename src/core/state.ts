// Game state machine + persistence (localStorage).
import type { ScanRecord } from './types';

export type Phase =
  | 'title'
  | 'flying'
  | 'paused'
  | 'map'
  | 'scanning'
  | 'hyperspace'
  | 'docked';

export interface PlayerState {
  credits: number;
  systemId: string;
  scans: Record<string, ScanRecord>;
}

const SAVE_KEY = 'stellar-drift.save.v1';

export class Game {
  phase: Phase = 'title';
  player: PlayerState = { credits: 10000, systemId: 'sys0', scans: {} };
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

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d && d.player) {
        Object.assign(this.player, d.player);
        if (!this.player.scans) this.player.scans = {};
      }
      return true;
    } catch {
      return false;
    }
  }
}
