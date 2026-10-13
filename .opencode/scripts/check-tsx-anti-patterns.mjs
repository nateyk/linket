#!/usr/bin/env node
/**
 * check-tsx-anti-patterns — a small static supplement for `impeccable detect`.
 *
 * impeccable's rules ship in a compiled binary (.opencode/skills/impeccable/scripts/bin) whose
 * static TSX pass is style-attribute-only, so whole anti-pattern families in TSX were only
 * catchable by hand during the product-flow audit. This script covers the three families where
 * a plain line scan is defensible: (1) raw hex colors inside `style={{…}}`, (2) physical
 * directionals (`mr-/ml-/pl-/pr-`) in `className`, and (3) `Dialog.Footer variant="muted"` —
 * a regression pin for the flat-footer fix. It does NOT replace the browser pass, it is not
 * imported by the app, and it adds no dependencies (node builtins only). Findings print as
 * `file:line rule-id: why`; exit codes mirror the impeccable CLI — 0 clean, 2 findings,
 * 1 a target could not be scanned. Legacy files that already violate rule 2/3 at the baseline
 * commit are allowlisted below (see LEGACY_DIRECTIONAL_FILES / ALLOWED_MUTED_FOOTERS); pass
 * --strict to ignore the allowlists and see every raw hit.
 *
 * Usage:  node .opencode/scripts/check-tsx-anti-patterns.mjs [--strict] [path …]
 * Default target: <repo>/resources/client
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_TARGET = join(REPO_ROOT, 'resources', 'client');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'vendor']);

// --- Rule 2 allowlist: physical directionals already present at baseline (commit 860096d8).
// These 42 files predate the product-flow pass; the plan's "logical props only" constraint
// applies to new/touched code, so existing hits (61 in total) are accepted legacy. Files not
// listed here must not introduce mr-/ml-/pl-/pr- classes.
const LEGACY_DIRECTIONAL_FILES = new Set([
  'resources/client/account-settings/app-account-settings-page.tsx',
  'resources/client/account-settings/webhooks/webhook-attempts-page.tsx',
  'resources/client/admin/biolinks-datatable-page/biolinks-datatable-page.tsx',
  'resources/client/admin/digital-products/admin-digital-product-payouts-datatable-columns.tsx',
  'resources/client/admin/digital-products/admin-digital-product-payouts-page.tsx',
  'resources/client/admin/digital-products/admin-product-reviews-table.tsx',
  'resources/client/admin/settings/product-settings.tsx',
  'resources/client/admin/withdrawals/admin-withdrawal-review-page.tsx',
  'resources/client/admin/withdrawals/admin-withdrawals-page.tsx',
  'resources/client/dashboard/courses/course-builder-page.tsx',
  'resources/client/dashboard/courses/course-preview-page.tsx',
  'resources/client/dashboard/custom-domains/domains-datatable-page.tsx',
  'resources/client/dashboard/folders/folder-links-datatable-page/folder-links-datatable-page.tsx',
  'resources/client/dashboard/folders/folders-datatable-page/folder-card.tsx',
  'resources/client/dashboard/folders/folders-datatable-page/folders-datatable-page.tsx',
  'resources/client/dashboard/layout/app-dasbboard-layout.tsx',
  'resources/client/dashboard/link-overlays/crupdate/crupdate-link-overlay-form.tsx',
  'resources/client/dashboard/link-overlays/crupdate/overlay-website-background.tsx',
  'resources/client/dashboard/link-overlays/link-overlays-datatable-page/link-overlays-datatable-page.tsx',
  'resources/client/dashboard/link-pages/link-pages-datatable-page/link-pages-datatable-page.tsx',
  'resources/client/dashboard/link-pages/preview-link-page.tsx',
  'resources/client/dashboard/links/forms/link-expiration-dialog.tsx',
  'resources/client/dashboard/links/forms/linkeable-qr-code-panel.tsx',
  'resources/client/dashboard/links/links-datatable-page/links-datatable-page.tsx',
  'resources/client/dashboard/qr-codes/qr-code-details-page/qr-code-settings-page.tsx',
  'resources/client/dashboard/qr-codes/qr-codes-datatable-page/qr-code-card.tsx',
  'resources/client/dashboard/qr-codes/qr-codes-datatable-page/qr-codes-datatable-page.tsx',
  'resources/client/dashboard/reports/workspace-tracked-events-table-page.tsx',
  'resources/client/dashboard/search/global-search-input.tsx',
  'resources/client/dashboard/storefront/storefront-dashboard-page.tsx',
  'resources/client/dashboard/stores/store-editor/content/biolink-item-layout.tsx',
  'resources/client/dashboard/stores/store-editor/content/link-content-item/link-content-item.tsx',
  'resources/client/dashboard/stores/store-editor/content/widgets/widget-selector/select-widget-dialog.tsx',
  'resources/client/dashboard/stores/store-editor/store-editor-page.tsx',
  'resources/client/dashboard/stores/stores-page.tsx',
  'resources/client/dashboard/tracking-pixels/tracking-pixels-datatable-page.tsx',
  'resources/client/landing/landing-page-stats.tsx',
  'resources/client/short-links/renderers/folder-renderer.tsx',
  'resources/client/short-links/renderers/link-iframe-renderer.tsx',
  'resources/client/short-links/renderers/link-page-renderer.tsx',
  'resources/client/short-links/renderers/link-splash-renderer.tsx',
]);

// --- Rule 3 allowlist: the two `Dialog.Footer variant="muted"` usages Task 6 explicitly ruled
// out of scope (task-6-report.md §3). Any other hit = regression of the flat-footer fix.
const ALLOWED_MUTED_FOOTERS = new Set([
  'resources/client/admin/digital-products/admin-digital-product-payouts-datatable-columns.tsx',
  'resources/client/digital-products/public/digital-product-public-pages.tsx',
]);

const RULE_IDS = {
  hex: 'style-raw-hex',
  direction: 'physical-directional',
  mutedFooter: 'muted-dialog-footer',
};

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/;
const STYLE_OPEN = /style\s*=\s*\{\{/;
const CLOSE_OBJECT = /\}\}/;
const CLASSNAME_DQUOTE = /className\s*=\s*"/;
const CLASSNAME_EXPR = /className\s*=\s*\{/;
const DIRECTIONAL = /(?:^|[\s"'`{])((?:[a-z0-9-]+:)*-?(?:mr|ml|pl|pr)-[a-z0-9.[\]%_/#-]*)/;
const DIALOG_FOOTER_OPEN = /<Dialog\.Footer\b/;
const MUTED_VARIANT = /variant\s*=\s*["']muted["']/;

const MAX_WINDOW = 12;

function displayPath(abs) {
  const rel = relative(REPO_ROOT, abs);
  return rel && !rel.startsWith('..') ? rel : abs;
}

function repoRelative(abs) {
  const rel = relative(REPO_ROOT, abs);
  return rel && !rel.startsWith('..') ? rel : null;
}

function collectTsx(target, files, errors) {
  let entries;
  try {
    entries = readdirSync(target, { withFileTypes: true });
  } catch (err) {
    errors.push(`${target}: ${err.code ?? err.message}`);
    return;
  }
  for (const entry of entries) {
    const full = join(target, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectTsx(full, files, errors);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
}

/** Rule 1: raw hex color inside a `style={{ … }}` object literal (may span lines). */
function checkStyleHex(abs, lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (!STYLE_OPEN.test(lines[i])) continue;
    const end = Math.min(lines.length, i + MAX_WINDOW + 1);
    for (let j = i; j < end; j++) {
      const m = lines[j].match(HEX);
      if (m) {
        findings.push({
          path: abs,
          line: j + 1,
          rule: RULE_IDS.hex,
          why: `raw hex color \`${m[0]}\` in style={{…}} — use a design-token class or CSS variable`,
        });
        break;
      }
      if (j > i && CLOSE_OBJECT.test(lines[j])) break;
    }
  }
  return findings;
}

