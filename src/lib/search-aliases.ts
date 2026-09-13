/**
 * Search aliases for the homepage directory.
 *
 * Rural Hindi users type the Devanagari spelling of a bank's short name
 * (एसबीआई, पीएनबी) rather than the English one (SBI, PNB). Banks whose
 * nameHindi is a translation rather than a transliteration — भारतीय स्टेट बैंक,
 * पंजाब नेशनल बैंक — had no match for those queries, so the site's primary
 * action returned "no results" for the spelling its audience actually types.
 *
 * The alias is derived from the bank's own shortName, so it can only ever
 * route a query to that same bank. It is additive haystack text: pure
 * enhancement of the existing data-name match, never a replacement.
 */

/** Letter-by-letter Devanagari spellings as used for Indian bank acronyms. */
const DEVANAGARI_LETTERS: Record<string, string> = {
  A: 'ए', B: 'बी', C: 'सी', D: 'डी', E: 'ई', F: 'एफ', G: 'जी', H: 'एच',
  I: 'आई', J: 'जे', K: 'के', L: 'एल', M: 'एम', N: 'एन', O: 'ओ', P: 'पी',
  Q: 'क्यू', R: 'आर', S: 'एस', T: 'टी', U: 'यू', V: 'वी', W: 'डब्ल्यू',
  X: 'एक्स', Y: 'वाय', Z: 'जेड',
};

/** Acronyms only: single tokens with no vowel runs, e.g. SBI, HSBC, APGB, BoB. */
function isAcronym(shortName: string): boolean {
  if (/\s/.test(shortName.trim())) return false;
  const letters = shortName.replace(/[^A-Za-z]/g, '');
  if (!letters || letters.length > 7) return false;
  // Two consecutive lowercase letters mean a word (Canara, Axis, Kotak), not an
  // acronym — transliterating those letter-by-letter produces spellings nobody uses.
  return !/[a-z]{2}/.test(letters);
}

/**
 * Devanagari spelling of an acronym, e.g. SBI -> एसबीआई, PNB -> पीएनबी.
 * Returns '' when the short name is not an acronym.
 */
export function devanagariAcronym(shortName: string): string {
  if (!isAcronym(shortName)) return '';
  return shortName
    .toUpperCase()
    .split('')
    .map((ch) => DEVANAGARI_LETTERS[ch] ?? '')
    .join('');
}

/**
 * Extra haystack text for one bank: the Devanagari acronym plus the English
 * acronym without separators (e.g. "J&K" also matches "jk", "au sfb" -> "ausfb").
 */
export function searchAliases(bank: { nameHindi: string; shortName: string }): string {
  const parts: string[] = [];
  const devanagari = devanagariAcronym(bank.shortName);
  // Skip when the Hindi name already contains this spelling.
  if (devanagari && !bank.nameHindi.includes(devanagari)) parts.push(devanagari);
  const compact = bank.shortName.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  if (compact && compact !== bank.shortName.toLowerCase()) parts.push(compact);
  return parts.join(' ');
}
