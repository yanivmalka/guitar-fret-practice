import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '../hooks/useAuth';
import { getInstrument, type InstrumentId } from '../utils/instruments';
import { historyForInstrument } from '../utils/mastery';
import type { HistoryEntry } from '../utils/music';
import { playClickSound, haptic } from '../utils/feedback';
import {
  fetchLeaderboard,
  upsertMyEntry,
  deleteMyEntry,
  computeMyStats,
  leaderboardName,
  type LeaderboardRow,
} from '../utils/leaderboard';

/**
 * The leaderboard, rendered as a hamburger settings sub-page (the wrapper in
 * App.tsx already draws the "‹ Back" row and the 🏆 / "Leaderboard" hero, so
 * this body starts at the subtitle).
 *
 * Free / open feature: the standings load for everyone, signed in or not. A
 * signed-in player is pushed onto the board automatically (their XP = lifetime
 * correct answers on the selected instrument) and can hide themselves with the
 * toggle. Guests see the list plus a sign-in nudge.
 *
 * The board is per-instrument, and a Guitar / Bass switch lets a player look at
 * either without leaving the drill they're set up for.
 */

const medalColor = (rank: number): string =>
  rank === 1 ? '#ffd700' : rank === 2 ? '#c8d0e0' : rank === 3 ? '#cd7f32' : '#6f6f8c';

function initialOf(name: string): string {
  const c = name.trim()[0];
  return c ? c.toUpperCase() : '?';
}

