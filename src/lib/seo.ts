/**
 * Meta-tag budget helpers — the single choke point every page's <title> and
 * meta description flows through (see the P1-2/P1-4 audit findings).
 *
 * Contracts enforced here:
 * - title      ≤ TITLE_MAX (65) chars
 * - description ≤ DESCRIPTION_MAX (165) chars (SERP target window 120–160)
 * - truncation never cuts mid-word and never cuts inside a grapheme cluster
 *   (a Devanagari base consonant stays attached to its matras/virama/nukta)
 */

export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 165;

/** Segmenter over grapheme clusters, so a combining mark is never orphaned. */
const graphemes = new Intl.Segmenter('hi', { granularity: 'grapheme' });

/**
 * Clamp `text` to at most `max` characters. Cuts happen at word boundaries;
 * if a single token alone exceeds the budget, the cut falls on a grapheme
 * boundary instead of inside a Devanagari cluster. Strips separator debris
 * left behind by the cut.
 */
export function fitText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  if (space > 0) {
    return cut.slice(0, space).replace(/[\s—|,;:-]+$/u, '').trimEnd();
  }
  let out = '';
  for (const { segment } of graphemes.segment(text)) {
    if (out.length + segment.length > max) break;
    out += segment;
  }
  return out.trimEnd();
}

/**
 * Compose a page title from ordered segments. Segments are joined with an
 * em dash; when the budget is exceeded, whole trailing segments are dropped
 * (the leading segment carries the query intent and is never the one cut for
 * space) and the optional brand suffix is dropped before any segment is cut.
 * Only if the leading segment alone overflows is it word-safely clamped.
 *
 * `composeTitle([head, tail], 'BalCheck')` renders the first that fits:
 *   "head — tail | BalCheck" / "head — tail" / "head | BalCheck" / "head",
 * falling back to a word-safe clamp of `head` for pathologically long names.
 */
export function composeTitle(parts: [string, ...string[]], brand?: string): string {
  const suffix = brand ? ` | ${brand}` : '';
  const [head, ...rest] = parts;
  for (let keep = rest.length; keep >= 0; keep--) {
    const joined = [head, ...rest.slice(0, keep)].join(' — ');
    if (joined.length + suffix.length <= TITLE_MAX) return `${joined}${suffix}`;
    if (suffix && joined.length <= TITLE_MAX) return joined;
  }
  return `${fitText(head, TITLE_MAX - suffix.length)}${suffix}`;
}

/** Clamp a meta description to the SERP budget on a word/grapheme boundary. */
export function composeDescription(text: string): string {
  return fitText(text, DESCRIPTION_MAX);
}
