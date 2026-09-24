import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Progress} from '@shadcn/progress/progress';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {isAxiosError} from 'axios';
import {GraduationCapIcon, TriangleAlertIcon, Link2Icon, TagIcon} from 'lucide-react';
import {FormEvent, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseWizardPrefill} from '../digital-products/product-create-flow';
import {ProductFormField} from '../digital-products/product-form-field';

type CreatedProduct = {id: number};
type CourseFieldErrors = {title?: string; price?: string};

interface CourseSection {
  id: 'details' | 'settings';
  title: string;
  description: string;
  icon: typeof GraduationCapIcon;
  isComplete: boolean;
}

function CourseSetupProgress({completed, total}: {completed: number; total: number}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message="Course setup" />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans message=":completed of :total sections complete" values={{completed, total}} />
        </p>
      </div>
      <Progress.Root value={(completed / total) * 100} className="w-full lg:w-48" aria-label="Course setup progress">
        <Progress.Track className="h-2"><Progress.Indicator /></Progress.Track>
      </Progress.Root>
    </div>
  );
}

function CourseSectionCard({
  id,
  title,
  description,
  icon: Icon,
  isComplete,
  children,
}: CourseSection & {children: React.ReactNode}) {
  return (
    <Card.Root className="overflow-hidden transition-colors" data-section={id}>
      <Card.Header className="p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 py-1">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm ${isComplete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
            <span className="truncate text-sm leading-snug font-medium"><Trans message={title} /></span>
            <span className="line-clamp-2 text-xs leading-snug font-normal text-muted-foreground"><Trans message={description} /></span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="p-4 pt-0">{children}</Card.Content>
    </Card.Root>
  );
}

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = parseWizardPrefill(searchParams);
  const isFree = prefill.billing === 'free';
  const {trans} = useTrans();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>(() => prefill.price ?? '0');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [creationUncertain, setCreationUncertain] = useState(false);

  const sections: CourseSection[] = [
    {id: 'details', title: 'Course details', description: 'Name your course and set its price', icon: GraduationCapIcon, isComplete: !!title.trim() && (isFree || Number(price) >= 0)},
    {id: 'settings', title: 'Course settings', description: 'Configure visibility and access options', icon: TagIcon, isComplete: true},
  ];

  const validate = (nextTitle: string, nextPrice: string) => {
    const errors: CourseFieldErrors = {};
    if (!nextTitle.trim()) errors.title = 'Add a course title.';
    if (!isFree) {
      const cents = Math.round(Number(nextPrice) * 100);
      if (!Number.isFinite(cents) || cents < 0) {
        errors.price = 'Add a valid price of ETB 0 or more.';
      }
    }
    return errors;
  };

  const completedSections = sections.filter(s => s.isComplete).length;

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(title, price);
    setFieldErrors(validation);
    if (Object.keys(validation).length) {
      document.getElementById(validation.title ? 'course-title' : 'course-price')?.focus();
      return;
    }
    const priceCents = isFree ? 0 : Math.round(Number(price) * 100);

    setCreating(true);
    setError(undefined);

    try {
      const response = await apiClient.post('/api/v1/digital-products', {
        title: title.trim(),
        description: null,
        price_cents: priceCents,
        currency: 'etb',
        type: 'course',
      });
      const product = response.data.data as CreatedProduct;
      navigate(`/dashboard/my-products/${product.id}/course`, {replace: true});
    } catch (reason) {
      const requestMayHaveSucceeded = isAxiosError(reason) && !reason.response;
      const message = isAxiosError<{message?: string}>(reason)
        ? reason.response?.data?.message
        : undefined;
      setCreationUncertain(requestMayHaveSucceeded);
      setError(
        requestMayHaveSucceeded
          ? 'We could not confirm whether the course was created. Check My Products before trying again.'
          : message || 'Unable to create the course. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  const previewPrice = isFree ? trans({message: 'Free'}) : `ETB ${(Number(price) || 0).toFixed(2)}`;

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
              <Trans message="Create course" />
            </Breadcrumb.Page          >
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle>
          <Trans message="Create course" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-4 sm:py-5">
          {prefill.billing !== null && (
            <p className="text-sm text-muted-foreground">
              {isFree ? (
                <Trans message="From previous step: Free." />
              ) : (
                <Trans message="From previous step: Paid · ETB :price — you can change it here." values={{price: price.trim() === '' ? '0.00' : price}} />
              )}
            </p>
          )}

          <CourseSetupProgress completed={completedSections} total={sections.length} />

          <Card.Root className="overflow-hidden">
            <Card.Header className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium"><Trans message="Customer preview" /></p>
                <Badge variant="secondary"><Link2Icon className="size-3" aria-hidden="true" /><Trans message="Preview" /></Badge>
              </div>
            </Card.Header>
            <Card.Content className="p-4 pt-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex size-24 shrink-0 items-center justify-center rounded-card bg-muted">
                  <GraduationCapIcon className="size-10 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <p className="truncate text-lg font-semibold">{title.trim() || trans({message: 'Your course title'})}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-primary">{previewPrice}</span>
                    {isFree && <Badge variant="outline" className="text-xs"><Trans message="Free" /></Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    <Trans message="Course description will appear here after creation. Add chapters and lessons in the builder." />
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          <div className="flex flex-col gap-4">
            <CourseSectionCard {...sections[0]}>
              <ProductFormField
                label="Course title"
                description="Choose a clear title learners can easily understand."
                error={fieldErrors.title}
                htmlFor="course-title"
                required
              >
                <Input
                  id="course-title"
                  aria-invalid={!!fieldErrors.title}
                  value={title}
                  maxLength={160}
                  onChange={event => {
                    setTitle(event.target.value);
                    if (fieldErrors.title) setFieldErrors(current => ({...current, title: undefined}));
                  }}
                  placeholder="Complete course title"
                  autoFocus
                />
              </ProductFormField>

              {!isFree && (
                <ProductFormField
                  label="Price (ETB)"
                  description="Set ETB 0 to offer this course for free."
                  error={fieldErrors.price}
                  htmlFor="course-price"
                  required
                >
                  <InputGroup>
                    <InputGroupAddon align="inline-start"><InputGroupText>ETB</InputGroupText></InputGroupAddon>
                    <InputGroupInput
                      id="course-price"
                      aria-invalid={!!fieldErrors.price}
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={event => {
                        setPrice(event.target.value);
                        if (fieldErrors.price) setFieldErrors(current => ({...current, price: undefined}));
                      }}
                      placeholder="0.00"
                    />
                  </InputGroup>
                </ProductFormField>
              )}

              {error && (
                <Alert.Root variant="destructive" fillStyle="subtleFill">
                  <TriangleAlertIcon />
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Root>
              )}
            </CourseSectionCard>

            <CourseSectionCard {...sections[1]}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium"><Trans message="Course visibility" /></p>
                  <p className="text-xs text-muted-foreground"><Trans message="This course will be visible in your storefront after publishing." /></p>
                </div>
                <Badge variant="outline"><Trans message="Visible by default" /></Badge>
              </div>
            </CourseSectionCard>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {creationUncertain && (
              <Button variant="outline" render={<Link to="/dashboard/my-products" />}><Trans message="Check My Products" /></Button>
            )}
            <Button type="submit" form="course-create-form" disabled={creating}>
              {creating ? <Spinner data-icon="inline-start" /> : <GraduationCapIcon data-icon="inline-start" />}
              <Trans message={creating ? 'Creating course...' : 'Create course'} />
            </Button>
          </div>
        </div>
      </DashboardLayout.SectionContent>

      <form id="course-create-form" onSubmit={createCourse} style={{display: 'none'}} />
    </DashboardLayout.MainSection>
  );
}