function Medal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3l1.8 4.2M15 3l-1.8 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function LeaderboardPanel({
  activeInstrumentId,
  allHistory,
  user,
  profile,
  optedOut,
  onOptOutChange,
  onSignIn,
}: {
  activeInstrumentId: InstrumentId;
  allHistory: Record<string, HistoryEntry[]>;
  user: User | null;
  profile: AuthProfile | null;
  optedOut: boolean;
  onOptOutChange: (next: boolean) => void;
  onSignIn: () => void;
}) {
  const [view, setView] = useState<InstrumentId>(activeInstrumentId);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);

  const instrument = getInstrument(view);
  const userId = user?.id ?? null;
  const myName = leaderboardName(profile?.name ?? null, profile?.email ?? user?.email ?? null);
  const myStats = useMemo(
    () => computeMyStats(historyForInstrument(allHistory, view)),
    [allHistory, view],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchLeaderboard(view, userId));
    } catch {
      setError('Couldn’t load the leaderboard. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [view, userId]);

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
            await upsertMyEntry(userId, view, myName, myStats);
          } catch { /* keep going — show whatever is on the board */ }
        }
        const list = await fetchLeaderboard(view, userId);
        if (alive) setRows(list);
      } catch {
        if (alive) setError('Couldn’t load the leaderboard. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // myStats / myName are snapshots captured at open; intentionally not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, userId, optedOut]);

  const switchView = (next: InstrumentId) => {
    if (next === view) return;
    playClickSound();
    haptic.tap();
    setView(next);
  };

  const toggleParticipation = async () => {
    if (!userId || busy) return;
    playClickSound();
    haptic.tap();
    const nextOut = !optedOut;
    setBusy(true);
    setError(null);
    try {
      if (nextOut) await deleteMyEntry(userId, view);
      else await upsertMyEntry(userId, view, myName, myStats);
      onOptOutChange(nextOut);
      await load();
    } catch {
      setError('Couldn’t update that. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const mine = rows.find((r) => r.mine);
  const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
  const listRows = podium.length ? rows.slice(3) : rows;
  const playerCount =
    rows.length === 0 ? null : rows.length >= 100 ? '100+ players' : `${rows.length} player${rows.length === 1 ? '' : 's'}`;

  // ── sub-blocks ────────────────────────────────────────────────────────────

  const subtitle = (
    <p className="lb-subtitle">
      {instrument.label} · ranked by XP{playerCount ? ` · ${playerCount}` : ''} · free for everyone
    </p>
  );

  const toggles = (
    <div className="lb-toggles">
      <div className="sp2-scope lb-scope">
        {(['guitar', 'bass'] as InstrumentId[]).map((id) => (
          <button
            key={id}
            className={`sp2-scope-btn${view === id ? ' sp2-scope-active' : ''}`}
            onClick={() => switchView(id)}
          >
            {getInstrument(id).label}
          </button>
        ))}
      </div>
      <div className="sp2-scope lb-scope">
        <button className="sp2-scope-btn sp2-scope-active">All-time</button>
        <button className="sp2-scope-btn lb-scope-soon" disabled title="Coming soon">
          This week
        </button>
      </div>
    </div>
  );

  const meCard = user ? (
    <div className="lb-standing">
      <div className="lb-standing-k">Your standing</div>
      <div className="lb-standing-row">
        <div className="lb-rankpill">
          <span className="lb-rankpill-n">{mine ? mine.rank : optedOut ? '–' : '–'}</span>
          <span className="lb-rankpill-l">RANK</span>
        </div>
        <div className="lb-standing-id">
          <div className="lb-standing-name">{myName}</div>
          <div className="lb-standing-sub">
            {myStats.questions.toLocaleString()} answered · {myStats.accuracy}% accuracy
          </div>
        </div>
        <div className="lb-standing-xp">
          <div className="lb-standing-xp-n">{myStats.xp.toLocaleString()}</div>
          <div className="lb-standing-xp-l">XP</div>
        </div>
      </div>
      <div className="lb-standing-foot">
        <span>{optedOut ? 'Hidden from the leaderboard' : 'Visible on the leaderboard'}</span>
        <button
          className={`lb-switch${optedOut ? '' : ' lb-switch-on'}`}
          role="switch"
          aria-checked={!optedOut}
          disabled={busy}
          onClick={() => void toggleParticipation()}
        >
          <span className="lb-switch-knob" />
        </button>
      </div>
    </div>
  ) : (
    <div className="lb-standing lb-standing-guest">
      <div className="lb-standing-k">Join the board</div>
      <p className="lb-guest-copy">
        You can see every player’s standing right now. Sign in with Google to take your own
        place — every correct answer you’ve ever played counts. Free, no subscription.
      </p>
      <button
        className="set-card-btn set-card-btn-primary"
        onClick={() => {
          playClickSound();
          haptic.tap();
          onSignIn();
        }}
      >
        Sign in with Google
      </button>
    </div>
  );

  const podiumBlock = podium.length === 3 && (
    <div className="lb-podium">
      {[podium[1], podium[0], podium[2]].map((r) => (
        <div
          key={r.userId}
          className={`lb-pod lb-pod-${r.rank}${r.mine ? ' lb-pod-me' : ''}`}
        >
          <div className="lb-pod-av" style={{ background: medalColor(r.rank) }}>
            {initialOf(r.displayName)}
          </div>
          <div className="lb-pod-medal" style={{ color: medalColor(r.rank) }}>
            <Medal />
            <span>{r.rank}</span>
          </div>
          <div className="lb-pod-name">{r.displayName}</div>
          <div className="lb-pod-xp">{r.xp.toLocaleString()}</div>
          <div className="lb-pod-acc">{r.accuracy}% acc</div>
        </div>
      ))}
    </div>
  );

  const listBlock = (
    <ol className="lb-list">
      {listRows.map((r) => (
        <li key={r.userId} className={`lb-item${r.mine ? ' lb-item-me' : ''}`}>
          <span className="lb-rk" style={r.rank <= 3 ? { color: medalColor(r.rank) } : undefined}>
            {r.rank}
          </span>
          <span className="lb-av">{initialOf(r.displayName)}</span>
          <span className="lb-name">
            {r.displayName}
            {r.mine && <span className="lb-you"> (you)</span>}
          </span>
          <span className="lb-stat">
            <span className="lb-xp">{r.xp.toLocaleString()}</span>
            <span className="lb-acc">{r.accuracy}% acc</span>
          </span>
        </li>
      ))}
    </ol>
  );

  const emptyBlock = (
    <div className="lb-empty">
      <svg
        width="44" height="44" viewBox="0 0 24 24" fill="none"
        stroke="#3a3a5c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 4h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" />
        <path d="M6 5H4a2 2 0 0 0 0 4h1M18 5h2a2 2 0 0 1 0 4h-1" />
        <path d="M10 12v3M14 12v3M8 20h8M9 20a3 3 0 0 1 6 0" />
      </svg>
      <div className="lb-empty-title">No one’s on the board yet</div>
      <p className="lb-empty-copy">
        Finish a practice run while signed in and your name lands here first.
      </p>
    </div>
  );

  const xpExplainer = (
    <div className="lb-xpexp">
      <button
        className={`sp2-exp${xpOpen ? ' sp2-exp-open' : ''}`}
        aria-expanded={xpOpen}
        onClick={() => {
          playClickSound();
          haptic.tap();
          setXpOpen((v) => !v);
        }}
      >
        <span>How is XP counted?</span>
        <span className="sp2-chev" aria-hidden="true">{xpOpen ? '▾' : '▸'}</span>
      </button>
      {xpOpen && (
        <p className="lb-xpexp-body">
          1&nbsp;XP for every correct answer, added up across all your {instrument.label.toLowerCase()}{' '}
          practice — the same lifetime total as your Stats screen. Speed and streak bonuses lift
          your in-game score, not your XP. Turn <em>Visible on the leaderboard</em> off any time to
          leave the board.
        </p>
      )}
    </div>
  );

  return (
    <div className="board lb-panel">
      {subtitle}
      {toggles}
      {meCard}
      {error && <p className="board-error">{error}</p>}
      {loading ? (
        <p className="board-empty">Loading…</p>
      ) : rows.length === 0 ? (
        emptyBlock
      ) : (
        <>
          {podiumBlock}
          {listBlock}
        </>
      )}
      {xpExplainer}
    </div>
  );
}
