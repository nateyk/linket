import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowRightIcon,
  GraduationCapIcon,
  PlayCircleIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {
  continueCourses,
  courseHref,
  type PortalCourse,
} from './my-portal-library-ui';
import type {PortalSection} from './portal-section';

export type PortalOverviewOrder = {
  id: string;
  product_title: string | null;
  product_type?: string | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  is_demo?: boolean;
};

export function PortalOverview({
  firstName,
  memberSince,
  courses,
  orders,
  onNavigate,
}: {
  firstName: string;
  memberSince?: string | null;
  courses: PortalCourse[];
  orders: PortalOverviewOrder[];
  onNavigate: (section: PortalSection) => void;
}) {
  const continueList = continueCourses(courses);
  const current = continueList[0];
  const fileOrders = orders.filter(
    order => order.product_type !== 'course' && order.product_type !== 'audio',
  );
  const audioOrders = orders.filter(order => order.product_type === 'audio');
  const recent = orders.slice(0, 3);

  const jumps: {
    id: Extract<PortalSection, 'courses' | 'downloads' | 'audio'>;
    label: string;
    value: string;
    note: ReactNode;
  }[] = [
    {
      id: 'courses',
      label: 'Courses',
      value: String(courses.length),
      note:
        continueList.length > 0 ? (
          <Trans
            message=":count in progress"
            values={{count: continueList.length}}
          />
        ) : (
          <Trans message="No courses in progress" />
        ),
    },
    {
      id: 'downloads',
      label: 'Files',
      value: String(fileOrders.length),
      note: fileOrders[0]?.product_title?.trim() || (
        <Trans message="No files yet" />
      ),
    },
    {
      id: 'audio',
      label: 'Tracks',
      value: String(audioOrders.length),
      note: audioOrders[0]?.product_title?.trim() || (
        <Trans message="No tracks yet" />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          <Trans
            message="Welcome back, :name"
            values={{name: firstName}}
          />
        </p>
        <p className="text-sm text-muted-foreground">
          {memberSince ? (
            <Trans
              message="Member since :date. Everything you've bought lives here."
              values={{date: memberSince}}
            />
          ) : (
            <Trans message="Everything you've bought lives here." />
          )}
        </p>
      </div>

      {current ? (
        <Card.Root className="gap-0 overflow-hidden py-0 md:grid md:grid-cols-5">
          <div className="relative aspect-video overflow-hidden bg-muted md:col-span-2 md:aspect-auto md:min-h-44">
            {current.cover?.url ? (
              <img
                src={current.cover.url}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <GraduationCapIcon className="size-8" aria-hidden="true" />
              </div>
            )}
          </div>
          <Card.Content className="flex flex-col gap-4 p-5 md:col-span-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Trans message="Continue learning" />
            </p>
            <h2 className="text-pretty text-lg font-semibold leading-snug">
              {current.title}
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {current.next_lesson_title ? (
                    <Trans
                      message="Up next: :title"
                      values={{title: current.next_lesson_title}}
                    />
                  ) : (
                    <Trans
                      message=":percent% complete"
                      values={{percent: current.percent}}
                    />
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  {current.percent}%
                </span>
              </div>
              <Progress.Root value={current.percent} aria-label={current.title}>
                <Progress.Track className="h-1.5">
                  <Progress.Indicator />
                </Progress.Track>
              </Progress.Root>
            </div>
            <Button
              className="w-fit"
              render={<Link to={courseHref(current)} />}
            >
              <PlayCircleIcon data-icon="inline-start" />
              <Trans message="Resume lesson" />
            </Button>
          </Card.Content>
        </Card.Root>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {jumps.map(jump => (
          <button
            key={jump.id}
            type="button"
            onClick={() => onNavigate(jump.id)}
            className="group flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-start transition-colors hover:bg-secondary/50"
          >
            <span className="flex items-center justify-between text-sm text-muted-foreground">
              <Trans message={jump.label} />
              <ArrowRightIcon
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="text-2xl font-semibold tabular-nums">
              {jump.value}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {jump.note}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            <Trans message="Recent orders" />
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigate('orders')}
          >
            <Trans message="View all" />
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
        {recent.length ? (
          <div className="overflow-hidden rounded-card border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  <Trans message="Recent orders" />
                </caption>
                <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      <Trans message="Product" />
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 font-medium sm:table-cell"
                    >
                      <Trans message="Date" />
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <Trans message="Amount" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map(order => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {order.product_title || (
                            <Trans message="Purchase" />
                          )}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {order.id}
                        </p>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                        {order.paid_at
                          ? new Date(order.paid_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {formatPrice(
                          order.gross_amount_cents,
                          order.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Trans message="Orders from your purchases will show up here." />
          </p>
        )}
      </div>
    </div>
  );
}
