import {initSearchTermLogger} from '@app/help-center/search/use-search-term-logger';
import {SettingsPreviewListener} from '@common/admin/settings/preview/settings-preview-listener';
import {ThemeProvider} from '@common/core/theme-provider';
import {queryClient} from '@common/http/query-client';
import {ChatWidget} from '@livechat/widget/chat-widget';
import {QueryClientProvider} from '@tanstack/react-query';
import {DialogStoreOutlet} from '@ui/overlays/store/dialog-store-outlet';
import {rootEl} from '@ui/root-el';
import {domAnimation, LazyMotion} from 'framer-motion';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';
import '../widget/widget.css';

const app = (
  <BrowserRouter basename="lc/widget">
    <DialogStoreOutlet />
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsPreviewListener />
        <LazyMotion features={domAnimation}>
          <ChatWidget />
        </LazyMotion>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

createRoot(rootEl).render(app);
initSearchTermLogger();
