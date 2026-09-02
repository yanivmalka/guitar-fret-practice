import type { BadgeDef } from '../utils/badges';

/**
 * A struck-medal rendering for a badge: a domed metal disc with a raised rim,
 * a specular gloss and a per-badge emblem stamped into the metal (a dark inlay
 * over a 1px light bevel). Ported from the "Fretboard Badge Book" design page.
 *
 * The shared metal gradients live in <BadgeMedalDefs/>, which must be mounted
 * once on any page that renders a <BadgeMedal/>.
 */

// `steel` / `gold` are the guitar instrument-scoped finishes; `bassSteel`
// (darker graphite) and `bassGold` (rosé / copper) are their bass counterparts,
// so a guitar badge and its bass twin never look alike.
type Metal = 'gold' | 'bronze' | 'steel' | 'onyx' | 'bassSteel' | 'bassGold';
type Emblem = keyof typeof EMBLEMS;

// Emblems authored in the 100×100 medal space, centred on 50,50, using
// `currentColor` so one path serves both the inlay and the bevel copy.
const EMBLEMS = {
  target:
    '<circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" stroke-width="3.4"/>' +
    '<circle cx="50" cy="50" r="8.6" fill="none" stroke="currentColor" stroke-width="3.4"/>' +
    '<circle cx="50" cy="50" r="2.7" fill="currentColor"/>',
  bolt:
    '<path d="M56 29 L39 53 h9.5 l-4.5 18 L63 45 h-9.5 Z" fill="currentColor"/>',
  flag:
    '<rect x="35" y="28" width="3.6" height="44" rx="1.6" fill="currentColor"/>' +
    '<rect x="38.6" y="31" width="26" height="19" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
    '<g fill="currentColor">' +
    '<rect x="38.6" y="31" width="8.66" height="6.33"/><rect x="55.94" y="31" width="8.66" height="6.33"/>' +
    '<rect x="47.28" y="37.33" width="8.66" height="6.33"/>' +
    '<rect x="38.6" y="43.66" width="8.66" height="6.34"/><rect x="55.94" y="43.66" width="8.66" height="6.34"/>' +
    '</g>',
  flame:
    '<path d="M50 27 C58 37 60.5 44 56.5 52 C61 50.5 62.5 46 62.5 46 C67 57 60.5 73 50 73 C39 73 33 60 39.5 47.5 C40.5 53 43.5 55.5 46 56.5 C41.5 46 45.5 35.5 50 27 Z" fill="currentColor"/>',
  comeback:
    '<path d="M33 61 C40 64 45 59 47 50 C49 41 53 35 63 35" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>' +
    '<path d="M56 28 L67 34.5 L55.5 41 Z" fill="currentColor"/>',
  string:
    '<path d="M30 50 q5 -11 10 0 t10 0 t10 0 t10 0" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="30" cy="50" r="3.6" fill="currentColor"/><circle cx="70" cy="50" r="3.6" fill="currentColor"/>',
  strings6:
    '<line x1="32" y1="33" x2="68" y2="33" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
    '<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
    '<line x1="36" y1="35" x2="36" y2="62"/><line x1="41.6" y1="35" x2="41.6" y2="62"/>' +
    '<line x1="47.2" y1="35" x2="47.2" y2="62"/><line x1="52.8" y1="35" x2="52.8" y2="62"/>' +
    '<line x1="58.4" y1="35" x2="58.4" y2="62"/><line x1="64" y1="35" x2="64" y2="62"/></g>',
  strings4:
    '<line x1="33" y1="33" x2="67" y2="33" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
    '<g stroke="currentColor" stroke-width="3.4" stroke-linecap="round">' +
    '<line x1="38" y1="35" x2="38" y2="62"/><line x1="46" y1="35" x2="46" y2="62"/>' +
    '<line x1="54" y1="35" x2="54" y2="62"/><line x1="62" y1="35" x2="62" y2="62"/></g>',
  calendar:
    '<rect x="33" y="35" width="34" height="31" rx="4.5" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M33 44 h34" stroke="currentColor" stroke-width="3"/>' +
    '<g fill="currentColor"><circle cx="41" cy="52" r="2.4"/><circle cx="50" cy="52" r="2.4"/><circle cx="59" cy="52" r="2.4"/>' +
    '<circle cx="41" cy="60" r="2.4"/><circle cx="50" cy="60" r="2.4"/></g>',
  calcheck:
    '<rect x="33" y="35" width="34" height="31" rx="4.5" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M33 44 h34" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M40 55 l6 6 12 -13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  hundred:
    '<text x="50" y="51.5" text-anchor="middle" dominant-baseline="central" ' +
    'font-family="Bricolage Grotesque, Arial Narrow, sans-serif" font-weight="700" ' +
    'font-size="25" letter-spacing="-1" fill="currentColor">100</text>',
  trophy:
    '<path d="M39 33 h22 v7 c0 8.5 -4.9 14.5 -11 14.5 S39 48.5 39 40 Z" fill="currentColor"/>' +
    '<path d="M39 35 c-6.5 0 -8.5 9 -1 11.5" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path d="M61 35 c6.5 0 8.5 9 1 11.5" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<rect x="46.7" y="53.5" width="6.6" height="8" fill="currentColor"/>' +
    '<rect x="39" y="61" width="22" height="5.5" rx="2" fill="currentColor"/>',
  crosshair:
    '<circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<g stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
    '<line x1="50" y1="27" x2="50" y2="37"/><line x1="50" y1="63" x2="50" y2="73"/>' +
    '<line x1="27" y1="50" x2="37" y2="50"/><line x1="63" y1="50" x2="73" y2="50"/></g>' +
    '<circle cx="50" cy="50" r="2.7" fill="currentColor"/>',
  trend:
    '<path d="M31 63 h4 M31 63 L44 51 L52 57 L67 37" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M60 35 L69 33 L68 43 Z" fill="currentColor"/>',
  fretboard:
    '<rect x="29" y="40" width="42" height="20" rx="3.5" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<g stroke="currentColor" stroke-width="2.3">' +
    '<line x1="39" y1="40" x2="39" y2="60"/><line x1="50" y1="40" x2="50" y2="60"/><line x1="61" y1="40" x2="61" y2="60"/></g>' +
    '<g fill="currentColor"><circle cx="44.5" cy="50" r="1.9"/><circle cx="55.5" cy="50" r="1.9"/></g>',
  // Longer board + an extra fret division and inlay — the bass neck (24 frets).
  fretboardLong:
    '<rect x="24" y="41" width="52" height="18" rx="3.2" fill="none" stroke="currentColor" stroke-width="2.8"/>' +
    '<g stroke="currentColor" stroke-width="2.1">' +
    '<line x1="34" y1="41" x2="34" y2="59"/><line x1="43" y1="41" x2="43" y2="59"/>' +
    '<line x1="52" y1="41" x2="52" y2="59"/><line x1="61" y1="41" x2="61" y2="59"/></g>' +
    '<g fill="currentColor"><circle cx="38.5" cy="50" r="1.8"/><circle cx="56.5" cy="50" r="1.8"/><circle cx="70" cy="50" r="1.8"/></g>',
  shield:
    '<path d="M50 27 L67 33 V49 C67 61 59 69 50 73 C41 69 33 61 33 49 V33 Z" ' +
    'fill="none" stroke="currentColor" stroke-width="3.3" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="46" r="4.2" fill="currentColor"/>' +
    '<path d="M47.9 48.5 h4.2 l-1.3 9 h-1.6 Z" fill="currentColor"/>',
} as const;

