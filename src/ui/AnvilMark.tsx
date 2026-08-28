interface AnvilMarkProps {
  className?: string | undefined;
  /** When set, the mark is exposed to assistive tech with this label. */
  title?: string;
}

/**
 * The Hypomone symbol: an anvil under a raised hammer, sparks between them —
 * something being shaped under repeated pressure. Solid single-colour vector
 * (`currentColor`), square viewBox. Keep this geometry in sync with the
 * standalone files in `public/` (favicon.svg, icon.svg, symbol.svg) and the
 * rasteriser in `scripts/gen-icons.mjs`.
 */
const ANVIL_D =
  "M84 268 Q126 244 168 244 L424 244 L424 296 L388 296 Q384 328 360 360 " +
  "L360 380 Q378 408 424 412 L440 452 L128 452 L144 412 Q194 408 216 380 " +
  "L216 360 Q192 328 188 296 L168 296 Q126 296 84 268 Z";

export function AnvilMark({ className, title }: AnvilMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={ANVIL_D} />
      <path d="M210 244 L224 236 L178 196 Z" />
      <path d="M226 248 L238 243 L216 186 Z" />
      <path d="M242 245 L251 252 L264 192 Z" />
      <g transform="rotate(-34 235 170)">
        <rect x="202" y="112" width="66" height="116" rx="10" />
        <rect x="254" y="151" width="196" height="38" rx="17" />
      </g>
    </svg>
  );
}
