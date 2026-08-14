import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  HashIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import {Link, useParams} from 'react-router';
import {useCallback, useEffect, useState} from 'react';

type Review = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  approved: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string | null;
  product?: {id: number; title: string} | null;
};

type PaginationMeta = {
  current_page: number;
  last_page: number;
  total: number;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function Component() {
  const {productId} = useParams();
  const [product, setProduct] = useState<{id: number; title: string}>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');

  const [meta, setMeta] = useState<PaginationMeta>();
  const [currentPage, setCurrentPage] = useState(1);

  const [hideTarget, setHideTarget] = useState<Review>();
  const [hideReason, setHideReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Review>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (page: number = currentPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({per_page: '15'});
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (page > 1) params.set('page', String(page));

        const response = await apiClient.get(
          `/api/v1/admin/digital-products/${productId}/reviews?${params.toString()}`,
        );
        setReviews(response.data.data ?? []);
        setProduct(response.data.product);
        setMeta(response.data.meta);
        setCurrentPage(response.data.meta?.current_page ?? 1);
        setError(undefined);
      } catch {
        setError('Unable to load reviews.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, currentPage, productId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setCurrentPage(1);
  };

  const hide = async () => {
    if (!hideTarget) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/reviews/${hideTarget.id}/hide`,
        {reason: hideReason.trim() || undefined},
      );
      setHideTarget(undefined);
      setHideReason('');
      await load();
    } catch {
      setError('Unable to hide review.');
    } finally {
      setBusy(false);
    }
  };

  const unhide = async (review: Review) => {
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/reviews/${review.id}/unhide`,
      );
      await load();
    } catch {
      setError('Unable to restore review.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(
        `/api/v1/admin/digital-products/reviews/${deleteTarget.id}`,
      );
      setDeleteTarget(undefined);
      await load();
    } catch {
      setError('Unable to delete review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Product Reviews" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Back to products" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {product && (
            <h1 className="mb-4 text-lg font-semibold">{product.title}</h1>
          )}

          <Card.Root>
            <div className="border-b p-4">
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                onSubmit={e => {
                  e.preventDefault();
                  applyFilters();
                }}
              >
                <div className="sm:col-span-6">
                  <Input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search reviews, buyers…"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Select.Root
                    value={status}
                    onValueChange={value => setStatus((value as string) ?? '')}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder={<Trans message="Status" />} />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">
                        <Trans message="All reviews" />
                      </Select.Item>
                      <Select.Item value="hidden">
                        <Trans message="Hidden" />
                      </Select.Item>
                      <Select.Item value="visible">
                        <Trans message="Visible" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className="flex gap-2 sm:col-span-3">
                  <Button type="submit" className="flex-1">
                    <SearchIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetFilters}
                  >
                    <Trans message="Reset" />
                  </Button>
                </div>
              </form>
            </div>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="ID" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Product" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Buyer" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Rating" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Review" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Date" />
                    </Table.Head>
                    <Table.Head />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : reviews.length ? (
                    reviews.map(review => (
                      <Table.Row key={review.id}>
                        <Table.Cell>
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <HashIcon className="size-3.5 text-muted-foreground" />
                            {review.id}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {review.product?.title ?? '—'}
                        </Table.Cell>
                        <Table.Cell>
                          <p className="text-sm">{review.buyer_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {review.buyer_email}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <StarIcon
                                key={star}
                                className={
                                  star <= (review.stars ?? 0)
                                    ? 'size-3.5 fill-current text-amber-500'
                                    : 'size-3.5 text-muted'
                                }
                              />
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <p className="font-medium">{review.title ?? '—'}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {review.review ?? '—'}
                          </p>
                          {review.hidden_reason && (
                            <p className="mt-1 text-xs text-destructive">
                              <Trans
                                message="Reason: :reason"
                                values={{reason: review.hidden_reason}}
                              />
                            </p>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {review.hidden_at ? (
                            <Badge variant="outline">
                              <EyeOffIcon />
                              <Trans message="Hidden" />
                            </Badge>
                          ) : (
                            <Badge variant="positive">
                              <Trans message="Visible" />
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end">
                            <Dropdown.Root>
                              <Dropdown.Trigger className="flex size-8 items-center justify-center rounded-input hover:bg-muted">
                                <Trans message="Actions" />
                              </Dropdown.Trigger>
                              <Dropdown.Content align="end">
                                {!review.hidden_at && (
                                  <Dropdown.Item
                                    onClick={() => setHideTarget(review)}
                                  >
                                    <EyeOffIcon />
                                    <Trans message="Hide" />
                                  </Dropdown.Item>
                                )}
                                {review.hidden_at && (
                                  <Dropdown.Item
                                    onClick={() => void unhide(review)}
                                  >
                                    <EyeIcon />
                                    <Trans message="Restore" />
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Item
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(review)}
                                >
                                  <Trash2Icon />
                                  <Trans message="Delete" />
                                </Dropdown.Item>
                              </Dropdown.Content>
                            </Dropdown.Root>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No reviews found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <Trans
                    message="Showing :from - :to of :total"
                    values={{
                      from: (meta.current_page - 1) * 15 + 1,
                      to: Math.min(meta.current_page * 15, meta.total),
                      total: meta.total,
                    }}
                  />
                </p>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => void load(currentPage - 1)}
                  >
                    <Trans message="Previous" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={currentPage >= meta.last_page}
                    onClick={() => void load(currentPage + 1)}
                  >
                    <Trans message="Next" />
                  </Button>
                </div>
              </div>
            )}
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      {hideTarget && (
        <Dialog.Root
          open
          onOpenChange={open => !open && !busy && setHideTarget(undefined)}
        >
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content className="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>
                  <EyeOffIcon />
                  <Trans message="Hide review" />
                </Dialog.Title>
                <Dialog.Description>
                  <Trans message="Hidden reviews no longer appear on the public product page." />
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Field.Root>
                  <Field.Label>
                    <Trans message="Reason (optional)" />
                  </Field.Label>
                  <Textarea
                    rows={3}
                    value={hideReason}
                    onChange={e => setHideReason(e.target.value)}
                    bindToHookForm={false}
                     placeholder="e.g. Contains inaccurate claims…"
                  />
                </Field.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="outline"
                  onClick={() => setHideTarget(undefined)}
                  disabled={busy}
                >
                  <Trans message="Cancel" />
                </Button>
                <Button color="danger" disabled={busy} onClick={() => void hide()}>
                  <EyeOffIcon />
                  <Trans message="Hide review" />
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {deleteTarget && (
        <AlertDialog.Root
          open
          onOpenChange={open => !open && !busy && setDeleteTarget(undefined)}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop />
            <AlertDialog.Content size="sm">
              <AlertDialog.Header>
                <AlertDialog.Media className="bg-destructive/10 text-destructive">
                  <Trash2Icon />
                </AlertDialog.Media>
                <AlertDialog.Title>
                  <Trans message="Delete this review?" />
                </AlertDialog.Title>
                <AlertDialog.Description>
                  <Trans message="This removes the review permanently. This action cannot be undone." />
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel disabled={busy}>
                  <Trans message="Cancel" />
                </AlertDialog.Cancel>
                <AlertDialog.Action
                  color="danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  <Trans message="Delete" />
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}
    </DashboardLayout.MainSection>
  );
}