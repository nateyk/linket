import {PreviewSidebar} from '@ai/ai-agent/preview/preview-sidebar';
import {CantAssistPanel} from '@ai/ai-agent/settings/cant-assist-panel';
import {GreetingPanel} from '@ai/ai-agent/settings/greeting-panel';
import {IdentityPanel} from '@ai/ai-agent/settings/identity-panel';
import {PersonalityPanel} from '@ai/ai-agent/settings/personality-panel';
import {AiAgentSettingsAccordion} from '@ai/ai-agent/settings/panel-layout';
import {TransferPanel} from '@ai/ai-agent/settings/transfer-panel';
import {
  DatatablePageScrollContainer,
  DatatablePageWithHeaderBody,
  DatatablePageWithHeaderLayout,
} from '@common/datatable/page/datatable-page-with-header-layout';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowRightIcon} from 'lucide-react';
import {useState} from 'react';
import {AiAgentPageHeader} from '../ai-agent-page-header';

export function Component() {
  const [previewVisible, setPreviewVisible] = useState(false);
  return (
    <>
      <DatatablePageWithHeaderLayout className="dashboard-grid-content dashboard-rounded-panel">
        <AiAgentPageHeader
          previewVisible={previewVisible}
          onTogglePreview={() => setPreviewVisible(!previewVisible)}
        />
        <DatatablePageWithHeaderBody>
          <DatatablePageScrollContainer>
            <div className="flex flex-col gap-6">
              <AiAgentSettingsAccordion>
                <IdentityPanel />
                <PersonalityPanel />
                <GreetingPanel />
                <CantAssistPanel />
                <TransferPanel />
              </AiAgentSettingsAccordion>
              <LinkButton
                variant="link"
                color="primary"
                to="/admin/settings/ai"
                className="w-fit"
              >
                <ArrowRightIcon data-icon="inline-start" />
                <Trans message="Additional AI settings" />
              </LinkButton>
            </div>
          </DatatablePageScrollContainer>
        </DatatablePageWithHeaderBody>
      </DatatablePageWithHeaderLayout>
      {previewVisible && (
        <PreviewSidebar onClose={() => setPreviewVisible(false)} />
      )}
    </>
  );
}
