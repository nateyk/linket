/**
 * Shared text handling for the creator's product description. The
 * description is DATA (creator-authored), never passed through <Trans>.
 */

const DECK_MAX_LENGTH = 240;

export function plainTextDescription(value: string): string {
  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(value, 'text/html');
    return document.body.textContent?.trim() ?? '';
  }

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * First-paint deck line under the product H1: the description distilled to
 * at most two sentences and hard-capped at DECK_MAX_LENGTH characters
 * (cut on a word boundary, then ellipsized) so the header stays a header.
 *
 * Degrades gracefully: missing / blank / markup-only descriptions return
 * null so callers render no block at all — never an empty one. A short
 * description comes through verbatim (one sentence, or two when they both
 * fit the cap).
 */
export function productDeck(description?: string | null): string | null {
  const text = plainTextDescription(description ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const sentences = (text.match(/[^.!?]+[.!?]*/g) ?? [text])
    .map(sentence => sentence.trim())
    .filter(Boolean);
  if (!sentences.length) return null;

  let deck = sentences[0];
  const second = sentences[1];
  if (second && `${deck} ${second}`.length <= DECK_MAX_LENGTH) {
    deck = `${deck} ${second}`;
  }

  if (deck.length > DECK_MAX_LENGTH) {
    deck = `${truncateOnWordBoundary(deck, DECK_MAX_LENGTH)}…`;
  }

  return deck;
}

function truncateOnWordBoundary(value: string, maxLength: number): string {
  const cut = value.slice(0, maxLength).trimEnd();
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}
