import {Avatar, AvatarProps} from '@ui/avatar/avatar';
import {Skeleton} from '@ui/skeleton/skeleton';
import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';

interface Props {
  image?: string | null;
  label: ReactNode;
  description?: ReactNode;
  labelClassName?: string;
  className?: string;
  avatarSize?: AvatarProps['size'];
  alwaysShowAvatar?: boolean;
  avatarLabel?: string;
  avatarCircle?: boolean;
}
export function NameWithAvatar({
  image,
  label,
  description,
  className,
  labelClassName,
  avatarSize = 'md',
  alwaysShowAvatar,
  avatarLabel,
  avatarCircle,
}: Props) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {(image || alwaysShowAvatar) && (
        <Avatar
          size={avatarSize}
          className="shrink-0"
          src={image}
          label={avatarLabel ?? label ?? 'User'}
          fallback="initials"
          circle={avatarCircle}
        />
      )}
      <div className="min-w-0 overflow-hidden">
        <div className={cn(labelClassName, 'overflow-hidden text-ellipsis')}>
          {label}
        </div>
        {description && (
          <div className="overflow-hidden text-xs text-ellipsis text-muted-foreground">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export function NameWithAvatarPlaceholder({
  className,
  labelClassName,
  showDescription,
  avatarCircle,
}: Partial<Props> & {
  showDescription?: boolean;
}) {
  return (
    <div className={cn('flex w-full max-w-4/5 items-center gap-3', className)}>
      <Skeleton
        className={cn('size-10 md:size-8', avatarCircle && 'rounded-full')}
        variant="rect"
      />
      <div className="flex-auto">
        <div className={cn(labelClassName, showDescription && 'leading-3')}>
          <Skeleton />
        </div>
        {showDescription && (
          <div className="mt-1 leading-3 text-muted-foreground">
            {<Skeleton />}
          </div>
        )}
      </div>
    </div>
  );
}
