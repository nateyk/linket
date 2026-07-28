import {Localization} from '@app/gen/schemas/localization';
import {
  retrieveLocalizationOptions,
  updateLocalizationOptions,
  uploadLocalizationOptions,
} from '@common/admin/translations/localizations-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {useVirtualizer} from '@tanstack/react-virtual';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {openUploadWindow} from '@ui/utils/files/open-upload-window';
import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {
  DownloadIcon,
  EllipsisIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import {nanoid} from 'nanoid';
import {use, useMemo, useRef, useState} from 'react';
import {NewTranslationDialog} from './new-translation-dialog';

type Lines = Record<string, string>;

const emptyLines = {};

export function Component() {
  const {localeId} = useRequiredParams(['localeId']);
  const query = useSuspenseQuery(retrieveLocalizationOptions(Number(localeId)));
  const localization = query.data.data;

  const [lines, setLines] = useState<Lines>(localization.lines || emptyLines);
  const [linesKey, setLinesKey] = useState(() => nanoid());

  const navigate = useNavigate();
  const updateLocalization = useMutation(
    updateLocalizationOptions(localization.id),
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleUpdateLocalization = (lines: Lines) => {
    updateLocalization.mutate(
      {lines},
      {
        onSuccess: () => {
          toast.success(<Trans message="Localization updated" />);
          navigate('/admin/localizations');
        },
        onError: error => showHttpErrorToast(error),
      },
    );
  };

  return (
    <form
      className="contents"
      onSubmit={e => {
        e.preventDefault();
        handleUpdateLocalization(lines);
      }}
    >
      <DashboardLayout.MainSection>
        <StaticPageTitle>
          <Trans
            message=":locale translations"
            values={{locale: localization.name}}
          />
        </StaticPageTitle>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />

          <Breadcrumb.Root className="text-xl">
            <Breadcrumb.Item>
              <Breadcrumb.Link to="/admin/localizations">
                <Trans message="Localizations" />
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Page>
                <Trans
                  message=":locale translations"
                  values={{locale: localization.name}}
                />
              </Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.Root>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent>
          <Header
            localization={localization}
            setLines={setLines}
            setLinesKey={setLinesKey}
            lines={lines}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={updateLocalization.isPending}
          />
          <DashboardLayout.SectionScrollContainer>
            <LinesList
              key={linesKey}
              lines={lines}
              setLines={setLines}
              searchQuery={searchQuery}
            />
          </DashboardLayout.SectionScrollContainer>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </form>
  );
}

interface HeaderProps {
  localization: Localization;
  lines: Lines;
  setLines: (lines: Lines) => void;
  setLinesKey: (key: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isLoading: boolean;
}
function Header({
  localization,
  searchQuery,
  setSearchQuery,
  setLinesKey,
  isLoading,
  lines,
  setLines,
}: HeaderProps) {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {trans} = useTrans();

  return (
    <DashboardLayout.SectionContentHeader>
      <InputGroup className="mr-auto max-w-110 min-w-45 flex-1">
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={trans({message: 'Type to search...'})}
        />
      </InputGroup>

      <NewTranslationDialog
        onAdd={newTranslation => {
          setLines({[newTranslation.key]: newTranslation.value, ...lines});
        }}
      >
        <Dialog.Trigger
          render={
            <Button
              variant="outline"
              color="primary"
              size={isMobileMode ? 'icon-sm' : undefined}
            />
          }
        >
          <PlusIcon />
          {!isMobileMode && <Trans message="Add new" />}
        </Dialog.Trigger>
      </NewTranslationDialog>

      <ActionsMenuTrigger
        locale={localization}
        setLines={setLines}
        setLinesKey={setLinesKey}
      />

      <Button
        variant="default"
        color="primary"
        type="submit"
        disabled={isLoading}
      >
        {isMobileMode ? (
          <Trans message="Save" />
        ) : (
          <Trans message="Save translations" />
        )}
      </Button>
    </DashboardLayout.SectionContentHeader>
  );
}

interface LinesListProps {
  searchQuery?: string;
  lines: Lines;
  setLines: (lines: Lines) => void;
}
function LinesList({searchQuery, lines, setLines}: LinesListProps) {
  const filteredLines = useMemo(() => {
    return Object.entries(lines).filter(([id, translation]) => {
      const lowerCaseQuery = searchQuery?.toLowerCase();
      return (
        !lowerCaseQuery ||
        id?.toLowerCase().includes(lowerCaseQuery) ||
        translation?.toLowerCase().includes(lowerCaseQuery)
      );
    });
  }, [lines, searchQuery]);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredLines.length,
    getScrollElement: () => containerRef.current?.parentElement ?? null,
    estimateSize: () => 123,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
      }}
    >
      {rowVirtualizer.getVirtualItems().map(virtualItem => {
        const entry = filteredLines[virtualItem.index];
        if (!entry) return null;
        const [id, translation] = entry;

        return (
          <div
            key={id}
            className="absolute top-0 left-0 w-full"
            style={{
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <div className="mb-2.5 rounded-card-sm border md:mr-2.5">
              <div className="flex items-center justify-between gap-6 border-b px-2.5 py-0.5">
                <label className="flex-auto text-xs font-semibold" htmlFor={id}>
                  {id}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    const newLines = {...lines};
                    delete newLines[id];
                    setLines(newLines);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
              <div>
                <textarea
                  id={id}
                  name={id}
                  defaultValue={translation}
                  className="block w-full resize-none rounded-sm bg-inherit p-2.5 text-sm"
                  rows={2}
                  onChange={e => {
                    const newLines = {...lines};
                    newLines[id] = e.target.value;
                    setLines(newLines);
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ActionsMenuTriggerProps {
  locale: Localization;
  setLines: (lines: Lines) => void;
  setLinesKey: (key: string) => void;
}
function ActionsMenuTrigger({
  locale,
  setLines,
  setLinesKey,
}: ActionsMenuTriggerProps) {
  const uploadFile = useMutation(uploadLocalizationOptions(locale.id));

  const handleUploadFile = (file: UploadedFile) => {
    uploadFile.mutate(
      {file: file.native},
      {
        onSuccess: response => {
          toast.success(<Trans message="Translation file uploaded" />);
          if (response.data.lines) {
            setLines(response.data.lines);
          }
          setLinesKey(nanoid());
        },
        onError: error => showHttpErrorToast(error),
      },
    );
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            color="primary"
            disabled={uploadFile.isPending}
          />
        }
      >
        <EllipsisIcon />
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Item
          onClick={() =>
            downloadFileFromUrl(`api/v1/localizations/${locale.id}/download`)
          }
        >
          <DownloadIcon />
          <Trans message="Download" />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={async () => {
            const files = await openUploadWindow({
              types: [FileInputType.json],
            });
            const file = files[0];
            if (file) {
              handleUploadFile(file);
            }
          }}
        >
          <UploadIcon />
          <Trans message="Upload" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
