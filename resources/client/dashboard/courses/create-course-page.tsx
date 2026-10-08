import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Accordion} from '@shadcn/accordion/accordion';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {isAxiosError} from 'axios';
import {GraduationCapIcon, Link2Icon, TagIcon, TriangleAlertIcon} from 'lucide-react';
import {FormEvent, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {parseWizardPrefill} from '../digital-products/product-create-flow';
import {ProductFormField} from '../digital-products/product-form-field';
import {ProductFormProgress} from '../digital-products/product-form-progress';
import {ProductFormSection} from '../digital-products/product-form-section';

type CreatedProduct = {id: number};
type Errors = {title?: string; price?: string};

export function Component() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefill = parseWizardPrefill(params);
  const isFree = prefill.billing === 'free';
  const {trans} = useTrans();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(() => prefill.price ?? '0');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('details');
  const sections = [
    {id: 'details', title: 'Course details', description: 'Name your course and confirm its price.', icon: GraduationCapIcon, isComplete: !!title.trim() && (isFree || Number(price) >= 0)},
    {id: 'settings', title: 'Course settings', description: 'Review what happens after creation.', icon: TagIcon, isComplete: true},
  ];
  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    if (!title.trim()) next.title = 'Add a course title.';
    if (!isFree && (!Number.isFinite(Number(price)) || Number(price) < 0)) next.price = 'Add a valid price of ETB 0 or more.';
    setErrors(next);
    if (Object.keys(next).length) { setOpenSection('details'); document.getElementById(next.title ? 'course-title' : 'course-price')?.focus(); return; }
    setCreating(true); setError(undefined);
    try {
      const response = await apiClient.post('/api/v1/items', {title: title.trim(), description: null, price_cents: isFree ? 0 : Math.round(Number(price) * 100), currency: 'etb', type: 'course'});
      navigate(`/dashboard/items/${(response.data.data as CreatedProduct).id}/course`, {replace: true});
    } catch (reason) {
      const requestUncertain = isAxiosError(reason) && !reason.response;
      setCreationUncertain(requestUncertain);
      setError(requestUncertain ? 'We could not confirm whether the course was created. Check My Items before trying again.' : isAxiosError<{message?: string}>(reason) ? reason.response?.data?.message || 'Unable to create the course. Please try again.' : 'Unable to create the course. Please try again.');
    } finally { setCreating(false); }
  };
  const previewPrice = isFree ? trans({message: 'Free'}) : `ETB ${(Number(price) || 0).toFixed(2)}`;
  return <DashboardLayout.MainSection>
    <DashboardLayout.SectionHeader>
      <DashboardLayout.SidebarToggle />
      <Breadcrumb><Breadcrumb.Item><Breadcrumb.Link to="/dashboard/items"><Trans message="All products" /></Breadcrumb.Link></Breadcrumb.Item><Breadcrumb.Separator /><Breadcrumb.Item><Breadcrumb.Page><Trans message="Create course" /></Breadcrumb.Page></Breadcrumb.Item></Breadcrumb>
      <DashboardLayout.SectionTitle><Trans message="Create course" /></DashboardLayout.SectionTitle>
      <div className="flex items-center gap-2">{creationUncertain && <Button variant="outline" size="sm" render={<Link to="/dashboard/items" />}><Trans message="Check My Items" /></Button>}<Button size="sm" type="submit" form="course-create-form" disabled={creating}>{creating ? <Spinner data-icon="inline-start" /> : <GraduationCapIcon data-icon="inline-start" />}<Trans message={creating ? 'Creating course...' : 'Create course'} /></Button></div>
    </DashboardLayout.SectionHeader>
    <DashboardLayout.SectionContent className="overflow-y-auto"><form id="course-create-form" onSubmit={createCourse} className="mx-auto grid w-full max-w-6xl min-w-0 items-start gap-5 py-4 sm:py-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
      <div className="flex min-w-0 flex-col gap-4">
        {error && <Alert.Root variant="destructive" fillStyle="subtleFill"><TriangleAlertIcon /><Alert.Description>{error}</Alert.Description></Alert.Root>}
        {prefill.billing !== null && <p className="text-sm text-muted-foreground">{isFree ? <Trans message="From previous step: Free." /> : <Trans message="From previous step: Paid · ETB :price — you can change it here." values={{price}} />}</p>}
        <ProductFormProgress label="Course setup" completed={sections.filter(s => s.isComplete).length} total={sections.length} />
        <Accordion.Root variant="bordered" value={openSection ? [openSection] : []} onValueChange={value => setOpenSection(value[0] ?? null)}>
          {sections.map(section => <ProductFormSection key={section.id} {...section} hasError={section.id === 'details' && !!(errors.title || errors.price)}>{section.id === 'details' ? <div className="flex flex-col gap-4">
            <ProductFormField label="Course title" description="Choose a clear title learners can easily understand." error={errors.title} htmlFor="course-title" required><Input id="course-title" aria-invalid={!!errors.title} value={title} maxLength={160} onChange={event => { setTitle(event.target.value); setErrors(current => ({...current, title: undefined})); }} placeholder="Complete course title" autoFocus /></ProductFormField>
            {!isFree && <ProductFormField label="Price (ETB)" description="This course is paid. Update the price if needed." error={errors.price} htmlFor="course-price" required><InputGroup><InputGroupAddon align="inline-start"><InputGroupText>ETB</InputGroupText></InputGroupAddon><InputGroupInput id="course-price" aria-invalid={!!errors.price} type="number" min="0" step="0.01" value={price} onChange={event => { setPrice(event.target.value); setErrors(current => ({...current, price: undefined})); }} placeholder="0.00" /></InputGroup></ProductFormField>}
          </div> : <div className="flex flex-col gap-1"><p className="text-sm font-medium"><Trans message="Next, add chapters and lessons in the course builder." /></p><p className="text-xs text-muted-foreground"><Trans message="Your course stays a draft until you submit it for review." /></p></div>}</ProductFormSection>)}
        </Accordion.Root>
      </div>
      <aside className="min-w-0 xl:sticky xl:top-6"><div className="flex flex-col gap-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium"><Trans message="Customer preview" /></p><Badge variant="secondary"><Link2Icon aria-hidden="true" /><Trans message="Preview" /></Badge></div><Card.Root><Card.Content className="flex flex-col gap-4 p-4"><div className="flex size-24 items-center justify-center rounded-card bg-muted"><GraduationCapIcon className="size-10 text-muted-foreground" aria-hidden="true" /></div><div className="flex flex-col gap-2"><p className="truncate text-lg font-semibold">{title.trim() || trans({message: 'Your course title'})}</p><span className="text-lg font-semibold text-primary">{previewPrice}</span><p className="text-sm text-muted-foreground"><Trans message="Course description will appear here after creation. Add chapters and lessons in the builder." /></p></div></Card.Content></Card.Root></div></aside>
    </form></DashboardLayout.SectionContent>
  </DashboardLayout.MainSection>;
}
