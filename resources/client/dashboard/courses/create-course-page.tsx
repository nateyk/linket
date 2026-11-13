import {apiClient} from '@common/http/query-client';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Accordion} from '@shadcn/accordion/accordion';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {isAxiosError} from 'axios';
import {ArrowLeftIcon, EyeIcon, GraduationCapIcon, ListChecksIcon, TriangleAlertIcon} from 'lucide-react';
import {FormEvent, useRef, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseEtbToCents, parseWizardPrefill, priceForBillingMode, type BillingMode} from '../digital-products/product-create-flow';
import {BillingModePicker} from '../digital-products/billing-mode-picker';
import {isUncertainMutationOutcome} from '../digital-products/request-outcome';
import {ProductFormField} from '../digital-products/product-form-field';
import {ProductFormProgress} from '../digital-products/product-form-progress';
import {ProductFormSection} from '../digital-products/product-form-section';
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
  const [openSection, setOpenSection] = useState<string | null>('details');
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
  const sections = [
    {id: 'details', title: 'Course details', description: 'Name your course and confirm its price.', icon: GraduationCapIcon, isComplete: !!title.trim() && !!billingMode && (isFree || (parseEtbToCents(price) ?? 0) > 0)},
    {id: 'settings', title: 'Course settings', description: 'Add a description, learning outcomes, and a cover image.', icon: ListChecksIcon, isComplete: hasSettingsContent},
  ];
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
    if (Object.keys(next).length) { setOpenSection('details'); document.getElementById(next.title ? 'course-title' : billingMode ? 'course-price' : 'course-billing')?.focus(); return; }
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
  const previewPrice = isFree ? trans({message: 'Free'}) : `ETB ${(Number(price) || 0).toFixed(2)}`;
  // The settings panel mounts CroppedCover, whose upload hook reads the
  // FileUploadContext — same provider wrap as the builder and the
  // digital-product form, or opening the section throws during render.
  return <FileUploadProvider><DashboardLayout.MainSection>
    <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
      <DashboardLayout.SidebarToggle />
      <Button
        variant="ghost"
        size="icon-sm"
        className="max-lg:size-11"
        nativeButton={false}
        aria-label={trans({message: 'Back to products'})}
        render={<Link to="/dashboard/items" />}
      >
        <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
      </Button>
      <DashboardLayout.SectionTitle render={<h1 />} className="max-lg:order-3 max-lg:basis-full max-lg:flex-none max-lg:w-full max-lg:text-xl max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip"><span className="min-w-0 truncate max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip"><Trans message="Create course" /></span></DashboardLayout.SectionTitle>
      {/* Header actions mirror the digital-product edit page: icon + label
          that collapses to icon-only below 1024px. aria-labels keep the
          collapsed buttons named. */}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="max-lg:size-11 max-lg:px-0"
          aria-label={trans({message: 'Preview'})}
          onClick={() => setPreviewOpen(true)}>
          <EyeIcon className="size-4" aria-hidden="true" />
          <span className="max-lg:hidden"><Trans message="Preview" /></span>
        </Button>
        {creationUncertain && <Button variant="outline" size="sm" className="min-h-11" aria-label={trans({message: 'Check My Items'})} render={<Link to="/dashboard/items" />}><Trans message="Check My Items" /></Button>}<Button size="sm" className="max-lg:size-11 max-lg:px-0" type="submit" form="course-create-form" aria-label={creating ? trans({message: 'Creating course...'}) : trans({message: 'Create course'})} disabled={creating || creationUncertain}>{creating ? <Spinner data-icon="inline-start" /> : <GraduationCapIcon className="size-4" data-icon="inline-start" />}<span className="max-lg:hidden">{creating ? <Trans message="Creating course..." /> : <Trans message="Create course" />}</span></Button></div>
    </DashboardLayout.SectionHeader>
    <DashboardLayout.SectionContent className="overflow-y-auto"><form id="course-create-form" onSubmit={createCourse} className="mx-auto w-full max-w-3xl py-4 sm:py-5">
      {error && <Alert.Root role="alert" variant="destructive" fillStyle="subtleFill" className="mb-5"><TriangleAlertIcon /><Alert.Description>{error}</Alert.Description></Alert.Root>}
      {/* Focused Course setup column; customer preview opens only on request. */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Existing URLs still prefill billing/price; new courses select them inline. */}
          <ProductFormProgress completed={sections.filter(s => s.isComplete).length} total={sections.length} />
          <Accordion.Root variant="bordered" value={openSection ? [openSection] : []} onValueChange={value => setOpenSection(value[0] ?? null)}>
            {sections.map(section => <ProductFormSection key={section.id} {...section} hasError={section.id === 'details' && !!(errors.title || errors.price)}>{section.id === 'details' ? <div className="flex flex-col gap-4">
              <ProductFormField label="Course title" description="Choose a clear title learners can easily understand." error={errors.title} htmlFor="course-title" required><Input id="course-title" aria-invalid={!!errors.title} aria-errormessage={errors.title ? "course-title-error" : undefined} value={title} maxLength={160} onChange={event => { setTitle(event.target.value); setErrors(current => ({...current, title: undefined})); }} placeholder="Complete course title" autoFocus /></ProductFormField>
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
                <ProductFormField label="Price (ETB)" description="This course is paid. Update the price if needed." error={errors.price} htmlFor="course-price" required><InputGroup><InputGroupAddon align="inline-start"><InputGroupText>ETB</InputGroupText></InputGroupAddon><InputGroupInput id="course-price" aria-invalid={!!errors.price} aria-errormessage={errors.price ? "course-price-error" : undefined} type="number" min="0" step="0.01" value={price} onChange={event => { setPrice(event.target.value); setErrors(current => ({...current, price: undefined})); }} placeholder="0.00" /></InputGroup></ProductFormField>
              ) : null}
            </div> : <div className="flex flex-col gap-4">
              {/* Same shared settings fields as the builder's CourseSettingsDialog; the two-step submit threads them into PUT /courses/{id}. */}
              <CourseSettingsDescriptionField inputId="course-create" value={description} onChange={setDescription} />
              <CourseSettingsOutcomesField outcomes={outcomes} onChange={setOutcomes} />
              <CourseSettingsCoverField value={coverUrl} onChange={(url, fileId) => { setCoverUrl(url); setCoverFileId(fileId); }} />
              {/* What happens NEXT — below the fields now that the inline form is the section's focus. */}
              <div className="flex flex-col gap-1"><p className="text-sm font-medium"><Trans message="After creating the course, add chapters and lessons in the course builder." /></p><p className="text-xs text-muted-foreground"><Trans message="Your course stays a draft until you submit it for review." /></p></div>
            </div>}</ProductFormSection>)}
          </Accordion.Root>
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
