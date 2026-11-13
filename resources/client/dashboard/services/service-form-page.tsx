import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Alert} from '@shadcn/alert/alert';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Spinner} from '@shadcn/spinner/spinner';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  CircleAlertIcon,
  CircleHelpIcon,
  EyeIcon,
  GlobeIcon,
  ImagesIcon,
  LayersIcon,
  MessageSquareQuoteIcon,
  PenLineIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {isUncertainMutationOutcome} from '@app/dashboard/digital-products/request-outcome';
import {parseServiceErrors, serviceSaveErrorMessage} from './service-save-error';
import {
  emptyServiceForm,
  fromServiceResource,
  serviceFormClientErrors,
  toServicePayload,
  type CreatorServiceResource,
  type ServiceFormState,
  type ServiceFormPackage,
} from './service-form-state';
import {ServiceContactChannelsField} from './service-form/service-contact-channels-field';
import {ServiceDescriptionEditor} from './service-form/service-description-editor';
import {ServiceFaqsField} from './service-form/service-faqs-field';
import {ServiceBuyerQuestionsField} from './service-form/service-buyer-questions-field';
import {ServiceFormField} from './service-form/service-form-field';
import {ServiceBuilderSteps, SERVICE_STEP_ORDER, type ServiceBuilderStepId} from './service-form/service-builder-steps';
import {ServiceFormSection, type ServiceFormSectionId} from './service-form/service-form-section';
import {ServiceGalleryField} from './service-form/service-gallery-field';
import {ServicePackagesField} from './service-form/service-packages-field';
import {ServicePreview} from './service-form/service-preview';

type StoreOption = {id: number; name: string};

type StoresResponse = {data?: StoreOption[]};

type CategoryOption = {
  id: number;
  name: string;
  subcategories: {id: number; name: string}[];
};

type CategoriesResponse = {data?: CategoryOption[]};

function stepForSection(section: ServiceFormSectionId): ServiceBuilderStepId {
  if (section === 'basics') return 'details';
  if (section === 'faq' || section === 'buyer-questions' || section === 'contact') return 'settings';
  return section;
}

function sectionForField(field: string): ServiceFormSectionId | null {
  if (field.startsWith('packages')) return 'packages';
  if (field.startsWith('faqs')) return 'faq';
  if (field.startsWith('buyer_questions')) return 'buyer-questions';
  if (field.startsWith('contact_channels')) return 'contact';
  if (
    field.startsWith('gallery') ||
    field === 'cover_file_entry_id' ||
    field === 'video_url' ||
    field === 'live_demo_url'
  ) {
    return 'media';
  }
  if (
    field === 'store_id' ||
    [
      'title',
      'short_description',
      'description',
      'category',
      'service_category_id',
      'service_subcategory_id',
      'skills',
    ].includes(field)
  ) {
    return 'basics';
  }

  return null;
}

export function Component() {
  return (
    <FileUploadProvider>
      <ServiceFormPage />
    </FileUploadProvider>
  );
}

