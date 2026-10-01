#!/usr/bin/env node
/**
 * Extract every user-visible translation string from `resources/client` into
 * `resources/client-translations.json`.
 *
 * PRODUCT.md product rule 3 / agents.md: every visible string is written as
 * `<Trans message="..." />` so it can be extracted. This script is the
 * extractor that rule assumes. It has no dependencies (Node standard library
 * only).
 *
 * Usage
 *   node resources/scripts/extract-translations.js           dry run, prints a
 *                                                             summary, writes
 *                                                             nothing
 *   node resources/scripts/extract-translations.js --write   merges the newly
 *                                                             found strings
 *                                                             into the catalog
 *   npm run extract                                          same as --write
 *
 * Catalog contract
 *   - Path:   resources/client-translations.json
 *   - Format: one line of compact JSON, `{"<source>":"<source>", ...}`, with no
 *             trailing newline — byte-for-byte what JSON.stringify() produces,
 *             matching the file the app already ships.
 *   - Merge:  existing keys keep their position and value, newly found strings
 *             are appended in discovery order, value === key (English default
 *             lines, see Common\Localizations\LocalizationsRepository).
 *   - Nothing is ever removed: strings that are no longer found in the source
 *             are reported as "stale" and kept, so a partial scan or a refactor
 *             can never delete a catalog entry.
 *
 * Scanned:  resources/client (recursive), files ending .ts / .tsx
 * Skipped:  gen/, node_modules/, dist/, build/, __tests__/, *.test.*, *.spec.*
 * Extracted call shapes (the ones the repo actually uses):
 *   1. <Trans message="..." />            JSX prop, single or double quotes,
 *                                         may span lines, escapes honoured
 *   2. <Trans message={...} />            message strings inside the expression:
 *                                         ternary branches and literals that are
 *                                         the whole expression; condition
 *                                         operands and ${} templates are dynamic
 *                                         and skipped
 *   3. message('...')                     @ui/i18n/message descriptor helper
 *   4. trans({message: '...'})            useTrans() object form
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOT = path.join(ROOT, 'resources', 'client');
const CATALOG_PATH = path.join(ROOT, 'resources', 'client-translations.json');

const SKIP_DIRS = new Set(['gen', 'node_modules', 'dist', 'build', '__tests__']);
const SKIP_FILES = /\.(test|spec)\.[jt]sx?$/;
const SOURCE_FILES = /\.tsx?$/;

/** Quoted string literal: '...' or "..." with backslash escapes. */
const SINGLE_LITERAL = /^(['"])((?:\\[\s\S]|(?!\1)[^\\])*)\1$/;
const SINGLE_TEMPLATE = /^`([^`]*)`$/;
const MESSAGE_ATTR_QUOTED = /\bmessage\s*=\s*(['"])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g;
const MESSAGE_ATTR_EXPR = /\bmessage\s*=\s*\{/g;
const MESSAGE_CALL = /(?<![\w.$])message\s*\(\s*(['"])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g;
const MESSAGE_PROP = /\bmessage\s*:\s*(['"])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g;
const TRANS_CALL = /(?<![\w.$])trans\s*\(/g;

function walk(dir, found = []) {
    if (!fs.existsSync(dir)) {
        return found;
    }

    for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) {
                continue;
            }

            walk(full, found);
        } else if (SOURCE_FILES.test(entry.name) && !SKIP_FILES.test(entry.name)) {
            found.push(full);
        }
    }

    return found;
}

/** Decode a JS/TS single- or double-quoted string body to its runtime value. */
function decodeQuoted(raw) {
    return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (all, esc) => {
        if (esc[0] === 'u') {
            const hex = esc[1] === '{' ? esc.slice(2, -1) : esc.slice(1);

            return String.fromCodePoint(Number.parseInt(hex, 16));
        }

        if (esc[0] === 'x') {
            return String.fromCharCode(Number.parseInt(esc.slice(1), 16));
        }

        switch (esc) {
            case 'n':
                return '\n';
            case 't':
                return '\t';
            case 'r':
                return '\r';
            case 'b':
                return '\b';
            case 'f':
                return '\f';
            case 'v':
                return '\v';
            case '0':
                return '\0';
            default:
                // '\\', '\'', '\"', '\`', '\/' and anything unknown.
                return esc;
        }
    });
}

/** Step past a quoted string starting at index `i`; returns the index after it. */
function skipQuoted(text, i) {
    const quote = text[i];
    i += 1;

    while (i < text.length) {
        if (text[i] === '\\') {
            i += 2;
            continue;
        }

        if (text[i] === quote) {
            return i + 1;
        }

        i += 1;
    }

    return i;
}

/**
 * Return the slice starting at `openIndex` ('(' or '{') through its matching
 * close, ignoring delimiters inside strings and comments. Null if unbalanced.
 */
function sliceBalanced(text, openIndex) {
    const open = text[openIndex];
    const close = open === '(' ? ')' : '}';
    const limit = Math.min(text.length, openIndex + 8000);
    let depth = 0;
    let i = openIndex;

    while (i < limit) {
        const char = text[i];

        if (char === '"' || char === "'" || char === '`') {
            i = skipQuoted(text, i);
            continue;
        }

        if (char === '/' && text[i + 1] === '/') {
            const lineEnd = text.indexOf('\n', i);

            i = lineEnd === -1 ? text.length : lineEnd;
            continue;
        }

        if (char === '/' && text[i + 1] === '*') {
            const commentEnd = text.indexOf('*/', i + 2);

            i = commentEnd === -1 ? text.length : commentEnd + 2;
            continue;
        }

        if (char === open) {
            depth += 1;
        } else if (char === close) {
            depth -= 1;

            if (depth === 0) {
                return text.slice(openIndex, i + 1);
            }
        }

        i += 1;
    }

    return null;
}

