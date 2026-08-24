import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {useTrans} from '@ui/i18n/use-trans';
import {SearchIcon, XIcon} from 'lucide-react';
import {useRef} from 'react';
import {useMatch, useNavigate, useSearchParams} from 'react-router';

export function GlobalSearchInput() {
  const {trans} = useTrans();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const match = useMatch('/dashboard/:page/*');
  const currentPage = match?.params.page ?? '';

  // set key to current page so it rerenders on page change and default value for input is updated
  return (
    <form
      key={currentPage}
      className="ml-2.5 max-w-180 flex-1"
      onSubmit={e => {
        e.preventDefault();
        if (inputRef.current?.value) {
          navigate(
            `${getSearchRoute(currentPage)}?query=${inputRef.current?.value}`,
          );
        } else {
          navigate(getSearchRoute(currentPage));
        }
      }}
    >
      <InputGroup className="h-11.5 rounded-button border-none bg-background in-data-[variant=default]:bg-accent in-data-[variant=inset]:shadow-sm *:data-[slot=input-group-control]:md:text-base dark:bg-card">
        <InputGroupAddon>
          <InputGroupButton size="icon-sm" type="submit">
            <SearchIcon />
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupInput
          placeholder={trans({message: 'Search...'})}
          defaultValue={searchParams.get('query') ?? ''}
          name="global-search-query"
          ref={inputRef}
        />
        {searchParams.get('query') ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              onClick={() => {
                inputRef.current!.value = '';
                // navigate so all other params (page, sort etc.) are cleared
                navigate(getSearchRoute(currentPage));
              }}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </form>
  );
}

function getSearchRoute(currentPage: string) {
  // storefront-first IA: creator dashboard hides legacy link tools; only pixels+stores are creator-visible.
  // Legacy cases below remain for admin routeType only — they are never hit on creator but kept for admin parity
  // (dashboard-routes.tsx gates them behind if (!isDashboard)). Default is storefront, not links.
  switch (currentPage) {
    case 'qr-codes':
      return `/dashboard/qr-codes`;
    case 'folders':
      return `/dashboard/folders`;
    case 'custom-domains':
      return `/dashboard/custom-domains`;
    case 'link-overlays':
      return `/dashboard/link-overlays`;
    case 'link-pages':
      return `/dashboard/link-pages`;
    case 'pixels':
      return `/dashboard/pixels`;
    case 'stores':
    case 'biolinks':
      return `/dashboard/stores`;
    // for other pages (including former 'links' default), storefront-first: search stores
    default:
      return `/dashboard/stores`;
  }
}
