import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-list';
import {SocialsWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderer-props';
import {LinkButton} from '@shadcn/button/button';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import clsx from 'clsx';

export function SocialsWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<SocialsWidget>) {
  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-y-2',
        variant === 'editor'
          ? 'mt-1 gap-x-3.5 text-muted-foreground'
          : 'mt-5 mb-6.5 justify-center gap-x-0.5',
      )}
    >
      {Object.entries(widget.config).map(([type, uri]) => {
        const icon = SocialsList[type as SocialsType].icon;
        if (!icon) return null;

        return (
          <div key={type}>
            {variant === 'editor' ? (
              icon
            ) : (
              <LinkButton
                to={buildUrl(type as SocialsType, uri)}
                className="text-inherit"
                key={type}
                variant="ghost"
                size="icon"
              >
                {icon}
              </LinkButton>
            )}
          </div>
        );
      })}
    </div>
  );
}

function buildUrl(socialsType: SocialsType, uri: string): string {
  if (!uri || isAbsoluteUrl(uri)) {
    return uri;
  }
  // only remove @ from the begging of string (Twitter and Instagram handle for example)
  if (socialsType === SocialsType.Twitter) {
    return `https://twitter.com/${uri.replace('@', '')}`;
  } else if (socialsType === SocialsType.Instagram) {
    return `https://instagram.com/${uri.replace('@', '')}`;
  } else if (socialsType === SocialsType.Tiktok) {
    return `https://tiktok.com/${uri}`;
  } else if (socialsType === SocialsType.Mail) {
    return `mailto:${uri}`;
  } else if (socialsType === SocialsType.Whatsapp) {
    return `https://api.whatsapp.com/send?phone=${uri}`;
  }
  return uri;
}
