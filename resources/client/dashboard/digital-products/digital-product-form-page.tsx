import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {apiClient} from '@common/http/query-client';
import {productSaveErrorMessage} from './product-save-error';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {Accordion} from '@shadcn/accordion/accordion';
import {Dialog} from '@shadcn/dialog/dialog';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@shadcn/attachment/attachment';
import {Alert} from '@shadcn/alert/alert';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {
  BookIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileIcon,
  FileTextIcon,
  EyeIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  Link2Icon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';
import {parseWizardPrefill, firstInvalidFieldId, parseEtbToCents, priceForBillingMode, resolveCreateType, type BillingMode} from './product-create-flow';
import {DigitalProductEditor} from './digital-product-editor';
import {BillingModePicker} from './billing-mode-picker';
import {
  ProductCreationProvider,
  sampleRequestPayload,
  useProductCreation,
} from './product-creation-context';
import type {FileEntry} from './product-creation-context';
import {
  ProductSampleFields,
  sampleSectionKind,
} from './product-sample-fields';
import {ProductFormField} from './product-form-field';
import {ProductFormProgress} from './product-form-progress';
import {
  ProductFormSection,
  type ProductSetupSection,
} from './product-form-section';
import {ProductPreview, ProductStatus} from './product-preview';
import type {ProductType} from './product-type-picker';

type Biolink = {id: number; name: string; short_url?: string};

type Product = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  cover?: {id: number; url: string} | null;
  cover_file_entry_id?: number | null;
  files?: FileEntry[];
  samples?: Array<{
    id: number;
    file_entry_id: number;
    title?: string | null;
    kind: 'audio' | 'pdf';
    position: number;
    duration_ms?: number | null;
    name?: string | null;
    file_size?: number | null;
    extension?: string | null;
  }>;
  biolink_ids?: number[];
  status: string;
  type?: string;
};

type FieldErrors = Record<string, string>;

const PRODUCT_TYPE_CONFIG: Record<
  ProductType,
  {label: string; icon: typeof DownloadIcon}
> = {
  digital: {label: 'Digital product', icon: DownloadIcon},
  ebook: {label: 'E-book', icon: BookIcon},
  audio: {label: 'Audio', icon: HeadphonesIcon},
  course: {label: 'Course', icon: GraduationCapIcon},
};

const SECTION_META: Record<
  ProductSetupSection,
  {label: string; icon: typeof FileTextIcon; description: string}
> = {
  details: {
    label: 'Product details',
    icon: FileTextIcon,
    description:
      'Add the basic information customers will see before purchasing.',
  },
  files: {
    label: 'Product files',
    icon: FileIcon,
    description: 'Upload the files customers will receive after purchase.',
  },
  'bio-pages': {
    label: 'Storefront placement',
    icon: Link2Icon,
    description: 'Optional. Show this product on one or more Storefronts.',
  },
};

export function Component() {
  const [searchParams] = useSearchParams();
  const {productId, creationType} = useParams();
  const prefill = parseWizardPrefill(searchParams);
  if (creationType) prefill.type = resolveCreateType(creationType);
  if (prefill.billing === 'free') prefill.price = '0';
  return (
    <FileUploadProvider>
      <ProductCreationProvider
        key={productId ?? `new:${creationType ?? 'legacy'}`}
        prefill={prefill}
        productId={productId ? Number(productId) : null}
      >
        <DigitalProductForm />
      </ProductCreationProvider>
    </FileUploadProvider>
  );
}