/** Name of the tag that owns the token at `index`, or null when not in a tag. */
function enclosingTagName(text, index) {
    const open = text.lastIndexOf('<', index);

    if (open === -1) {
        return null;
    }

    const match = /^<([A-Za-z][\w.-]*)/.exec(text.slice(open, open + 64));

    return match ? match[1] : null;
}

function eachMatch(text, regex, callback) {
    regex.lastIndex = 0;

    let match;

    while ((match = regex.exec(text)) !== null) {
        callback(match);
    }
}

/**
 * Split a top-level ternary `cond ? consequent : alternate`.
 *
 * The condition is never a message, so it is deliberately returned separately.
 *
 * @returns {{consequent: string, alternate: string}|null}
 */
function splitTopLevelTernary(expression) {
    let depth = 0;
    let question = -1;
    let colon = -1;

    for (let i = 0; i < expression.length; i += 1) {
        const char = expression[i];

        if (char === '"' || char === "'" || char === '`') {
            i = skipQuoted(expression, i) - 1;
            continue;
        }

        if (char === '(' || char === '[' || char === '{') {
            depth += 1;
            continue;
        }

        if (char === ')' || char === ']' || char === '}') {
            depth -= 1;
            continue;
        }

        if (depth !== 0) {
            continue;
        }

        // Skip `?.` and `??`; only a real `?` opens a ternary.
        if (char === '?' && question === -1 && expression[i + 1] !== '.' && expression[i + 1] !== '?') {
            question = i;
            continue;
        }

        if (char === ':' && question !== -1 && colon === -1) {
            colon = i;
        }
    }

    if (question === -1 || colon === -1 || colon < question) {
        return null;
    }

    return {
        consequent: expression.slice(question + 1, colon),
        alternate: expression.slice(colon + 1),
    };
}

/**
 * Pull the message strings out of a `message={...}` expression.
 *
 * Only values the component can actually render are taken: the branches of a
 * ternary and a literal that is the whole expression. Condition operands and
 * arguments of nested calls are not messages and are ignored.
 *
 * @returns {string[]}
 */
function messageCandidatesInExpression(rawExpression) {
    const expression = rawExpression.trim();

    if (expression === '') {
        return [];
    }

    const ternary = splitTopLevelTernary(expression);

    if (ternary !== null) {
        return [
            ...messageCandidatesInExpression(ternary.consequent),
            ...messageCandidatesInExpression(ternary.alternate),
        ];
    }

    if (expression.startsWith('(') && expression.endsWith(')')) {
        const unwrapped = sliceBalanced(expression, 0);

        if (unwrapped !== null && unwrapped.length === expression.length) {
            return messageCandidatesInExpression(unwrapped.slice(1, -1));
        }
    }

    const literal = SINGLE_LITERAL.exec(expression);

    if (literal !== null) {
        return [decodeQuoted(literal[2])];
    }

    const template = SINGLE_TEMPLATE.exec(expression);

    // A template with ${...} is dynamic — not extractable (agents.md: the
    // message prop must be a static string).
    if (template !== null && !template[1].includes('${')) {
        return [template[1]];
    }

    return [];
}

