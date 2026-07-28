import {retrieveWebhookAttemptOptions} from '@app/account-settings/webhooks/webhook-queries';
import {WebhookDeliveryAttempt} from '@app/gen/schemas/webhook-delivery-attempt';
import {hljs} from '@common/text-editor/highlight/highlight';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Badge} from '@shadcn/badge/badge';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {toast} from '@ui/toast/toast';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import clsx from 'clsx';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {ReactNode, useMemo, useState} from 'react';

export function Component() {
  const {attemptId, webhookId} = useRequiredParams(['attemptId', 'webhookId']);
  const attemptQuery = useSuspenseQuery(
    retrieveWebhookAttemptOptions(webhookId, attemptId),
  );

  const prettyAttemptPayload = useMemo(
    () =>
      JSON.stringify(
        {
          id: attemptQuery.data.data.id,
          event_type: attemptQuery.data.data.delivery?.event_type,
          created_at: attemptQuery.data.data.created_at,
          data: attemptQuery.data.data.delivery?.payload,
        },
        null,
        2,
      ),
    [attemptQuery.data.data],
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/account-settings/webhooks">
              <Trans message="Webhooks" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link to={`/account-settings/webhooks/${webhookId}`}>
              {attemptQuery.data.data.webhook?.name} <Trans message="logs" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="event" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl xl:p-6">
          <AttemptDetails attempt={attemptQuery.data.data} />
          <div className="mb-11">
            <SectionTitle className="mb-3.5">
              <Trans message="Response body" />
            </SectionTitle>
            <div className="compact-scrollbar overflow-x-auto">
              <HighlightedCode key="response">
                {attemptQuery.data.data.response_body ?? ''}
              </HighlightedCode>
            </div>
          </div>

          <SectionTitle className="mb-3.5">
            <Trans message="Request body" />
          </SectionTitle>
          <div className="compact-scrollbar overflow-x-auto">
            <HighlightedCode key="request">
              {prettyAttemptPayload}
            </HighlightedCode>
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};
function SectionTitle({children, className}: SectionTitleProps) {
  return <h2 className={clsx('text-base font-bold', className)}>{children}</h2>;
}

type AttemptDetailsProps = {
  attempt: WebhookDeliveryAttempt;
};
function AttemptDetails({attempt}: AttemptDetailsProps) {
  return (
    <div className="mb-11">
      <SectionTitle>
        <Trans message="Request details" />
      </SectionTitle>
      <div className="mb-8.5 flex items-center gap-3 text-sm">
        <div className="font-medium text-primary">POST</div>
        <div>{attempt.webhook?.url}</div>
      </div>
      <section className="space-y-2">
        <DetailsRow
          label="Status"
          value={
            <Badge
              variant={
                !attempt.response_status || attempt.response_status >= 300
                  ? 'destructive'
                  : 'positive'
              }
            >
              {attempt.response_status}
            </Badge>
          }
        />
        <DetailsRow label="Event ID" value={attempt.id} />
        <DetailsRow
          label="Event type"
          value={
            <Badge variant="secondary">{attempt.delivery?.event_type}</Badge>
          }
        />
        <DetailsRow
          label="Time"
          value={<FormattedDate date={attempt.created_at} preset="timestamp" />}
        />
        <DetailsRow
          label="Attempt number"
          value={`#${attempt.attempt_number}`}
        />
        <DetailsRow label="Duration" value={`${attempt.duration_ms}ms`} />
      </section>
    </div>
  );
}

type DetailsRowProps = {
  label: ReactNode;
  value: ReactNode;
};
function DetailsRow({label, value}: DetailsRowProps) {
  return (
    <div className="flex items-center gap-4 text-sm wrap-break-word">
      <div className="w-35">{label}</div>
      <div>{value}</div>
    </div>
  );
}

type HighlightedCodeProps = {
  children: string;
};
function HighlightedCode({children}: HighlightedCodeProps) {
  const [highlightedCode] = useState<string>(() => {
    let isJson = false;
    let finalText = children;

    try {
      const parsed = JSON.parse(finalText);
      // pretty print json before highlighting
      finalText = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch (e) {
      isJson = false;
      finalText = children;
    }

    return hljs.highlight(finalText, {language: isJson ? 'json' : 'html'})
      .value;
  });

  const isDarkMode = useIsDarkMode();
  const [isCopied, copyToClipboard] = useClipboard(children);

  return (
    <div className="overflow-hidden rounded-card">
      <div className="flex items-center justify-end bg-muted px-3 py-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            copyToClipboard();
            toast.positive(message('Copied to clipboard'));
          }}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
      <div className="bg-muted/50 p-3">
        <pre
          className={clsx(
            'compact-scrollbar overflow-x-auto text-sm',
            isDarkMode ? 'hljs-dark' : 'hljs-light',
          )}
        >
          <code dangerouslySetInnerHTML={{__html: highlightedCode}} />
        </pre>
      </div>
    </div>
  );
}
