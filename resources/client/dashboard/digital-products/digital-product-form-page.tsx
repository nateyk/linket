import type {CopyDraftIdentity} from './product-ai-copy-review-state';
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
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Progress} from '@shadcn/progress/progress';
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
  ChevronDownIcon,
  Clock3Icon,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router';
import {isUncertainMutationOutcome} from './request-outcome';
import {parseWizardPrefill, firstInvalidFieldId, parseEtbToCents, priceForBillingMode, resolveCreateType, type BillingMode} from './product-create-flow';
import {DigitalProductEditor} from './digital-product-editor';
import {EbookEditor} from './ebook-editor';
import {AudioEditor} from './audio-editor';
import {ProductPreviewDialog} from './product-preview-dialog';
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
import {focusProductAuthoringStep, ProductAuthoringSteps, type NonCourseProductType, type ProductAuthoringStep} from './product-authoring-steps';
import {
  ProductFormSection,
  type ProductSetupSection,
} from './product-form-section';
import {ProductPreview, ProductStatus} from './product-preview';
import {ProductAiCopyReview} from './product-ai-copy-review';
import {missingProductRequirements} from './product-authoring-status';
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
  has_pending_update?: boolean;
  review_requested_at?: string | null;
  type?: string;
};

type FieldErrors = Record<string, string>;
type SubmissionRecovery = 'failed' | 'uncertain';

