import {
  BiolinkEditorStoreProvider,
  useBiolinkEditorStore,
} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BiolinkSettingsDialog} from '@app/dashboard/stores/store-editor/biolink-settings-dialog';
import {LinkContentItem} from '@app/dashboard/stores/store-editor/content/link-content-item/link-content-item';
import {CreateBiolinkLinkDialog} from '@app/dashboard/stores/store-editor/content/links/create-biolink-link-dialog';
import {WidgetContentItem} from '@app/dashboard/stores/store-editor/content/widgets/widget-content-item';
import {WidgetList} from '@app/dashboard/stores/store-editor/content/widgets/widget-list';
import {SelectWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/widget-selector/select-widget-dialog';
import {CreateBiolinkDialog} from '@app/dashboard/stores/store-editor/create-biolink-dialog';
import {DeleteBiolinkDialog} from '@app/dashboard/stores/store-editor/delete-biolink-dialog';
import {CreatorProfileEditor} from '@app/dashboard/stores/store-editor/creator-profile-editor';
import {isCreatorProfileBiolink} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {LivePreview} from '@app/dashboard/stores/store-editor/live-preview';
import {
  listCurrentUserStoresOptions,
  retrieveStoreOptions,
  storesBaseKey,
  updateStoreAppearanceOptions,
} from '@app/dashboard/stores/stores-queries';
import {useSelectedStoreId} from '@app/dashboard/stores/use-selected-store-id';
import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {AdHost} from '@common/admin/ads/ad-host';
import {parseApiError} from '@common/http/errors/parsed-api-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {
  convertStoreToCreatorProfile,
  updateStoreCreatorProfile,
} from '@app/gen/stores';
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
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  ChartNoAxesCombinedIcon,
  LayoutGridIcon,
  LayoutPanelTop,
  LoaderCircleIcon,
  PlusIcon,
  SaveIcon,
  SettingsIcon,
  TrashIcon,
  SparklesIcon,
  UserRoundPenIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Outlet, useLocation, useNavigate} from 'react-router';
import {
  isWithinStoreEditorPath,
  UnsavedChangesGuard,
} from './unsaved-changes-guard';
import {SaveErrorSummary} from './save-error-summary';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {storeId} = useRequiredParams(['storeId']);
  const baseUrl = `/${routeType}/stores/${storeId}`;
  const query = useSuspenseQuery(retrieveStoreOptions(String(storeId)));
  const biolink = query.data.data;

  const {pathname} = useLocation();
  const navigate = useNavigate();
  const selectedTab = pathname.endsWith('insights')
    ? 'insights'
    : pathname.endsWith('appearance')
      ? 'appearance'
      : pathname.endsWith('about')
        ? 'about'
        : 'content';
  const isInsightsTab = selectedTab === 'insights';

  // Arrow/Home/End/Space activation must switch tabs without stacking
  // history entries, so the router move replaces instead of pushes (A-11).
  const tabPaths: Record<string, string> = {
    content: baseUrl,
    about: `${baseUrl}/about`,
    appearance: `${baseUrl}/appearance`,
    insights: `${baseUrl}/insights`,
  };

  // re-create store provider when biolink changes
  return (
    <BiolinkEditorStoreProvider
      data={biolink}
      key={`${biolink.id}-${biolink.builder_mode}`}
    >
      <DashboardLayout.MainSection>
        <h1 className="sr-only">{biolink.name}</h1>
        <EditorHeaderWithGuard baseUrl={baseUrl} />
        <section className="flex min-h-0 flex-auto flex-col overflow-x-hidden overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="flex min-w-0 shrink-0 flex-col lg:min-h-0 lg:flex-auto lg:overflow-hidden">
            {!isInsightsTab && (
              <Tabs.Root
                value={selectedTab}
                className="shrink-0 border-b"
                onValueChange={value => {
                  const path = tabPaths[String(value)];
                  if (path) {
                    navigate(path, {replace: true});
                  }
                }}
              >
                <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8">
                  <Tabs.List
                    variant="line"
                    className="w-full justify-start"
                    activateOnFocus
                  >
                    <Tabs.LinkTab value="content" to={baseUrl} replace>
                      <Trans message="Content" />
                    </Tabs.LinkTab>
                    <Tabs.LinkTab value="about" to={`${baseUrl}/about`} replace>
                      <Trans message="About" />
                    </Tabs.LinkTab>
                    <Tabs.LinkTab
                      value="appearance"
                      to={`${baseUrl}/appearance`}
                      replace
                    >
                      <Trans message="Appearance" />
                    </Tabs.LinkTab>
                  </Tabs.List>
                </div>
              </Tabs.Root>
            )}
            <div className="compact-scrollbar min-w-0 overflow-x-hidden lg:min-h-0 lg:flex-auto lg:overflow-y-auto">
              <div
                className={
                  isInsightsTab
                    ? 'mx-auto flex w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8'
                    : 'w-full max-w-3xl p-4 sm:p-6 lg:p-8'
                }
              >
                <AdHost slot="dashboard" className="mb-6" />
                {!isInsightsTab && (
                  <SaveErrorSummary
                    activeTab={
                      selectedTab === 'appearance' ? 'appearance' : 'profile'
                    }
                  />
                )}
                <Outlet />
              </div>
            </div>
          </div>
          <LivePreview />
        </section>
      </DashboardLayout.MainSection>
    </BiolinkEditorStoreProvider>
  );
}

