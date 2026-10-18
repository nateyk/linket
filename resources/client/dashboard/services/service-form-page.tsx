import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {apiClient} from '@common/http/query-client';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {Alert} from '@shadcn/alert/alert';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import type {FileEntry} from '@app/gen/schemas/file-entry';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {parseServiceErrors, serviceSaveErrorMessage} from './service-save-error';
import {
  emptyServiceForm,
  fromServiceResource,
  toServicePayload,
  type CreatorServiceResource,
  type ServiceContactChannelType,
  type ServiceFormState,
} from './service-form-state';

type StoreOption = {id: number; name: string};

type StoresResponse = {data?: StoreOption[]};

const CHANNEL_TYPES: {value: ServiceContactChannelType; label: string}[] = [
  {value: 'whatsapp', label: 'WhatsApp'},
  {value: 'telegram', label: 'Telegram'},
  {value: 'email', label: 'Email'},
  {value: 'phone', label: 'Phone'},
  {value: 'link', label: 'Link'},
];

export function Component() {
  return (
    <FileUploadProvider>
      <ServiceFormPage />
    </FileUploadProvider>
  );
}

function ServiceFormPage() {
  const {serviceId} = useParams();
  const navigate = useNavigate();
  const {trans} = useTrans();
  const isEditing = !!serviceId;
  const [form, setForm] = useState<ServiceFormState>(() =>
    emptyServiceForm(),
  );
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const storesResponse = await apiClient.get('/api/v1/stores?per_page=100');
      const storeOptions = (storesResponse.data as StoresResponse).data ?? [];
      setStores(storeOptions);

      if (serviceId) {
        const serviceResponse = await apiClient.get(
          `/api/v1/services/${serviceId}`,
        );
        const service = (serviceResponse.data as {data: CreatorServiceResource})
          .data;
        setForm(fromServiceResource(service));
      } else {
        setForm(current => ({
          ...current,
          store_id: current.store_id || String(storeOptions[0]?.id ?? ''),
        }));
      }
    } catch (reason) {
      setError(serviceSaveErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = <Key extends keyof ServiceFormState>(
    key: Key,
    value: ServiceFormState[Key],
  ) => {
    setForm(current => ({...current, [key]: value}));
    setFieldErrors(current => {
      if (!current[key]) return current;
      const next = {...current};
      delete next[key];
      return next;
    });
  };

  const save = async (status?: 'draft' | 'published') => {
    setSaving(true);
    setError(undefined);
    setFieldErrors({});

    const payload = toServicePayload({
      ...form,
      status: status ?? form.status,
    });

    try {
      if (isEditing) {
        await apiClient.put(`/api/v1/services/${serviceId}`, payload);
      } else {
        await apiClient.post('/api/v1/services', payload);
      }

      toast.positive(
        status === 'published'
          ? message('Service published')
          : message('Service saved'),
      );

      if (isEditing) {
        setForm(current => ({...current, status: payload.status}));
      } else {
        navigate('/dashboard/services');
      }
    } catch (reason) {
      const parsed = parseServiceErrors(reason);
      setError(serviceSaveErrorMessage(reason));
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!serviceId) return;
    setDeleting(true);
    setError(undefined);

    try {
      await apiClient.delete(`/api/v1/services/${serviceId}`);
      toast.positive(message('Service deleted'));
      navigate('/dashboard/services');
    } catch (reason) {
      setError(serviceSaveErrorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  const fieldError = (name: string) => fieldErrors[name];

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Service" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-6">
            <Skeleton className="h-40 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (!stores.length) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="New service" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl py-10">
            <Alert variant="default">
              <CircleAlertIcon />
              <Trans message="Create a storefront before adding a service." />
            </Alert>
            <Button className="mt-4" render={<Link to="/dashboard/stores" />}>
              <Trans message="Go to My Store" />
            </Button>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={trans({message: 'Back to services'})}
          render={<Link to="/dashboard/services" />}
        >
          <ArrowLeftIcon />
        </Button>
        <DashboardLayout.SectionTitle>
          {isEditing ? (
            <Trans message="Edit service" />
          ) : (
            <Trans message="New service" />
          )}
        </DashboardLayout.SectionTitle>
        {isEditing && (
          <Button
            variant="outline"
            color="danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon data-icon="inline-start" />
            <Trans message="Delete" />
          </Button>
        )}
        <Button
          variant="outline"
          disabled={saving}
          onClick={() => void save('draft')}
        >
          <Trans message="Save draft" />
        </Button>
        <Button disabled={saving} onClick={() => void save('published')}>
          <SaveIcon data-icon="inline-start" />
          {form.status === 'published' ? (
            <Trans message="Save changes" />
          ) : (
            <Trans message="Publish service" />
          )}
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 py-6">
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              {error}
            </Alert>
          )}

          <FormSection
            title={<Trans message="Basics" />}
            description={
              <Trans message="What you offer and how customers find it." />
            }
          >
            <FormField
              id="service-store"
              label={<Trans message="Storefront" />}
              description={
                <Trans message="The service appears on this storefront." />
              }
              error={fieldError('store_id')}
            >
              <Select.Root
                value={form.store_id}
                onValueChange={value => update('store_id', String(value))}
              >
                <Select.Trigger id="service-store" className="w-full">
                  <Select.Value>
                    {stores.find(store => String(store.id) === form.store_id)
                      ?.name ?? trans(message('Select a storefront'))}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {stores.map(store => (
                    <Select.Item key={store.id} value={String(store.id)}>
                      {store.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </FormField>

            <FormField
              id="service-title"
              label={<Trans message="Title" />}
              description={
                <Trans message="A clear name, for example Logo design." />
              }
              error={fieldError('title')}
            >
              <Input
                id="service-title"
                value={form.title}
                onChange={event => update('title', event.target.value)}
                placeholder={trans(message('Logo design'))}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="service-category"
                label={<Trans message="Category" />}
                error={fieldError('category')}
              >
                <Input
                  id="service-category"
                  value={form.category}
                  onChange={event => update('category', event.target.value)}
                  placeholder={trans(message('Design'))}
                />
              </FormField>
              <FormField
                id="service-skills"
                label={<Trans message="Skills" />}
                description={
                  <Trans message="Separate skills with commas." />
                }
                error={fieldError('skills')}
              >
                <Input
                  id="service-skills"
                  value={form.skills}
                  onChange={event => update('skills', event.target.value)}
                  placeholder={trans(message('Logo, Branding'))}
                />
              </FormField>
            </div>

            <FormField
              id="service-short-description"
              label={<Trans message="Short description" />}
              description={
                <Trans message="Shown on the service card. Keep it to one or two lines." />
              }
              error={fieldError('short_description')}
            >
              <Textarea
                id="service-short-description"
                rows={2}
                value={form.short_description}
                onChange={event =>
                  update('short_description', event.target.value)
                }
              />
            </FormField>

            <FormField
              id="service-description"
              label={<Trans message="Description" />}
              error={fieldError('description')}
            >
              <DescriptionEditor
                value={form.description}
                onChange={value => update('description', value)}
              />
            </FormField>
          </FormSection>

          <FormSection
            title={<Trans message="Media and links" />}
            description={
              <Trans message="Show your work before someone asks for a quote." />
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="service-cover"
                label={<Trans message="Cover image" />}
                error={fieldError('cover_file_entry_id')}
              >
                <CroppedCover
                  value={form.cover_url}
                  onChange={(url, entry) =>
                    setForm(current => ({
                      ...current,
                      cover_url: url,
                      cover_file_entry_id: entry?.id ?? null,
                    }))
                  }
                  uploadType="linkImages"
                  aspect={16 / 9}
                  label={trans(message('Cover image'))}
                  className="aspect-video h-auto w-full"
                />
              </FormField>

              <FormField
                id="service-gallery"
                label={<Trans message="Gallery" />}
                description={
                  <Trans message="Add up to 8 images. The cover is used on cards." />
                }
                error={fieldError('gallery_file_entry_ids')}
              >
                <GalleryField
                  value={form.gallery}
                  onChange={gallery => update('gallery', gallery)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="service-video"
                label={<Trans message="Video preview" />}
                error={fieldError('video_url')}
              >
                <Input
                  id="service-video"
                  value={form.video_url}
                  onChange={event => update('video_url', event.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </FormField>
              <FormField
                id="service-demo"
                label={<Trans message="Live demo" />}
                error={fieldError('live_demo_url')}
              >
                <Input
                  id="service-demo"
                  value={form.live_demo_url}
                  onChange={event =>
                    update('live_demo_url', event.target.value)
                  }
                  placeholder="https://example.com"
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title={<Trans message="Packages" />}
            description={
              <Trans message="Give customers clear options. Prices are shown as a starting point; payment happens outside Linket." />
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update('packages', [
                    ...form.packages,
                    {
                      name: '',
                      description: '',
                      price: '',
                      delivery_days: '',
                      revisions: '',
                      features: '',
                    },
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                <Trans message="Add package" />
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              {form.packages.map((packageItem, index) => (
                <div
                  key={packageItem.id ?? index}
                  className="flex flex-col gap-4 rounded-card-sm border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      <Trans
                        message="Package :number"
                        values={{number: index + 1}}
                      />
                    </span>
                    {form.packages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={trans({message: 'Remove package'})}
                        onClick={() =>
                          update(
                            'packages',
                            form.packages.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id={`package-${index}-name`}
                      label={<Trans message="Name" />}
                      error={fieldError(`packages.${index}.name`)}
                    >
                      <Input
                        id={`package-${index}-name`}
                        value={packageItem.name}
                        onChange={event =>
                          updatePackage(index, {
                            name: event.target.value,
                          })
                        }
                        placeholder={trans(message('Starter'))}
                      />
                    </FormField>
                    <FormField
                      id={`package-${index}-price`}
                      label={<Trans message="Price (ETB)" />}
                      description={
                        <Trans message="Leave empty to show Request a quote." />
                      }
                      error={fieldError(`packages.${index}.price_cents`)}
                    >
                      <Input
                        id={`package-${index}-price`}
                        inputMode="decimal"
                        value={packageItem.price}
                        onChange={event =>
                          updatePackage(index, {
                            price: event.target.value,
                          })
                        }
                        placeholder="299"
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      id={`package-${index}-delivery`}
                      label={<Trans message="Delivery days" />}
                      error={fieldError(`packages.${index}.delivery_days`)}
                    >
                      <Input
                        id={`package-${index}-delivery`}
                        inputMode="numeric"
                        value={packageItem.delivery_days}
                        onChange={event =>
                          updatePackage(index, {
                            delivery_days: event.target.value,
                          })
                        }
                        placeholder="5"
                      />
                    </FormField>
                    <FormField
                      id={`package-${index}-revisions`}
                      label={<Trans message="Revisions" />}
                      error={fieldError(`packages.${index}.revisions`)}
                    >
                      <Input
                        id={`package-${index}-revisions`}
                        inputMode="numeric"
                        value={packageItem.revisions}
                        onChange={event =>
                          updatePackage(index, {
                            revisions: event.target.value,
                          })
                        }
                        placeholder="2"
                      />
                    </FormField>
                  </div>

                  <FormField
                    id={`package-${index}-description`}
                    label={<Trans message="Package description" />}
                    error={fieldError(`packages.${index}.description`)}
                  >
                    <Textarea
                      id={`package-${index}-description`}
                      rows={2}
                      value={packageItem.description}
                      onChange={event =>
                        updatePackage(index, {
                          description: event.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField
                    id={`package-${index}-features`}
                    label={<Trans message="What is included" />}
                    description={
                      <Trans message="One item per line." />
                    }
                    error={fieldError(`packages.${index}.features`)}
                  >
                    <Textarea
                      id={`package-${index}-features`}
                      rows={4}
                      value={packageItem.features}
                      onChange={event =>
                        updatePackage(index, {
                          features: event.target.value,
                        })
                      }
                      placeholder={trans(
                        message('One logo concept\nPNG and vector files'),
                      )}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection
            title={<Trans message="FAQ" />}
            description={
              <Trans message="Answer the questions you hear before every project." />
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update('faqs', [...form.faqs, {question: '', answer: ''}])
                }
              >
                <PlusIcon data-icon="inline-start" />
                <Trans message="Add FAQ" />
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              {form.faqs.map((faq, index) => (
                <div
                  key={faq.id ?? index}
                  className="flex flex-col gap-3 rounded-card-sm border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      <Trans
                        message="Question :number"
                        values={{number: index + 1}}
                      />
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={trans({message: 'Remove FAQ'})}
                      onClick={() =>
                        update(
                          'faqs',
                          form.faqs.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                  <FormField
                    id={`faq-${index}-question`}
                    label={<Trans message="Question" />}
                    error={fieldError(`faqs.${index}.question`)}
                  >
                    <Input
                      id={`faq-${index}-question`}
                      value={faq.question}
                      onChange={event =>
                        updateFaq(index, {question: event.target.value})
                      }
                    />
                  </FormField>
                  <FormField
                    id={`faq-${index}-answer`}
                    label={<Trans message="Answer" />}
                    error={fieldError(`faqs.${index}.answer`)}
                  >
                    <Textarea
                      id={`faq-${index}-answer`}
                      rows={2}
                      value={faq.answer}
                      onChange={event =>
                        updateFaq(index, {answer: event.target.value})
                      }
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection
            title={<Trans message="Contact buttons" />}
            description={
              <Trans message="Let people reach you directly. These appear on the service page." />
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  update('contact_channels', [
                    ...form.contact_channels,
                    {type: 'whatsapp', label: '', value: ''},
                  ])
                }
              >
                <PlusIcon data-icon="inline-start" />
                <Trans message="Add contact" />
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              {form.contact_channels.length ? (
                form.contact_channels.map((channel, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-card-sm border border-border p-4 sm:grid-cols-[9rem_1fr_1fr_auto] sm:items-end"
                  >
                    <FormField
                      id={`channel-${index}-type`}
                      label={<Trans message="Type" />}
                      error={fieldError(
                        `contact_channels.${index}.type`,
                      )}
                    >
                      <Select.Root
                        value={channel.type}
                        onValueChange={value =>
                          updateContactChannel(index, {
                            type: value as ServiceContactChannelType,
                          })
                        }
                      >
                        <Select.Trigger
                          id={`channel-${index}-type`}
                          className="w-full"
                        >
                          <Select.Value>
                            {CHANNEL_TYPES.find(
                              item => item.value === channel.type,
                            )?.label ?? channel.type}
                          </Select.Value>
                        </Select.Trigger>
                        <Select.Content>
                          {CHANNEL_TYPES.map(item => (
                            <Select.Item key={item.value} value={item.value}>
                              {item.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </FormField>
                    <FormField
                      id={`channel-${index}-label`}
                      label={<Trans message="Label" />}
                      error={fieldError(
                        `contact_channels.${index}.label`,
                      )}
                    >
                      <Input
                        id={`channel-${index}-label`}
                        value={channel.label}
                        onChange={event =>
                          updateContactChannel(index, {
                            label: event.target.value,
                          })
                        }
                        placeholder={trans(message('Chat on WhatsApp'))}
                      />
                    </FormField>
                    <FormField
                      id={`channel-${index}-value`}
                      label={<Trans message="Value" />}
                      error={fieldError(
                        `contact_channels.${index}.value`,
                      )}
                    >
                      <Input
                        id={`channel-${index}-value`}
                        value={channel.value}
                        onChange={event =>
                          updateContactChannel(index, {
                            value: event.target.value,
                          })
                        }
                        placeholder={trans(message('+251911234567'))}
                      />
                    </FormField>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={trans({message: 'Remove contact button'})}
                      onClick={() =>
                        update(
                          'contact_channels',
                          form.contact_channels.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Trans message="No contact buttons yet. Customers can still send an inquiry." />
                </p>
              )}
            </div>
          </FormSection>

          <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialog.Portal>
              <AlertDialog.Backdrop />
              <AlertDialog.Content size="sm">
                <AlertDialog.Header>
                  <AlertDialog.Media className="bg-destructive/10 text-destructive">
                    <Trash2Icon />
                  </AlertDialog.Media>
                  <AlertDialog.Title>
                    <Trans message="Delete this service?" />
                  </AlertDialog.Title>
                  <AlertDialog.Description>
                    <Trans message="The service and its public page will be removed. Inquiries already received are kept." />
                  </AlertDialog.Description>
                </AlertDialog.Header>
                <AlertDialog.Footer>
                  <AlertDialog.Cancel disabled={deleting}>
                    <Trans message="Cancel" />
                  </AlertDialog.Cancel>
                  <AlertDialog.Action
                    color="danger"
                    disabled={deleting}
                    onClick={() => void remove()}
                  >
                    <Trans message="Delete service" />
                  </AlertDialog.Action>
                </AlertDialog.Footer>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );

  function updatePackage(
    index: number,
    patch: Partial<ServiceFormState['packages'][number]>,
  ) {
    update(
      'packages',
      form.packages.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  }

  function updateFaq(
    index: number,
    patch: Partial<ServiceFormState['faqs'][number]>,
  ) {
    update(
      'faqs',
      form.faqs.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  }

  function updateContactChannel(
    index: number,
    patch: Partial<ServiceFormState['contact_channels'][number]>,
  ) {
    update(
      'contact_channels',
      form.contact_channels.map((item, itemIndex) =>
        itemIndex === index ? {...item, ...patch} : item,
      ),
    );
  }
}

function FormSection({
  title,
  description,
  action,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Card.Title>{title}</Card.Title>
            {description && (
              <Card.Description>{description}</Card.Description>
            )}
          </div>
          {action}
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">{children}</Card.Content>
    </Card.Root>
  );
}

function FormField({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {description && !error && (
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function GalleryField({
  value,
  onChange,
}: {
  value: {id: number; file_entry_id: number; url: string}[];
  onChange: (
    value: {id: number; file_entry_id: number; url: string}[],
  ) => void;
}) {
  const {trans} = useTrans();

  const addImage = (entry: FileEntry) => {
    if (value.length >= 8) return;
    if (value.some(item => item.file_entry_id === entry.id)) return;
    onChange([
      ...value,
      {id: entry.id, file_entry_id: entry.id, url: entry.url},
    ]);
  };

  return (
    <div className="flex flex-col gap-3">
      <SharedFileUploader
        uploadType="linkImages"
        bare
        onUploaded={addImage}
        hint={trans(message('PNG, JPG or WebP. Up to 8 images.'))}
      />
      {!!value.length && (
        <ul className="grid grid-cols-4 gap-2">
          {value.map(item => (
            <li key={item.file_entry_id} className="group relative">
              <img
                src={item.url}
                alt=""
                className="aspect-square w-full rounded-card-xs object-cover"
              />
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute end-1 top-1 bg-background/90"
                aria-label={trans({message: 'Remove image'})}
                onClick={() =>
                  onChange(
                    value.filter(
                      image => image.file_entry_id !== item.file_entry_id,
                    ),
                  )
                }
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={value}
      onChange={onChange}
    >
      <div className="overflow-hidden rounded-input border border-input">
        <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
          <FormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <LinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-none px-3 py-2.5 dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}
