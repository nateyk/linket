import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  EyeOffIcon,
  StarIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type Review = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  created_at: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
};

export function Component() {
  const {productId} = useParams();
  const {trans} = useTrans();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await apiClient.get(
        `/api/v1/digital-products/${productId}/reviews?per_page=100`,
      );
      setReviews(response.data.data ?? []);
    } catch {
      setError(trans({message: 'Unable to load reviews.'}));
    } finally {
      setLoading(false);
    }
  }, [productId, trans]);

  useEffect(() => {
    void load();
  }, [load]);

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
          render={<Link to="/dashboard/my-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Back to products" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl py-6">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <CircleAlertIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Card.Root>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="Rating" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Review" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Buyer" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Date" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <Skeleton className="h-20 w-full" />
                      </Table.Cell>
                    </Table.Row>
                  ) : reviews.length ? (
                    reviews.map(review => (
                      <Table.Row key={review.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
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
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {review.buyer_name ?? (
                            <Trans message="Verified buyer" />
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
                          {review.created_at
                            ? <FormattedDate date={review.created_at} />
                            : '—'}
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No reviews yet." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
