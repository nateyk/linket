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
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {isAxiosError} from 'axios';
import {GraduationCapIcon, TriangleAlertIcon} from 'lucide-react';
import {FormEvent, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseWizardPrefill} from '../digital-products/product-create-flow';
import {ProductFormField} from '../digital-products/product-form-field';

type CreatedProduct = {id: number};

type CourseFieldErrors = {title?: string; price?: string};

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = parseWizardPrefill(searchParams);
  const isFree = prefill.billing === 'free';
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<string>(() => prefill.price ?? '0');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [creationUncertain, setCreationUncertain] = useState(false);

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

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate(title, price);
    setFieldErrors(validation);
    if (Object.keys(validation).length) {
      document
        .getElementById(validation.title ? 'course-title' : 'course-price')
        ?.focus();
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
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb>
        <DashboardLayout.SectionTitle>
          <Trans message="Create course" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4 sm:py-5">
          {isFree && (
            <div>
              <Badge variant="secondary">
                <Trans message="Free" />
              </Badge>
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Start your course" />
              </Card.Title>
              <Card.Description>
                <Trans message="Name your course and set its price. You will add chapters, lessons, video, and resources in the course builder." />
              </Card.Description>
            </Card.Header>
            <form onSubmit={createCourse}>
              <Card.Content>
                <div className="flex flex-col gap-4">
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
                        if (fieldErrors.title) {
                          setFieldErrors(current => ({...current, title: undefined}));
                        }
                      }}
                      placeholder="Complete course title"
                      autoFocus
                    />
                  </ProductFormField>

                  {!isFree && (
                    <ProductFormField
                      label="Price"
                      description="Set ETB 0 to offer this course for free."
                      error={fieldErrors.price}
                      htmlFor="course-price"
                      required
                    >
                      <InputGroup>
                        <InputGroupAddon align="inline-start">
                          <InputGroupText>ETB</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          id="course-price"
                          aria-invalid={!!fieldErrors.price}
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={event => {
                            setPrice(event.target.value);
                            if (fieldErrors.price) {
                              setFieldErrors(current => ({
                                ...current,
                                price: undefined,
                              }));
                            }
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
                </div>
              </Card.Content>
              <Card.Footer className="justify-end">
                {creationUncertain && (
                  <Button
                    variant="outline"
                    render={<Link to="/dashboard/my-products" />}
                  >
                    <Trans message="Check My Products" />
                  </Button>
                )}
                <Button type="submit" disabled={creating || creationUncertain}>
                  {creating ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <GraduationCapIcon data-icon="inline-start" />
                  )}
                  <Trans
                    message={
                      creating ? 'Creating course...' : 'Create course'
                    }
                  />
                </Button>
              </Card.Footer>
            </form>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
