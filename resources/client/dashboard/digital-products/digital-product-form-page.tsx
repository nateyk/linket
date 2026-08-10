import {BuilderCollapsibleSection} from '@app/dashboard/biolink/biolink-editor/builder-section-header';
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
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Progress} from '@shadcn/progress/progress';
import {Separator} from '@shadcn/separator';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Trans} from '@ui/i18n/trans';
import {
  BookIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  HeadphonesIcon,
  Link2Icon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
  PackageOpenIcon,
} from 'lucide-react';
import {type ChangeEvent, useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';

type FileEntry = {
  id: number;
  name: string;
  file_size?: number;
  extension?: string;
};

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
};

import type {ProductType} from './product-type-selection-page';

type SetupSection = 'details' | 'files' | 'bio-pages';

const PRODUCT_TYPE_CONFIG: Record<
  ProductType,
  {label: string; icon: typeof DownloadIcon}
> = {
  digital: {label: 'Digital product', icon: DownloadIcon},
  ebook: {label: 'E-book', icon: BookIcon},
  audio: {label: 'Audio', icon: HeadphonesIcon},
};

const SECTION_ORDER: SetupSection[] = ['details', 'files', 'bio-pages'];

const SECTION_META: Record<
  SetupSection,
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
    label: 'Bio pages',
    icon: Link2Icon,
    description: 'Select the bio pages where this product will be displayed.',
  },
};

export function Component() {
  return (
    <FileUploadProvider>
      <DigitalProductForm />
    </FileUploadProvider>
  );
}

