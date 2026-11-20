import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const templateIdx = args.indexOf('--template');
const template = templateIdx >= 0 ? args[templateIdx + 1] : '';
const props = JSON.parse(readFileSync(0, 'utf8') || '{}');
const name = props.buyerName ?? 'there';

process.stdout.write(
  JSON.stringify({
    html: `<p>Hello ${name}</p>`,
    text: `Hello ${name}`,
    template,
  }),
);