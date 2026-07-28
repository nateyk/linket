import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {cn} from '@ui/utils/cn';

interface LinkImageProps {
  link: {
    image?: string | null;
    long_url: string;
  };
  className?: string;
  size?: string;
}
export function LinkImage({link, className, size = 'size-4'}: LinkImageProps) {
  return link.image ? (
    <img
      className={cn('object-cover', size, className)}
      alt=""
      src={link.image}
    />
  ) : (
    <RemoteFavicon className={className} size={size} url={link.long_url} />
  );
}
