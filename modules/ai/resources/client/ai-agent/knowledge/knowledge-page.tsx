import {PreviewSidebar} from '@ai/ai-agent/preview/preview-sidebar';
import {
  DatatablePageScrollContainer,
  DatatablePageWithHeaderBody,
  DatatablePageWithHeaderLayout,
} from '@common/datatable/page/datatable-page-with-header-layout';
import {Trans} from '@ui/i18n/trans';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {AiAgentPageHeader} from '../ai-agent-page-header';
import {aiAgentQueries} from '../ai-agent-queries';
import {ArticlesKnowledgeSection} from './articles/articles-knowledge-section';
import {DocumentsKnowledgeSection} from './documents/documents-knowledge-section';
import {SnippetsKnowledgeSection} from './snippets/snippets-knowledge-section';
import {WebsitesKnowledgeSection} from './websites/websites-knowledge-section';

export function Component() {
  const {data} = useSuspenseQuery(aiAgentQueries.knowledge.index());
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
              {data.ingesting && (
                <div className="rounded-card bg-warning/10 px-3 py-3 text-center text-sm font-medium text-foreground">
                  <Trans message="Your content is currently being ingested. You will be notified once the ingestion is complete. In the meantime, AI agent may not have your latest content." />
                </div>
              )}
              <WebsitesKnowledgeSection />
              <ArticlesKnowledgeSection />
              <DocumentsKnowledgeSection />
              <SnippetsKnowledgeSection />
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