/** All (index, length) matches of a non-global regex in a string. */
function findAll(re, text) {
  const g = new RegExp(re.source, 'g');
  const out = [];
  let m;
  while ((m = g.exec(text)) !== null) {
    out.push({ index: m.index, length: m[0].length });
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  return out;
}

/** Rule 2: physical directional utility class inside a className attribute. */
function checkDirectionals(abs, lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    for (const [re, close] of [
      [CLASSNAME_DQUOTE, '"'],
      [CLASSNAME_EXPR, '}'],
    ]) {
      for (const at of findAll(re, lines[i])) {
        // Gather the attribute value/expression, tracking which line each chunk came from.
        const chunks = [{ line: i, text: lines[i].slice(at.index + at.length) }];
        const last = () => chunks[chunks.length - 1];
        if (!last().text.includes(close)) {
          for (let k = i + 1; k < Math.min(lines.length, i + MAX_WINDOW); k++) {
            chunks.push({ line: k, text: lines[k] });
            if (lines[k].includes(close)) break;
          }
        } else {
          const t = last().text;
          last().text = t.slice(0, t.indexOf(close) + 1);
        }
        const value = chunks.map((c) => c.text).join('\n');
        const g = new RegExp(DIRECTIONAL.source, 'g');
        const seen = new Set();
        let hm;
        while ((hm = g.exec(value)) !== null) {
          if (hm.index === g.lastIndex) g.lastIndex++;
          const token = hm[1];
          if (seen.has(token)) continue; // one finding per distinct token per attribute
          seen.add(token);
          const tokenLine = chunks.find((c) => c.text.includes(token))?.line ?? i;
          findings.push({
            path: abs,
            line: tokenLine + 1,
            rule: RULE_IDS.direction,
            why: `physical directional class \`${token}\` in className — use the logical (ms-/me-/ps-/pe-) equivalent`,
          });
        }
      }
    }
  }
  return findings;
}

