import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
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
import {
  ArrowLeftIcon,
  GraduationCapIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import {FormEvent, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {initialPriceFromParam} from '../digital-products/product-create-flow';

type CreatedProduct = {id: number};

export function Component() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [searchParams] = useSearchParams();
  const [price, setPrice] = useState<string>(
    () => initialPriceFromParam(searchParams.get('price_cents')) ?? '0',
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [creationUncertain, setCreationUncertain] = useState(false);

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const priceCents = Math.round(Number(price) * 100);

    if (!title.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      setError('Add a course title and a valid price.');
      return;
    }

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
        <DashboardLayout.SectionTitle>
          <Trans message="Create course" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-6">
          <Button
            className="w-fit"
            variant="ghost"
            render={<Link to="/dashboard/my-products/new" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            <Trans message="Choose another product type" />
          </Button>

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
                <Field.Group>
                  <Field.Root data-invalid={!!error}>
                    <Field.Label htmlFor="course-title">
                      <Trans message="Course title" />
                    </Field.Label>
                      <Input
                        id="course-title"
                        aria-invalid={!!error}
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      placeholder="Complete course title"
                      maxLength={160}
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root data-invalid={!!error}>
                    <Field.Label htmlFor="course-price">
                      <Trans message="Price" />
                    </Field.Label>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>ETB</InputGroupText>
                      </InputGroupAddon>
                        <InputGroupInput
                          id="course-price"
                          aria-invalid={!!error}
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={event => setPrice(event.target.value)}
                      />
                    </InputGroup>
                    <Field.Description>
                      <Trans message="Enter 0 to publish a free course." />
                    </Field.Description>
                  </Field.Root>
                  {error && (
                    <Alert.Root variant="destructive" fillStyle="subtleFill">
                      <TriangleAlertIcon />
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Root>
                  )}
                </Field.Group>
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