function DigitalProductForm() {
  const {productId} = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productType = searchParams.get('type') as ProductType | null;
  const [product, setProduct] = useState<Product | null>(null);
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileId, setCoverFileId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [biolinkIds, setBiolinkIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [convertToEtb, setConvertToEtb] = useState(false);
  const [openSection, setOpenSection] = useState<SetupSection | null>(
    'details',
  );

  const typeConfig = productType ? PRODUCT_TYPE_CONFIG[productType] : null;
  const TypeIcon = typeConfig?.icon ?? DownloadIcon;
  const pageTitle = product
    ? 'Edit digital product'
    : typeConfig
      ? `Create ${typeConfig.label}`
      : 'Create digital product';

  useEffect(() => {
    void (async () => {
      try {
        const pageResponse = await fetch(
          '/api/v1/biolinks?fields_preset=minimal',
          {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'},
          },
        );

        if (pageResponse.ok) {
          const payload = await pageResponse.json();
          setBiolinks(payload.data ?? []);
        }

        if (!productId) return;

        const response = await fetch(`/api/v1/digital-products/${productId}`, {
          credentials: 'same-origin',
          headers: {Accept: 'application/json'},
        });

        if (!response.ok) {
          throw new Error(
            await responseErrorMessage(
              response,
              'Unable to load this digital product.',
            ),
          );
        }

        const item = (await response.json()).data as Product;
        setProduct(item);
        setTitle(item.title);
        setDescription(item.description ?? '');
        setPrice((item.price_cents / 100).toFixed(2));
        setCoverUrl(item.cover?.url ?? '');
        setCoverFileId(item.cover_file_entry_id ?? item.cover?.id ?? null);
        setFiles(item.files ?? []);
        setBiolinkIds(item.biolink_ids ?? []);
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
  }, [productId]);

  const save = useCallback(
    async (submitAfterSave = false) => {
      const priceCents = Math.round(Number(price) * 100);

      if (
        !title.trim() ||
        !Number.isFinite(priceCents) ||
        priceCents < 50 ||
        !files.length
      ) {
        setOpenSection(
          !title.trim() || !Number.isFinite(priceCents) || priceCents < 50
            ? 'details'
            : 'files',
        );
        setError(
          'Add a title, a price of at least ETB 0.50, and one downloadable file.',
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

      try {
        const body = {
          title: title.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          currency: 'etb',
          cover_file_entry_id: coverFileId,
          file_ids: files.map(file => file.id),
          biolink_ids: biolinkIds,
        };
        const response = product
          ? await apiClient.put(`/api/v1/digital-products/${product.id}`, body)
          : await apiClient.post('/api/v1/digital-products', body);
        const saved = response.data as Product;
        setProduct(saved);

        if (submitAfterSave) {
          setSubmitting(true);
          await apiClient.post(`/api/v1/digital-products/${saved.id}/submit`);
        }

        navigate(`/dashboard/my-products/${saved.id}/edit`, {replace: true});
        if (submitAfterSave) navigate('/dashboard/my-products');
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Unable to save product.',
        );
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
      title,
    ],
  );

  const remove = async () => {
    if (!product || !window.confirm('Delete this digital product?')) return;

    setSaving(true);
    try {
      await apiClient.delete(`/api/v1/digital-products/${product.id}`);
      navigate('/dashboard/my-products');
    } catch {
      setError('Unable to delete product.');
    } finally {
      setSaving(false);
    }
  };

  const isSectionComplete = (section: SetupSection) => {
    if (section === 'details')
      return title.trim().length > 0 && price.trim().length > 0;
    if (section === 'files') return files.length > 0;
    return biolinkIds.length > 0;
  };

  const completedSections = SECTION_ORDER.filter(isSectionComplete).length;

  return (
    <DashboardLayout.MainSection>
      {/* Page Header */}
      <header className="flex h-14 w-full shrink-0 items-center gap-3 border-b px-4 md:px-6">
        <DashboardLayout.SidebarToggle />
        <div className="flex min-w-0 items-center gap-2.5">
          <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
          <h1 className="truncate text-[15px] font-semibold">
            <Trans message={pageTitle} />
          </h1>
          {product && <ProductStatus status={product.status} />}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {product && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => void remove()}
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
            disabled={saving || submitting}
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
      </header>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-card-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <span className="min-w-0 flex-1">{error}</span>
            </div>
          )}

          {loading ? (
            <BuilderSkeleton />
          ) : (
            <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-6">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <Trans message="Product setup" />
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Trans
                        message=":completed of 3 sections complete"
                        values={{completed: completedSections}}
                      />
                    </p>
                  </div>
                  <Progress.Root
                    value={(completedSections / SECTION_ORDER.length) * 100}
                    className="w-full lg:w-48"
                    aria-label="Product setup progress"
                  >
                    <Progress.Track className="h-1.5">
                      <Progress.Indicator />
                    </Progress.Track>
                  </Progress.Root>
                </div>

                <div className="min-w-0 divide-y overflow-hidden rounded-card border bg-card">
                  {SECTION_ORDER.map(section => {
                    const meta = SECTION_META[section];
                    const Icon = meta.icon;
                    const isComplete = isSectionComplete(section);
                    const count =
                      section === 'files'
                        ? files.length
                        : section === 'bio-pages'
                          ? biolinkIds.length
                          : null;

                    return (
                      <BuilderCollapsibleSection
                        key={section}
                        open={openSection === section}
                        onOpenChange={open =>
                          setOpenSection(open ? section : null)
                        }
                        icon={Icon}
                        isComplete={isComplete}
                        title={<Trans message={meta.label} />}
                        description={<Trans message={meta.description} />}
                        trailing={
                          count !== null && count > 0 ? (
                            <Badge
                              variant="secondary"
                              className="h-4 min-w-[16px] px-1 text-[10px]"
                            >
                              {count}
                            </Badge>
                          ) : undefined
                        }
                      >
                        <div className="max-w-2xl">
                          {section === 'details' && (
                            <DetailsPanel
                              title={title}
                              description={description}
                              price={price}
                              coverUrl={coverUrl}
                              onTitleChange={setTitle}
                              onDescriptionChange={setDescription}
                              onPriceChange={setPrice}
                              legacyCurrency={product?.currency}
                              convertToEtb={convertToEtb}
                              onConvertToEtbChange={setConvertToEtb}
                              onCoverChange={(url, entry) => {
                                setCoverUrl(url);
                                setCoverFileId(entry?.id ?? null);
                              }}
                            />
                          )}
                          {section === 'files' && (
                            <FilesPanel
                              files={files}
                              onUploaded={file =>
                                setFiles(current =>
                                  current.some(item => item.id === file.id)
                                    ? current
                                    : [...current, file],
                                )
                              }
                              onRemove={id =>
                                setFiles(current =>
                                  current.filter(file => file.id !== id),
                                )
                              }
                            />
                          )}
                          {section === 'bio-pages' && (
                            <BioPagesPanel
                              biolinks={biolinks}
                              selectedIds={biolinkIds}
                              onChange={setBiolinkIds}
                            />
                          )}
                        </div>
                      </BuilderCollapsibleSection>
                    );
                  })}
                </div>
              </div>

              <aside className="min-w-0 lg:sticky lg:top-6">
                <ProductBuilderPreview
                  title={title}
                  description={description}
                  price={price}
                  coverUrl={coverUrl}
                  fileCount={files.length}
                  productTypeLabel={typeConfig?.label ?? 'Digital product'}
                />
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ProductBuilderPreview({
  title,
  description,
  price,
  coverUrl,
  fileCount,
  productTypeLabel,
}: {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  fileCount: number;
  productTypeLabel: string;
}) {
  const previewDescription = description
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const numericPrice = Number(price);
  const formattedPrice = Number.isFinite(numericPrice)
    ? `ETB ${numericPrice.toFixed(2)}`
    : 'ETB 0.00';

  return (
    <div className="overflow-hidden rounded-card border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            <Trans message="Customer preview" />
          </p>
          <p className="text-xs text-muted-foreground">
            <Trans message="Updates as you build" />
          </p>
        </div>
        <Badge variant="secondary">
          <Trans message="Live" />
        </Badge>
      </div>
      <div className="relative aspect-[4/3] bg-muted">
        {coverUrl ? (
          <img className="size-full object-cover" src={coverUrl} alt="" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <PackageOpenIcon className="size-8" />
            <span className="text-xs">
              <Trans message="Add a cover image" />
            </span>
          </div>
        )}
        <Badge className="absolute right-3 bottom-3 bg-background/95 text-foreground shadow-sm">
          {formattedPrice}
        </Badge>
      </div>
      <Separator />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <Badge variant="outline" className="w-fit">
            <Trans message={productTypeLabel} />
          </Badge>
          <h2 className="text-lg leading-tight font-semibold text-pretty">
            {title.trim() || <Trans message="Your digital product" />}
          </h2>
          <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
            {previewDescription || (
              <Trans message="Your product description will appear here." />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <FileIcon className="size-4" />
          <Trans message=":count download files" values={{count: fileCount}} />
        </div>
        <Button disabled className="w-full">
          <Trans message="Buy now" />
        </Button>
      </div>
    </div>
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
}) {
  return (
    <div className="space-y-4">
      <Field.Root>
        <Field.Label>
          <Trans message="Product title" />
        </Field.Label>
        <Field.Description>
          <Trans message="Choose a clear title customers can easily understand." />
        </Field.Description>
        <Input
          value={title}
          maxLength={160}
          onChange={event => onTitleChange(event.target.value)}
          placeholder="My digital guide"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Price" />
        </Field.Label>
        <Field.Description>
          <Trans message="Set the amount customers will pay." />
        </Field.Description>
        <div className="flex items-center gap-2">
          <span className="flex h-9 items-center rounded-card-sm border border-border bg-muted/50 px-3 text-[13px] font-medium text-muted-foreground">
            ETB
          </span>
          <Input
            type="number"
            min="0.50"
            step="0.01"
            value={price}
            onChange={event => onPriceChange(event.target.value)}
            placeholder="9.00"
            className="flex-1"
          />
        </div>
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
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Field.Description>
          <Trans message="Describe what customers will receive." />
        </Field.Description>
        <DescriptionEditor value={description} onChange={onDescriptionChange} />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Cover image" />
        </Field.Label>
        <Field.Description>
          <Trans message="Shown on your product listing and bio pages." />
        </Field.Description>
        <ImageSelector.Square
          value={coverUrl}
          onChange={onCoverChange}
          uploadType="linkImages"
          placeholderVariant="dropzone"
        />
      </Field.Root>
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
}: {
  files: FileEntry[];
  onUploaded: (file: FileEntry) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-3">
      <DownloadUploader onUploaded={onUploaded} />
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
                  {formatFileSize(file.file_size)}
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
        <Trans message="Create a bio page first, then return here to display this product." />
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

/* ─── Product Status ─── */

function ProductStatus({status}: {status: string}) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'In review',
    approved: 'Approved',
    rejected: 'Needs changes',
    archived: 'Archived',
  };

  return (
    <Badge variant="outline">
      <Trans message={labels[status] ?? 'Draft'} />
    </Badge>
  );
}

/* ─── Download Uploader ─── */

function DownloadUploader({
  onUploaded,
}: {
  onUploaded: (file: FileEntry) => void;
}) {
  const {uploadFile, uploadStatus, percentage} = useActiveUpload();
  const uploading = uploadStatus === 'inProgress';

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadFile(file, {
      uploadType: 'digitalProductFiles',
      showToastOnRestrictionFail: true,
      onSuccess: entry =>
        onUploaded({
          id: entry.id,
          name: entry.name,
          file_size: entry.file_size,
          extension: entry.extension ?? undefined,
        }),
    });
    event.target.value = '';
  };

  return (
    <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-card-sm border border-dashed border-border px-5 py-6 text-center transition-colors hover:bg-muted/40">
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept=".pdf,.zip,.txt,.epub"
        disabled={uploading}
        onChange={onChange}
      />
      <div className="flex size-9 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
        <UploadIcon className="size-4" />
      </div>
      <span className="text-[13px] font-medium">
        {uploading ? (
          <Trans message="Uploading file..." />
        ) : (
          <Trans message="Add product file" />
        )}
      </span>
      <span className="text-[12px] text-muted-foreground">
        <Trans message="PDF, ZIP, EPUB, or TXT" />
      </span>
      {uploading && (
        <Progress.Root
          className="absolute right-3 bottom-2 left-3"
          value={percentage}
        >
          <Progress.Track>
            <Progress.Indicator />
          </Progress.Track>
        </Progress.Root>
      )}
    </label>
  );
}

/* ── Skeleton ─── */

function BuilderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-48" />
      <div className="rounded-card border border-border">
        <div className="border-b px-4 py-3.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3.5 w-56" />
        </div>
        <div className="space-y-4 px-4 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function responseErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => undefined);
  return typeof payload?.message === 'string' ? payload.message : fallback;
}