const INLAY: Record<Metal, string> = {
  gold:      'rgba(62,42,4,0.86)',
  bronze:    'rgba(46,23,7,0.86)',
  steel:     'rgba(30,36,46,0.86)',
  onyx:      'rgba(224,230,244,0.9)',
  bassSteel: 'rgba(22,28,38,0.88)',
  bassGold:  'rgba(58,28,10,0.86)',
};

// Which struck emblem + metal each badge wears. Instrument-scoped badges take
// a bass-specific finish (and, where the emblem counts something, a
// bass-specific emblem) so a guitar badge never looks like its bass twin.
function medalSpec(def: BadgeDef, instrumentId?: string): { emblem: Emblem; metal: Metal } {
  const bass = instrumentId === 'bass';
  if (def.id.startsWith('string_master_s')) {
    return { emblem: 'string', metal: bass ? 'bassSteel' : 'steel' };
  }
  if (def.id === 'string_master_all') {
    return { emblem: bass ? 'strings4' : 'strings6', metal: bass ? 'bassGold' : 'gold' };
  }
  if (def.id === 'full_neck') {
    return { emblem: bass ? 'fretboardLong' : 'fretboard', metal: bass ? 'bassGold' : 'gold' };
  }
  const map: Record<string, [Emblem, Metal]> = {
    perfect_session: ['target', 'bronze'],
    speed_demon: ['bolt', 'bronze'],
    flawless_sprint: ['flag', 'bronze'],
    on_fire: ['flame', 'bronze'],
    comeback: ['comeback', 'bronze'],
    week_warrior: ['calendar', 'gold'],
    dedicated: ['calcheck', 'gold'],
    century: ['hundred', 'gold'],
    marathoner: ['trophy', 'gold'],
    sharpshooter: ['crosshair', 'gold'],
    most_improved: ['trend', 'gold'],
    admin: ['shield', 'onyx'],
  };
  const [emblem, metal] = map[def.id] ?? ['target', 'gold'];
  return { emblem, metal };
}