function BiolinkEditorHeader({save}: {save: StoreEditorSave}) {
  const {routeType} = useDatatableRouteType();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const saveStatus = useBiolinkEditorStore(s => s.saveStatus);
  const location = useLocation();
  const isAppearanceTab = location.pathname.endsWith('appearance');
  const isProfileTab =
    !isAppearanceTab && !location.pathname.endsWith('insights');
  const appearanceIsDirty = useBiolinkEditorStore(s => s.appearanceIsDirty);
  const profileIsDirty = useBiolinkEditorStore(s => s.profileIsDirty);

  const showSaveButton =
    (isAppearanceTab && appearanceIsDirty) || (isProfileTab && profileIsDirty);

  return (
    <DashboardLayout.SectionHeader className="min-h-16 gap-2 border-none px-4 sm:px-6">
      {/* Quiet success announcement alongside the toast: the region exists
          up front and only its text changes, so screen readers catch it
          without the announcement being tied to a toast's lifetime (A-07). */}
      <span role="status" className="sr-only">
        {saveStatus === 'saved' ? <Trans message="Changes saved" /> : ''}
      </span>
      <DashboardLayout.SidebarToggle />
      {routeType === 'admin' ? <AdminBreadcrumb /> : <BiolinkSelector />}
      <MoreActionsButton />
      <ShareLinkButton
        type="text"
        url={biolink.short_url}
        variant="outline"
        className="max-lg:hidden"
      />
      {(isProfileTab || isAppearanceTab) && (
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                onClick={save.saveCurrentTab}
                disabled={!showSaveButton || save.isSaving}
                aria-busy={save.isSaving || undefined}
                aria-keyshortcuts="Control+S Meta+S"
                // Clean = nothing to save: muted tokens, not just opacity .5,
                // so it reads as intentionally off rather than hovered (A-07).
                className={
                  !showSaveButton
                    ? 'disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100'
                    : undefined
                }
              />
            }
          >
            {save.isSaving ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <SaveIcon data-icon="inline-start" />
            )}
            <span className="hidden sm:inline">
              {save.isSaving ? (
                <Trans message="Saving..." />
              ) : (
                <Trans message="Save changes" />
              )}
            </span>
            <span className="sm:hidden">
              {save.isSaving ? (
                <Trans message="Saving..." />
              ) : (
                <Trans message="Save" />
              )}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Trans message="Save changes (Ctrl+S)" />
          </Tooltip.Content>
        </Tooltip.Root>
      )}
    </DashboardLayout.SectionHeader>
  );
}

/**
 * Single save implementation for the editor: the header's Save button and
 * the unsaved-changes guard's "Save & leave" share it, so both save every
 * dirty part with the same payloads and the same toasts.
 */
