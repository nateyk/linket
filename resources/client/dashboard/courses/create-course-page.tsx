import {apiClient} from '@common/http/query-client';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {isAxiosError} from 'axios';
import {EyeIcon, GraduationCapIcon, TriangleAlertIcon} from 'lucide-react';
import {FormEvent, type ReactNode, useRef, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseEtbToCents, parseWizardPrefill, priceForBillingMode, type BillingMode} from '../digital-products/product-create-flow';
import {BillingModePicker} from '../digital-products/billing-mode-picker';
import {isUncertainMutationOutcome} from '../digital-products/request-outcome';
import {ProductFormField} from '../digital-products/product-form-field';
import {ProductFormProgress} from '../digital-products/product-form-progress';
import {ProductFormCustomerPreview} from '../digital-products/product-preview';
import {ProductPreviewDialog} from '../digital-products/product-preview-dialog';
import {
  CourseSettingsCoverField,
  CourseSettingsDescriptionField,
  CourseSettingsOutcomesField,
} from './course-settings-fields';

// POST /items returns the DIGITAL PRODUCT resource: the top-level id is the
// product id, and the course id (what /courses/{id} binds) is nested at
// data.course.id — they only coincide in databases where the two tables
// share an auto-increment. See DigitalProductResource + CourseFreeE2ETest.
type CreatedProduct = {id: number; course?: {id: number} | null};
type Errors = {title?: string; price?: string};
type CourseOutcome = {id: string; text: string};

