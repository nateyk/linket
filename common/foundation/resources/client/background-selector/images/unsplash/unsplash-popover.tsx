import type {ListUnsplashImages200ResultsItem} from '@app/gen/schemas/list-unsplash-images200-results-item';
import {
  listUnsplashImagesOptions,
  trackUnsplashDownloadOptions,
} from '@common/background-selector/images/unsplash/unsplash-queries';
import {SiUnsplash} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Popover} from '@shadcn/popover/popover';
import {Spinner} from '@shadcn/spinner/spinner';
import {keepPreviousData, useMutation, useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {MoreHorizontalIcon, SearchIcon, XIcon} from 'lucide-react';
import {ReactElement, useRef, useState} from 'react';
import {useDebouncedCallback} from 'use-debounce';

type UnsplashImage = ListUnsplashImages200ResultsItem;

interface Props {
  onSelected?: (value: string) => void;
  children?: ReactElement;
}

export function UnsplashPopover({onSelected, children}: Props) {
  const [open, setOpen] = useState(false);
  const trackDownload = useMutation(trackUnsplashDownloadOptions());

  const selectedImageRef = useRef<UnsplashImage | null>(null);

  const selectImage = (image: UnsplashImage) => {
    onSelected?.(image.urls.regular || image.urls.full);
    selectedImageRef.current = image;
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          setOpen(false);
          if (selectedImageRef.current) {
            trackDownload.mutate(selectedImageRef.current.id);
          }
        } else {
          setOpen(true);
        }
      }}
    >
      {children}
      <Popover.Portal>
        <Content onSelected={selectImage} />
      </Popover.Portal>
    </Popover.Root>
  );
}

function Content({onSelected}: {onSelected: (image: UnsplashImage) => void}) {
  const {trans} = useTrans();
  const [params, setParams] = useState({search: '', page: 1});

  const selectedImageRef = useRef<UnsplashImage | null>(null);
  const setSearch = useDebouncedCallback((search: string) => {
    setParams({search, page: 1});
  }, 300);

  const query = useQuery({
    ...listUnsplashImagesOptions({
      page: params.page,
      ...(params.search ? {search: params.search} : {}),
    }),
    placeholderData: keepPreviousData,
  });

  const images = query.data?.results ?? [];
  const totalPages = Math.min(query.data?.total_pages ?? 1, 50);
  const hasImages = images.length > 0;

  const selectImage = (image: UnsplashImage) => {
    onSelected?.(image);
    selectedImageRef.current = image;
  };

  return (
    <Popover.Content align="start" className="w-107 gap-3">
      <Popover.Header className="flex-row items-center justify-between border-b pb-2">
        <Popover.Title className="text-sm">
          <SiUnsplash />
          <Trans message="Unsplash" />
        </Popover.Title>
        <Popover.CloseButton
          className="text-muted-foreground"
          render={<Button variant="ghost" size="icon-xs" />}
        >
          <XIcon className="size-4" />
        </Popover.CloseButton>
      </Popover.Header>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder={trans(message('Search for images...'))}
          onChange={e => setSearch(e.target.value.trim())}
        />
      </InputGroup>
      <div className="compact-scrollbar h-70 overflow-x-hidden overflow-y-auto">
        {query.isPending ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : query.isError ? (
          <UnsplashEmptyState
            title={<Trans message="Could not load images" />}
            description={<Trans message="Please try another search." />}
          />
        ) : !hasImages ? (
          <UnsplashEmptyState
            title={<Trans message="No images found" />}
            description={<Trans message="Try searching for something else." />}
          />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map(image => {
              const label =
                image.alt_description ||
                image.description ||
                image.user?.name ||
                params.search ||
                trans(message('Unsplash image'));
              const authorName = image.user?.name;
              const authorProfileUrl = image.user?.links.html;

              return (
                <div
                  key={image.id}
                  className="group relative aspect-[1.1] w-full overflow-hidden rounded-md bg-muted transition-transform focus-within:scale-[1.02] hover:scale-[1.02]"
                >
                  <button
                    type="button"
                    aria-label={label}
                    className="block size-full outline-foreground focus-visible:outline-2"
                    onClick={() => selectImage(image)}
                  >
                    <img
                      src={image.urls.small}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      className="size-full object-cover"
                    />
                  </button>
                  {authorName && authorProfileUrl && (
                    <span className="pointer-events-none absolute bottom-0 left-0 z-10 w-full bg-linear-to-t from-black to-transparent px-1 pt-[50%] pb-1 text-center text-xs font-medium text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100">
                      <a
                        href={authorProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pointer-events-auto outline-none"
                      >
                        {authorName}
                      </a>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hasImages && totalPages > 1 && (
        <UnsplashPagination
          page={params.page}
          totalPages={totalPages}
          onPageChange={page => setParams({...params, page})}
        />
      )}
    </Popover.Content>
  );
}

function UnsplashEmptyState({
  title,
  description,
}: {
  title: ReactElement;
  description: ReactElement;
}) {
  return (
    <Empty.Root className="h-full">
      <Empty.Header>
        <Empty.Media variant="icon">
          <SearchIcon />
        </Empty.Media>
        <Empty.Title className="text-base">{title}</Empty.Title>
        <Empty.Description className="text-sm">{description}</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function UnsplashPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const visiblePages = getVisiblePages(page, totalPages);
  const firstVisiblePage = visiblePages[0] ?? 1;
  const lastVisiblePage = visiblePages.at(-1) ?? totalPages;
  const showStartEllipsis = firstVisiblePage > 2;
  const showEndEllipsis = lastVisiblePage < totalPages - 1;

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      {firstVisiblePage > 1 && (
        <Button
          size="icon-sm"
          variant={page === 1 ? 'outline' : 'ghost'}
          onClick={() => onPageChange(1)}
        >
          1
        </Button>
      )}
      {showStartEllipsis && (
        <div className="flex size-6 items-center justify-center" aria-hidden>
          <MoreHorizontalIcon className="size-3" />
        </div>
      )}
      {visiblePages.map(pageNumber => (
        <Button
          key={pageNumber}
          size="icon-sm"
          variant={pageNumber === page ? 'outline' : 'ghost'}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </Button>
      ))}
      {showEndEllipsis && (
        <div className="flex size-6 items-center justify-center" aria-hidden>
          <MoreHorizontalIcon className="size-3" />
        </div>
      )}
      {lastVisiblePage < totalPages && (
        <Button
          size="icon-sm"
          variant={page === totalPages ? 'outline' : 'ghost'}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Button>
      )}
    </div>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const maxVisiblePages = 5;
  const visiblePageCount = Math.min(totalPages, maxVisiblePages);
  const halfWindow = Math.floor(visiblePageCount / 2);
  const lastStartPage = Math.max(totalPages - visiblePageCount + 1, 1);
  const startPage = Math.min(Math.max(page - halfWindow, 1), lastStartPage);

  return Array.from(
    {length: visiblePageCount},
    (_, index) => startPage + index,
  );
}
