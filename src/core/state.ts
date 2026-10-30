// Game state machine + persistence (localStorage).
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
}

const SAVE_KEY = 'stellar-drift.save.v1';

export class Game {
  phase: Phase = 'title';
  player: PlayerState = { credits: 10000, systemId: 'sys0' };
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
      if (d && d.player) Object.assign(this.player, d.player);
      return true;
    } catch {
      return false;
    }
  }
}
