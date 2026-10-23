import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';
import {
  GraduationCapIcon,
  HeadphonesIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {auth} from '@common/auth/use-auth';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {
  DEMO_AUDIO_ORDERS,
  DEMO_DOWNLOAD_ORDERS,
  DEMO_PORTAL_COURSES,
} from './my-portal-demo-data';
import {PortalEntitlementPack} from './portal-entitlement-packs';
import {PortalOrdersTable} from './portal-orders-table';
import {PortalSettingsPanel} from './portal-settings-panel';
import {
  filterCourses,
  PortalCourseFilters,
  PortalCourseGrid,
  type CourseFilter,
  type PortalCourse,
} from './my-portal-library-ui';
import {MyPortalShell} from './my-portal-shell';
import {PortalSidebar} from './my-portal-sidebar';
import {PortalLibraryLayout} from './portal-library-layout';
import {PortalOverview} from './portal-overview';
import {parsePortalSection, type PortalSection} from './portal-section';
import {PortalSectionLayout} from './portal-section-layout';
import {PortalReviewDialog} from './portal-review-dialog';
import {
  PORTAL_EMAIL_KEY,
  type PortalOrder,
  type PortalOrderDownload,
} from './portal-order-types';

type EnrolledCourse = PortalCourse;

export function MyPortalLibrary({mode}: {mode: 'auth' | 'guest'}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = parsePortalSection(searchParams.get('section'));
  const setActiveSection = (section: PortalSection) => {
    const next = new URLSearchParams(searchParams);
    if (section === 'overview') {
      next.delete('section');
    } else {
      next.set('section', section);
    }
    setSearchParams(next, {replace: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [orders, setOrders] = useState<PortalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFailed, setCourseFailed] = useState(false);
  const [purchasesError, setPurchasesError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [reviewOrderId, setReviewOrderId] = useState<string>();
  const portalEmail = (() => {
    try {
      return sessionStorage.getItem(PORTAL_EMAIL_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  })();
  const load = useCallback(async () => {
    setLoading(true);
    setCourseFailed(false);
    setPurchasesError(undefined);
    try {
      if (mode === 'guest') {
        const response = await apiClient.get('/api/v1/public/my-portal/library');
        const payload = response.data;
        setCourses(payload?.courses ?? payload?.data?.courses ?? []);
        setOrders(payload?.orders ?? payload?.data?.orders ?? []);
      } else {
        const [coursesResult, purchasesResult] = await Promise.allSettled([
          apiClient.get('/api/v1/my-courses'),
          apiClient.get('/api/v1/public/my-portal/library'),
        ]);
        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.data.data ?? []);
        } else {
          setCourseFailed(true);
        }
        if (purchasesResult.status === 'fulfilled') {
          const payload = purchasesResult.value.data;
          setOrders(payload?.orders ?? payload?.data?.orders ?? []);
          const libraryCourses =
            payload?.courses ?? payload?.data?.courses ?? [];
          if (coursesResult.status !== 'fulfilled' && libraryCourses.length) {
            setCourses(libraryCourses);
            setCourseFailed(false);
          }
        } else {
          const apiMessage = getApiErrorMessage(purchasesResult.reason);
          setPurchasesError(
            apiMessage !== 'An error occurred.'
              ? apiMessage
              : 'Your portal session has expired.',
          );
        }
      }
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      if (mode === 'guest') {
        setPurchasesError(
          apiMessage !== 'An error occurred.'
            ? apiMessage
            : 'Your portal session has expired.',
        );
      } else {
        setCourseFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const withCsrf = async (): Promise<Record<string, string>> => {
    await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
    const token = document.cookie
      .split('; ')
      .find(value => value.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    return headers;
  };

  const download = async (order: PortalOrder, entitlement: PortalOrderDownload) => {
    if (order.is_demo) {
      toast(message('Sample download — real files appear after purchase.'));
      return;
    }
    setBusy(`download-${entitlement.id}`);
    try {
      const headers = await withCsrf();
      const response = await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/downloads/${entitlement.id}`,
        {},
        {headers},
      );
      const payload = response.data;
      if (!payload?.url)
        throw new Error(
          payload?.message || 'This protected download is no longer available.',
        );
      window.location.assign(payload.url);
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      toast.danger(
        apiMessage !== 'An error occurred.'
          ? apiMessage
          : reason instanceof Error
            ? reason.message
            : 'Unable to prepare your download.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const resend = async (order: PortalOrder) => {
    if (order.is_demo) {
      toast(message('Sample receipt — real receipts appear after purchase.'));
      return;
    }
    setBusy(`receipt-${order.id}`);
    try {
      const headers = await withCsrf();
      const response = await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/resend-receipt`,
        {},
        {headers},
      );
      const payload = response.data;
      if (!payload && response.status >= 400)
        throw new Error('Unable to resend the receipt.');
      toast(message('Your receipt is being sent.'));
      void load();
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      toast.danger(
        apiMessage !== 'An error occurred.'
          ? apiMessage
          : reason instanceof Error
            ? reason.message
            : 'Unable to resend the receipt.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const realDownloadOrders = orders.filter(
    order =>
      order.product_type !== 'course' &&
      order.product_type !== 'audio' &&
      !order.course_id,
  );
  const realAudioOrders = orders.filter(
    order => order.product_type === 'audio',
  );
  // Full empty library → sample layout; any real purchase replaces demos.
  const usingDemoLibrary =
    !loading &&
    !courses.length &&
    !realDownloadOrders.length &&
    !realAudioOrders.length &&
    !courseFailed &&
    !(purchasesError && mode === 'auth');
  const displayCourses = usingDemoLibrary ? DEMO_PORTAL_COURSES : courses;
  const filteredCourses = filterCourses(displayCourses, filter);
  const downloadOrders = usingDemoLibrary
    ? (DEMO_DOWNLOAD_ORDERS as PortalOrder[])
    : realDownloadOrders;
  const audioOrders = usingDemoLibrary
    ? (DEMO_AUDIO_ORDERS as PortalOrder[])
    : realAudioOrders;
  const reviewingOrder = orders.find(order => order.id === reviewOrderId);
  const authQuery = portalEmail
    ? `?email=${encodeURIComponent(portalEmail)}`
    : '';

  const sectionTitle =
    activeSection === 'overview' ? (
      <Trans message="Overview" />
    ) : activeSection === 'courses' ? (
      <Trans message="My courses" />
    ) : activeSection === 'downloads' ? (
      <Trans message="Downloads" />
    ) : activeSection === 'audio' ? (
      <Trans message="Audio library" />
    ) : activeSection === 'orders' ? (
      <Trans message="Orders" />
    ) : (
      <Trans message="Account settings" />
    );

  if (loading) {
    return (
      <PortalLibraryLayout>
        <PortalSidebar
          mode={mode}
          email={portalEmail || auth.user?.email || undefined}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          counts={{
            courses: 0,
            downloads: 0,
            audio: 0,
          }}
        />
        <PortalSectionLayout title={sectionTitle}>
          <div className="flex min-h-40 items-center justify-center">
            <Spinner />
          </div>
        </PortalSectionLayout>
      </PortalLibraryLayout>
    );
  }

  if (purchasesError && mode === 'guest' && !courses.length) {
    return (
      <MyPortalShell>
        <Alert variant="warning" fillStyle="subtleFill">
          <ShieldCheckIcon />
          <Alert.Title>
            <Trans message="Session unavailable" />
          </Alert.Title>
          <Alert.Description>
            <p>{purchasesError}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              render={<Link to="/my-portal" state={{forceRecovery: true}} />}
            >
              <Trans message="Request a new code" />
            </Button>
          </Alert.Description>
        </Alert>
      </MyPortalShell>
    );
  }

  return (
    <PortalLibraryLayout>
      <PortalSidebar
        mode={mode}
        email={portalEmail || auth.user?.email || undefined}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        counts={{
          courses: displayCourses.length,
          downloads: downloadOrders.length,
          audio: audioOrders.length,
        }}
      />
      <PortalSectionLayout title={sectionTitle}>
        <div className="flex flex-col gap-6">
          {usingDemoLibrary && activeSection !== 'overview' ? (
            <Alert fillStyle="subtleFill">
              <PackageOpenIcon />
              <Alert.Title>
                <Trans message="Sample library layout" />
              </Alert.Title>
              <Alert.Description>
                <Trans message="Showing demo courses and downloads so you can preview the portal. Your real purchases replace this automatically." />
              </Alert.Description>
            </Alert>
          ) : null}

          {activeSection === 'overview' ? (
            <PortalOverview
              firstName={
                auth.user?.name?.split(' ')[0] ||
                portalEmail?.split('@')[0] ||
                'there'
              }
              memberSince={
                auth.user?.created_at
                  ? new Date(auth.user.created_at).toLocaleDateString(
                      undefined,
                      {month: 'short', year: 'numeric'},
                    )
                  : null
              }
              courses={usingDemoLibrary ? [] : displayCourses}
              orders={usingDemoLibrary ? [] : orders}
              onNavigate={setActiveSection}
            />
          ) : null}

          {activeSection === 'courses' ? (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                <Trans message="Pick up right where you left off." />
              </p>
              <PortalCourseFilters value={filter} onChange={setFilter} />
              {courseFailed && !courses.length ? (
                <Alert variant="warning" fillStyle="subtleFill">
                  <GraduationCapIcon />
                  <Alert.Title>
                    <Trans message="Courses unavailable" />
                  </Alert.Title>
                  <Alert.Description>
                    <Trans message="Unable to load your courses." />
                  </Alert.Description>
                </Alert>
              ) : filteredCourses.length ? (
                <PortalCourseGrid courses={filteredCourses} />
              ) : (
                <Alert fillStyle="subtleFill">
                  <GraduationCapIcon />
                  <Alert.Title>
                    <Trans message="No courses in this filter" />
                  </Alert.Title>
                  <Alert.Description>
                    <Trans message="Try another filter to see more of your courses." />
                  </Alert.Description>
                </Alert>
              )}
              {mode === 'guest' && courses.length ? (
                <p className="text-xs text-muted-foreground">
                  <Trans message="Optional: create an account with this email to keep progress on all devices." />{' '}
                  <Link className="underline" to={`/register${authQuery}`}>
                    <Trans message="Create account" />
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          {activeSection === 'downloads' ? (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                <Trans message="Every file you own, always up to date." />
              </p>
              {purchasesError && mode === 'auth' ? (
                <Alert variant="warning" fillStyle="subtleFill">
                  <ShieldCheckIcon />
                  <Alert.Title>
                    <Trans message="Purchases locked" />
                  </Alert.Title>
                  <Alert.Description>
                    <p>
                      <Trans message="Verify the email you used at checkout to unlock downloads and receipts in this browser." />
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      render={
                        <Link to="/my-portal" state={{forceRecovery: true}} />
                      }
                    >
                      <Trans message="Verify purchase email" />
                    </Button>
                  </Alert.Description>
                </Alert>
              ) : downloadOrders.length ? (
                <div className="flex flex-col gap-4">
                  {downloadOrders.map(order => (
                    <PortalEntitlementPack
                      key={order.id}
                      order={order}
                      busy={busy}
                      variant="files"
                      onDownload={download}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Trans message="File downloads from your purchases will show up here." />
                </p>
              )}
            </section>
          ) : null}

          {activeSection === 'audio' ? (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                <Trans message="Preview packs and tracks you purchased." />
              </p>
              {audioOrders.length ? (
                <div className="flex flex-col gap-4">
                  {audioOrders.map(order => (
                    <PortalEntitlementPack
                      key={order.id}
                      order={order}
                      busy={busy}
                      variant="audio"
                      onDownload={download}
                    />
                  ))}
                </div>
              ) : (
                <Empty.Root>
                  <Empty.Header>
                    <Empty.Media variant="icon">
                      <HeadphonesIcon />
                    </Empty.Media>
                    <Empty.Title>
                      <Trans message="No audio packs yet" />
                    </Empty.Title>
                    <Empty.Description>
                      <Trans message="Purchased audio packs will show up here with downloads." />
                    </Empty.Description>
                  </Empty.Header>
                </Empty.Root>
              )}
            </section>
          ) : null}

          {activeSection === 'orders' ? (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                <Trans message="Receipts for every purchase you've made." />
              </p>
              <PortalOrdersTable
                orders={orders}
                busy={busy}
                onResend={resend}
                onReview={order => setReviewOrderId(order.id)}
              />
            </section>
          ) : null}

          {activeSection === 'settings' ? (
            <PortalSettingsPanel
              mode={mode}
              name={auth.user?.name || undefined}
              email={portalEmail || auth.user?.email || undefined}
              registerHref={`/register${authQuery}`}
            />
          ) : null}

          {reviewingOrder && !reviewingOrder.is_demo ? (
            <PortalReviewDialog
              order={reviewingOrder}
              onClose={() => setReviewOrderId(undefined)}
              onSaved={load}
            />
          ) : null}
        </div>
      </PortalSectionLayout>
    </PortalLibraryLayout>
  );
}

