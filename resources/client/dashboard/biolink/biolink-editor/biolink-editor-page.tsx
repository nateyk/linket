import {
  BiolinkEditorStoreProvider,
  useBiolinkEditorStore,
} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {BiolinkSettingsDialog} from '@app/dashboard/biolink/biolink-editor/biolink-settings-dialog';
import {LinkContentItem} from '@app/dashboard/biolink/biolink-editor/content/link-content-item/link-content-item';
import {CreateBiolinkLinkDialog} from '@app/dashboard/biolink/biolink-editor/content/links/create-biolink-link-dialog';
import {WidgetContentItem} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-content-item';
import {WidgetList} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-list';
import {SelectWidgetDialog} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-selector/select-widget-dialog';
import {CreateBiolinkDialog} from '@app/dashboard/biolink/biolink-editor/create-biolink-dialog';
import {DeleteBiolinkDialog} from '@app/dashboard/biolink/biolink-editor/delete-biolink-dialog';
import {CreatorProfileEditor} from '@app/dashboard/biolink/biolink-editor/creator-profile-editor';
import {isCreatorProfileBiolink} from '@app/dashboard/biolink/biolink-editor/creator-profile-types';
import {LivePreview} from '@app/dashboard/biolink/biolink-editor/live-preview';
import {
  listCurrentUserBiolinksOptions,
  retrieveBiolinkOptions,
  updateBiolinkAppearanceOptions,
} from '@app/dashboard/biolink/biolinks-queries';
import {useSelectedBiolinkId} from '@app/dashboard/biolink/use-selected-biolink-id';
import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {convertBiolinkToCreatorProfile} from '@app/gen/biolinks';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Alert} from '@shadcn/alert/alert';
import {Tabs} from '@shadcn/tabs/tabs';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  LayoutPanelTop,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  SparklesIcon,
} from 'lucide-react';
import {useState} from 'react';
import {Outlet, useLocation, useNavigate} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const baseUrl = `/${routeType}/biolinks/${biolinkId}`;
  const query = useSuspenseQuery(retrieveBiolinkOptions(Number(biolinkId)));
  const biolink = query.data.data;

  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('insights')
    ? 'insights'
    : pathname.endsWith('appearance')
      ? 'appearance'
      : 'content';

  // re-create store provider when biolink changes
  return (
    <BiolinkEditorStoreProvider
      data={biolink}
      key={`${biolink.id}-${biolink.builder_mode}`}
    >
      <DashboardLayout.MainSection>
        <BiolinkEditorHeader />
        <Tabs.Root value={selectedTab}>
          <div className="border-b px-6">
            <Tabs.List variant="line">
              <Tabs.LinkTab
                className="min-w-35"
                value="content"
                to={baseUrl}
                replace
              >
                <Trans message="Content" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-35"
                value="appearance"
                to={`${baseUrl}/appearance`}
                replace
              >
                <Trans message="Appearance" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-35"
                value="insights"
                to={`${baseUrl}/insights`}
                replace
              >
                <Trans message="Insights" />
              </Tabs.LinkTab>
            </Tabs.List>
          </div>
        </Tabs.Root>
        <section className="flex flex-auto overflow-hidden">
          <div className="compact-scrollbar min-w-0 flex-auto overflow-y-auto p-(--section-spacing)">
            <AdHost slot="dashboard" className="mb-6" />
            <Outlet />
          </div>
          <LivePreview />
        </section>
      </DashboardLayout.MainSection>
    </BiolinkEditorStoreProvider>
  );
}

function BiolinkEditorHeader() {
  const {routeType} = useDatatableRouteType();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const getState = useBiolinkEditorStore(s => s.getState);
  const saveAppearance = useMutation(
    updateBiolinkAppearanceOptions(biolink.id),
  );
  const appearanceIsDirty = useBiolinkEditorStore(s => s.appearanceIsDirty);
  const setAppearanceIsDirty = useBiolinkEditorStore(
    s => s.setAppearanceIsDirty,
  );
  const location = useLocation();
  const isAppearanceTab = location.pathname.endsWith('appearance');

  const handleSaveAppearance = () => {
    saveAppearance.mutate(
      {config: getState().appearance},
      {
        onSuccess: () => {
          setAppearanceIsDirty(false);
          toast.success(<Trans message="Changes saved" />);
        },
        onError: err => {
          showHttpErrorToast(
            err,
            <Trans message="Could not save appearance" />,
          );
        },
      },
    );
  };

  return (
    <DashboardLayout.SectionHeader className="border-none">
      <DashboardLayout.SidebarToggle />
      {routeType === 'admin' ? <AdminBreadcrumb /> : <BiolinkSelector />}
      <MoreActionsButton />
      <ShareLinkButton
        type="text"
        url={biolink.short_url}
        variant="outline"
        className="max-md:hidden"
      />
      {isAppearanceTab && (
        <Button
          onClick={() => handleSaveAppearance()}
          disabled={!appearanceIsDirty || saveAppearance.isPending}
        >
          <Trans message="Save changes" />
        </Button>
      )}
    </DashboardLayout.SectionHeader>
  );
}

