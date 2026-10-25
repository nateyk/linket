import {useSuppressHcLegacyCustomHtml} from '@app/help-center/homepage/use-suppress-hc-legacy-custom-html';
import {HcLivechatWidgetLoader} from '@livechat/hc-livechat-widget-loader';
import {Fragment} from 'react';
import {Outlet} from 'react-router';

export function Component() {
  useSuppressHcLegacyCustomHtml();

  return (
    <Fragment>
      <HcLivechatWidgetLoader />
      <Outlet />
    </Fragment>
  );
}