function DigitalProductForm() {
  const {productId} = useParams();
  const navigate = useNavigate();
  const {trans} = useTrans();
  const {state, actions, dirty, billing} = useProductCreation();
  const title = state.title;
  const description = state.description;
  const price = state.price;
  const coverUrl = state.coverUrl;
  const coverFileId = state.coverFileId;
  const files = state.files;
  const samples = state.samples;
  const biolinkIds = state.biolinkIds;
  const productType = state.productType as ProductType | null;
  const [product, setProduct] = useState<Product | null>(null);
  const [billingChoice, setBillingChoice] = useState<BillingMode | null>(billing);
  const effectiveBilling: BillingMode | null =
    billingChoice ?? (product ? (product.price_cents === 0 ? 'free' : 'paid') : null);
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [convertToEtb, setConvertToEtb] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openSection, setOpenSection] = useState<ProductSetupSection | null>(
    'details',
  );

  // Auto-save only runs for drafts: the approved→draft revert is promised to
  // the user as an explicit Save action (the warning banner below), so
  // auto-save must not perform it (Review Focus #1). `product` is null while
  // the GET is in flight, which also keeps auto-save off during load.
  useEffect(() => {
    if (dirty && product?.status === 'draft') actions.autoSave();
  }, [dirty, actions, product?.status]);

  const validateField = useCallback(
    (field: string, value: string) => {
      if (field === 'title' && !value.trim()) {
        setFieldErrors(current => ({...current, title: 'Title is required'}));
      } else if (field === 'title') {
        setFieldErrors(current => {
          const next = {...current};
          delete next.title;
          return next;
        });
      }
      if (field === 'price') {
        const cents = Math.round(Number(value) * 100);
        if (!Number.isFinite(cents) || cents < 0) {
          setFieldErrors(current => ({...current, price_cents: 'Invalid price'}));
        } else {
          setFieldErrors(current => {
            const next = {...current};
            delete next.price_cents;
            return next;
          });
        }
      }
      if (field === 'description' && value.length > 5000) {
        setFieldErrors(current => ({...current, description: 'Description too long'}));
      } else if (field === 'description') {
        setFieldErrors(current => {
          const next = {...current};
          delete next.description;
          return next;
        });
      }
    },
    [],
  );

  const typeConfig = productType ? PRODUCT_TYPE_CONFIG[productType] : null;
  // Creator-facing file formats come from the server capability
  // (App\Storefront\ProductFileFormats via bootstrap data) — never hardcoded.
  const effectiveFileType = (product?.type ?? productType ?? 'digital') as
    | 'digital'
    | 'ebook'
    | 'audio'
    | 'course';
  const fileCapability =
    getBootstrapData()?.product_file_formats?.[effectiveFileType];
  // Fallback for stale bootstrap payloads: the server-provided upload MIME
  // list for the same upload type. Also server data, never hardcoded.
  const fileAccept =
    fileCapability?.accept ??
    getBootstrapData()?.uploading_types?.digitalProductFiles?.accept?.join(
      ',',
    );
  const fileHint = fileCapability?.hint;
  const pageTitle = product
    ? `Edit ${PRODUCT_TYPE_CONFIG[effectiveFileType].label.toLowerCase()}`
    : typeConfig
      ? `Create ${typeConfig.label}`
      : 'Create digital product';

  // The product must be loaded exactly once per productId. `actions` is
  // rebuilt by the creation-context memo on every state change, so listing it
  // as a dependency re-fetched the product on every render and re-hydrated the
  // form, wiping typed input within one round trip (the unbounded
  // hydrate/refetch loop). Read the latest actions through a ref instead, so
  // the effect only tracks the route values that actually identify the load.
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    // P2 (T2 review): this effect re-runs when the route's productId changes
    // (/items/1/edit → /items/2/edit). Without cancellation, product 1's
    // response can resolve AFTER product 2's and overwrite the form (and the
    // `product` record Save PUTs against). Only the latest request's response
    // may apply; the cleanup cancels the previous run.
    let cancelled = false;
    void (async () => {
      try {
        if (productId) {
          const response = await apiClient.get(
            `/api/v1/items/${productId}`,
          );
          if (cancelled) return;
          const item = response.data.data as Product;
          if (item.type === 'course') {
            navigate(
              `/dashboard/items/${item.id}/course?notice=moved-to-builder`,
              {
                replace: true,
              },
            );
            return;
          }
          setProduct(item);
          const coverId = item.cover_file_entry_id ?? item.cover?.id ?? null;
          actionsRef.current.hydrate({
            title: item.title,
            description: item.description ?? '',
            price: (item.price_cents / 100).toFixed(2),
            coverUrl: item.cover?.url ?? '',
            coverFileId: coverId,
            files: item.files ?? [],
            samples: (item.samples ?? []).map(sample => ({
              fileEntryId: sample.file_entry_id,
              name: sample.name ?? sample.title ?? 'Preview',
              fileSize: sample.file_size ?? undefined,
              extension: sample.extension ?? undefined,
              title: sample.title ?? '',
              durationMs: sample.duration_ms ?? null,
            })),
            biolinkIds: item.biolink_ids ?? [],
            productType: (item.type ?? 'digital') as ProductType,
          });
        }

        try {
          const pageResponse = await apiClient.get(
            '/api/v1/biolinks?fields_preset=minimal',
          );
          if (cancelled) return;
          const payload = pageResponse.data;
          setBiolinks(payload.data ?? []);
        } catch {
          // Storefront placement is optional, so a failed list request is non-fatal.
        }
      } catch (reason) {
        if (cancelled) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load this digital product.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, productId]);

  const save = useCallback(
    async (submitAfterSave = false) => {
      if (productId && (!product || String(product.id) !== productId)) return;
      const priceCents = effectiveBilling === 'free' ? 0 : Math.round(Number(price) * 100);
      const effectiveType = product?.type ?? productType ?? 'digital';
      const isCourse = effectiveType === 'course';

      if (
        !title.trim() ||
        !effectiveBilling ||
        !Number.isFinite(priceCents) ||
        priceCents < 0 ||
        (effectiveBilling === 'paid' && priceCents <= 0) ||
        (!isCourse && !files.length)
      ) {
        setOpenSection(
          !title.trim() || !effectiveBilling || !Number.isFinite(priceCents) || priceCents < 0 || (effectiveBilling === 'paid' && priceCents <= 0)
            ? 'details'
            : 'files',
        );
        setError(
          !effectiveBilling
            ? 'Choose Free access or Paid before saving.'
            : effectiveBilling === 'paid' && priceCents <= 0
              ? 'Enter an amount greater than ETB 0.'
              : isCourse
                ? 'Add a title and a valid price.'
                : 'Add a title, a price of ETB 0 or more, and one downloadable file.',
        );
        return;
      }
      if (
        product &&
        product.currency.toLowerCase() !== 'etb' &&
        !convertToEtb
      ) {
        setOpenSection('details');
        setError(
          'Enter the correct ETB price and confirm the currency conversion before saving this product.',
        );
        return;
      }

      setSaving(true);
      setError(undefined);
      setFieldErrors({});
      let saved: Product | undefined;

      try {
        const body: Record<string, unknown> = {
          title: title.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          currency: 'etb',
          cover_file_entry_id: coverFileId,
          file_ids: files.map(file => file.id),
          ...sampleRequestPayload(samples),
          biolink_ids: biolinkIds,
          type: effectiveType,
        };
        // For courses, file_ids is optional — send empty array as-is, backend allows it
        const response = product
          ? await apiClient.put(`/api/v1/items/${product.id}`, body)
          : await apiClient.post('/api/v1/items', body);
        saved = response.data.data as Product;
        setProduct(saved);

        if (submitAfterSave) {
          setSubmitting(true);
          await apiClient.post(`/api/v1/items/${saved.id}/submit`);
        }

        if (isCourse || saved.type === 'course') {
          navigate(`/dashboard/items/${saved.id}/course`, {
            replace: true,
          });
        } else {
          navigate(`/dashboard/items/${saved.id}/edit`, {replace: true});
        }
        if (submitAfterSave) navigate('/dashboard/items');
      } catch (reason) {
        const validationErrors = getValidationErrors(reason);
        if (Object.keys(validationErrors).length) {
          setFieldErrors(validationErrors);
          setOpenSection(
            validationErrors.sample_file_ids || validationErrors.sample_titles
              ? 'previews'
              : validationErrors.file_ids
                ? 'files'
                : 'details',
          );
          const focusId = firstInvalidFieldId(validationErrors);
          if (focusId) {
            requestAnimationFrame(() => {
              document.getElementById(focusId)?.focus({preventScroll: false});
            });
          }
        } else {
          setError(productSaveErrorMessage(reason, Boolean(saved && submitAfterSave)));
        }
      } finally {
        setSaving(false);
        setSubmitting(false);
      }
    },
    [
      biolinkIds,
      convertToEtb,
      coverFileId,
      description,
      files,
      samples,
      navigate,
      effectiveBilling,
      price,
      product,
      productId,
      productType,
      title,
    ],
  );

  const previewKind = sampleSectionKind(effectiveFileType);
  const sectionOrder = useMemo<ProductSetupSection[]>(
    () => [
      'details',
      'files',
      ...(previewKind ? ['previews'] : []),
      'bio-pages',
    ],
    [previewKind],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void save(false);
      }
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        setOpenSection(current => {
          const idx = sectionOrder.indexOf(current ?? 'details');
          return sectionOrder[Math.min(idx + 1, sectionOrder.length - 1)];
        });
      }
      if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        setOpenSection(current => {
          const idx = sectionOrder.indexOf(current ?? 'details');
          return sectionOrder[Math.max(idx - 1, 0)];
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save, sectionOrder]);

  const remove = async (): Promise<boolean> => {
    if (!product) return false;

    setSaving(true);
    try {
      await apiClient.delete(`/api/v1/items/${product.id}`);
      navigate('/dashboard/items');
      return true;
    } catch {
      setError('Unable to delete product.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const isSectionComplete = (section: ProductSetupSection) => {
    const isCourse = productType === 'course';
    if (section === 'details') return title.trim().length > 0;
    if (section === 'files') return isCourse ? true : files.length > 0;
    if (section === 'pricing') return !!effectiveBilling &&
      (effectiveBilling === 'free' || (parseEtbToCents(price) ?? 0) > 0);
    return true;
  };

  const progressSections = effectiveFileType === 'digital'
    ? ['details', 'files', 'pricing']
    : sectionOrder.filter(section => section !== 'previews' && section !== 'bio-pages');
  const completedSections = progressSections.filter(isSectionComplete).length;
  const canSubmit =
    !product || product.status === 'draft' || product.status === 'rejected';
  const unavailable = !!productId && (!product || String(product.id) !== productId);

  const handleBillingChange = (mode: BillingMode) => {
    setBillingChoice(mode);
    actions.setPrice(priceForBillingMode(price, mode));
    setFieldErrors(current => {
      const next = {...current};
      delete next.price_cents;
      return next;
    });
  };

  const detailsFields = (
    <DetailsPanel
      title={title}
      description={description}
      price={price}
      billingMode={effectiveBilling}
      onBillingModeChange={handleBillingChange}
      coverUrl={coverUrl}
      onTitleChange={actions.setTitle}
      onDescriptionChange={actions.setDescription}
      onPriceChange={actions.setPrice}
      legacyCurrency={product?.currency}
      convertToEtb={convertToEtb}
      onConvertToEtbChange={setConvertToEtb}
      onCoverChange={actions.setCover}
      errors={fieldErrors}
      validateField={validateField}
      hidePricing={effectiveFileType === 'digital'}
    />
  );

  const pricingFields = (
    <PricingFields
      price={price}
      billingMode={effectiveBilling}
      onBillingModeChange={handleBillingChange}
      onPriceChange={actions.setPrice}
      legacyCurrency={product?.currency}
      convertToEtb={convertToEtb}
      onConvertToEtbChange={setConvertToEtb}
      errors={fieldErrors}
      validateField={validateField}
    />
  );

  const privateFileFields = (
    <FilesPanel
      files={files}
      accept={fileAccept}
      hint={fileHint}
      onUploaded={file => {
        if (!files.some(item => item.id === file.id)) {
          actions.setFiles([...files, file]);
        }
      }}
      onRemove={id => actions.setFiles(files.filter(file => file.id !== id))}
      error={fieldErrors.file_ids}
    />
  );

  const sampleFields = previewKind ? (
    <ProductSampleFields
      kind={previewKind}
      samples={samples}
      onChange={actions.setSamples}
      error={fieldErrors.sample_file_ids || fieldErrors.sample_titles}
    />
  ) : null;

  const storefrontFields = (
    <BioPagesPanel
      biolinks={biolinks}
      selectedIds={biolinkIds}
      onChange={actions.setBiolinkIds}
    />
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        {/* P2 (crit3-A/3-B): the SectionTitle (page title + status badge)
            measured width 0 at 1280/1440/1920. Root cause is the flex
            chain in SectionHeader: the breadcrumb <nav> ships `w-full`,
            i.e. a flex base size equal to the whole row, while the title
            is `flex-1` (flex-basis 0%) — free space for it never exists,
            so it collapses and `overflow:hidden` clips the badge behind
            the action row. `w-auto` gives the slack to the title;
            `max-sm:hidden` keeps the 360px row for title + icon actions
            (navigation still lives in the drawer). The current-page crumb
            is dropped on purpose: it repeated the exact string the title
            now shows again (crit3-A, duplicate-title note). */}
        <Breadcrumb className="w-auto max-sm:hidden">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/dashboard/items">
              <Trans message="All products" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle render={<h1 />}>
          {/* P2: in a tight row the TEXT is what truncates (min-w-0), so
              the status badge — the one product-specific fact the chrome
              carries — keeps its 36px at every width.
              Final-fix item 2: `render={<h1 />}` makes this the page's one
              and only heading (T7's mechanism on the selection page). */}
          <span className="min-w-0 truncate">
            <Trans message={pageTitle} />
          </span>
          {product && <ProductStatus status={product.status} />}
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          {/* P2 (crit3-A): the text labels collapse below 640px
              (max-sm:hidden), leaving icon-only buttons with no accessible
              name. aria-labels match the visible text via trans() — the
              same pattern the course setup page uses. */}
          {product && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              aria-label={trans({message: 'Delete'})}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-4" />
              <span className="max-sm:hidden">
                <Trans message="Delete" />
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={saving || submitting || unavailable}
            aria-label={
              saving
                ? trans({message: 'Saving...'})
                : trans({message: 'Save draft'})
            }
            onClick={() => void save(false)}
          >
            <SaveIcon className="size-4" />
            <span className="max-sm:hidden">
              {saving ? (
                <Trans message="Saving..." />
              ) : (
                <Trans message="Save draft" />
              )}
            </span>
          </Button>
          <Button
            size="sm"
            disabled={saving || submitting || unavailable || !canSubmit}
            aria-label={
              submitting
                ? trans({message: 'Submitting...'})
                : trans({message: 'Submit for review'})
            }
            onClick={() => void save(true)}
          >
            <SendIcon className="size-4" />
            <span className="max-sm:hidden">
              {submitting ? (
                <Trans message="Submitting..." />
              ) : (
                <Trans message="Submit for review" />
              )}
            </span>
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className={effectiveFileType === 'digital' ? 'mx-auto w-full max-w-3xl py-4 sm:py-5' : 'mx-auto w-full max-w-6xl py-4 sm:py-5'}>
          {error && (
            <Alert.Root
              variant="destructive"
              fillStyle="subtleFill"
              className="mb-5"
            >
              <TriangleAlertIcon />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          {product?.status === 'approved' && dirty && (
            <Alert.Root variant="warning" fillStyle="subtleFill" className="mb-5">
              <TriangleAlertIcon />
              <Alert.Description>
                <Trans message="Changes to approved products may require review. The published version remains available during review." />
              </Alert.Description>
            </Alert.Root>
          )}

          {product && biolinkIds.length > 0 && product.status !== 'approved' && (
            <Alert.Root className="mb-5 border-primary/20 bg-primary/5">
              <Link2Icon />
              <Alert.Description>
                <Trans message="This product is placed on storefronts, but it will not appear publicly until it is approved." />
              </Alert.Description>
            </Alert.Root>
          )}

          {(productType === 'course' || product?.type === 'course') && (
            <Alert.Root className="mb-5 border-primary/20 bg-primary/5">
              <GraduationCapIcon />
              <Alert.Title>
                <Trans message="Course product" />
              </Alert.Title>
              <Alert.Description className="flex flex-wrap items-center gap-2">
                <span>
                  <Trans message="After saving, you'll build your curriculum in the course builder." />
                </span>
                {product && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/dashboard/items/${product.id}/course`)
                    }
                  >
                    <GraduationCapIcon />
                    <Trans message="Open course builder" />
                  </Button>
                )}
              </Alert.Description>
            </Alert.Root>
          )}

          {loading ? (
            <>
              <div className="flex flex-col gap-4">
                <DetailsSkeleton />
                <FilesSkeleton />
                <BioPagesSkeleton />
              </div>
              <aside className="min-w-0 lg:sticky lg:top-6">
                <PreviewSkeleton />
              </aside>
            </>
          ) : unavailable ? null : effectiveFileType === 'digital' ? (
            <div className="flex min-w-0 flex-col gap-5">
              <ProductFormProgress completed={completedSections} total={progressSections.length} />
              <DigitalProductEditor
                details={detailsFields}
                files={privateFileFields}
                sample={sampleFields}
                pricing={pricingFields}
                storefront={storefrontFields}
              />
            </div>
          ) : (
            <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
              <div className="flex min-w-0 flex-col gap-4">
                <ProductFormProgress
                  completed={completedSections}
                  total={progressSections.length}
                />

                <Accordion.Root
                  variant="bordered"
                  value={openSection ? [openSection] : []}
                  onValueChange={value =>
                    setOpenSection(
                      (value[0] as ProductSetupSection | undefined) ?? null,
                    )
                  }
                >
                  {sectionOrder.map(section => {
                    if (section === 'previews' && previewKind) {
                      return (
                        <ProductFormSection
                          key={section}
                          id={section}
                          title={
                            previewKind === 'audio' ? (
                              <Trans message="Preview tracks" />
                            ) : (
                              <Trans message="Sample PDF" />
                            )
                          }
                          description={
                            previewKind === 'audio' ? (
                              <Trans message="Free preview audio" />
                            ) : (
                              <Trans message="Buyers can read this sample before they buy." />
                            )
                          }
                          icon={previewKind === 'audio' ? HeadphonesIcon : FileTextIcon}
                          isComplete
                          count={samples.length}
                          hasError={
                            !!(
                              fieldErrors.sample_file_ids ||
                              fieldErrors.sample_titles
                            )
                          }
                        >
                          <ProductSampleFields
                            kind={previewKind}
                            samples={samples}
                            onChange={actions.setSamples}
                            error={
                              fieldErrors.sample_file_ids ||
                              fieldErrors.sample_titles
                            }
                          />
                        </ProductFormSection>
                      );
                    }

                    const meta = SECTION_META[section as keyof typeof SECTION_META];

                    return (
                      <ProductFormSection
                        key={section}
                        id={section}
                        title={
                          section === 'files' && previewKind === 'audio' ? (
                            <Trans message="Files buyers get after purchase" />
                          ) : (
                            meta.label
                          )
                        }
                        description={
                          section === 'files' && previewKind === 'audio' ? (
                            <Trans message="These files stay private until someone buys." />
                          ) : (
                            meta.description
                          )
                        }
                        icon={meta.icon}
                        isComplete={isSectionComplete(section)}
                        count={
                          section === 'files'
                            ? files.length
                            : section === 'bio-pages'
                              ? biolinkIds.length
                              : null
                        }
                        hasError={
                          section === 'details'
                            ? !!(
                                fieldErrors.title || fieldErrors.price_cents
                              )
                            : section === 'files'
                              ? !!fieldErrors.file_ids
                              : false
                        }
                      >
                        {section === 'details' && (
                          <DetailsPanel
                            title={title}
                            description={description}
                            price={price}
                            billingMode={effectiveBilling}
                            onBillingModeChange={mode => {
                              setBillingChoice(mode);
                              actions.setPrice(priceForBillingMode(price, mode));
                              setFieldErrors(current => {const next = {...current}; delete next.price_cents; return next;});
                            }}
                            coverUrl={coverUrl}
                            onTitleChange={actions.setTitle}
                            onDescriptionChange={actions.setDescription}
                            onPriceChange={actions.setPrice}
                            legacyCurrency={product?.currency}
                            convertToEtb={convertToEtb}
                            onConvertToEtbChange={setConvertToEtb}
                            onCoverChange={actions.setCover}
                            errors={fieldErrors}
                            validateField={validateField}
                          />
                        )}
                        {section === 'files' && (
                          <FilesPanel
                            files={files}
                            accept={fileAccept}
                            hint={fileHint}
                            onUploaded={file => {
                              if (
                                !files.some(item => item.id === file.id)
                              ) {
                                actions.setFiles([...files, file]);
                              }
                            }}
                            onRemove={id =>
                              actions.setFiles(
                                files.filter(file => file.id !== id),
                              )
                            }
                            error={fieldErrors.file_ids}
                          />
                        )}
                        {section === 'bio-pages' && (
                          <BioPagesPanel
                            biolinks={biolinks}
                            selectedIds={biolinkIds}
                            onChange={actions.setBiolinkIds}
                          />
                        )}
                      </ProductFormSection>
                    );
                  })}
                </Accordion.Root>
              </div>

              <aside className="min-w-0 lg:sticky lg:top-6">
                <ProductPreview />
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout.SectionContent>

      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Media className="bg-destructive/10 text-destructive">
                <Trash2Icon />
              </AlertDialog.Media>
              <AlertDialog.Title>
                <Trans message="Delete this product?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="This removes the product from every storefront. This action cannot be undone." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={saving}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={saving}
                onClick={async () => {
                  if (await remove()) {
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {saving ? (
                  <Trans message="Deleting..." />
                ) : (
                  <Trans message="Delete product" />
                )}
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </DashboardLayout.MainSection>
  );
}

/* ─── Details Panel ── */

function DetailsPanel({
  title,
  description,
  price,
  billingMode,
  onBillingModeChange,
  coverUrl,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  legacyCurrency,
  convertToEtb,
  onConvertToEtbChange,
  onCoverChange,
  errors,
  hidePricing = false,
}: {
  title: string;
  description: string;
  price: string;
  billingMode: BillingMode | null;
  onBillingModeChange: (mode: BillingMode) => void;
  coverUrl: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  legacyCurrency?: string;
  convertToEtb: boolean;
  onConvertToEtbChange: (value: boolean) => void;
  onCoverChange: (url: string, entry?: {id: number}) => void;
  errors: FieldErrors;
  hidePricing?: boolean;
  validateField: (field: string, value: string) => void;
}) {
  const {validateField} = arguments[0] as {validateField: (field: string, value: string) => void};
  const {trans} = useTrans();
  return (
    <div className="flex flex-col gap-4">
      <ProductFormField
        label="Product title"
        description="Choose a clear title customers can easily understand."
        error={errors.title}
        htmlFor="product-title"
        required
        onBlur={() => validateField('title', title)}
      >
        <Input
          id="product-title"
          aria-invalid={!!errors.title}
          value={title}
          maxLength={160}
          onChange={event => onTitleChange(event.target.value)}
          placeholder="My digital guide"
        />
      </ProductFormField>

      {!hidePricing && (
        <PricingFields
          price={price}
          billingMode={billingMode}
          onBillingModeChange={onBillingModeChange}
          onPriceChange={onPriceChange}
          legacyCurrency={legacyCurrency}
          convertToEtb={convertToEtb}
          onConvertToEtbChange={onConvertToEtbChange}
          errors={errors}
          validateField={validateField}
        />
      )}

      <ProductFormField
        label="Description"
        description="Describe what customers will receive."
        error={errors.description}
        htmlFor="product-description"
        onBlur={() => validateField('description', description)}
      >
        <DescriptionEditor value={description} onChange={onDescriptionChange} />
      </ProductFormField>

      <ProductFormField
        label="Cover image"
        description="Shown on your product listing and Storefronts."
        error={errors.cover_file_entry_id}
        htmlFor="product-cover"
      >
        <CroppedCover
          value={coverUrl}
          onChange={onCoverChange}
          uploadType="linkImages"
          aspect={16 / 9}
          label={trans(message('Cover image'))}
          className="aspect-video h-auto w-full"
        />
      </ProductFormField>
    </div>
  );
}

interface PricingFieldsProps {
  price: string;
  billingMode: BillingMode | null;
  onBillingModeChange: (mode: BillingMode) => void;
  onPriceChange: (value: string) => void;
  legacyCurrency?: string;
  convertToEtb: boolean;
  onConvertToEtbChange: (value: boolean) => void;
  errors: FieldErrors;
  validateField: (field: string, value: string) => void;
}

function PricingFields({
  price,
  billingMode,
  onBillingModeChange,
  onPriceChange,
  legacyCurrency,
  convertToEtb,
  onConvertToEtbChange,
  errors,
  validateField,
}: PricingFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          <Trans message="Free or paid?" />
        </p>
        <BillingModePicker value={billingMode} onValueChange={mode => {if (mode) onBillingModeChange(mode);}} />
      </div>
      {billingMode === 'free' ? (
        <p className="text-sm text-muted-foreground">
          <Trans message="Buyers pay nothing." />
        </p>
      ) : billingMode === 'paid' ? (
      <ProductFormField
        label="Price"
        description="One-time price in ETB."
        error={errors.price_cents}
        htmlFor="product-price"
        required
        onBlur={() => validateField('price', price)}
      >
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>ETB</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="product-price"
            aria-invalid={!!errors.price_cents}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={event => onPriceChange(event.target.value)}
            placeholder="0.00"
          />
        </InputGroup>
        {legacyCurrency && legacyCurrency.toLowerCase() !== 'etb' && (
          <label className="mt-2 flex items-start gap-3 rounded-card-sm border border-border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={convertToEtb}
              onCheckedChange={value => onConvertToEtbChange(value === true)}
            />
            <span>
              <span className="block font-medium">
                <Trans message="Convert this product price to ETB" />
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                <Trans message="Set the correct Ethiopian birr amount above. Existing sales remain in their original currency." />
              </span>
            </span>
          </label>
        )}
      </ProductFormField>
      ) : null}


    </div>
  );
}

/* ─ Description Editor ─── */

function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={value}
      onChange={onChange}
    >
      {/* P2 (crit3-B nested-cards): this box is the Description FIELD's
          control — same role as the title/price inputs beside it — so it
          wears the field tokens (`rounded-input` 12px + `border-input`),
          not the card tokens (`rounded-card-sm` 16px + `border-border`)
          that made it read as a third card nested in the section card.
          The boundary stays because an editable surface with a toolbar
          needs one (DESIGN.md field spec), it just stops being card
          chrome. */}
      <div className="overflow-hidden rounded-input border border-input">
        <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
          <FormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <LinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-none px-3 py-2.5 dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}

/* ── Files Panel ─── */

function fileTypeIcon(extension?: string) {
  const ext = extension?.toLowerCase() ?? '';
  if (ext === 'zip') return FileArchiveIcon;
  if (['pdf', 'epub', 'txt'].includes(ext)) return FileTextIcon;
  if (['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) return HeadphonesIcon;
  return FileIcon;
}

function FilesPanel({
  files,
  onUploaded,
  onRemove,
  error,
  accept,
  hint,
}: {
  files: FileEntry[];
  onUploaded: (file: FileEntry) => void;
  onRemove: (id: number) => void;
  error?: string;
  accept?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-3" id="product-files" tabIndex={-1}>
      <SharedFileUploader
        uploadType="digitalProductFiles"
        bare
        onUploaded={entry =>
          onUploaded({
            id: entry.id,
            name: entry.name,
            file_size: entry.file_size,
            extension: entry.extension ?? undefined,
          })
        }
        accept={accept}
        hint={hint}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!!files.length && (
        <ul className="flex flex-col gap-2">
          {files.map(file => {
            const Icon = fileTypeIcon(file.extension);
            return (
              <li key={file.id}>
                <Attachment state="done" size="sm" className="w-full">
                  <AttachmentMedia>
                    <Icon aria-hidden="true" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    {file.file_size && (
                      <AttachmentDescription className="tabular-nums">
                        <FormattedBytes bytes={file.file_size} />
                      </AttachmentDescription>
                    )}
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${file.name}`}
                      onClick={() => onRemove(file.id)}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── Bio Pages Panel ─── */

function BioPagesPanel({
  biolinks,
  selectedIds,
  onChange,
}: {
  biolinks: Biolink[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  if (!biolinks.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        <Trans message="You can sell this product directly. Create a Storefront later if you want to display it there." />
      </p>
    );
  }

  return (
    <div className="divide-y">
      {biolinks.map(page => (
        <label
          key={page.id}
          className="flex cursor-pointer items-center gap-3 py-3 text-sm transition-colors hover:bg-muted/40"
        >
          <Checkbox
            bindToHookForm={false}
            checked={selectedIds.includes(page.id)}
            onCheckedChange={checked =>
              onChange(
                checked
                  ? [...selectedIds, page.id]
                  : selectedIds.filter(id => id !== page.id),
              )
            }
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{page.name}</span>
            {page.short_url && (
              <span className="block truncate text-xs text-muted-foreground">
                {page.short_url}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ── Skeleton ─── */

function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}

function FilesSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function BioPagesSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

/* ─── Helpers ─── */

function getValidationErrors(reason: unknown): FieldErrors {
  const errors = (reason as {response?: {data?: {errors?: unknown}}})?.response
    ?.data?.errors;

  if (!errors || typeof errors !== 'object') return {};

  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, messages]) =>
      Array.isArray(messages) && typeof messages[0] === 'string'
        ? [[field, messages[0]]]
        : [],
    ),
  );
}
