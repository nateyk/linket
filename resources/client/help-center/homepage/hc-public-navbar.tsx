import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {ButtonColor} from '@shadcn/button/button';
import {cn} from '@ui/utils/cn';

type Props = {
  className?: string;
  logoColor?: 'light' | 'dark' | 'auto';
  primaryButtonColor?: ButtonColor;
  tone?: 'default' | 'onPrimary';
};

export function HcPublicNavbar({
  className,
  logoColor = 'dark',
  primaryButtonColor = 'primary',
  tone = 'default',
}: Props) {
  return (
    <Navbar.Root
      className={cn(
        'relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center bg-transparent px-6 py-2 md:px-10',
        tone === 'onPrimary' &&
          'text-primary-foreground [&_[data-slot=dropdown-trigger]]:text-primary-foreground [&_[data-slot=popover-trigger]]:text-primary-foreground',
        className,
      )}
    >
      <Navbar.Logo color={logoColor} url="/" />
      <Navbar.Content className="ml-auto">
        <Navbar.AuthContent primaryButtonColor={primaryButtonColor} />
      </Navbar.Content>
    </Navbar.Root>
  );
}
