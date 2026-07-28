import {UserTokensItem} from '@app/gen/schemas/user-tokens-item';
import {DeleteTokenAlert} from '@common/auth/ui/account-settings/access-token-panel/access-token-panel';
import {CreateNewTokenDialog} from '@common/auth/ui/account-settings/access-token-panel/create-new-token-dialog';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {useAuth} from '@common/auth/use-auth';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Table} from '@common/shadcn/table/table';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {BookOpenIcon, KeyIcon, TrashIcon} from 'lucide-react';

export function Component() {
  const query = useSuspenseQuery(getAccountSettingsOptions());

  const tokens = query.data.data.tokens || [];

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="API keys" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="API keys" />
          </h1>
        </DashboardLayout.SectionTitle>
        <LearnMoreApiDocsButton />
        <CreateNewTokenButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionScrollContainer>
          {tokens.length > 0 ? <TokensTable tokens={tokens} /> : <EmptyState />}
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function TokensTable({tokens}: {tokens: UserTokensItem[]}) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row className="hover:bg-transparent">
          <Table.Head>
            <Trans message="Name" />
          </Table.Head>
          <Table.Head>
            <Trans message="Created" />
          </Table.Head>
          <Table.Head>
            <Trans message="Last used" />
          </Table.Head>
          <Table.Head className="w-21 shrink-0 text-end">
            <span className="sr-only">
              <Trans message="Actions" />
            </span>
          </Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {tokens.map(token => (
          <Table.Row key={token.id} className="hover:bg-transparent">
            <Table.Cell>
              <div className="truncate">{token.name}</div>
            </Table.Cell>
            <Table.Cell>
              <FormattedDate date={token.created_at} />
            </Table.Cell>
            <Table.Cell>
              {token.last_used_at ? (
                <FormattedDate date={token.last_used_at} />
              ) : (
                <Trans message="Never" />
              )}
            </Table.Cell>
            <Table.Cell className="text-end">
              <DeleteTokenAlert token={token}>
                <AlertDialog.Trigger
                  render={<Button size="icon" variant="ghost" color="danger" />}
                >
                  <TrashIcon />
                </AlertDialog.Trigger>
              </DeleteTokenAlert>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function EmptyState() {
  const {branding} = useSettings();
  return (
    <Empty.Root className="rounded-card border border-dashed">
      <Empty.Header>
        <Empty.Media variant="icon">
          <KeyIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="No API keys yet" />
        </Empty.Title>
        <Empty.Description>
          <Trans
            message="Connect to external services and automate your workflows by using :siteName API."
            values={{siteName: branding.site_name}}
          />
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function LearnMoreApiDocsButton() {
  const {base_url} = useSettings();
  return (
    <LinkButton to={`${base_url}/api-docs`} target="_blank" variant="outline">
      <BookOpenIcon />
      <Trans message="Learn more" />
    </LinkButton>
  );
}

function CreateNewTokenButton() {
  const {billing} = useSettings();
  const {hasPermission} = useAuth();

  if (!billing?.enable && !hasPermission('api.access')) {
    return (
      <NoFeaturePermissionPopover.Root
        message={
          <Trans message="Your current plan doesn't include API functionality." />
        }
      >
        <NoFeaturePermissionPopover.ButtonTrigger
          size="default"
          color="primary"
          variant="default"
        />
      </NoFeaturePermissionPopover.Root>
    );
  }

  return (
    <CreateNewTokenDialog>
      <Dialog.Trigger render={<Button variant="default" color="primary" />}>
        <Trans message="Create API key" />
      </Dialog.Trigger>
    </CreateNewTokenDialog>
  );
}
