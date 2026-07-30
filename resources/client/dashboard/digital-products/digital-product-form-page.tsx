import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  CheckIcon,
  FileIcon,
  FileTextIcon,
  Link2Icon,
  PackageCheckIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react';
import {type ChangeEvent, useCallback, useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';

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

type SetupSection = 'details' | 'files' | 'bio-pages';

export function Component() {
  return (
    <FileUploadProvider>
      <DigitalProductForm />
    </FileUploadProvider>
  );
}

function DigitalProductForm() {
  const {productId} = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileId, setCoverFileId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [biolinkIds, setBiolinkIds] = useState<number[]>([]);
  const [activeSection, setActiveSection] = useState<SetupSection>('details');
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [convertToEtb, setConvertToEtb] = useState(false);

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

        const response = await fetch(
          `/api/v1/digital-products/${productId}`,
          {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'},
          },
        );

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
        setError('Add a title, a price of at least ETB 0.50, and one downloadable file.');
        setActiveSection(!title.trim() || priceCents < 50 ? 'details' : 'files');
        return;
      }
      if (product && product.currency.toLowerCase() !== 'etb' && !convertToEtb) {
        setError('Enter the correct ETB price and confirm the currency conversion before saving this product.');
        setActiveSection('details');
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
    [biolinkIds, convertToEtb, coverFileId, description, files, navigate, price, product, title],
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

  const displayPrice = formatPrice(price, product?.currency ?? 'ETB');
  const sections: Array<{
    id: SetupSection;
    label: string;
    complete: boolean;
    icon: typeof FileTextIcon;
  }> = [
    {
      id: 'details',
      label: 'Product details',
      complete: Boolean(title.trim()) && Number(price) >= 0.5,
      icon: FileTextIcon,
    },
    {
      id: 'files',
      label: 'Product files',
      complete: files.length > 0,
      icon: PackageCheckIcon,
    },
    {
      id: 'bio-pages',
      label: 'Bio pages',
      complete: biolinkIds.length > 0,
      icon: Link2Icon,
    },
  ];

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message={product ? 'Edit digital product' : 'Create digital product'} />
        </DashboardLayout.SectionTitle>
        {product && <ProductStatus status={product.status} />}
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" render={<Link to="/dashboard/my-products" />}>
              <ArrowLeftIcon />
              <Trans message="All products" />
            </Button>
            <div className="flex items-center gap-2">
              {product && (
                <Button
                  color="danger"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void remove()}
                >
                  <Trash2Icon />
                  <Trans message="Delete" />
                </Button>
              )}
              <Button
                variant="outline"
                disabled={saving || submitting}
                onClick={() => void save(false)}
              >
                <SaveIcon />
                {saving ? <Trans message="Saving..." /> : <Trans message="Save draft" />}
              </Button>
              <Button
                disabled={saving || submitting}
                onClick={() => void save(true)}
              >
                <SendIcon />
                {submitting ? (
                  <Trans message="Submitting..." />
                ) : (
                  <Trans message="Submit for review" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <BuilderSkeleton />
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <section className="min-w-0">
                <div className="flex items-center gap-2 border-b pb-3">
                  <span className="text-sm font-medium">
                    <Trans message="Product page" />
                  </span>
                  <Badge variant="secondary">
                    <Trans message="Live preview" />
                  </Badge>
                </div>
                <div className="bg-muted/30 p-4 sm:p-5">
                  <ProductPagePreview
                    title={title}
                    description={description}
                    price={displayPrice}
                    coverUrl={coverUrl}
                    files={files.length}
                  />
                </div>
              </section>

              <aside className="border-t pt-4 xl:sticky xl:top-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
                <h2 className="text-sm font-medium">
                  <Trans message="Product setup" />
                </h2>
                <div className="mt-3 space-y-1">
                  {sections.map(section => (
                    <SetupSectionButton
                      key={section.id}
                      icon={section.icon}
                      label={section.label}
                      active={activeSection === section.id}
                      complete={section.complete}
                      onClick={() => setActiveSection(section.id)}
                    />
                  ))}
                </div>
                <div className="mt-5 border-t pt-5">
                  {activeSection === 'details' && (
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
                  {activeSection === 'files' && (
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
                        setFiles(current => current.filter(file => file.id !== id))
                      }
                    />
                  )}
                  {activeSection === 'bio-pages' && (
                    <BioPagesPanel
                      biolinks={biolinks}
                      selectedIds={biolinkIds}
                      onChange={setBiolinkIds}
                    />
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function SetupSectionButton({
  icon: Icon,
  label,
  active,
  complete,
  onClick,
}: {
  icon: typeof FileTextIcon;
  label: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-left text-sm transition-colors ${
        active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1 truncate">
        <Trans message={label} />
      </span>
      <span
        className={`grid size-5 place-items-center rounded-full border ${
          complete
            ? 'border-positive bg-positive text-positive-foreground'
            : 'border-muted-foreground/30 text-transparent'
        }`}
      >
        <CheckIcon className="size-3" />
      </span>
    </button>
  );
}

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
    <div className="space-y-5">
      <Field.Root>
        <Field.Label>
          <Trans message="Product title" />
        </Field.Label>
        <Input
          value={title}
          maxLength={160}
          onChange={event => onTitleChange(event.target.value)}
          placeholder="My digital guide"
        />
      </Field.Root>
      {legacyCurrency && legacyCurrency.toLowerCase() !== 'etb' && (
        <label className="flex items-start gap-3 rounded-input border bg-muted/30 p-3 text-sm">
          <Checkbox checked={convertToEtb} onCheckedChange={value => onConvertToEtbChange(value === true)} />
          <span>
            <span className="block font-medium"><Trans message="Convert this product price to ETB" /></span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              <Trans message="Set the correct Ethiopian birr amount above. Existing sales remain in their original currency." />
            </span>
          </span>
        </label>
      )}
      <Field.Root>
        <Field.Label>
          <Trans message="Price" />
        </Field.Label>
        <Input
          type="number"
          min="0.50"
          step="0.01"
          value={price}
          onChange={event => onPriceChange(event.target.value)}
          placeholder="9.00"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea
          value={description}
          rows={5}
          maxLength={5000}
          onChange={event => onDescriptionChange(event.target.value)}
          placeholder="What will customers receive?"
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>
          <Trans message="Cover image" />
        </Field.Label>
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
      {files.map(file => (
        <div
          key={file.id}
          className="flex items-center gap-3 border-b py-3 text-sm last:border-b-0"
        >
          <div className="flex size-8 items-center justify-center rounded-input bg-muted text-muted-foreground">
            <FileIcon className="size-4" />
          </div>
          <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
          <Button size="icon-xs" variant="ghost" onClick={() => onRemove(file.id)}>
            <Trash2Icon />
          </Button>
        </div>
      ))}
    </div>
  );
}

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
      <p className="text-sm text-muted-foreground">
        <Trans message="Create a bio page first, then return here to display this product." />
      </p>
    );
  }

  return (
    <div className="divide-y border-y">
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

function ProductPagePreview({
  title,
  description,
  price,
  coverUrl,
  files,
}: {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  files: number;
}) {
  const previewTitle = title || 'Your digital product';

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-card border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="truncate text-sm font-semibold">{previewTitle}</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-semibold">{price}</span>
          <Button size="sm" disabled>
            <Trans message="Buy now" />
          </Button>
        </div>
      </div>
      <div className="aspect-[16/9] bg-gradient-to-br from-primary/30 via-primary/10 to-muted">
        {coverUrl ? (
          <img className="size-full object-cover" src={coverUrl} alt="" />
        ) : (
          <div className="flex size-full items-end p-5">
            <Badge className="bg-background/90 text-foreground shadow-sm">
              <Trans message="Digital download" />
            </Badge>
          </div>
        )}
      </div>
      <div className="grid divide-y sm:grid-cols-[minmax(0,1fr)_13rem] sm:divide-x sm:divide-y-0">
            <div className="p-5 sm:p-6">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {previewTitle}
              </h1>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {description || (
                  <Trans message="Your product description will appear here." />
                )}
              </p>
            </div>
            <div className="flex flex-col justify-between gap-5 p-5">
              <div>
                <p className="text-2xl font-semibold tracking-tight">{price}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <Trans message="One-time payment" />
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileIcon className="size-3.5" />
                  <Trans message=":count download files" values={{count: files}} />
                </div>
                <Button className="w-full" disabled>
                  <Trans message="Buy now" />
                </Button>
              </div>
            </div>
      </div>
    </div>
  );
}

function ProductStatus({status}: {status: string}) {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'In review',
    approved: 'Approved',
    rejected: 'Needs changes',
    archived: 'Archived',
  };

  return <Badge variant="outline"><Trans message={labels[status] ?? 'Draft'} /></Badge>;
}

function DownloadUploader({onUploaded}: {onUploaded: (file: FileEntry) => void}) {
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
          extension: entry.extension,
        }),
    });
    event.target.value = '';
  };

  return (
    <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-input border border-dashed px-5 py-8 text-center transition-colors hover:bg-muted/40">
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept=".pdf,.zip,.txt,.epub"
        disabled={uploading}
        onChange={onChange}
      />
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadIcon className="size-5" />
      </div>
      <span className="text-sm font-medium">
        {uploading ? (
          <Trans message="Uploading file..." />
        ) : (
          <Trans message="Add product file" />
        )}
      </span>
      <span className="text-xs text-muted-foreground">
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

function BuilderSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-4">
        <div className="h-5 w-30 animate-pulse rounded bg-muted" />
        <div className="aspect-[16/10] animate-pulse rounded-card bg-muted" />
      </div>
      <div className="space-y-4 border-t pt-4 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
          {[1, 2, 3, 4].map(item => (
            <div key={item} className="h-10 animate-pulse rounded-input bg-muted" />
          ))}
      </div>
    </div>
  );
}

function formatPrice(price: string, currency: string) {
  const value = Number(price);
  return value > 0
    ? new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(value)
    : 'ETB 0.00';
}

async function responseErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => undefined);
  return typeof payload?.message === 'string' ? payload.message : fallback;
}