function medalSVG(metal: Metal, emblem: Emblem): string {
  const e = EMBLEMS[emblem];
  return (
    '<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">' +
      `<circle cx="50" cy="50" r="48" fill="url(#bm-rim-${metal})"/>` +
      '<circle cx="50" cy="50" r="47.2" fill="none" stroke="url(#bm-edge)" stroke-width="1.4"/>' +
      `<circle cx="50" cy="50" r="40" fill="url(#bm-dome-${metal})"/>` +
      '<circle cx="50" cy="50" r="40" fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="1"/>' +
      `<g transform="translate(0,1.3)" style="color:rgba(255,255,255,0.3)">${e}</g>` +
      `<g style="color:${INLAY[metal]}">${e}</g>` +
      '<ellipse cx="40" cy="33" rx="21" ry="12.5" fill="url(#bm-gloss)"/>' +
    '</svg>'
  );
}

export function BadgeMedal({
  def, instrumentId, size = 52,
}: {
  def: BadgeDef;
  /** The instrument this badge is being shown for — picks the bass finish. */
  instrumentId?: string;
  size?: number;
}) {
  const { emblem, metal } = medalSpec(def, instrumentId);
  return (
    <span
      className="badge-medal"
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: medalSVG(metal, emblem) }}
    />
  );
}

/** Shared metal gradients — mount once per page that shows a <BadgeMedal/>. */
export function BadgeMedalDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="bm-dome-gold" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#fff7d6" /><stop offset="0.34" stopColor="#f5d270" />
          <stop offset="0.7" stopColor="#cf9a2c" /><stop offset="1" stopColor="#87610f" />
        </radialGradient>
        <radialGradient id="bm-dome-bronze" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#ffe7cb" /><stop offset="0.34" stopColor="#e2a672" />
          <stop offset="0.7" stopColor="#a86440" /><stop offset="1" stopColor="#5d3418" />
        </radialGradient>
        <radialGradient id="bm-dome-steel" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#ffffff" /><stop offset="0.34" stopColor="#dee2e9" />
          <stop offset="0.7" stopColor="#a3abb8" /><stop offset="1" stopColor="#616976" />
        </radialGradient>
        <radialGradient id="bm-dome-onyx" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#7c7c93" /><stop offset="0.34" stopColor="#45454f" />
          <stop offset="0.7" stopColor="#26262f" /><stop offset="1" stopColor="#111117" />
        </radialGradient>
        <radialGradient id="bm-dome-bassSteel" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#eef2f6" /><stop offset="0.34" stopColor="#aab6c2" />
          <stop offset="0.7" stopColor="#6a7581" /><stop offset="1" stopColor="#39414c" />
        </radialGradient>
        <radialGradient id="bm-dome-bassGold" cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor="#ffe8d8" /><stop offset="0.34" stopColor="#e8a878" />
          <stop offset="0.7" stopColor="#b9713e" /><stop offset="1" stopColor="#77391b" />
        </radialGradient>
        <linearGradient id="bm-rim-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffeab0" /><stop offset="0.5" stopColor="#c9942a" /><stop offset="1" stopColor="#79540e" />
        </linearGradient>
        <linearGradient id="bm-rim-bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4d0a9" /><stop offset="0.5" stopColor="#ac6c41" /><stop offset="1" stopColor="#61371b" />
        </linearGradient>
        <linearGradient id="bm-rim-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f5f8" /><stop offset="0.5" stopColor="#aab1bd" /><stop offset="1" stopColor="#69717d" />
        </linearGradient>
        <linearGradient id="bm-rim-onyx" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9797ab" /><stop offset="0.5" stopColor="#3d3d49" /><stop offset="1" stopColor="#191920" />
        </linearGradient>
        <linearGradient id="bm-rim-bassSteel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfe6ec" /><stop offset="0.5" stopColor="#7c8794" /><stop offset="1" stopColor="#3a404a" />
        </linearGradient>
        <linearGradient id="bm-rim-bassGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6cbb0" /><stop offset="0.5" stopColor="#b56f45" /><stop offset="1" stopColor="#6a3a1e" />
        </linearGradient>
        <linearGradient id="bm-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="bm-gloss" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="0.68" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
