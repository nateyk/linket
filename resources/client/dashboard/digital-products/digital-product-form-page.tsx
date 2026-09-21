import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {apiClient} from '@common/http/query-client';
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
import {Trans} from '@ui/i18n/trans';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {
  BookIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  GraduationCapIcon,
  HeadphonesIcon,
  Link2Icon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';
import {parseWizardPrefill, firstInvalidFieldId} from './product-create-flow';
import {
  ProductCreationProvider,
  useProductCreation,
} from './product-creation-context';
import type {FileEntry} from './product-creation-context';
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

const SECTION_ORDER: ProductSetupSection[] = ['details', 'files', 'bio-pages'];

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
  const {productId} = useParams();
  return (
    <FileUploadProvider>
      <ProductCreationProvider
        prefill={parseWizardPrefill(searchParams)}
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
  const {state, actions, dirty} = useProductCreation();
  const title = state.title;
  const description = state.description;
  const price = state.price;
  const coverUrl = state.coverUrl;
  const coverFileId = state.coverFileId;
  const files = state.files;
  const biolinkIds = state.biolinkIds;
  const productType = state.productType as ProductType | null;
  const [product, setProduct] = useState<Product | null>(null);
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [convertToEtb, setConvertToEtb] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openSection, setOpenSection] = useState<ProductSetupSection | null>(
    'details',
  );

  useEffect(() => {
    if (dirty) actions.autoSave();
  }, [dirty, actions]);

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
    ? 'Edit digital product'
    : typeConfig
      ? `Create ${typeConfig.label}`
      : 'Create digital product';

  useEffect(() => {
    void (async () => {
      try {
        if (productId) {
          const response = await apiClient.get(
            `/api/v1/digital-products/${productId}`,
          );
          const item = response.data.data as Product;
          if (item.type === 'course') {
            navigate(`/dashboard/my-products/${item.id}/course`, {
              replace: true,
            });
            return;
          }
          setProduct(item);
          actions.setTitle(item.title);
          actions.setDescription(item.description ?? '');
          actions.setPrice((item.price_cents / 100).toFixed(2));
          {
            const coverId =
              item.cover_file_entry_id ?? item.cover?.id ?? null;
            actions.setCover(
              item.cover?.url ?? '',
              coverId != null ? {id: coverId} : undefined,
            );
          }
          actions.setFiles(item.files ?? []);
          actions.setBiolinkIds(item.biolink_ids ?? []);
          if (item.type) {
            actions.setProductType(item.type as ProductType);
          }
        }

        try {
          const pageResponse = await apiClient.get(
            '/api/v1/biolinks?fields_preset=minimal',
          );
          const payload = pageResponse.data;
          setBiolinks(payload.data ?? []);
        } catch {
          // Storefront placement is optional, so a failed list request is non-fatal.
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load this digital product.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, productId, actions]);

  const save = useCallback(
    async (submitAfterSave = false) => {
      const priceCents = Math.round(Number(price) * 100);
      const effectiveType = product?.type ?? productType ?? 'digital';
      const isCourse = effectiveType === 'course';

      if (
        !title.trim() ||
        !Number.isFinite(priceCents) ||
        priceCents < 0 ||
        (!isCourse && !files.length)
      ) {
        setOpenSection(
          !title.trim() || !Number.isFinite(priceCents) || priceCents < 0
            ? 'details'
            : 'files',
        );
        setError(
          isCourse
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
          biolink_ids: biolinkIds,
          type: effectiveType,
        };
        // For courses, file_ids is optional — send empty array as-is, backend allows it
        const response = product
          ? await apiClient.put(`/api/v1/digital-products/${product.id}`, body)
          : await apiClient.post('/api/v1/digital-products', body);
        saved = response.data.data as Product;
        setProduct(saved);

        if (submitAfterSave) {
          setSubmitting(true);
          await apiClient.post(`/api/v1/digital-products/${saved.id}/submit`);
        }

        if (isCourse || saved.type === 'course') {
          navigate(`/dashboard/my-products/${saved.id}/course`, {
            replace: true,
          });
        } else {
          navigate(`/dashboard/my-products/${saved.id}/edit`, {replace: true});
        }
        if (submitAfterSave) navigate('/dashboard/my-products');
      } catch (reason) {
        const validationErrors = getValidationErrors(reason);
        if (Object.keys(validationErrors).length) {
          setFieldErrors(validationErrors);
          setOpenSection(validationErrors.file_ids ? 'files' : 'details');
          const focusId = firstInvalidFieldId(validationErrors);
          if (focusId) {
            requestAnimationFrame(() => {
              document.getElementById(focusId)?.focus({preventScroll: false});
            });
          }
        } else {
          setError(
            saved && submitAfterSave
              ? 'Draft saved, but submission failed. Fix the issue and try again.'
              : reason instanceof Error
                ? reason.message
                : 'Unable to save product.',
          );
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
      navigate,
      price,
      product,
      productType,
      title,
    ],
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
          const idx = SECTION_ORDER.indexOf(current ?? 'details');
          return SECTION_ORDER[Math.min(idx + 1, SECTION_ORDER.length - 1)];
        });
      }
      if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        setOpenSection(current => {
          const idx = SECTION_ORDER.indexOf(current ?? 'details');
          return SECTION_ORDER[Math.max(idx - 1, 0)];
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  const remove = async (): Promise<boolean> => {
    if (!product) return false;

    setSaving(true);
    try {
      await apiClient.delete(`/api/v1/digital-products/${product.id}`);
      navigate('/dashboard/my-products');
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
    if (section === 'details')
      return title.trim().length > 0 && price.trim().length > 0;
    if (section === 'files') return isCourse ? true : files.length > 0;
    return true;
  };

  const completedSections = SECTION_ORDER.filter(isSectionComplete).length;
  const canSubmit =
    !product || product.status === 'draft' || product.status === 'rejected';

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb>
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/dashboard/my-products">
              <Trans message="All products" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message={pageTitle} />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle>
          <Trans message={pageTitle} />
          {product && <ProductStatus status={product.status} />}
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          {product && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
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
            disabled={saving || submitting}
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
            disabled={saving || submitting || !canSubmit}
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
        <div className="mx-auto w-full max-w-6xl py-4 sm:py-5">
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

          {product?.status === 'approved' && (
            <Alert.Root variant="warning" fillStyle="subtleFill" className="mb-5">
              <TriangleAlertIcon />
              <Alert.Description>
                <Trans message="Saving changes will return this approved product to draft." />
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
              <Alert.Title>Course product</Alert.Title>
              <Alert.Description className="flex flex-wrap items-center gap-2">
                <span>
                  After saving, you’ll build your curriculum in the course
                  builder.
                </span>
                {product && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate(`/dashboard/my-products/${product.id}/course`)
                    }
                  >
                    <GraduationCapIcon />
                    Open course builder
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
          ) : (
            <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
              <div className="flex min-w-0 flex-col gap-4">
                <ProductFormProgress
                  completed={completedSections}
                  total={2}
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
                  {SECTION_ORDER.map(section => {
                    const meta = SECTION_META[section];

                    return (
                      <ProductFormSection
                        key={section}
                        id={section}
                        title={meta.label}
                        description={meta.description}
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
  coverUrl,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  legacyCurrency,
  convertToEtb,
  onConvertToEtbChange,
  onCoverChange,
  errors,
}: {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  legacyCurrency?: string;
  convertToEtb: boolean;
  onConvertToEtbChange: (value: boolean) => void;
  onCoverChange: (url: string, entry?: {id: number}) => void;
  errors: FieldErrors;
  validateField: (field: string, value: string) => void;
}) {
  const {validateField} = arguments[0] as {validateField: (field: string, value: string) => void};
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

      <ProductFormField
        label="Price"
        description="Set ETB 0 to offer this product for free."
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
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                <Trans message="Set the correct Ethiopian birr amount above. Existing sales remain in their original currency." />
              </span>
            </span>
          </label>
        )}
      </ProductFormField>

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
        />
      </ProductFormField>
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
      <div className="overflow-hidden rounded-card-sm border border-border">
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
        <div className="divide-y">
          {files.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-1 py-2.5 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground">
                <FileIcon className="size-4" />
              </div>
              <span className="min-w-0 flex-1 truncate font-medium">
                {file.name}
              </span>
              {file.file_size && (
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  <FormattedBytes bytes={file.file_size} />
                </span>
              )}
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onRemove(file.id)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
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
      <p className="py-4 text-[13px] text-muted-foreground">
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
              <span className="block truncate text-[12px] text-muted-foreground">
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