function useStoreEditorSave() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const getState = useBiolinkEditorStore(s => s.getState);
  const setAppearanceIsDirty = useBiolinkEditorStore(
    s => s.setAppearanceIsDirty,
  );
  const markProfileSaved = useBiolinkEditorStore(s => s.markProfileSaved);
  const setSaveError = useBiolinkEditorStore(s => s.setSaveError);
  const setSaveStatus = useBiolinkEditorStore(s => s.setSaveStatus);
  const location = useLocation();
  const isAppearanceTab = location.pathname.endsWith('appearance');
  const isProfileTab =
    !isAppearanceTab && !location.pathname.endsWith('insights');

  // Every save clears the previous feedback first: the summary disappears
  // while the request runs and reappears only if this attempt fails (A-07).
  const saveAppearance = useMutation({
    ...updateStoreAppearanceOptions(String(biolink.id)),
    onMutate: () => {
      setSaveError(null);
      setSaveStatus(null);
    },
    onSuccess: () => {
      setAppearanceIsDirty(false);
      setSaveStatus('saved');
      toast.success(<Trans message="Changes saved" />);
    },
    onError: error => {
      setSaveError({tab: 'appearance', parsed: parseApiError(error)});
      setSaveStatus(null);
      showHttpErrorToast(error, <Trans message="Could not save appearance" />);
    },
  });
  const saveProfile = useMutation({
    mutationFn: (payload: Parameters<typeof updateStoreCreatorProfile>[1]) =>
      updateStoreCreatorProfile(String(biolink.id), payload),
    onMutate: () => {
      setSaveError(null);
      setSaveStatus(null);
    },
    onSuccess: () => {
      // The just-saved config becomes the baseline dirtiness is compared
      // against — in the store, so it survives editor remounts.
      markProfileSaved(getState().profileConfig);
      queryClient.invalidateQueries({queryKey: storesBaseKey});
      queryClient.invalidateQueries({queryKey: ['digital-products']});
      setSaveStatus('saved');
      toast.success(<Trans message="Changes saved" />);
    },
    onError: error => {
      // Dirty state is deliberately untouched: nothing is lost, and the
      // summary lists the server's field errors for a retry (A-07).
      setSaveError({tab: 'profile', parsed: parseApiError(error)});
      setSaveStatus(null);
      showHttpErrorToast(error);
    },
  });

  const saveProfilePayload = () => {
    const state = getState();
    return {
      ...state.profileConfig,
      skills: state.profileConfig.skills.slice(0, 8),
      featured_product_ids: state.featuredProductIds.slice(0, 6),
    } as Parameters<typeof updateStoreCreatorProfile>[1];
  };

  const saveCurrentTab = () => {
    const state = getState();
    if (isAppearanceTab && state.appearanceIsDirty) {
      saveAppearance.mutate({config: state.appearance as any});
    } else if (isProfileTab && state.profileIsDirty) {
      saveProfile.mutate(saveProfilePayload());
    }
  };

  const saveAll = async () => {
    const state = getState();
    const pending: Promise<unknown>[] = [];
    if (state.appearanceIsDirty) {
      pending.push(
        saveAppearance.mutateAsync({config: state.appearance as any}),
      );
    }
    if (state.profileIsDirty) {
      pending.push(saveProfile.mutateAsync(saveProfilePayload()));
    }
    await Promise.all(pending);
  };

  return {
    saveCurrentTab,
    saveAll,
    isSaving: saveAppearance.isPending || saveProfile.isPending,
  };
}

type StoreEditorSave = ReturnType<typeof useStoreEditorSave>;

/**
 * Editor header paired with the unsaved-changes guard. Navigating anywhere
 * outside the editor while a form is dirty (sidebar links, back button,
 * biolink selector, tab close) opens an accessible dialog offering
 * "Save & leave", "Discard changes" or "Stay". Switching editor tabs is not
 * blocked: tab content is kept mounted, so the dirty state survives.
 */
