interface ChevronProps {
  /**
   * "forward" — points toward the reading-end (opening a sub-page): ">" in
   * LTR, "<" in RTL. "back" — points toward the reading-start (returning):
   * "<" in LTR, ">" in RTL.
   */
  dir?: 'forward' | 'back';
  className?: string;
}

/**
 * A direction-agnostic chevron. The glyph is always drawn as ">"; which way
 * it actually points is decided in CSS (`.chev--forward` / `.chev--back` plus
 * the `[dir="rtl"]` flip in 02-settings.css) from the `dir` on an ancestor —
 * so no caller ever branches on `lang`. Using an SVG rather than the "‹"/"›"
 * angle-quote characters also sidesteps their Unicode Bidi_Mirrored property,
 * which was silently flipping the text chevrons inside RTL panels.
 */
export function Chevron({ dir = 'forward', className }: ChevronProps) {
  return (
    <svg
      className={`chev chev--${dir}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Chevron;
