import { useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

function Phone({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="sr-phone-wrap">
      <div className="sr-phone-title">
        {title}
        {note && <span> — {note}</span>}
      </div>
      <div className="sr-phone">
        <div className="sr-phone-notch" />
        <div className="sr-screen">{children}</div>
      </div>
    </div>
  );
}

function PageHead() {
  return (
    <div className="sr-head">
      <span className="sr-back">‹ Back</span>
      <span className="sr-title">Stats &amp; progress</span>
    </div>
  );
}

function Scope({ value }: { value: 'setup' | 'all' }) {
  return (
    <div className="sr-scope">
      <span className={`sr-scope-btn ${value === 'setup' ? 'active' : ''}`}>This setup</span>
      <span className={`sr-scope-btn ${value === 'all' ? 'active' : ''}`}>All time</span>
    </div>
  );
}

const STRING_BARS = [
  ['E hi', 92, 'mastered'],
  ['B', 81, 'mastered'],
  ['G', 74, 'solid'],
  ['D', 66, 'solid'],
  ['A', 58, 'growing'],
  ['E lo', 88, 'mastered'],
] as const;

export default function StatsRedesign() {
  const [theme, setTheme] = useState<Theme>('dark');

  return (
    <div className="sr-root" data-theme={theme}>
      <div className="sr-topbar">
        <div>
          <span className="sr-brand-title">🎸 Stats &amp; progress</span>
          <span className="sr-brand-sub">Redesign Lab — proposal, not in the app</span>
        </div>
        <div className="sr-toggle-group">
          <button className={`sr-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
          <button className={`sr-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
        </div>
      </div>

      <p className="sr-intro">
        A rethink of the merged <strong>Stats &amp; progress</strong> screen. Instead of five wrapping
        tabs with a second tab bar nested inside, it becomes one scrolling page: a single header, a{' '}
        <strong>This setup / All time</strong> scope switch, a row of hero stat tiles for the
        motivating glance, the most actionable section (weakest notes) open by default, and everything
        else behind expanders sharing one bar/row primitive. &ldquo;Clear history&rdquo; drops to a
        low-emphasis action at the bottom, correctly scoped. These are static mockups of structure and
        hierarchy — no production file is touched.
      </p>

      <div className="sr-gallery">

        {/* ── 1. This setup, default view ─────────────────── */}
        <Phone title="This setup" note="default view">
          <PageHead />
          <Scope value="setup" />
          <div className="sr-scope-cap">🎸 6 strings · frets 0–12 · by fret · naturals</div>

          <div className="sr-hero">
            <div className="sr-tile"><span className="sr-tile-v sr-gold">82%</span><span className="sr-tile-l">accuracy</span></div>
            <div className="sr-tile"><span className="sr-tile-v">🔥 12</span><span className="sr-tile-l">best streak</span></div>
            <div className="sr-tile"><span className="sr-tile-v">⚡ 2.4s</span><span className="sr-tile-l">avg speed</span></div>
          </div>

          <div className="sr-strip">Last round <b>1,860 pts</b> · <span className="sr-gold">🏆 new personal best</span></div>

          <div className="sr-section">
            <div className="sr-section-head"><span>🎯 Weakest notes</span><span className="sr-hint">work on these</span></div>
            <div className="sr-chips">
              {([['G#', 41], ['D#', 58], ['A#', 63], ['C#', 67]] as const).map(([n, p]) => (
                <span className="sr-chip" key={n}>{n} <span className="sr-chip-bad">{p}%</span></span>
              ))}
            </div>
          </div>

          <div className="sr-exp"><span>By note</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>By string</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Fretboard heatmap</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Daily timeline</span><span className="sr-chev">▾</span></div>

          <button className="sr-danger">Clear history for this setup</button>
        </Phone>

        {/* ── 2. All time, By string expanded ─────────────── */}
        <Phone title="All time" note="“By string” expanded">
          <PageHead />
          <Scope value="all" />
          <div className="sr-scope-cap">across every settings combination</div>

          <div className="sr-hero">
            <div className="sr-tile"><span className="sr-tile-v sr-gold">76%</span><span className="sr-tile-l">accuracy</span></div>
            <div className="sr-tile"><span className="sr-tile-v">🔥 5</span><span className="sr-tile-l">day streak</span></div>
            <div className="sr-tile"><span className="sr-tile-v">2,914</span><span className="sr-tile-l">answered</span></div>
          </div>

          <div className="sr-section">
            <div className="sr-section-head"><span>🎯 Weakest notes</span></div>
            <div className="sr-chips">
              {(['F#', 'C#', 'G#'] as const).map(n => (
                <span className="sr-chip" key={n}>{n} <span className="sr-chip-bad">≈60%</span></span>
              ))}
            </div>
          </div>

          <div className="sr-exp"><span>By note</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp open"><span>By string</span><span className="sr-chev">▴</span></div>
          <div className="sr-section sr-section--nested">
            <div className="sr-rows">
              {STRING_BARS.map(([l, p, cat]) => (
                <div className="sr-row" key={l}>
                  <span className="sr-row-label">{l}</span>
                  <span className="sr-row-track"><span className={`sr-row-fill sr-fill-${cat}`} style={{ width: `${p}%` }} /></span>
                  <span className="sr-row-val">{p}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="sr-exp"><span>Fretboard heatmap</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Daily timeline</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Personal bests</span><span className="sr-chev">▾</span></div>

          <button className="sr-danger">Clear all history</button>
        </Phone>

        {/* ── 3. All time, Fretboard heatmap expanded ─────── */}
        <Phone title="All time" note="“Fretboard heatmap” expanded">
          <PageHead />
          <Scope value="all" />

          <div className="sr-exp open"><span>Fretboard heatmap</span><span className="sr-chev">▴</span></div>
          <div className="sr-section sr-section--nested">
            <div className="sr-fret">
              {Array.from({ length: 6 }, (_, r) => (
                <div className="sr-fret-row" key={r}>
                  <span className="sr-fret-str">{['E', 'B', 'G', 'D', 'A', 'E'][r]}</span>
                  {Array.from({ length: 13 }, (_, c) => {
                    const seed = (r * 7 + c * 3) % 10;
                    const lvl = seed > 6 ? 'known' : seed > 3 ? 'work' : seed > 1 ? 'weak' : 'none';
                    return <span key={c} className={`sr-fret-cell sr-fret-${lvl}`} />;
                  })}
                </div>
              ))}
            </div>
            <div className="sr-legend">
              <span><i className="sr-fret-known" /> known</span>
              <span><i className="sr-fret-work" /> ok</span>
              <span><i className="sr-fret-weak" /> needs work</span>
              <span><i className="sr-fret-none" /> unplayed</span>
            </div>
            <p className="sr-note">Same mastery colours as the live FretGrid, not a separate palette.</p>
          </div>

          <div className="sr-exp"><span>By note</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>By string</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Daily timeline</span><span className="sr-chev">▾</span></div>
          <div className="sr-exp"><span>Personal bests</span><span className="sr-chev">▾</span></div>

          <button className="sr-danger">Clear all history</button>
        </Phone>

      </div>

      <div className="sr-rationale">
        <h2>Why this is better</h2>
        <ul>
          <li>
            <strong>One header, one control row.</strong> Today: page title + Close, then a five-tab
            row that wraps, then a nested Score/Details bar, then By&nbsp;Note/By&nbsp;String, then
            filter chips — four rows of chrome before any number. Here: header, scope switch, done.
          </li>
          <li>
            <strong>Scope switch, not vague tabs.</strong> &ldquo;This setup&rdquo; vs
            &ldquo;Overview&rdquo; never read as a scope. A two-item <em>This setup / All time</em>{' '}
            segment with the <em>same</em> section layout underneath teaches &ldquo;same stats,
            different range&rdquo;.
          </li>
          <li>
            <strong>Hero tiles.</strong> The three motivating numbers (accuracy, streak, speed) are
            always visible at a glance instead of buried in six identical label/value rows.
          </li>
          <li>
            <strong>Progressive disclosure.</strong> Weakest notes — the actionable bit — is open;
            by-note / by-string / heatmap / timeline / bests are collapsed. No horizontal tab
            overflow is possible because there is no tab strip.
          </li>
          <li>
            <strong>One row primitive.</strong> Every section (overview, timeline, per-note,
            per-string, bests) uses the same label–track–value row; the inline-styled{' '}
            <code>&lt;table&gt;</code> heatmap is redrawn with the app&rsquo;s real mastery colours.
          </li>
          <li>
            <strong>Honest destructive action.</strong> &ldquo;Clear history&rdquo; moves to the
            bottom as a low-emphasis button and says what it actually clears (per-setup vs all).
          </li>
        </ul>
      </div>
    </div>
  );
}