function EditorHeaderWithGuard({baseUrl}: {baseUrl: string}) {
  const profileIsDirty = useBiolinkEditorStore(s => s.profileIsDirty);
  const appearanceIsDirty = useBiolinkEditorStore(s => s.appearanceIsDirty);
  const save = useStoreEditorSave();

  // Ctrl/Cmd+S while the editor is mounted: suppress the browser's save
  // dialog and save the dirty part of the editor (no-op when clean or
  // already saving). Cleanup on unmount restores native behavior (A-16).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (save.isSaving) {
          return;
        }
        save.saveCurrentTab();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  return (
    <>
      <BiolinkEditorHeader save={save} />
      <UnsavedChangesGuard
        isDirty={profileIsDirty || appearanceIsDirty}
        isEditorPath={path => isWithinStoreEditorPath(baseUrl, path)}
        saveAndLeave={save.saveAll}
      />
    </>
  );
}

function BiolinkSelector() {
  const {routeType} = useDatatableRouteType();
  const {storeId} = useRequiredParams(['storeId']);
  const navigate = useNavigate();
  const query = useSuspenseQuery(listCurrentUserStoresOptions());
  const biolinks = query.data.data ?? [];
  const [, setSelectedBiolinkId] = useSelectedStoreId();
  const selectedBiolink = biolinks.find((b: any) => `${b.id}` === storeId)!;
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
            <Button
              variant="outline"
              className="mr-auto max-w-64 justify-between"
            />
          }
        >
          <span className="truncate">{selectedBiolink.name}</span>
          <ChevronDownIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.RadioGroup
            value={storeId}
            onValueChange={value => {
              setSelectedBiolinkId(Number(value));
              navigate(`/${routeType}/stores/${value}`);
            }}
          >
            {biolinks.map((b: any) => (
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
        <Breadcrumb.Link to="/admin/stores">
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
  const {storeId} = useRequiredParams(['storeId']);
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const listQuery = useSuspenseQuery(listCurrentUserStoresOptions());
  const location = useLocation();
  const navigate = useNavigate();
  const {trans} = useTrans();
  const isInsightsTab = location.pathname.endsWith('/insights');
  const baseUrl = `/${routeType}/stores/${storeId}`;

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
        storeId={biolink.id}
      />

      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={trans({message: 'More actions'})}
              className="ml-auto"
            />
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
          <Dropdown.Item
            onClick={() =>
              navigate(isInsightsTab ? baseUrl : `${baseUrl}/insights`)
            }
          >
            {isInsightsTab ? <UserRoundPenIcon /> : <ChartNoAxesCombinedIcon />}
            <Trans message={isInsightsTab ? 'Edit profile' : 'Insights'} />
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

  if (isCreatorProfileBiolink(biolink as any)) {
    return <CreatorProfileEditor />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            <Trans message="Content" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message="Add links and widgets to build your page." />
          </p>
        </div>
        <CreatorProfileUpgrade />
        <div className="flex flex-wrap gap-3">
          <AddNewLinkButton />
          <AddNewWidgetButton />
        </div>
      </div>
      <div className="mt-6">
        {content.length ? (
          <BiolinkItemList />
        ) : (
          <Empty.Root className="rounded-card border border-dashed py-16">
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
    </div>
  );
}

export function BiolinkAboutTab() {
  const biolink = useBiolinkEditorStore(s => s.biolink);

  if (isCreatorProfileBiolink(biolink as any)) {
    return <CreatorProfileEditor tab="about" />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-2">
      <div>
        <h2 className="text-lg font-semibold">
          <Trans message="About" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans message="Add a fuller introduction after converting this page into a creator profile." />
        </p>
      </div>
      <CreatorProfileUpgrade />
    </div>
  );
}

function CreatorProfileUpgrade() {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const convert = useMutation({
    mutationFn: () => convertStoreToCreatorProfile(String(biolink.id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: storesBaseKey});
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
      <Dialog.Trigger render={<Button className="min-w-36" />}>
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
        <Dialog.Trigger render={<Button variant="outline" />}>
          <LayoutGridIcon />
          <Trans message="Add widget" />
        </Dialog.Trigger>
      </SelectWidgetDialog>
    </>
  );
}
