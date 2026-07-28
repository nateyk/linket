import {LinkImage} from '@app/dashboard/links/link-image';
import {listLinksOptions} from '@app/dashboard/links/links-queries';
import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {toast} from '@shadcn/toast/toast';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  FolderIcon,
} from 'lucide-react';
import {parseAsInteger, useQueryState} from 'nuqs';

interface Props {
  folder: Folder;
}
export function FolderRenderer({folder}: Props) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const query = useSuspenseQuery(
    listLinksOptions('dashboard', {folder_id: folder.id, page}),
  );
  const items = query.data.data ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar.Root className="sticky top-0 shrink-0 border-b">
        <Navbar.Logo />
        <Navbar.Menu position="link-page-navbar" />
        <Navbar.Content className="ml-auto">
          <ShareLinkButton
            type="text"
            variant="outline"
            url={folder.short_url}
          />
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>
      <div className="mx-auto w-full max-w-6xl flex-auto px-6 py-10">
        <h1 className="mb-10 text-3xl">{folder.name}</h1>
        <div>
          {items.length > 0 ? (
            <>
              <Item.Group className="mb-8">
                {items.map(link => (
                  <LinkListItem key={link.id} link={link} />
                ))}
              </Item.Group>
              <BackendPagination
                response={query.data}
                onPageChange={page => {
                  setPage(page);
                }}
              />
            </>
          ) : (
            <Empty.Root>
              <Empty.Header>
                <Empty.Media variant="icon">
                  <FolderIcon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="Nothing to show" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="This folder does not have any links yet" />
                </Empty.Description>
              </Empty.Header>
            </Empty.Root>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkListItem({link}: {link: LinkType}) {
  const [isCopied, copyToClipboard] = useClipboard(link.short_url);

  return (
    <Item.Root variant="outline">
      <Item.Media align="center" className="size-9.5 rounded-full border p-2">
        <LinkImage link={link} size="size-5" />
      </Item.Media>
      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title>
            <a
              href={link.short_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:underline"
            >
              {removeProtocol(link.short_url)}
            </a>
          </Item.Title>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              copyToClipboard();
              toast.success(<Trans message="Copied to clipboard" />);
            }}
          >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </Item.Row>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0">
          <CornerDownRightIcon />
          <a
            href={link.final_destination_url ?? link.long_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate hover:underline"
          >
            {removeProtocol(link.long_url)}
          </a>
        </div>
      </Item.Content>
    </Item.Root>
  );
}