// Each message is a static literal so the translation extractor finds it.
const PRODUCT_PAGE_TITLES = {
  create: {
    digital: <Trans message="Create digital product" />,
    ebook: <Trans message="Create e-book" />,
    audio: <Trans message="Create audio" />,
    course: <Trans message="Create course" />,
  },
  edit: {
    digital: <Trans message="Edit digital product" />,
    ebook: <Trans message="Edit e-book" />,
    audio: <Trans message="Edit audio" />,
    course: <Trans message="Edit course" />,
  },
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

/** Connected non-course navigation; sections remain mounted for safe uploads and autosave. */
function NonCourseAuthoringLayout({
  type,
  completed,
  completedSections,
  totalSections,
  readinessHint,
  children,
}: {
  type: NonCourseProductType;
  completed: Record<ProductAuthoringStep, boolean>;
  completedSections: number;
  totalSections: number;
  readinessHint: ReactNode;
  children: ReactNode;
}) {
  const [activeStep, setActiveStep] = useState<ProductAuthoringStep>('details');
  const {trans} = useTrans();

  const selectStep = (step: ProductAuthoringStep) => {
    setActiveStep(step);
    focusProductAuthoringStep(type, step);
  };

  return (
    <div
      className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] xl:gap-6"
      data-testid="product-authoring-layout"
    >
      <ProductAuthoringSteps
        type={type}
        active={activeStep}
        completed={completed}
        onSelect={selectStep}
      />
      <div className="min-w-0">
        <div
          data-testid="product-setup-status"
          className="mb-4 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3"
        >
          <p className="text-xs text-muted-foreground">
            <Trans
              message=":completed of :total required sections complete"
              values={{completed: completedSections, total: totalSections}}
            />
          </p>
          <Progress.Root
            value={(completedSections / totalSections) * 100}
            className="ms-auto w-28 shrink-0 sm:w-40"
            aria-label={trans({message: 'Product setup progress'})}
          >
            <Progress.Track className="h-2"><Progress.Indicator /></Progress.Track>
          </Progress.Root>
          {readinessHint ? <div className="basis-full">{readinessHint}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

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
  const location = useLocation();
  const routeRecovery = location.state as {
    productSubmissionRecovery?: SubmissionRecovery;
    productSubmissionErrors?: FieldErrors;
  } | null;
  const {trans} = useTrans();
  const {state, actions, dirty, autoSaveState, aiCopyApproval, aiCopySaveConflict, billing} = useProductCreation();
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
  const [storefrontLoadStatus, setStorefrontLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [storefrontRetry, setStorefrontRetry] = useState(0);
  const [loading, setLoading] = useState(!!productId);
  const [productLoadRetry, setProductLoadRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // A confirmed save followed by failed submission must not create again.
  const saveInFlight = useRef(false);
  const mutationUncertain = useRef(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [submissionRecovery, setSubmissionRecovery] = useState<SubmissionRecovery | null>(
    routeRecovery?.productSubmissionRecovery === 'uncertain'
      ? 'uncertain'
      : routeRecovery?.productSubmissionRecovery === 'failed' ? 'failed' : null,
  );
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(
    routeRecovery?.productSubmissionErrors ?? {},
  );
  const recoveryFocusDone = useRef(false);
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
    // Every draft edit resets the idle debounce, including edits made after
    // a failed autosave while "dirty" is already true.
    if (dirty && product?.status === 'draft') actions.autoSave();
  }, [dirty, state, actions.autoSave, product?.status]);

  useEffect(() => {
    // The newly created draft is redirected to its saved edit URL if submit
    // fails. Restore server validation errors and keyboard focus after GET.
    if (loading || !productId || recoveryFocusDone.current) return;
    const recoveryErrors = routeRecovery?.productSubmissionErrors;
    if (!recoveryErrors || !Object.keys(recoveryErrors).length) return;
    const focusId = firstInvalidFieldId(recoveryErrors);
    if (!focusId) return;
    recoveryFocusDone.current = true;
    const frame = requestAnimationFrame(() => {
      document.getElementById(focusId)?.focus({preventScroll: false});
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, productId]);

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
    ? PRODUCT_PAGE_TITLES.edit[effectiveFileType]
    : productType
      ? PRODUCT_PAGE_TITLES.create[productType]
      : <Trans message="Create digital product" />;

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
    if (productId) {
      setLoading(true);
      setError(undefined);
    }
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
  }, [navigate, productId, productLoadRetry]);

  // Optional Storefront lookup is independent of item hydration. A failed
  // request must not look like an empty account, wipe selected IDs, or block
  // product creation. Each retry invalidates only the previous list request.
  useEffect(() => {
    let cancelled = false;
    setStorefrontLoadStatus('loading');
    void (async () => {
      try {
        const response = await apiClient.get('/api/v1/biolinks?fields_preset=minimal');
        const records: unknown = response.data?.data;
        if (!Array.isArray(records)) throw new Error('Invalid Storefront list response');
        if (cancelled) return;
        setBiolinks(records as Biolink[]);
        setStorefrontLoadStatus('ready');
      } catch {
        if (!cancelled) setStorefrontLoadStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [storefrontRetry]);

  const save = useCallback(
    async (submitAfterSave = false) => {
      if (saveInFlight.current || mutationUncertain.current || creationUncertain || submissionRecovery === 'uncertain') return;
      if (productId && (!product || String(product.id) !== productId)) return;
      if (aiCopySaveConflict) {
        setError('This product changed since the AI copy was approved. Your edits remain here. Copy them before refreshing and generate a new suggestion.');
        return;
      }
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

      saveInFlight.current = true;
      setSaving(true);
      setError(undefined);
      setFieldErrors({});
      setSubmissionRecovery(null);
      let saved: Product | undefined;
      let saveResponseUncertain = false;

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
          ...(product && aiCopyApproval?.productId === product.id
            ? {ai_copy_source_fingerprint: aiCopyApproval.sourceFingerprint,
                ...(aiCopyApproval.draft ? {
                  ai_copy_draft_id: aiCopyApproval.draft.draftId,
                  ai_copy_draft_version: aiCopyApproval.draft.draftVersion,
                } : {}),
              }
            : {}),
        };
        // For courses, file_ids is optional — send empty array as-is, backend allows it
        const response = product
          ? await apiClient.put(`/api/v1/items/${product.id}`, body)
          : await apiClient.post('/api/v1/items', body);
        saved = response.data.data as Product;
        if (!saved || !Number.isSafeInteger(saved.id) || saved.id <= 0) {
          // A 2xx response without a usable ID is not proof that a POST did
          // not create a record; never blindly repeat it.
          saved = undefined;
          saveResponseUncertain = true;
          throw new Error('Saved product response missing an ID');
        }
        actions.confirmPersisted(state, aiCopyApproval?.sourceFingerprint);
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
        if (
          aiCopyApproval &&
          (reason as {response?: {status?: number}})?.response?.status === 409
        ) {
          actions.markAiCopyConflict();
        }
        const validationErrors = getValidationErrors(reason);
        const savedBeforeSubmitFailure = Boolean(saved && submitAfterSave);
        const unconfirmedNetworkResponse = isUncertainMutationOutcome(reason);
        if (savedBeforeSubmitFailure && saved) {
          const recovery: SubmissionRecovery = unconfirmedNetworkResponse
            ? 'uncertain'
            : 'failed';
          if (recovery === 'uncertain') mutationUncertain.current = true;
          if (!productId) {
            // The product already has a server ID. Move from /new to /edit
            // before a refresh or retry could issue a second create POST.
            navigate(`/dashboard/items/${saved.id}/edit`, {
              replace: true,
              state: {
                productSubmissionRecovery: recovery,
                productSubmissionErrors: validationErrors,
              },
            });
            return;
          }
          setSubmissionRecovery(recovery);
        } else if (!productId && !product && (unconfirmedNetworkResponse || saveResponseUncertain)) {
          // An unacknowledged create POST may have committed. Block another
          // POST until the creator checks the server's item list.
          mutationUncertain.current = true;
          setCreationUncertain(true);
        } else if (!Object.keys(validationErrors).length) {
          setError(
            aiCopyApproval &&
              (reason as {response?: {status?: number}})?.response?.status === 409
              ? 'This product changed after you approved AI copy. Your local edits are preserved. Copy them before refreshing, then generate a new suggestion.'
              : productSaveErrorMessage(reason, false),
          );
        }

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
        }
      } finally {
        saveInFlight.current = false;
        setSaving(false);
        setSubmitting(false);
      }
    },
    [
      biolinkIds,
      state,
      actions.confirmPersisted,
      actions.markAiCopyConflict,
      aiCopyApproval,
      aiCopySaveConflict,
      creationUncertain,
      submissionRecovery,
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

  const progressSections: ProductSetupSection[] = ['details', 'files', 'pricing'];
  const completedSections = progressSections.filter(isSectionComplete).length;
  const nonCourseStepsCompleted: Record<ProductAuthoringStep, boolean> = {
    details: isSectionComplete('details'),
    files: isSectionComplete('files'),
    sample: samples.length > 0,
    pricing: isSectionComplete('pricing'),
    storefront: biolinkIds.length > 0,
  };
  const canSubmit =
    !product || product.status === 'draft' || product.status === 'rejected';
  const missingRequirements = missingProductRequirements({
    title,
    filesCount: files.length,
    billing: effectiveBilling,
    price,
    type: effectiveFileType,
  });
  // Explain the first missing required item without counting optional samples
  // or storefront placement as mandatory.
  const readinessHint = canSubmit && missingRequirements.length > 0 ? (
    <p className="text-xs text-muted-foreground" role="status">
      {missingRequirements[0] === 'title' ? (
        <Trans message="Add a title before submitting." />
      ) : missingRequirements[0] === 'files' ? (
        <Trans message="Upload at least one private product file before submitting." />
      ) : (
        <Trans message="Choose Free access or enter a valid paid price before submitting." />
      )}
    </p>
  ) : null;
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
      productId={product?.id}
      price={price}
      billingMode={effectiveBilling}
      onBillingModeChange={handleBillingChange}
      coverUrl={coverUrl}
      onTitleChange={actions.setTitle}
      onDescriptionChange={actions.setDescription}
      onAiDescriptionApproved={actions.approveAiDescription}
      onPriceChange={actions.setPrice}
      legacyCurrency={product?.currency}
      convertToEtb={convertToEtb}
      onConvertToEtbChange={setConvertToEtb}
      onCoverChange={actions.setCover}
      errors={fieldErrors}
      validateField={validateField}
      hidePricing={effectiveFileType !== 'course'}
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
      productType={effectiveFileType === 'digital' ? 'digital' : 'ebook'}
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
      loadStatus={storefrontLoadStatus}
      onRetry={() => setStorefrontRetry(current => current + 1)}
    />
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
        <DashboardLayout.SidebarToggle />
        {/* P2 (crit3-A/3-B): the SectionTitle (page title + status badge)
            measured width 0 at 1280/1440/1920. Root cause is the flex
            chain in SectionHeader: the breadcrumb <nav> ships `w-full`,
            i.e. a flex base size equal to the whole row, while the title
            is `flex-1` (flex-basis 0%) — free space for it never exists,
            so it collapses and `overflow:hidden` clips the badge behind
            the action row. `w-auto` gives the slack to the title;
            `max-lg:hidden` keeps the narrow row for title + icon actions
            (navigation still lives in the drawer). The current-page crumb
            is dropped on purpose: it repeated the exact string the title
            now shows again (crit3-A, duplicate-title note). */}
        <Breadcrumb className="w-auto max-lg:hidden">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/dashboard/items">
              <Trans message="All products" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle render={<h1 />} className="max-lg:order-3 max-lg:basis-full max-lg:flex-none max-lg:w-full max-lg:text-xl max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip">
          {/* P2: in a tight row the TEXT is what truncates (min-w-0), so
              the status badge — the one product-specific fact the chrome
              carries — keeps its 36px without clipping.
              Final-fix item 2: `render={<h1 />}` makes this the page's one
              and only heading (T7's mechanism on the selection page). */}
          <span className="min-w-0 truncate max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip">
            {pageTitle}
          </span>
          {product && <ProductStatus status={product.status} hasPendingUpdate={product.has_pending_update === true} />}
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2 max-lg:ml-auto">
          {effectiveFileType !== 'course' && (
            <Button
              variant="outline"
              size="sm" className="max-lg:size-11 max-lg:px-0"
              aria-label={trans({message: 'Preview'})}
              onClick={() => setPreviewOpen(true)}
            >
              <EyeIcon className="size-4" aria-hidden="true" />
              <span className="max-lg:hidden"><Trans message="Preview" /></span>
            </Button>
          )}
          {/* P2 (crit3-A): the text labels collapse below 1024px
              (max-lg:hidden), leaving icon-only buttons with no accessible
              name. aria-labels match the visible text via trans() — the
              same pattern the course setup page uses. */}
          {product && (
            <Button
              variant="ghost"
              size="sm" className="max-lg:size-11 max-lg:px-0"
              disabled={saving}
              aria-label={trans({message: 'Delete'})}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="size-4" />
              <span className="max-lg:hidden">
                <Trans message="Delete" />
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm" className="max-lg:size-11 max-lg:px-0"
            disabled={saving || submitting || unavailable || creationUncertain || submissionRecovery === 'uncertain'}
            aria-label={
              saving
                ? trans({message: 'Saving...'})
                : trans({message: 'Save draft'})
            }
            onClick={() => void save(false)}
          >
            <SaveIcon className="size-4" />
            <span className="max-lg:hidden">
              {saving ? (
                <Trans message="Saving..." />
              ) : (
                <Trans message="Save draft" />
              )}
            </span>
          </Button>
          <Button
            size="sm" className="max-lg:size-11 max-lg:px-0"
            disabled={saving || submitting || unavailable || !canSubmit || creationUncertain || submissionRecovery === 'uncertain'}
            aria-label={
              submitting
                ? trans({message: 'Submitting...'})
                : trans({message: 'Submit for review'})
            }
            onClick={() => void save(true)}
          >
            <SendIcon className="size-4" />
            <span className="max-lg:hidden">
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
        <div className={effectiveFileType !== 'course' ? 'mx-auto w-full max-w-5xl py-4 sm:py-5' : 'mx-auto w-full max-w-6xl py-4 sm:py-5'}>
          {!loading && !unavailable && (
            <div role="status" aria-live="polite" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {saving ? (
                  <Trans message="Saving changes..." />
                ) : creationUncertain ? (
                  <Trans message="Creation outcome unconfirmed" />
                ) : !product ? (
                  <Trans message="Not saved yet" />
                ) : product.status === 'draft' && aiCopySaveConflict ? (
                  <Trans message="Product changed — AI copy was not saved." />
                ) : product.status === 'draft' && autoSaveState === 'saving' ? (
                  <Trans message="Saving draft..." />
                ) : product.status === 'draft' && autoSaveState === 'failed' ? (
                  <Trans message="Autosave failed. Changes are still on this page." />
                ) : dirty ? (
                  <Trans message="Unsaved changes" />
                ) : product.status === 'draft' ? (
                  <Trans message="Draft saved" />
                ) : (
                  <Trans message="No unsaved changes" />
                )}
              </span>
              {product?.status === 'draft' && autoSaveState === 'failed' && dirty && (
                <Button type="button" variant="outline" size="sm" onClick={() => actions.autoSave()}>
                  <Trans message="Retry save" />
                </Button>
              )}
            </div>
          )}
          {aiCopySaveConflict && (
            <Alert.Root variant="warning" role="alert" fillStyle="subtleFill" className="mb-5">
              <TriangleAlertIcon aria-hidden="true" />
              <Alert.Description>
                <Trans message="The product changed after AI copy approval. Autosave is stopped and your edits are still here. Copy your wording before refreshing, then generate a fresh suggestion." />
              </Alert.Description>
            </Alert.Root>
          )}
          {(creationUncertain || submissionRecovery) && (
            <Alert.Root variant="warning" role="alert" fillStyle="subtleFill" className="mb-5">
              <TriangleAlertIcon aria-hidden="true" />
              <Alert.Description className="flex flex-col items-start gap-2">
                {creationUncertain ? (
                  <Trans message="We could not confirm whether the product was created. Check My Items before creating it again." />
                ) : submissionRecovery === 'uncertain' ? (
                  <Trans message="Draft saved, but we could not confirm submission. Check My Items before submitting again." />
                ) : (
                  <Trans message="Draft saved, but submission failed. Fix the issue and try again." />
                )}
                {(creationUncertain || submissionRecovery === 'uncertain') && (
                  <Button type="button" size="sm" variant="outline" render={<Link to="/dashboard/items" />}>
                    <Trans message="Check My Items" />
                  </Button>
                )}
              </Alert.Description>
            </Alert.Root>
          )}
          {error && (
            <Alert.Root
              role="alert"
              variant="destructive"
              fillStyle="subtleFill"
              className="mb-5"
            >
              <TriangleAlertIcon />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          {unavailable && !loading && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mb-4"
              onClick={() => setProductLoadRetry(current => current + 1)}
            >
              <Trans message="Retry loading product" />
            </Button>
          )}

          {product?.status === 'approved' && product.has_pending_update === true && (
            <Alert.Root variant="warning" fillStyle="subtleFill" className="mb-5">
              <Clock3Icon />
              <Alert.Description>
                <Trans message="This product remains approved while an update is under review." />
              </Alert.Description>
            </Alert.Root>
          )}

          {product?.status === 'approved' && dirty && product.has_pending_update !== true && (
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
                <Trans message="Storefronts selected. This product cannot appear publicly until it is approved." />
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
            effectiveFileType === 'course' ? (
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
            ) : (
              <NonCourseEditorSkeleton />
            )
          ) : unavailable ? null : effectiveFileType === 'digital' ? (
            <NonCourseAuthoringLayout
              type="digital"
              completed={nonCourseStepsCompleted}
              completedSections={completedSections}
              totalSections={progressSections.length}
              readinessHint={readinessHint}
            >
              <DigitalProductEditor
                details={detailsFields}
                files={privateFileFields}
                sample={sampleFields}
                pricing={pricingFields}
                storefront={storefrontFields}
              />
            </NonCourseAuthoringLayout>
          ) : effectiveFileType === 'ebook' ? (
            <NonCourseAuthoringLayout
              type="ebook"
              completed={nonCourseStepsCompleted}
              completedSections={completedSections}
              totalSections={progressSections.length}
              readinessHint={readinessHint}
            >
              <EbookEditor
                details={detailsFields}
                files={privateFileFields}
                sample={sampleFields}
                pricing={pricingFields}
                storefront={storefrontFields}
              />
            </NonCourseAuthoringLayout>
          ) : effectiveFileType === 'audio' ? (
            <NonCourseAuthoringLayout
              type="audio"
              completed={nonCourseStepsCompleted}
              completedSections={completedSections}
              totalSections={progressSections.length}
              readinessHint={readinessHint}
            >
              <AudioEditor
                details={detailsFields}
                files={privateFileFields}
                sample={sampleFields}
                pricing={pricingFields}
                storefront={storefrontFields}
              />
            </NonCourseAuthoringLayout>
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
                            productId={product?.id}
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
                            onAiDescriptionApproved={actions.approveAiDescription}
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
                            loadStatus={storefrontLoadStatus}
                            onRetry={() => setStorefrontRetry(current => current + 1)}
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

      <ProductPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <ProductPreview buyerOnly />
      </ProductPreviewDialog>

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
  productId,
  price,
  billingMode,
  onBillingModeChange,
  coverUrl,
  onTitleChange,
  onDescriptionChange,
  onAiDescriptionApproved,
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
  productId?: number;
  price: string;
  billingMode: BillingMode | null;
  onBillingModeChange: (mode: BillingMode) => void;
  coverUrl: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAiDescriptionApproved: (description: string, fingerprint: string, draft?: CopyDraftIdentity) => void;
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
  const [copyRevision, setCopyRevision] = useState(0);
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
          aria-errormessage={errors.title ? "product-title-error" : undefined}
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
        <DescriptionEditor key={copyRevision} value={description} onChange={onDescriptionChange} />
      </ProductFormField>
      {productId != null && (
        <ProductAiCopyReview
          productId={productId}
          currentTitle={title}
          currentDescription={description}
          onUseDescription={(candidate, sourceFingerprint, draft) => {
            onAiDescriptionApproved(candidate, sourceFingerprint, draft);
            setCopyRevision(current => current + 1);
          }}
        />
      )}

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
          className={hidePricing ? 'aspect-video h-auto w-full max-w-lg' : 'aspect-video h-auto w-full'}
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
            aria-errormessage={errors.price_cents ? "product-price-error" : undefined}
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
    <div
      className="flex flex-col gap-3"
      id="product-files"
      tabIndex={-1}
      aria-describedby={error ? 'product-files-error' : undefined}
    >
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
      {error && (
        <p id="product-files-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
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
  loadStatus,
  onRetry,
}: {
  biolinks: Biolink[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  loadStatus: 'loading' | 'ready' | 'error';
  onRetry: () => void;
}) {
  const {trans} = useTrans();
  if (loadStatus === 'loading') {
    return (
      <p role="status" className="py-4 text-sm text-muted-foreground">
        <Trans message="Loading Storefronts..." />
      </p>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div role="status" className="flex flex-col items-start gap-3 py-4">
        <p className="text-sm text-muted-foreground">
          <Trans message="Unable to load Storefronts. Your product can still be saved or submitted. Retry to choose placement." />
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <Trans message="Retry Storefront loading" />
        </Button>
      </div>
    );
  }

  if (!biolinks.length) {
    return (
      <div className="flex flex-col gap-2 py-4 text-sm text-muted-foreground">
        <p>
          <Trans message="You can sell this product directly. Create a Storefront later if you want to display it there." />
        </p>
        <p className="text-xs">
          <Trans message="Storefront placement is optional and does not block product submission." />
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        <Trans message="Optional. Choose where customers can find this product after approval." />
      </p>
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex min-h-11 w-full max-w-lg items-center justify-between gap-3 text-start font-normal"
            />
          }
          aria-label={trans({message: 'Choose Storefronts'})}
        >
          <span className="min-w-0 flex-1 truncate">
            <Trans message="Choose Storefronts" />
          </span>
          {selectedIds.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <Trans
                message="[one :count selected|other :count selected]"
                values={{count: selectedIds.length}}
              />
            </span>
          )}
          <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Dropdown.Trigger>
        <Dropdown.Content
          align="start"
          className="max-h-80 w-[min(28rem,calc(100vw-2rem))] overflow-y-auto"
        >
          <Dropdown.Group>
            <Dropdown.GroupLabel>
              <Trans message="Select one or more Storefronts" />
            </Dropdown.GroupLabel>
            {biolinks.map(page => (
              <Dropdown.CheckboxItem
                key={page.id}
                checked={selectedIds.includes(page.id)}
                onCheckedChange={checked =>
                  onChange(
                    checked
                      ? selectedIds.includes(page.id) ? selectedIds : [...selectedIds, page.id]
                      : selectedIds.filter(id => id !== page.id),
                  )
                }
                className="min-h-11"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{page.name}</span>
                  {page.short_url && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {page.short_url}
                    </span>
                  )}
                </span>
              </Dropdown.CheckboxItem>
            ))}
          </Dropdown.Group>
        </Dropdown.Content>
      </Dropdown.Root>
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {selectedIds.length > 0 ? (
          <Trans
            message="[one :count Storefront selected|other :count Storefronts selected]"
            values={{count: selectedIds.length}}
          />
        ) : (
          <Trans message="No Storefront selected" />
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        <Trans message="Selection does not publish the product; approval is handled separately." />
      </p>
    </div>
  );
}

/* ── Skeleton ─── */

/** Approximate the actual non-course sections without giant blank slabs. */
function NonCourseEditorSkeleton() {
  return (
    <div role="status" aria-busy="true" data-testid="non-course-editor-skeleton" className="min-w-0 space-y-4">
      <span className="sr-only"><Trans message="Loading product editor" /></span>
      <div aria-hidden="true" className="flex min-w-0 items-center justify-between gap-4 border-b pb-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-28 rounded-input" />
          <Skeleton className="h-4 w-48 max-w-full rounded-input" />
        </div>
        <Skeleton className="h-2 w-28 shrink-0 rounded-full sm:w-40" />
      </div>
      <div aria-hidden="true" className="space-y-4">
        <div className="space-y-4 rounded-card-sm border p-4 sm:p-5">
          <Skeleton className="h-5 w-40 rounded-input" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-input" />
            <Skeleton className="h-10 w-full rounded-input" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-input" />
            <Skeleton className="h-28 w-full rounded-input" />
          </div>
          <Skeleton className="aspect-video w-full max-w-lg rounded-input" />
        </div>
        {['files', 'samples', 'price', 'storefront'].map(section => (
          <div key={section} className="flex min-w-0 items-center justify-between gap-3 rounded-card-sm border p-4 sm:p-5">
            <Skeleton className="h-5 w-36 max-w-full rounded-input" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
