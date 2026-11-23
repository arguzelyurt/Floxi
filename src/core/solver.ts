// Derinlik öncelikli çözücü. Hamleleri "temiz tur önce, çok silen önce" sırasıyla dener,
// görülen durumları atlar. Üretilen seviyelerde çözümü genelde ilk denemede bulur.

import { applyMove, Level, legalMoves, Move, MoveResult, State, stateKey } from './rules';

export interface SolveResult {
  moves: Move[] | null;
  /** Düğüm sınırına takıldıysa true (çözümsüz demek değildir) */
  exhausted: boolean;
}

export function solve(level: Level, start: State, maxNodes = 20000): SolveResult {
  const seen = new Set<string>();
  let nodes = 0;
  let exhausted = false;

  const dfs = (s: State, path: Move[]): Move[] | null => {
    if (s.status === 'won') return path;
    if (s.status === 'stuck') return null;
    if (++nodes > maxNodes) {
      exhausted = true;
      return null;
    }
    const key = stateKey(s);
    if (seen.has(key)) return null;
    seen.add(key);

    const options: { m: Move; r: MoveResult }[] = [];
    for (const m of legalMoves(level, s)) {
      const r = applyMove(level, s, m);
      // Rıhtımdan çıkıp hiçbir şey silmeyen flox durumu değiştirmez
      if (m.from === 'dock' && r.hits.length === 0) continue;
      if (r.state.status === 'stuck') continue;
      options.push({ m, r });
    }
    options.sort((a, b) => {
      const ca = a.r.left === 0 ? 1 : 0;
      const cb = b.r.left === 0 ? 1 : 0;
      if (ca !== cb) return cb - ca;
      if (a.r.hits.length !== b.r.hits.length) return b.r.hits.length - a.r.hits.length;
      return (a.m.from === 'lane' ? 0 : 1) - (b.m.from === 'lane' ? 0 : 1);
    });
    for (const o of options) {
      const res = dfs(o.r.state, [...path, o.m]);
      if (res) return res;
      if (exhausted) return null;
    }
    return null;
  };

  const moves = dfs(start, []);
  return { moves, exhausted };
}

/** İpucu: çözüm bulunursa ilk hamle. Telefonda hızlı kalsın diye düğüm sınırı düşük. */
export function hint(level: Level, s: State, maxNodes = 4000): Move | null {
  const r = solve(level, s, maxNodes);
  return r.moves && r.moves.length > 0 ? r.moves[0] : null;
}
