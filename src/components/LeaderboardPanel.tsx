import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '../hooks/useAuth';
import type { InstrumentConfig } from '../utils/instruments';
import { playClickSound, haptic } from '../utils/feedback';
import {
  fetchLeaderboard,
  upsertMyEntry,
  deleteMyEntry,
  leaderboardName,
  type LeaderboardRow,
  type MyStats,
} from '../utils/leaderboard';

/**
 * The leaderboard, rendered as a hamburger settings sub-page.
 *
 * Free / open feature: the standings load for everyone, signed in or not. A
 * signed-in player is pushed onto the board automatically (their XP = lifetime
 * correct answers on the current instrument) and can hide themselves with the
 * toggle. Guests see the list plus a sign-in nudge.
 *
 * The board is per-instrument — guitar and bass have separate standings — so
 * switching instrument reloads it.
 */
export function LeaderboardPanel({
  instrument,
  user,
  profile,
  myStats,
  optedOut,
  onOptOutChange,
  onSignIn,
}: {
  instrument: InstrumentConfig;
  user: User | null;
  profile: AuthProfile | null;
  myStats: MyStats;
  optedOut: boolean;
  onOptOutChange: (next: boolean) => void;
  onSignIn: () => void;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const userId = user?.id ?? null;
  const myName = leaderboardName(profile?.name ?? null, profile?.email ?? user?.email ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchLeaderboard(instrument.id, userId);
      setRows(list);
    } catch {
      setError('Couldn’t load the leaderboard. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [instrument.id, userId]);

  // On open (and on instrument / sign-in change): push our own up-to-date row
  // first when we're participating, then load the standings so our position is
  // current. A push failure is non-fatal — we still show the list.
  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (userId && !optedOut) {
          try {
            await upsertMyEntry(userId, instrument.id, myName, myStats);
          } catch { /* keep going — show whatever is on the board */ }
        }
        const list = await fetchLeaderboard(instrument.id, userId);
        if (alive) setRows(list);
      } catch {
        if (alive) {
          setError('Couldn’t load the leaderboard. Check your connection and try again.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // myStats / myName are snapshots captured at open; intentionally not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument.id, userId, optedOut]);

  const toggleParticipation = async () => {
    if (!userId || busy) return;
    playClickSound();
    haptic.tap();
    const nextOut = !optedOut;
    setBusy(true);
    setError(null);
    try {
      if (nextOut) {
        await deleteMyEntry(userId, instrument.id);
      } else {
        await upsertMyEntry(userId, instrument.id, myName, myStats);
      }
      onOptOutChange(nextOut);
      await load();
    } catch {
      setError('Couldn’t update that. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const mine = rows.find((r) => r.mine);

  const intro = (
    <p className="board-intro">
      All-time standings for {instrument.label}, ranked by XP — one point per
      correct answer. Free for everyone; sign in with Google to take your place
      on it.
    </p>
  );

  const signInCard = !user && (
    <button
      className="set-card-btn set-card-btn-primary"
      onClick={() => {
        playClickSound();
        haptic.tap();
        onSignIn();
      }}
    >
      Sign in with Google to join
    </button>
  );

  const meCard = user && (
    <div className="lb-me">
      <div className="lb-me-row">
        <span className="lb-me-rank">
          {optedOut ? '—' : mine ? `#${mine.rank}` : '—'}
        </span>
        <span className="lb-me-name">{myName} (you)</span>
        <span className="lb-me-xp">{myStats.xp} XP</span>
      </div>
      <div className="lb-me-sub">
        {myStats.questions} answered · {myStats.accuracy}% accuracy
      </div>
      <button
        className="board-action"
        disabled={busy}
        onClick={() => void toggleParticipation()}
      >
        {optedOut ? 'Show me on the leaderboard' : 'Hide me from the leaderboard'}
      </button>
    </div>
  );

  const list = loading ? (
    <p className="board-empty">Loading…</p>
  ) : rows.length === 0 ? (
    <p className="board-empty">No one’s on the board yet — be the first.</p>
  ) : (
    <ol className="lb-list">
      {rows.map((r) => (
        <li
          key={r.userId}
          className={`lb-item${r.mine ? ' lb-item-me' : ''}`}
        >
          <span className={`lb-rank${r.rank <= 3 ? ` lb-rank-${r.rank}` : ''}`}>
            {r.rank}
          </span>
          <span className="lb-name">{r.displayName}</span>
          <span className="lb-stat">
            <span className="lb-xp">{r.xp} XP</span>
            <span className="lb-acc">{r.accuracy}%</span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="board">
      {intro}
      {signInCard}
      {meCard}
      {error && <p className="board-error">{error}</p>}
      {list}
    </div>
  );
}
