import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const templateIdx = args.indexOf('--template');
const template = templateIdx >= 0 ? args[templateIdx + 1] : '';
const props = JSON.parse(readFileSync(0, 'utf8') || '{}');
const name = props.buyerName ?? 'there';
const logo = props.logoUrl ?? '';
const radius = props.buttonBorderRadiusPx ?? '';

process.stdout.write(
  JSON.stringify({
    html: `<p>Hello ${name}|${logo}|${radius}</p>`,
    text: `Hello ${name}|${logo}|${radius}`,
    template,
  }),
);