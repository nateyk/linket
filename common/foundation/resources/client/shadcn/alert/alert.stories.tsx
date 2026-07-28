import {
  Alert,
} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import preview from '@storybook/preview';
import {AlertCircleIcon, CheckCircle2Icon, InfoIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Alert',
  component: Alert.Root,
  tags: ['autodocs'],
});

export const AlertDemo = meta.story(() => {
  return (
    <div className="grid w-full max-w-md items-start gap-4">
      <Alert.Root>
        <CheckCircle2Icon />
        <Alert.Title>Payment successful</Alert.Title>
        <Alert.Description>
          Your payment of $29.99 has been processed. A receipt has been sent to
          your email address.
        </Alert.Description>
        <Alert.Action>
          <Button size="xs" variant="default">
            Enable
          </Button>
        </Alert.Action>
      </Alert.Root>
      <Alert.Root>
        <InfoIcon />
        <Alert.Title>New feature available</Alert.Title>
        <Alert.Description>
          We&apos;ve added dark mode support. You can enable it in your account
          settings.
        </Alert.Description>
      </Alert.Root>
    </div>
  );
});

export const OutlineVariants = meta.story(() => {
  return (
    <div className="grid w-full max-w-md items-start gap-4">
      <Alert.Root variant="destructive">
        <AlertCircleIcon />
        <Alert.Title>Payment failed</Alert.Title>
        <Alert.Description>
          Your payment could not be processed. Please check your payment method
          and try again.
        </Alert.Description>
      </Alert.Root>
      <Alert.Root variant="positive">
        <CheckCircle2Icon />
        <Alert.Title>Payment successful</Alert.Title>
        <Alert.Description>
          Your payment of $29.99 has been processed. A receipt has been sent to
          your email address.
        </Alert.Description>
      </Alert.Root>
    </div>
  );
});

export const SubtleFill = meta.story(() => {
  return (
    <div className="grid w-full max-w-md items-start gap-4">
      <Alert.Root variant="destructive" fillStyle="subtleFill">
        <AlertCircleIcon />
        <Alert.Title>Payment failed</Alert.Title>
        <Alert.Description>
          Your payment could not be processed. Please check your payment method
          and try again.
        </Alert.Description>
      </Alert.Root>
      <Alert.Root variant="positive" fillStyle="subtleFill">
        <CheckCircle2Icon />
        <Alert.Title>Payment successful</Alert.Title>
        <Alert.Description>
          Your payment of $29.99 has been processed. A receipt has been sent to
          your email address.
        </Alert.Description>
      </Alert.Root>
    </div>
  );
});

export const BoldFill = meta.story(() => {
  return (
    <div className="grid w-full max-w-md items-start gap-4">
      <Alert.Root variant="destructive" fillStyle="boldFill">
        <AlertCircleIcon />
        <Alert.Title>Payment failed</Alert.Title>
        <Alert.Description>
          Your payment could not be processed. Please check your payment method
          and try again.
        </Alert.Description>
      </Alert.Root>
      <Alert.Root variant="positive" fillStyle="boldFill">
        <CheckCircle2Icon />
        <Alert.Title>Payment successful</Alert.Title>
        <Alert.Description>
          Your payment of $29.99 has been processed. A receipt has been sent to
          your email address.
        </Alert.Description>
      </Alert.Root>
    </div>
  );
});