function ServiceFormPage() {
  const {serviceId} = useParams();
  const navigate = useNavigate();
  const {trans} = useTrans();
  const isEditing = !!serviceId;

  const [form, setForm] = useState<ServiceFormState>(() =>
    emptyServiceForm(),
  );
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mutationUncertain = useRef(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState<ServiceBuilderStepId>('details');
  const contentScrollerRef = useRef<HTMLDivElement>(null);
  const pendingStepScrollRef = useRef<ServiceBuilderStepId | null>(null);
  const pendingErrorFocusRef = useRef<string | null>(null);
  const packageDraftCacheRef = useRef<Record<string, ServiceFormPackage>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError(undefined);

    try {
      const storesResponse =
        await apiClient.get('/api/v1/stores?per_page=100');
      const storeOptions =
        (storesResponse.data as StoresResponse).data ?? [];
      setStores(storeOptions);

      const categoriesResponse = await apiClient.get(
        '/api/v1/public/service-categories',
      );
      setCategories(
        (categoriesResponse.data as CategoriesResponse).data ?? [],
      );

      if (serviceId) {
        const serviceResponse = await apiClient.get(
          `/api/v1/services/${serviceId}`,
        );
        setForm(
          fromServiceResource(
            (serviceResponse.data as {data: CreatorServiceResource}).data,
          ),
        );
      } else {
        setForm(current => ({
          ...current,
          store_id: current.store_id || String(storeOptions[0]?.id ?? ''),
        }));
      }
    } catch (reason) {
      setLoadFailed(true);
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to load this service.'}),
      );
    } finally {
      setLoading(false);
    }
  }, [serviceId, trans]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <Key extends keyof ServiceFormState>(
    key: Key,
    value: ServiceFormState[Key],
  ) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => {
      const next = {...current};
      const keyPrefix = `${String(key)}.`;
      for (const field of Object.keys(next)) {
        if (field === key || field.startsWith(keyPrefix)) {
          delete next[field];
        }
      }
      return next;
    });
  };

  const namedPackages = useMemo(
    () => form.packages.filter(item => item.name.trim()),
    [form.packages],
  );

  const selectedCategory = categories.find(
    category => category.id === form.service_category_id,
  );
  const selectedSubcategory = selectedCategory?.subcategories.find(
    subcategory => subcategory.id === form.service_subcategory_id,
  );

  const requiredSections = useMemo(
    () => ({
      basics: !!form.title.trim(),
      media: !!form.cover_url,
      packages: namedPackages.length > 0,
    }),
    [form.title, form.short_description, form.cover_url, namedPackages],
  );

  const completedSteps: Record<ServiceBuilderStepId, boolean> = {
    details: requiredSections.basics,
    media: requiredSections.media || form.gallery.length > 0 || !!form.video_url.trim() || !!form.live_demo_url.trim(),
    packages: requiredSections.packages,
    settings: form.faqs.some(faq => !!faq.question.trim() || !!faq.answer.trim())
      || form.buyer_questions.some(question => !!question.trim())
      || form.contact_channels.some(channel => !!channel.value.trim()),
  };

  const activeStepIndex = SERVICE_STEP_ORDER.indexOf(activeStep);
  const previousStep = SERVICE_STEP_ORDER[activeStepIndex - 1];
  const nextStep = SERVICE_STEP_ORDER[activeStepIndex + 1];

  const changeStep = useCallback((step: ServiceBuilderStepId) => {
    if (step === activeStep) return;
    // Schedule focus/scroll for the committed new panel, not the old DOM.
    pendingStepScrollRef.current = step;
    setActiveStep(step);
    setAnnouncement(trans({
      message: 'Step :current of :total',
      values: {current: SERVICE_STEP_ORDER.indexOf(step) + 1, total: SERVICE_STEP_ORDER.length},
    }));
  }, [activeStep, trans]);

  useLayoutEffect(() => {
    const resetStageScroll = () => {
      if (contentScrollerRef.current) contentScrollerRef.current.scrollTop = 0;
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    };

    const pendingErrorField = pendingErrorFocusRef.current;
    if (pendingErrorField) {
      const section = sectionForField(pendingErrorField);
      const targetStep = section ? stepForSection(section) : null;

      // Wait until React has committed the stage that owns the invalid field.
      if (!targetStep || targetStep === activeStep) {
        pendingErrorFocusRef.current = null;
        resetStageScroll();
        requestAnimationFrame(() => {
          document.getElementById(pendingErrorField)?.focus();
        });
      }
      return;
    }

    if (pendingStepScrollRef.current !== activeStep) return;
    pendingStepScrollRef.current = null;

    // SectionContent is the canonical scroll owner for this dashboard screen.
    // A stage change can shorten the panel and leave its former scroll offset.
    // Reset that element directly. scrollIntoView also scrolls the window and
    // the dashboard shell, which pushes the stepper above the visible pane.
    resetStageScroll();

    // Normal navigation keeps keyboard focus with the selected step. Validation
    // recovery uses the branch above instead, so the invalid field owns focus.
    const navigation = document.getElementById('service-builder-steps');
    navigation?.querySelector<HTMLButtonElement>('button[aria-current="step"]')
      ?.focus({preventScroll: true});
  }, [activeStep, fieldErrors]);

  const sectionError = (id: ServiceFormSectionId) =>
    Object.keys(fieldErrors).some(
      field => sectionForField(field) === id,
    );

  const focusFirstError = (errors: Record<string, string>) => {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;

    pendingErrorFocusRef.current = firstField;
    const section = sectionForField(firstField);
    if (!section) {
      requestAnimationFrame(() => {
        pendingErrorFocusRef.current = null;
        document.getElementById(firstField)?.focus();
      });
      return;
    }

    const targetStep = stepForSection(section);
    // Always set the derived stage. save() deliberately does not depend on
    // activeStep, so comparing against its closure can use the stage from the
    // last form edit rather than the stage currently visible at submit time.
    setActiveStep(targetStep);
    setAnnouncement(trans({
      message: 'Step :current of :total',
      values: {
        current: SERVICE_STEP_ORDER.indexOf(targetStep) + 1,
        total: SERVICE_STEP_ORDER.length,
      },
    }));
  };

  const save = useCallback(
    async (statusOverride?: 'draft' | 'published') => {
      // Keyboard shortcuts can fire while a save is in flight. Never create a
      // second service merely because the first response is still pending.
      if (savingRef.current || mutationUncertain.current) return;
      if (statusOverride === 'published' && !form.title.trim()) {
        const errors = {title: trans({message: 'A title is required.'})};
        setFieldErrors(errors);
        focusFirstError(errors);
        return;
      }

      const clientErrors = serviceFormClientErrors(form);
      if (Object.keys(clientErrors).length) {
        setError(undefined);
        setFieldErrors(clientErrors);
        focusFirstError(clientErrors);
        return;
      }

      savingRef.current = true;
      setSaving(true);
      setError(undefined);
      setFieldErrors({});

      const status = statusOverride ?? form.status;
      const payload = toServicePayload({...form, status});

      try {
        if (isEditing) {
          const response = await apiClient.put(
            `/api/v1/services/${serviceId}`,
            payload,
          );
          setForm(
            fromServiceResource(
              (response.data as {data: CreatorServiceResource}).data,
            ),
          );
        } else {
          const response = await apiClient.post('/api/v1/services', payload);
          const created = (response.data as {data?: CreatorServiceResource})?.data;
          if (!created || !Number.isSafeInteger(created.id) || created.id <= 0) {
            // 2xx without a usable record ID is not proof that creation failed.
            throw new Error('Service create response missing an ID');
          }
        }

        setAnnouncement(
          status === 'published'
            ? trans({message: 'Service published'})
            : trans({message: 'Service saved'}),
        );
        toast.positive(
          status === 'published'
            ? message('Service published')
            : message('Service saved'),
        );

        if (!isEditing) {
          navigate('/dashboard/services');
        }
      } catch (reason) {
        if (!isEditing && isUncertainMutationOutcome(reason)) {
          // A network timeout or 5xx can occur after a successful insert.
          // Do not invite a second POST until the creator checks My Services.
          mutationUncertain.current = true;
          setCreationUncertain(true);
          setAnnouncement(trans({message: 'Service creation outcome unconfirmed'}));
          setError(undefined);
          setFieldErrors({});
          return;
        }
        const parsed = parseServiceErrors(reason);
        setError(serviceSaveErrorMessage(reason));
        setFieldErrors(parsed.fieldErrors);
        focusFirstError(parsed.fieldErrors);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, isEditing, serviceId, trans],
  );

  // Cmd/Ctrl+S saves the draft from anywhere on the page, matching the
  // product editor; Alt+Arrow moves between sections without leaving the keys.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        void save('draft');
        return;
      }

      if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        // Let editable controls and selects retain their native Alt shortcuts.
        if (event.target instanceof HTMLElement
          && event.target.closest('input, textarea, select, [contenteditable], [role="combobox"]')) {
          return;
        }
        event.preventDefault();
        const index = SERVICE_STEP_ORDER.indexOf(activeStep);
        const nextIndex = event.key === 'ArrowDown'
          ? Math.min(SERVICE_STEP_ORDER.length - 1, index + 1)
          : Math.max(0, index - 1);
        changeStep(SERVICE_STEP_ORDER[nextIndex]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, changeStep, activeStep]);

  const remove = async () => {
    if (!serviceId) return;
    setDeleting(true);
    setError(undefined);

    try {
      await apiClient.delete(`/api/v1/services/${serviceId}`);
      toast.positive(message('Service deleted'));
      navigate('/dashboard/services');
    } catch (reason) {
      setError(serviceSaveErrorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  const renderHeader = (children: React.ReactNode) => (
    <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2 max-sm:h-14 max-sm:flex-nowrap max-sm:gap-1 max-sm:px-2 max-sm:py-0">
      <DashboardLayout.SidebarToggle />
      <h1 className="sr-only">
        {isEditing ? <Trans message="Edit service" /> : <Trans message="Create a service" />}
      </h1>
      <Breadcrumb.Root className="me-auto w-auto min-w-0 text-xl max-sm:me-0 max-sm:w-0 max-sm:flex-1 max-sm:overflow-hidden max-sm:text-sm">
        <Breadcrumb.Item>
          <Breadcrumb.Link to="/dashboard/services">
            <Trans message="My Services" />
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item className="max-sm:min-w-0">
          <Breadcrumb.Page className="max-sm:block max-sm:min-w-0 max-sm:truncate">
            {isEditing ? <Trans message="Edit service" /> : <Trans message="Create a service" />}
          </Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.Root>
      {children}
    </DashboardLayout.SectionHeader>
  );

  const renderActions = () => (
    <div className="ms-auto flex max-w-full shrink-0 items-center gap-2 max-sm:ms-0 max-sm:gap-1">
      <Button
        variant="outline"
        size="sm"
        className="max-lg:size-11 max-lg:px-0"
        aria-label={trans({message: 'Preview'})}
        onClick={() => setPreviewOpen(true)}
      >
        <EyeIcon className="size-4" />
        <span className="max-lg:hidden">
          <Trans message="Preview" />
        </span>
      </Button>
      {isEditing && (
        <Button
          variant="ghost"
          size="sm"
          className="max-lg:size-11 max-lg:px-0"
          disabled={saving || deleting}
          aria-label={trans({message: 'Delete'})}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon className="size-4" />
          <span className="max-lg:hidden">
            <Trans message="Delete" />
          </span>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-lg:size-11 max-lg:px-0"
        disabled={saving || creationUncertain}
        aria-label={trans({message: 'Save draft'})}
        onClick={() => void save('draft')}
      >
        <SaveIcon className="size-4" />
        <span className="max-lg:hidden">
          <Trans message="Save draft" />
        </span>
      </Button>
      <Button
        size="sm"
        className="max-lg:size-11 max-lg:px-0"
        disabled={saving || creationUncertain}
        aria-label={trans({message: 'Publish service'})}
        onClick={() => void save('published')}
      >
        {saving ? (
          <Spinner className="size-4" />
        ) : (
          <SendIcon className="size-4" />
        )}
        <span className="max-lg:hidden">
          {form.status === 'published' ? (
            <Trans message="Save changes" />
          ) : (
            <Trans message="Publish service" />
          )}
        </span>
      </Button>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        {renderHeader(null)}
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="w-full max-w-6xl py-4 sm:py-5" role="status" aria-busy="true">
            <span className="sr-only"><Trans message="Loading service editor" /></span>
            <div
              aria-hidden="true"
              className="grid min-w-0 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:gap-6"
            >
              <div className="min-w-0 space-y-4 border-b pb-4 xl:border-b-0 xl:border-e xl:pe-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-28 rounded-input" />
                  <Skeleton className="h-4 w-16 rounded-input" />
                </div>
                <div className="grid grid-cols-4 gap-2 xl:grid-cols-1 xl:gap-3">
                  {SERVICE_STEP_ORDER.map(step => (
                    <div key={step} className="flex min-w-0 flex-col items-center gap-2 py-2 xl:flex-row xl:gap-3">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-4 w-full max-w-16 rounded-input xl:max-w-28" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0 space-y-4">
                <div className="min-w-0 rounded-card border bg-card p-4 sm:p-5">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <Skeleton className="h-5 w-32 rounded-input" />
                    <Skeleton className="size-8 rounded-full" />
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-input" />
                      <Skeleton className="h-9 w-full rounded-input" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-36 rounded-input" />
                      <Skeleton className="h-9 w-full rounded-input" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28 rounded-input" />
                      <Skeleton className="h-32 w-full rounded-input" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <Skeleton className="h-9 w-28 rounded-button" />
                  <Skeleton className="h-9 w-24 rounded-button" />
                </div>
              </div>
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (loadFailed) {
    return (
      <DashboardLayout.MainSection>
        {renderHeader(null)}
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="w-full max-w-3xl py-8">
            <Alert.Root variant="destructive" fillStyle="subtleFill" role="alert">
              <CircleAlertIcon />
              <Alert.Title>
                <Trans message="Unable to load service" />
              </Alert.Title>
              <Alert.Description>{error}</Alert.Description>
              <Alert.Action>
                <Button size="sm" onClick={() => void load()}>
                  <Trans message="Try again" />
                </Button>
              </Alert.Action>
            </Alert.Root>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (!stores.length) {
    return (
      <DashboardLayout.MainSection>
        {renderHeader(null)}
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="w-full max-w-3xl py-8">
            <Alert.Root>
              <CircleAlertIcon />
              <Alert.Title>
                <Trans message="Create a storefront first" />
              </Alert.Title>
              <Alert.Description>
                <Trans message="Services are published on a storefront. Create one before adding your first service." />
              </Alert.Description>
              <Alert.Action>
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/dashboard/stores" />}
                >
                  <Trans message="Go to My Store" />
                </Button>
              </Alert.Action>
            </Alert.Root>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  return (
    <DashboardLayout.MainSection>
      {renderHeader(renderActions())}

      <DashboardLayout.SectionContent
        ref={contentScrollerRef}
        className="overflow-y-auto [overflow-anchor:none]"
      >
        <div className="w-full max-w-6xl py-4 sm:py-5">
          {creationUncertain && (
            <Alert.Root role="alert" variant="warning" fillStyle="subtleFill" className="mb-5">
              <CircleAlertIcon />
              <Alert.Description className="flex flex-col items-start gap-2">
                <Trans message="We could not confirm whether the service was created. Check My Services before creating it again." />
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/dashboard/services" />}
                >
                  <Trans message="Check My Services" />
                </Button>
              </Alert.Description>
            </Alert.Root>
          )}
          {error && (
            <Alert.Root variant="destructive" fillStyle="subtleFill" className="mb-5">
              <CircleAlertIcon />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          <div className="grid min-w-0 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:gap-6">
            <ServiceBuilderSteps
              active={activeStep}
              onSelect={changeStep}
              completed={completedSteps}
            />

            <div className="min-w-0 space-y-4 sm:space-y-5">
              {/* Keep the rich-text editor mounted between steps. Unmounting and
                  remounting it can restore editor focus/selection after the
                  navigator changes, moving both document and panel scroll. */}
              <div hidden={activeStep !== 'details'} inert={activeStep !== 'details'}>
                <ServiceFormSection
                  id="basics"
                  icon={PenLineIcon}
                  title={trans({message: 'Basics'})}
                  description={trans({
                    message: 'Name the offer and describe it in one clear line.',
                  })}
                  isComplete={requiredSections.basics}
                  hasError={sectionError('basics')}
                >
                  <div className="flex flex-col gap-4">
                    <ServiceFormField
                      name="store_id"
                      label={trans({message: 'Storefront'})}
                      description={trans({
                        message: 'Where this service is published.',
                      })}
                      error={fieldErrors.store_id}
                    >
                      <Select.Root
                        value={form.store_id}
                        onValueChange={value =>
                          update('store_id', String(value))
                        }
                      >
                        <Select.Trigger id="store_id" className="w-full">
                          <Select.Value>
                            {stores.find(
                              store => String(store.id) === form.store_id,
                            )?.name ?? trans({message: 'Select a storefront'})}
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          {stores.map(store => (
                            <Select.Item
                              key={store.id}
                              value={String(store.id)}
                            >
                              {store.name}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </ServiceFormField>

                    <ServiceFormField
                      name="title"
                      label={trans({message: 'Title'})}
                      required
                      description={trans({
                        message: 'A clear name, for example Logo design.',
                      })}
                      counter={{current: form.title.length, max: 160}}
                      error={fieldErrors.title}
                    >
                      <Input
                        id="title"
                        value={form.title}
                        maxLength={160}
                        onChange={event =>
                          update('title', event.target.value)
                        }
                        placeholder={trans({message: 'Logo design'})}
                        aria-invalid={!!fieldErrors.title}
                      />
                    </ServiceFormField>

                    <ServiceFormField
                      name="short_description"
                      label={trans({message: 'Short description'})}
                      description={trans({
                        message:
                          'Shown on the service card and in search results. One or two lines.',
                      })}
                      counter={{
                        current: form.short_description.length,
                        max: 240,
                      }}
                      error={fieldErrors.short_description}
                    >
                      <Input
                        id="short_description"
                        value={form.short_description}
                        maxLength={240}
                        onChange={event =>
                          update('short_description', event.target.value)
                        }
                        placeholder={trans({
                          message:
                            'A custom logo and identity built for your brand.',
                        })}
                        aria-invalid={!!fieldErrors.short_description}
                      />
                    </ServiceFormField>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <ServiceFormField
                        name="service_category_id"
                        label={trans({message: 'Category'})}
                        error={
                          fieldErrors.service_category_id ??
                          fieldErrors.category
                        }
                      >
                        <Select.Root
                          value={
                            form.service_category_id
                              ? String(form.service_category_id)
                              : null
                          }
                          onValueChange={value => {
                            const category = categories.find(
                              item => String(item.id) === value,
                            );
                            update(
                              'service_category_id',
                              category?.id ?? null,
                            );
                            update('category', category?.name ?? '');
                            update('service_subcategory_id', null);
                          }}
                        >
                          <Select.Trigger
                            id="service_category_id"
                            className="w-full"
                          >
                            <Select.Value
                              placeholder={
                                <Trans message="Select a category" />
                              }
                            >
                              {selectedCategory?.name}
                            </Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            {categories.map(category => (
                              <Select.Item
                                key={category.id}
                                value={String(category.id)}
                              >
                                {category.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </ServiceFormField>

                      <ServiceFormField
                        name="service_subcategory_id"
                        label={trans({message: 'Subcategory'})}
                        error={fieldErrors.service_subcategory_id}
                      >
                        <Select.Root
                          value={
                            form.service_subcategory_id
                              ? String(form.service_subcategory_id)
                              : null
                          }
                          onValueChange={value =>
                            update(
                              'service_subcategory_id',
                              value ? Number(value) : null,
                            )
                          }
                        >
                          <Select.Trigger
                            id="service_subcategory_id"
                            className="w-full"
                            disabled={!selectedCategory}
                          >
                            <Select.Value
                              placeholder={
                                <Trans message="Select a subcategory" />
                              }
                            >
                              {selectedSubcategory?.name}
                            </Select.Value>
                          </Select.Trigger>
                          <Select.Content>
                            {selectedCategory?.subcategories.map(
                              subcategory => (
                                <Select.Item
                                  key={subcategory.id}
                                  value={String(subcategory.id)}
                                >
                                  {subcategory.name}
                                </Select.Item>
                              ),
                            )}
                          </Select.Content>
                        </Select.Root>
                      </ServiceFormField>
                    </div>

                    <ServiceFormField
                      name="skills"
                      label={trans({message: 'Skills'})}
                      description={trans({
                        message: 'Separate skills with commas.',
                      })}
                      error={fieldErrors.skills}
                    >
                      <Input
                        id="skills"
                        value={form.skills}
                        onChange={event =>
                          update('skills', event.target.value)
                        }
                        placeholder={trans({
                          message: 'Logo, Branding',
                        })}
                        aria-invalid={!!fieldErrors.skills}
                      />
                    </ServiceFormField>

                    <ServiceFormField
                      name="description"
                      label={trans({message: 'Description'})}
                      description={trans({
                        message:
                          'The full story of the service: your process, what you need from the customer, and what they get.',
                      })}
                      error={fieldErrors.description}
                    >
                      <div id="description">
                        <ServiceDescriptionEditor
                          value={form.description}
                          onChange={value => update('description', value)}
                        />
                      </div>
                    </ServiceFormField>
                  </div>
                </ServiceFormSection>
              </div>
              {activeStep === 'media' && (
                <ServiceFormSection
                  id="media"
                  icon={ImagesIcon}
                  title={trans({message: 'Media and links'})}
                  description={trans({
                    message: 'Show examples that help customers understand your work.',
                  })}
                  isComplete={requiredSections.media}
                  optional
                  hasError={sectionError('media')}
                >
                  <div className="flex flex-col gap-5">
                    <ServiceGalleryField
                      coverUrl={form.cover_url}
                      gallery={form.gallery}
                      coverError={fieldErrors.cover_file_entry_id}
                      galleryError={fieldErrors.gallery}
                      onCoverChange={(url, entryId) => {
                        update('cover_url', url);
                        update('cover_file_entry_id', entryId);
                      }}
                      onGalleryChange={gallery => update('gallery', gallery)}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <ServiceFormField
                        name="video_url"
                        label={trans({message: 'Video preview'})}
                        description={trans({
                          message: 'A YouTube or Vimeo link.',
                        })}
                        error={fieldErrors.video_url}
                      >
                        <Input
                          id="video_url"
                          value={form.video_url}
                          maxLength={500}
                          onChange={event =>
                            update('video_url', event.target.value)
                          }
                          placeholder="https://youtube.com/watch?v=…"
                          aria-invalid={!!fieldErrors.video_url}
                        />
                      </ServiceFormField>

                      <ServiceFormField
                        name="live_demo_url"
                        label={trans({message: 'Live demo'})}
                        description={trans({
                          message: 'A link to work you can show.',
                        })}
                        error={fieldErrors.live_demo_url}
                      >
                        <Input
                          id="live_demo_url"
                          value={form.live_demo_url}
                          maxLength={500}
                          onChange={event =>
                            update('live_demo_url', event.target.value)
                          }
                          placeholder="https://example.com/work"
                          aria-invalid={!!fieldErrors.live_demo_url}
                        />
                      </ServiceFormField>
                    </div>
                  </div>
                </ServiceFormSection>
              )}
              {activeStep === 'packages' && (
                <ServiceFormSection
                  id="packages"
                  icon={LayersIcon}
                  title={trans({message: 'Packages'})}
                  description={trans({
                    message: 'Offer clear packages, or let customers request a quote.',
                  })}
                  isComplete={requiredSections.packages}
                  optional
                  count={namedPackages.length}
                  hasError={sectionError('packages')}
                >
                  <ServicePackagesField
                    packages={form.packages}
                    errors={fieldErrors}
                    draftCache={packageDraftCacheRef}
                    onChange={packages => update('packages', packages)}
                  />
                </ServiceFormSection>
              )}
              {activeStep === 'settings' && (
                <div className="space-y-4 sm:space-y-5">
                  <ServiceFormSection
                  id="faq"
                  icon={MessageSquareQuoteIcon}
                  title={trans({message: 'FAQ'})}
                  description={trans({
                    message:
                      'Answer what you would otherwise answer by DM.',
                  })}
                  optional
                  count={form.faqs.length}
                  hasError={sectionError('faq')}
                >
                  <ServiceFaqsField
                    faqs={form.faqs}
                    errors={fieldErrors}
                    onChange={faqs => update('faqs', faqs)}
                  />
                </ServiceFormSection>

                <ServiceFormSection
                  id="buyer-questions"
                  icon={MessageSquareQuoteIcon}
                  title={trans({message: 'Questions for buyers'})}
                  description={trans({message: 'Optional. Ask up to three short questions with each service inquiry.'})}
                  optional
                  count={form.buyer_questions.length}
                  hasError={sectionError('buyer-questions')}
                >
                  <ServiceBuyerQuestionsField
                    questions={form.buyer_questions}
                    errors={fieldErrors}
                    onChange={questions => update('buyer_questions', questions)}
                  />
                </ServiceFormSection>

                <ServiceFormSection
                  id="contact"
                  icon={GlobeIcon}
                  title={trans({message: 'Contact buttons'})}
                  description={trans({
                    message:
                      'Let people reach you without sending a form.',
                  })}
                  optional
                  count={form.contact_channels.length}
                  hasError={sectionError('contact')}
                >
                  <ServiceContactChannelsField
                    channels={form.contact_channels}
                    errors={fieldErrors}
                    onChange={channels =>
                      update('contact_channels', channels)
                    }
                  />
                  </ServiceFormSection>
                  <div className="flex items-start gap-2 rounded-card border border-note bg-note px-4 py-3 text-sm text-muted-foreground">
                    <CircleHelpIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <Trans message="Customers request a quote and agree contracts directly with you. Linket never receives service payments." />
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:pt-5">
                {previousStep ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => changeStep(previousStep)}
                  >
                    <ChevronLeftIcon className="size-4" aria-hidden="true" />
                    <Trans message="Previous step" />
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <Trans message="Your changes are saved when you select Save draft or Publish service." />
                  </p>
                )}
                {nextStep ? (
                  <Button
                    type="button"
                    size="sm"
                    className="ms-auto min-h-11"
                    onClick={() => changeStep(nextStep)}
                  >
                    <Trans message="Continue" />
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ms-auto min-h-11"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <EyeIcon className="size-4" aria-hidden="true" />
                    <Trans message="Preview before publishing" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout.SectionContent>

      <span className="sr-only" role="status">
        {announcement}
      </span>

      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-2xl">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Customer preview" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Preview only. Contact and inquiry actions are unavailable here." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="min-h-0 max-h-[70dvh] overflow-y-auto">
              <ServicePreview state={form} />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseButton render={<Button variant="outline" />}>
                <Trans message="Close" />
              </Dialog.CloseButton>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Media className="bg-destructive/10 text-destructive">
                <Trash2Icon />
              </AlertDialog.Media>
              <AlertDialog.Title>
                <Trans message="Delete this service?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="The service and its public page will be removed. Inquiries already received are kept." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={deleting}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={deleting}
                onClick={() => void remove()}
              >
                <Trans message="Delete service" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </DashboardLayout.MainSection>
  );
}