/**
 * Extract receipt identifiers locally from pasted bank/wallet messages.
 * Never send a full SMS, buyer phone, balance, or unrelated text to Verify.et.
 * Extraction is a convenience only: the buyer must explicitly tap Verify
 * and the backend still validates recipient, amount and provider evidence.
 */
export type ReceiptExtraction =
  | {kind: 'found'; reference: string}
  | {kind: 'ambiguous'}
  | {kind: 'none'};

function validReference(provider: string, candidate: string): string | null {
  const value = candidate.trim();
  if (!value || /^\d{9,}$/.test(value)) return null;

  switch (provider.toLowerCase()) {
    case 'cbe':
      return /^(?:FT[A-Z0-9]{8,148}|[A-Z0-9_-]{6,150})$/i.test(value)
        ? /^FT/i.test(value) ? value.toUpperCase() : value
        : null;
    case 'telebirr':
      return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{8,30}$/i.test(value)
        ? value.toUpperCase()
        : null;
    case 'boa':
      return /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{6,30}$/i.test(value)
        ? value.toUpperCase()
        : null;
    default:
      return null;
  }
}

function fromTrustedReceiptUrl(provider: string, raw: string): string | null {
  try {
    const parsed = new URL(raw.replace(/[),.;!?]+$/, ''));
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    if (provider === 'cbe' && ['mbreciept.cbe.com.et', 'cbe.com.et', 'www.cbe.com.et'].includes(host)) {
      const path = parsed.pathname.match(/^\/(?:receipt\/)?([a-z0-9_-]{6,150})\/?$/i);
      return path ? validReference('cbe', path[1]) : null;
    }
    if (provider === 'telebirr'
      && ['transactioninfo.ethiotelecom.et', 'apps.ethiotelecom.et'].includes(host)) {
      const query = parsed.searchParams.get('transactionNo')
        ?? parsed.searchParams.get('transactionno');
      if (query) return validReference('telebirr', query);
      const path = parsed.pathname.match(/^\/receipt\/([a-z0-9]{8,30})\/?$/i);
      return path ? validReference('telebirr', path[1]) : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Conservative by design: unlabelled numbers (amounts, phone numbers,
 * receiving accounts) are never inferred as receipts from long SMS text.
 * Multiple different IDs require manual review rather than guessing.
 */
export function extractReceiptReference(providerInput: string, input: string): ReceiptExtraction {
  const provider = providerInput.toLowerCase();
  const text = input.trim();
  if (!text || text.length > 4096) return {kind: 'none'};

  // Normal reference entry is still supported without any SMS heuristics.
  if (/^[A-Z0-9._-]{6,150}$/i.test(text)) {
    const reference = validReference(provider, text);
    return reference ? {kind: 'found', reference} : {kind: 'none'};
  }

  const unique = (items: string[]): string[] => [...new Set(items)];
  const urls = [...text.matchAll(/https:\/\/[^\s<>"']+/gi)]
    .map(match => fromTrustedReceiptUrl(provider, match[0]))
    .filter((value): value is string => value !== null);
  const uniqueUrls = unique(urls);
  if (uniqueUrls.length > 1) return {kind: 'ambiguous'};
  if (uniqueUrls.length === 1) return {kind: 'found', reference: uniqueUrls[0]};

  const candidates: string[] = [];
  const labelPattern = /(?:receipt\s*(?:id|number|no\.?)?|transaction\s*(?:id|number|no\.?|reference)|reference\s*(?:number|no\.?|id)?|ref\s*(?:number|no\.?|id)?|የሂሳብ\s*እንቅስቃሴ\s*ቁጥርዎ|የደረሰኝ\s*ቁጥር)\s*[:#=\-፡：]?\s*([a-z0-9_-]{6,150})/gi;
  for (const match of text.matchAll(labelPattern)) {
    const value = validReference(provider, match[1]);
    if (value) candidates.push(value);
  }

  if (provider === 'cbe') {
    for (const match of text.matchAll(/\bFT[A-Z0-9]{8,148}\b/gi)) {
      const value = validReference(provider, match[0]);
      if (value) candidates.push(value);
    }
  } else if (provider === 'telebirr') {
    for (const match of text.matchAll(/\b(?:DET|CHQ|DAB|DJA|DEL|ADQ|DEP|CHG|DF)[A-Z0-9]{6,12}\b/gi)) {
      const value = validReference(provider, match[0]);
      if (value) candidates.push(value);
    }
  }

  const choices = unique(candidates);
  if (choices.length === 1) return {kind: 'found', reference: choices[0]};
  return {kind: choices.length > 1 ? 'ambiguous' : 'none'};
}