/**
 * Extract every translatable string from one source file.
 *
 * @returns {{index: number, value: string}[]} sorted by position in the file
 */
function extractFromSource(text) {
    const found = [];

    eachMatch(text, MESSAGE_ATTR_QUOTED, (match) => {
        if (enclosingTagName(text, match.index) !== 'Trans') {
            return;
        }

        found.push({index: match.index, value: decodeQuoted(match[2])});
    });

    eachMatch(text, MESSAGE_ATTR_EXPR, (match) => {
        if (enclosingTagName(text, match.index) !== 'Trans') {
            return;
        }

        // sliceBalanced() keeps the delimiters; the braces around the JSX
        // expression must come off before it is parsed.
        const expression = sliceBalanced(text, match.index + match[0].length - 1);

        if (expression === null || !expression.startsWith('{') || !expression.endsWith('}')) {
            return;
        }

        for (const value of messageCandidatesInExpression(expression.slice(1, -1))) {
            found.push({index: match.index, value});
        }
    });

    eachMatch(text, MESSAGE_CALL, (match) => {
        found.push({index: match.index, value: decodeQuoted(match[2])});
    });

    eachMatch(text, TRANS_CALL, (match) => {
        const openIndex = match.index + match[0].length - 1;
        const call = sliceBalanced(text, openIndex);

        if (call === null || !call.slice(1, -1).trimStart().startsWith('{')) {
            return;
        }

        eachMatch(call, MESSAGE_PROP, (prop) => {
            found.push({index: match.index, value: decodeQuoted(prop[2])});
        });
    });

    return found.sort((a, b) => a.index - b.index);
}

function readCatalog() {
    if (!fs.existsSync(CATALOG_PATH)) {
        return {};
    }

    const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${CATALOG_PATH} must contain a JSON object.`);
    }

    return parsed;
}

function main() {
    const args = process.argv.slice(2);
    const unknown = args.filter((arg) => arg !== '--write');

    if (unknown.length > 0) {
        console.error(`Unknown argument(s): ${unknown.join(' ')}`);
        console.error('Usage: node resources/scripts/extract-translations.js [--write]');

        process.exitCode = 1;

        return;
    }

    const write = args.includes('--write');
    const files = walk(SOURCE_ROOT);
    const ordered = [];
    const seen = new Set();

    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');

        for (const {value} of extractFromSource(source)) {
            if (value === '' || seen.has(value)) {
                continue;
            }

            seen.add(value);
            ordered.push(value);
        }
    }

    const catalog = readCatalog();
    const existingKeys = Object.keys(catalog);
    const existing = new Set(existingKeys);
    const fresh = ordered.filter((value) => !existing.has(value));
    const stale = existingKeys.filter((key) => !seen.has(key));
    const merged = {...catalog};

    for (const value of fresh) {
        merged[value] = value;
    }

    console.log(`extract-translations: scanned ${files.length} files under resources/client`);
    console.log(`  extracted strings (deduped): ${ordered.length}`);
    console.log(`  catalog ${path.relative(ROOT, CATALOG_PATH)}: ${existingKeys.length} existing, ${fresh.length} new, ${stale.length} stale (kept)`);
    console.log(`  would hold ${Object.keys(merged).length} keys`);

    if (stale.length > 0) {
        console.log(`  stale example: ${JSON.stringify(stale.slice(0, 3))}`);
    }

    if (!write) {
        console.log('DRY RUN — nothing written. Re-run with --write to update the catalog.');

        return;
    }

    if (fresh.length === 0) {
        console.log('Catalog already up to date — file untouched.');

        return;
    }

    fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged), 'utf8');
    console.log(`WROTE ${path.relative(ROOT, CATALOG_PATH)} (${existingKeys.length} -> ${Object.keys(merged).length} keys, ${fresh.length} added).`);
}

main();