function BiolinkSelector() {
  const {routeType} = useDatatableRouteType();
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const navigate = useNavigate();
  const query = useSuspenseQuery(listCurrentUserBiolinksOptions());
  const biolinks = query.data.data ?? [];
  const [, setSelectedBiolinkId] = useSelectedBiolinkId();
  const selectedBiolink = biolinks.find(b => `${b.id}` === biolinkId)!;
  const [createIsOpen, setCreateIsOpen] = useState(false);

  if (!selectedBiolink) {
    return null;
  }

  return (
    <>
      <CreateBiolinkDialog open={createIsOpen} onOpenChange={setCreateIsOpen} />
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button variant="outline" className="mr-auto justify-between" />
          }
        >
          {selectedBiolink.name}
          <ChevronDownIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.RadioGroup
            value={biolinkId}
            onValueChange={value => {
              setSelectedBiolinkId(Number(value));
              navigate(`/${routeType}/biolinks/${value}`);
            }}
          >
            {biolinks.map(b => (
              <Dropdown.RadioItem value={`${b.id}`} key={b.id}>
                {b.name}
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
          <Dropdown.Item onClick={() => setCreateIsOpen(true)}>
            <PlusIcon />
            <Trans message="New link in bio" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

function AdminBreadcrumb() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  return (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to="/admin/biolinks">
          <Trans message="Biolinks" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{biolink.name}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );
}

function MoreActionsButton() {
  const {routeType} = useDatatableRouteType();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const listQuery = useSuspenseQuery(listCurrentUserBiolinksOptions());

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <BiolinkSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <DeleteBiolinkDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        biolinkId={biolink.id}
      />

      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button size="icon-sm" variant="outline" className="ml-auto" />
          }
        >
          <EllipsisVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
            <Trans message="Settings" />
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => window.open(biolink.short_url, '_blank')}
          >
            <ExternalLinkIcon />
            <Trans message="Open in new tab" />
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={
              routeType === 'dashboard' && listQuery.data.data.length === 1
            }
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

export function BiolinkContentTab() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const content = useBiolinkEditorStore(s => s.content);

  if (isCreatorProfileBiolink(biolink)) {
    return <CreatorProfileEditor />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <CreatorProfileUpgrade />
      <div>
        <AddNewLinkButton />
        <AddNewWidgetButton />
      </div>
      {content.length ? (
        <BiolinkItemList />
      ) : (
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <LayoutPanelTop />
            </Empty.Media>
            <Empty.Title>
              <Trans message="No content yet." />
            </Empty.Title>
            <Empty.Description>
              <Trans message="Get started by adding a link or widget." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      )}
    </div>
  );
}

function CreatorProfileUpgrade() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const convert = useMutation({
    mutationFn: () => convertBiolinkToCreatorProfile(biolink.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ['biolinks']});
      toast.success(<Trans message="Creator profile is ready" />);
    },
    onError: error => showHttpErrorToast(error),
  });

  return (
    <Alert.Root>
      <SparklesIcon />
      <Alert.Title>
        <Trans message="Turn this page into a creator profile" />
      </Alert.Title>
      <Alert.Description>
        <Trans message="Use a focused profile, work showcase, and Digital Products layout. Your existing content will be preserved." />
      </Alert.Description>
      <Alert.Action>
        <Button
          size="sm"
          variant="outline"
          disabled={convert.isPending}
          onClick={() => convert.mutate()}
        >
          <Trans message="Upgrade" />
        </Button>
      </Alert.Action>
    </Alert.Root>
  );
}

export function BiolinkItemList() {
  const content = useBiolinkEditorStore(s => s.content);
  return (
    <>
      {content.map(contentItem => {
        const ContentItem =
          contentItem.model_type === 'biolinkWidget'
            ? WidgetContentItem
            : LinkContentItem;
        return (
          <ContentItem
            key={`${contentItem.model_type}-${contentItem.id}`}
            item={contentItem as never}
          />
        );
      })}
    </>
  );
}

function AddNewLinkButton() {
  const content = useBiolinkEditorStore(s => s.content);
  const position = content?.filter(x => 'pinned' in x && x.pinned).length;

  return (
    <CreateBiolinkLinkDialog position={position}>
      <Dialog.Trigger render={<Button className="mr-3.5 min-w-36" />}>
        <Trans message="Add link" />
      </Dialog.Trigger>
    </CreateBiolinkLinkDialog>
  );
}

function AddNewWidgetButton() {
  const [activeWidgetDialog, setActiveWidgetDialog] = useState<
    BiolinkWidget['type'] | null
  >(null);

  const DialogEl = activeWidgetDialog
    ? WidgetList[activeWidgetDialog].dialog
    : null;

  return (
    <>
      {DialogEl ? (
        <DialogEl
          open={activeWidgetDialog != null}
          onOpenChange={(isOpen: boolean) => {
            if (!isOpen) {
              setActiveWidgetDialog(null);
            }
          }}
        />
      ) : null}

      <SelectWidgetDialog
        onSelect={widgetType => setActiveWidgetDialog(widgetType)}
      >
        <Dialog.Trigger render={<Button color="primary" variant="outline" />}>
          <LayoutGridIcon />
          <Trans message="Add widget" />
        </Dialog.Trigger>
      </SelectWidgetDialog>
    </>
  );
}