export function Component() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefill = parseWizardPrefill(params);
  const {trans} = useTrans();
  const [billingMode, setBillingMode] = useState<BillingMode | null>(prefill.billing);
  const isFree = billingMode === 'free';
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(() => prefill.billing === 'free' ? '0' : (prefill.price ?? ''));
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef(false);
  const uncertainRequest = useRef(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Inline course settings (Task B): the same shared fields the builder's
  // CourseSettingsDialog renders, filled in before the course exists.
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState<CourseOutcome[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileId, setCoverFileId] = useState<number | null>(null);
  // A focused-then-cleared TipTap editor can emit tag-only HTML (`<p></p>`
  // or an empty paragraph with a trailing break) — meaningful description is
  // the tag-stripped, trimmed text, and BOTH the gate and the PUT body use
  // it so tag-only junk never counts as content or gets stored.
  const descriptionText = description.replace(/<[^>]*>/g, '').trim();
  // Settings "content" gate: feeds the progress display AND the follow-up
  // PUT — any of the three fields being filled makes settings worth sending.
  const hasSettingsContent =
    !!descriptionText ||
    outcomes.some(item => !!item.text.trim()) ||
    coverFileId != null;
  // Intentionally lighter than the digital-product edit page: chapters and
  // lessons are authored in the course builder after creation, so this setup
  // form has no files or storefront-placement sections.
  const detailsComplete =
    !!title.trim() &&
    !!billingMode &&
    (isFree || (parseEtbToCents(price) ?? 0) > 0);
  const completedSections = [detailsComplete, hasSettingsContent].filter(Boolean).length;
  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A missing response may mean the server already created the Course.
    // Never repeat a POST in the same form after an uncertain outcome.
    if (createInFlight.current || uncertainRequest.current || creationUncertain) return;
    const next: Errors = {};
    if (!title.trim()) next.title = 'Add a course title.';
    if (!billingMode) next.price = trans({message: 'Choose Free access or Paid.'});
    // Paid must mean a real price: mirror the wizard's cents > 0 gate so an
    // empty (or zero) field never submits price_cents: 0 under Paid billing.
    if (billingMode === 'paid') {
      const cents = parseEtbToCents(price);
      if (cents === null || cents <= 0) {
        next.price = trans({message: 'Enter an amount greater than ETB 0.'});
      }
    }
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.title ? 'course-title' : billingMode ? 'course-price' : 'course-billing')?.focus();
      return;
    }
    createInFlight.current = true;
    setCreating(true); setError(undefined);
    try {
      const response = await apiClient.post('/api/v1/items', {title: title.trim(), description: null, price_cents: isFree ? 0 : Math.round(Number(price) * 100), currency: 'etb', type: 'course'});
      const created = response.data?.data as CreatedProduct | undefined;
      if (!created || !Number.isSafeInteger(created.id) || created.id <= 0) {
        // A malformed 2xx response is not proof that the POST did not commit.
        throw new Error('Course creation response missing a product ID');
      }
      // The settings PUT binds the COURSE id (courses.{course} route
      // binding), never the product id from the response's top level.
      const courseId = created.course?.id ?? null;
      const hasValidCourseId = Number.isSafeInteger(courseId) && (courseId ?? 0) > 0;
      // Second step: the course exists now, so settings go along as a
      // best-effort PUT of ONLY the settings subset. A rejected PUT must
      // never re-POST (that would duplicate the course) — the learner is
      // routed into the builder either way and can fix settings there.
      if (hasSettingsContent) {
        if (!hasValidCourseId) {
          // Should not happen for type=course, but without a course id the
          // settings cannot be saved: warn once, navigate, never re-create.
          toast.danger(trans({message: 'Course created, but some settings could not be saved. You can update them from the course builder.'}));
        } else {
          try {
            await apiClient.put(`/api/v1/courses/${courseId}`, {
              description: descriptionText ? description.trim() : null,
              learning_outcomes: outcomes.map(item => item.text.trim()).filter(Boolean),
              cover_file_entry_id: coverFileId,
            });
          } catch {
            toast.danger(trans({message: 'Course created, but some settings could not be saved. You can update them from the course builder.'}));
          }
        }
      }
      navigate(`/dashboard/items/${created.id}/course`, {replace: true});
    } catch (reason) {
      // Only an actual HTTP rejection confirms that a create POST failed.
      // Network errors and malformed success payloads require reconciliation.
      const requestUncertain = isUncertainMutationOutcome(reason);
      if (requestUncertain) uncertainRequest.current = true;
      setCreationUncertain(requestUncertain);
      setError(
        requestUncertain
          ? trans({message: 'We could not confirm whether the course was created. Check My Items before trying again.'})
          : isAxiosError<{message?: string}>(reason)
            ? reason.response?.data?.message || trans({message: 'Unable to create the course. Please try again.'})
            : trans({message: 'Unable to create the course. Please try again.'}),
      );
    } finally {
      createInFlight.current = false;
      setCreating(false);
    }
  };
  const previewPrice = isFree
    ? trans({message: 'Free'})
    : `ETB ${(Number(price) || 0).toFixed(2)}`;
  // The settings panel mounts CroppedCover, whose upload hook reads the
  // FileUploadContext — same provider wrap as the builder and the
  // digital-product form, or opening the section throws during render.
  return <FileUploadProvider><DashboardLayout.MainSection>
    <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2 max-sm:h-14 max-sm:flex-nowrap max-sm:gap-1 max-sm:px-2 max-sm:py-0">
      <DashboardLayout.SidebarToggle />
      <h1 className="sr-only"><Trans message="Create course" /></h1>
      <Breadcrumb.Root className="me-auto w-auto min-w-0 text-xl max-sm:me-0 max-sm:w-0 max-sm:flex-1 max-sm:overflow-hidden max-sm:text-sm">
        <Breadcrumb.Item>
          <Breadcrumb.Link to="/dashboard/items">
            <Trans message="All products" />
          </Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item className="max-sm:min-w-0">
          <Breadcrumb.Page className="max-sm:block max-sm:min-w-0 max-sm:truncate"><Trans message="Create course" /></Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.Root>
      <div className="ms-auto flex shrink-0 items-center gap-2 max-sm:ms-0 max-sm:gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-lg:size-11 max-lg:px-0"
          aria-label={trans({message: 'Preview'})}
          onClick={() => setPreviewOpen(true)}
        >
          <EyeIcon className="size-4" aria-hidden="true" />
          <span className="max-lg:hidden"><Trans message="Preview" /></span>
        </Button>
        {creationUncertain && (
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/dashboard/items" />}
          >
            <Trans message="Check My Items" />
          </Button>
        )}
        <Button
          size="sm"
          className="max-lg:size-11 max-lg:px-0"
          type="submit"
          form="course-create-form"
          aria-label={
            creating
              ? trans({message: 'Creating...'})
              : trans({message: 'Create course'})
          }
          disabled={creating || creationUncertain}
        >
          {creating ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <GraduationCapIcon className="size-4" data-icon="inline-start" />
          )}
          <span className="max-lg:hidden">
            {creating ? <Trans message="Creating..." /> : <Trans message="Create course" />}
          </span>
        </Button>
      </div>
    </DashboardLayout.SectionHeader>
    <DashboardLayout.SectionContent className="overflow-y-auto"><form id="course-create-form" onSubmit={createCourse} className="mx-auto w-full max-w-6xl py-4 sm:py-5">
      {error && <Alert.Root role="alert" variant="destructive" fillStyle="subtleFill" className="mb-5"><TriangleAlertIcon /><Alert.Description>{error}</Alert.Description></Alert.Root>}
      <div className="flex min-w-0 flex-col gap-4">
        <ProductFormProgress
          completed={completedSections}
          total={2}
          heading={<Trans message="Course setup" />}
          progressAriaLabel="Course setup progress"
        />
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2 lg:gap-5">
          <CreateCoursePanel
            title="Course details"
            hasError={!!(errors.title || errors.price)}
          >
            <ProductFormField label="Course title" error={errors.title} htmlFor="course-title" required>
              <Input
                id="course-title"
                aria-invalid={!!errors.title}
                aria-errormessage={errors.title ? 'course-title-error' : undefined}
                value={title}
                maxLength={160}
                onChange={event => {
                  setTitle(event.target.value);
                  setErrors(current => ({...current, title: undefined}));
                }}
                placeholder="Course title"
                autoFocus
              />
            </ProductFormField>
            <CourseSettingsCoverField
              value={coverUrl}
              onChange={(url, fileId) => {
                setCoverUrl(url);
                setCoverFileId(fileId);
              }}
            />
            <div id="course-billing" className="flex flex-col gap-2" tabIndex={-1}>
              <p className="text-sm font-medium"><Trans message="Free or paid?" /></p>
              <BillingModePicker
                value={billingMode}
                onValueChange={mode => {
                  if (!mode) return;
                  setBillingMode(mode);
                  setPrice(current => priceForBillingMode(current, mode));
                  setErrors(current => ({...current, price: undefined}));
                }}
              />
            </div>
            {isFree ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium"><Trans message="Price" /></p>
                <Badge variant="secondary"><Trans message="Free" /></Badge>
              </div>
            ) : billingMode === 'paid' ? (
              <ProductFormField label="Price (ETB)" error={errors.price} htmlFor="course-price" required>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>ETB</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="course-price"
                    aria-invalid={!!errors.price}
                    aria-errormessage={errors.price ? 'course-price-error' : undefined}
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={event => {
                      setPrice(event.target.value);
                      setErrors(current => ({...current, price: undefined}));
                    }}
                    placeholder="0.00"
                  />
                </InputGroup>
              </ProductFormField>
            ) : null}
          </CreateCoursePanel>
          <CreateCoursePanel title="About Course">
            <CourseSettingsDescriptionField inputId="course-create" value={description} onChange={setDescription} />
            <CourseSettingsOutcomesField outcomes={outcomes} onChange={setOutcomes} />
          </CreateCoursePanel>
        </div>
      </div>
      <ProductPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <ProductFormCustomerPreview
          title={title}
          emptyTitle="Your course title"
          price={previewPrice}
          productType="course"
          coverUrl={coverUrl || undefined}
          description={descriptionText || undefined}
          imageFallback={
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <GraduationCapIcon className="size-8" aria-hidden="true" />
              <span className="text-xs">
                <Trans message="Add a cover image" />
              </span>
            </div>
          }
        />
      </ProductPreviewDialog>
    </form></DashboardLayout.SectionContent>
  </DashboardLayout.MainSection></FileUploadProvider>;
}

function CreateCoursePanel({
  title,
  hasError = false,
  children,
}: {
  title: string;
  hasError?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-card border bg-card',
        hasError && 'border-destructive/40',
      )}
    >
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium tracking-tight">
          <Trans message={title} />
        </h2>
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}