/** Rule 3: `Dialog.Footer variant="muted"` (regression pin for Task 6; may span lines). */
function checkMutedFooter(abs, lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DIALOG_FOOTER_OPEN.test(lines[i])) continue;
    const end = Math.min(lines.length, i + MAX_WINDOW + 1);
    for (let j = i; j < end; j++) {
      if (MUTED_VARIANT.test(lines[j])) {
        findings.push({
          path: abs,
          line: i + 1,
          rule: RULE_IDS.mutedFooter,
          why: '<Dialog.Footer variant="muted"> paints a nested muted strip — drop the variant (flat footer, Task 6)',
        });
        break;
      }
      if (lines[j].includes('>')) break;
    }
  }
  return findings;
}

function main(argv) {
  const strict = argv.includes('--strict');
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      [
        'Usage: node .opencode/scripts/check-tsx-anti-patterns.mjs [--strict] [path …]',
        '',
        'Static TSX anti-pattern supplement for `impeccable detect`.',
        'Rules: style-raw-hex | physical-directional | muted-dialog-footer',
        'Exit:  0 clean · 2 findings · 1 target could not be scanned',
        'Options:',
        '  --strict   ignore the legacy allowlists and report every raw hit',
        '  -h, --help show this help',
      ].join('\n'),
    );
    return 0;
  }

  const args = argv.filter((a) => !a.startsWith('--'));
  const targets = (args.length ? args : [DEFAULT_TARGET]).map((p) => resolve(process.cwd(), p));

  const files = [];
  const errors = [];
  for (const t of targets) {
    let st = null;
    try {
      st = statSync(t);
    } catch (err) {
      errors.push(`${t}: ${err.code ?? err.message}`);
      continue;
    }
    if (st.isFile()) {
      if (t.endsWith('.tsx')) files.push(t);
      else errors.push(`${t}: not a .tsx file`);
    } else if (st.isDirectory()) {
      collectTsx(t, files, errors);
    } else {
      errors.push(`${t}: not a regular file or directory`);
    }
  }

  const findings = [];
  for (const abs of files) {
    const rel = repoRelative(abs);
    let lines;
    try {
      lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    } catch (err) {
      errors.push(`${abs}: ${err.code ?? err.message}`);
      continue;
    }
    const hits = [
      ...checkStyleHex(abs, lines),
      ...checkDirectionals(abs, lines),
      ...checkMutedFooter(abs, lines),
    ];
    for (const f of hits) {
      if (strict) {
        findings.push(f);
        continue;
      }
      if (f.rule === RULE_IDS.direction && rel && LEGACY_DIRECTIONAL_FILES.has(rel)) continue;
      if (f.rule === RULE_IDS.mutedFooter && rel && ALLOWED_MUTED_FOOTERS.has(rel)) continue;
      findings.push(f);
    }
  }

  findings.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  for (const f of findings) {
    console.log(`${displayPath(f.path)}:${f.line} ${f.rule}: ${f.why}`);
  }

  const byRule = (rule) => findings.filter((f) => f.rule === rule).length;
  const touched = new Set(findings.map((f) => f.path)).size;
  const mode = strict ? ', strict (allowlists disabled)' : '';
  console.log(
    `check-tsx-anti-patterns: ${findings.length} finding(s) in ${touched} file(s) ` +
      `(${RULE_IDS.hex} ${byRule(RULE_IDS.hex)}, ${RULE_IDS.direction} ${byRule(RULE_IDS.direction)}, ` +
      `${RULE_IDS.mutedFooter} ${byRule(RULE_IDS.mutedFooter)}; ${files.length} .tsx file(s) scanned${mode})`,
  );

  if (errors.length) {
    for (const e of errors) console.error(`unscannable: ${e}`);
    return 1;
  }
  return findings.length ? 2 : 0;
}

process.exit(main(process.argv.slice(2)));
