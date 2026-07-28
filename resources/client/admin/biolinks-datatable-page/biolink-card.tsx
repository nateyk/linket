import {DeleteBiolinksDialog} from '@app/admin/biolinks-datatable-page/delete-biolinks-dialog';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {Biolink} from '@app/gen/schemas/biolink';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  BarChart3Icon,
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  LayoutPanelTop,
  MoreVerticalIcon,
  PencilIcon,
  Trash,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

type BiolinkCardProps = {
  biolink: Biolink;
};

export function BiolinkCard({biolink}: BiolinkCardProps) {
  const [isCopied, copyToClipboard] = useClipboard(biolink.short_url);

  const handleCopyToClipboard = () => {
    copyToClipboard();
    toast.positive(message('Copied to clipboard'));
  };

  return (
    <Item.Root variant="outline">
      <BiolinkMedia />
      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title>
            <Link
              to={`${biolink.id}`}
              className="font-semibold hover:underline"
            >
              {biolink.name}
            </Link>
          </Item.Title>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyToClipboard}
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </Item.Row>
        <BiolinkDetails biolink={biolink} />
      </Item.Content>
      <Item.Actions>
        <BiolinkActionsButton biolink={biolink} />
      </Item.Actions>
    </Item.Root>
  );
}

type BiolinkDetailsProps = {
  biolink: Biolink;
};

function BiolinkDetails({biolink}: BiolinkDetailsProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0">
      <CornerDownRightIcon />
      <a
        href={biolink.short_url}
        target="_blank"
        rel="noreferrer"
        className="block truncate hover:underline"
      >
        {removeProtocol(biolink.short_url)}
      </a>
      {biolink.user && (
        <ResourceCardUser className="mx-1" user={biolink.user} />
      )}
      {biolink.created_at && (
        <div className="shrink-0 whitespace-nowrap">
          <FormattedRelativeTime date={biolink.created_at} style="narrow" />
        </div>
      )}
    </div>
  );
}

function BiolinkMedia() {
  return (
    <Item.Media align="center" className="size-9.5 rounded-full border">
      <LayoutPanelTop className="size-4" />
    </Item.Media>
  );
}

function BiolinkActionsButton({biolink}: {biolink: Biolink}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.LinkItem render={<Link to={`${biolink.id}`} />}>
            <PencilIcon />
            <Trans message="Edit" />
          </Dropdown.LinkItem>
          <Dropdown.LinkItem render={<Link to={`${biolink.id}/insights`} />}>
            <BarChart3Icon />
            <Trans message="View insights" />
          </Dropdown.LinkItem>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <DeleteBiolinksDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        biolink={biolink}
      />
    </>
  );
}
