import {
  FontSelectorState,
  UseFontSelectorProps,
  useFontSelectorState,
} from '@common/ui/font-selector/font-selector-state';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {BrowserSafeFonts} from '@ui/fonts/font-picker/browser-safe-fonts';
import {FontConfig} from '@ui/fonts/font-picker/font-config';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import {CaseUpperIcon, MoreHorizontalIcon, SearchIcon} from 'lucide-react';

interface FontSelectorProps extends UseFontSelectorProps {
  className?: string;
}
export function FontSelector({className, ...props}: FontSelectorProps) {
  const {trans} = useTrans();
  const state = useFontSelectorState(props);
  return (
    <div className={className}>
      <InputGroup className="mb-6">
        <InputGroupInput
          value={state.query}
          onChange={e => state.setQuery(e.target.value)}
          placeholder={trans(message('Search fonts'))}
        />
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      <div className="min-h-176">
        <FontList state={state} />
      </div>

      {state.pages.length > 1 && (
        <FontSelectorPagination
          currentPage={state.currentPage}
          totalPages={state.pages.length}
          onPageChange={state.setCurrentPage}
        />
      )}
    </div>
  );
}

function FontList({state}: {state: FontSelectorState}) {
  const {isLoading, fonts} = state;

  if (isLoading) {
    return <FontListSkeleton className="grid grid-cols-2 items-start gap-4" />;
  }

  if (!fonts?.length) {
    return (
      <Empty.Root>
        <Empty.Header>
          <Empty.Media variant="icon">
            <CaseUpperIcon />
          </Empty.Media>
          <Empty.Title>
            <Trans message="No matching fonts" />
          </Empty.Title>
          <Empty.Description>
            <Trans message="Try a different search query" />
          </Empty.Description>
        </Empty.Header>
      </Empty.Root>
    );
  }

  return (
    <div className="grid grid-cols-2 items-start gap-4">
      {fonts?.map(font => (
        <FontButton key={font.family} font={font} state={state} />
      ))}
    </div>
  );
}

interface FontButtonProps {
  font: FontConfig;
  state: FontSelectorState;
}
function FontButton({font, state: {value, onChange}}: FontButtonProps) {
  const isActive = value?.family === font.family;
  return (
    <button
      type="button"
      data-active={isActive}
      className="flex h-14 items-center justify-center rounded-card-xs border p-2 font-medium outline-offset-3 outline-primary hover:bg-accent focus-visible:outline-2 data-active:outline-2"
      style={{fontFamily: font.family}}
      onClick={() => onChange(font)}
    >
      <FontDisplayName font={font} />
    </button>
  );
}
function FontSelectorPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const page = currentPage + 1;
  const visiblePages = getVisiblePages(page, totalPages);
  const firstVisiblePage = visiblePages[0] ?? 1;
  const lastVisiblePage = visiblePages.at(-1) ?? totalPages;
  const showStartEllipsis = firstVisiblePage > 2;
  const showEndEllipsis = lastVisiblePage < totalPages - 1;

  return (
    <div className="mt-5 flex items-center justify-center gap-1 border-t pt-4">
      {firstVisiblePage > 1 && (
        <Button
          size="icon-sm"
          variant={page === 1 ? 'outline' : 'ghost'}
          onClick={() => onPageChange(0)}
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
          onClick={() => onPageChange(pageNumber - 1)}
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
          onClick={() => onPageChange(totalPages - 1)}
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

export function FontDisplayName({font}: {font: FontConfig}) {
  if (font.family === BrowserSafeFonts[0]!.family) {
    return <Trans message="System" />;
  }
  return font.family.split(',')[0]!.replace(/"/g, '');
}

interface FontListSkeletonProps {
  className: string;
}
function FontListSkeleton({className}: FontListSkeletonProps) {
  const items = Array.from(Array(20).keys());
  return (
    <div className={className}>
      {items.map(index => (
        <Skeleton
          className="block h-14 rounded-card-xs"
          variant="rect"
          key={index}
        />
      ))}
    </div>
  );
}
