import { LinketMessage, type LinketMessageProps } from './_components/linket-message';

export default function MessageEmail(props: LinketMessageProps) {
  return <LinketMessage {...props} />;
}

MessageEmail.PreviewProps = {
  preview: 'Your Linket account is ready',
  heading: 'Welcome to Linket',
  lines: [
    'Hi Ada, your Linket account is ready.',
    'Publish a page, list a product, and sell it from the same link.',
  ],
  actionLabel: 'Open your dashboard',
  actionUrl: 'https://example.com/dashboard',
} satisfies LinketMessageProps;
