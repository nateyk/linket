import { readFileSync } from 'node:fs';
import { render } from 'react-email';
import { createElement, type ComponentType } from 'react';

type TemplateModule = {
  default: ComponentType<any>;
};

const registry: Record<string, () => Promise<TemplateModule>> = {
  'order-confirmation': () => import('../emails/order-confirmation'),
  'verify-email': () => import('../emails/verify-email'),
  'password-reset': () => import('../emails/password-reset'),
  'portal-sign-in': () => import('../emails/portal-sign-in'),
  'renewal-reminder': () => import('../emails/renewal-reminder'),
  'ops-alert': () => import('../emails/ops-alert'),
  message: () => import('../emails/message'),
};

function parseArgs(argv: string[]) {
  const templateIdx = argv.indexOf('--template');
  if (templateIdx < 0 || !argv[templateIdx + 1]) {
    throw new Error('Missing --template <name>');
  }
  return { template: argv[templateIdx + 1] };
}

async function main() {
  const { template } = parseArgs(process.argv.slice(2));
  const loader = registry[template];
  if (!loader) {
    throw new Error(`Unknown template: ${template}`);
  }

  const raw = readFileSync(0, 'utf8');
  const props = raw.trim() ? JSON.parse(raw) : {};
  const mod = await loader();
  const element = createElement(mod.default, props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  process.stdout.write(JSON.stringify({ html, text }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});