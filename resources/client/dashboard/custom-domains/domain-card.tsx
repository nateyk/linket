import {useUsage} from '@app/dashboard/use-usage';
import {
  archiveDomainOptions,
  deleteDomainOptions,
  unarchiveDomainOptions,
} from '@app/dashboard/custom-domains/domains-queries';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {useAuth} from '@common/auth/use-auth';
import {ConnectDomainDialog} from '@common/custom-domains/connect-domain-dialog/connect-domain-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  ArchiveIcon,
  ChartColumnBigIcon,
  EllipsisVerticalIcon,
  GlobeIcon,
  Trash,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

type DomainCardProps = {
  domain: CustomDomain;
};

export function DomainCard({domain}: DomainCardProps) {
  return (
    <Item.Root variant="outline">
      <Item.Media align="center" className="size-9.5 rounded-full border">
        <RemoteFavicon url={domain.host} size="size-4.5" />
      </Item.Media>
      <Item.Content>
        <Item.Title>
          <a className="hover:underline" href={domain.host} target="_blank">
            {domain.host}
          </a>
        </Item.Title>
        <Item.Row className="gap-3">
          {domain.created_at ? (
            <div className="text-muted-foreground">
              <FormattedDate date={domain.created_at} />
            </div>
          ) : null}
          {domain.user ? <ResourceCardUser user={domain.user} /> : null}
        </Item.Row>
      </Item.Content>
      <Item.Actions>
        {domain.global && (
          <Badge variant="secondary">
            <Trans message="Global" />
          </Badge>
        )}
        <DomainOptionsButton domain={domain} />
      </Item.Actions>
    </Item.Root>
  );
}

type DomainOptionsButtonProps = {
  domain: CustomDomain;
};

function DomainOptionsButton({domain}: DomainOptionsButtonProps) {
  const {routeType} = useDatatableRouteType();
  const query = useUsage();
  const {user} = useAuth();
  const archiveDomain = useMutation(archiveDomainOptions());
  const unarchiveDomain = useMutation(unarchiveDomainOptions());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const canDeleteDomain =
    query.data?.data.custom_domains.delete || domain.user_id === user?.id;

  const handleArchive = () => {
    archiveDomain.mutate(domain.id, {
      onSuccess: () => {
        toast.success(<Trans message="Domain archived" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveDomain.mutate(domain.id, {
      onSuccess: () => {
        toast.success(<Trans message="Domain unarchived" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
          <EllipsisVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.LinkItem
            render={<Link to={`/${routeType}/custom-domains/${domain.id}`} />}
          >
            <ChartColumnBigIcon />
            <Trans message="View insights" />
          </Dropdown.LinkItem>
          <Dropdown.Item onClick={() => setConnectOpen(true)}>
            <GlobeIcon />
            <Trans message="Change domain" />
          </Dropdown.Item>
          <Dropdown.Item
            disabled={!canDeleteDomain}
            onClick={() =>
              domain.deleted_at ? handleUnarchive() : handleArchive()
            }
          >
            <ArchiveIcon />
            {!domain.deleted_at ? (
              <Trans message="Archive" />
            ) : (
              <Trans message="Unarchive" />
            )}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            disabled={!canDeleteDomain}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash />
            <Trans message="Remove" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <DeleteDomainDialog
        domain={domain}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <ConnectDomainDialog
        domain={domain}
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onSuccess={() => {
          toast.success(<Trans message="Domain connected" />);
        }}
      />
    </>
  );
}

type DeleteDomainDialogProps = {
  domain: CustomDomain;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteDomainDialog({
  domain,
  open,
  onOpenChange,
}: DeleteDomainDialogProps) {
  const deleteDomain = useMutation(deleteDomainOptions());

  const handleDelete = () => {
    deleteDomain.mutate(domain.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(
          <Trans
            message="“:domain” removed"
            values={{domain: removeProtocol(domain.host)}}
          />,
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Remove domain?" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans
                message="Are you sure you want to remove “:domain“?"
                values={{domain: domain.host}}
              />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteDomain.isPending}
              onClick={() => handleDelete()}
            >
              <Trans message="Remove" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
