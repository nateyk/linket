import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {CreatorProfileConfig} from '@app/dashboard/biolink/biolink-editor/creator-profile-types';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-list';
import {updateCreatorProfile} from '@app/gen/biolinks';
import {digitalProductsIndex} from '@app/gen/digital-products';
import {queryClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Separator} from '@shadcn/separator';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  AtSignIcon,
  LinkIcon,
  PackageCheckIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  UserRoundIcon,
} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {Link} from 'react-router';

type CreatorProfileForm = Omit<CreatorProfileConfig, 'skills'> & {
  skills: string;
};

type CreatorProduct = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: string;
  cover?: {url: string} | null;
  biolink_ids?: number[];
};

type ProfessionOption = {
  value: string;
  label: ReturnType<typeof message>;
};

const professionOptions: ProfessionOption[] = [
  {value: 'Architect', label: message('Architect')},
  {value: 'Artist', label: message('Artist')},
  {value: 'Author', label: message('Author')},
  {value: 'Blogger', label: message('Blogger')},
  {value: 'Business owner', label: message('Business owner')},
  {value: 'Chef', label: message('Chef')},
  {value: 'Coach', label: message('Coach')},
  {value: 'Community manager', label: message('Community manager')},
  {value: 'Consultant', label: message('Consultant')},
  {value: 'Content creator', label: message('Content creator')},
  {value: 'Copywriter', label: message('Copywriter')},
  {value: 'Creative director', label: message('Creative director')},
  {value: 'Dancer', label: message('Dancer')},
  {value: 'Designer', label: message('Designer')},
  {value: 'Developer', label: message('Developer')},
  {value: 'Digital marketer', label: message('Digital marketer')},
  {value: 'Educator', label: message('Educator')},
  {value: 'Entrepreneur', label: message('Entrepreneur')},
  {value: 'Event planner', label: message('Event planner')},
  {value: 'Fashion designer', label: message('Fashion designer')},
  {value: 'Filmmaker', label: message('Filmmaker')},
  {value: 'Fitness trainer', label: message('Fitness trainer')},
  {value: 'Graphic designer', label: message('Graphic designer')},
  {value: 'Illustrator', label: message('Illustrator')},
  {value: 'Influencer', label: message('Influencer')},
  {value: 'Makeup artist', label: message('Makeup artist')},
  {value: 'Model', label: message('Model')},
  {value: 'Motion designer', label: message('Motion designer')},
  {value: 'Musician', label: message('Musician')},
  {value: 'Nutritionist', label: message('Nutritionist')},
  {value: 'Photographer', label: message('Photographer')},
  {value: 'Podcaster', label: message('Podcaster')},
  {value: 'Producer', label: message('Producer')},
  {value: 'Product designer', label: message('Product designer')},
  {value: 'Product manager', label: message('Product manager')},
  {value: 'Social media manager', label: message('Social media manager')},
  {value: 'Software engineer', label: message('Software engineer')},
  {value: 'Streamer', label: message('Streamer')},
  {value: 'Teacher', label: message('Teacher')},
  {value: 'Travel creator', label: message('Travel creator')},
  {value: 'UI/UX designer', label: message('UI/UX designer')},
  {value: 'Video producer', label: message('Video producer')},
  {value: 'Web designer', label: message('Web designer')},
  {value: 'Writer', label: message('Writer')},
];

const supportedSocials = Object.values(SocialsType);
const primarySocials: SocialsType[] = [
  SocialsType.Instagram,
  SocialsType.Twitter,
  SocialsType.Tiktok,
  SocialsType.Youtube,
  SocialsType.LinkedIn,
  SocialsType.Mail,
];

export function CreatorProfileEditor() {
  const {trans} = useTrans();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);
  const initialProfileConfig = useRef(profileConfig).current;
  const initialSelectedProductIds = useRef<number[] | null>(null);
  const updateProfileConfig = useBiolinkEditorStore(s => s.updateProfileConfig);
  const setProfileIsDirty = useBiolinkEditorStore(s => s.setProfileIsDirty);
  const [showAllSocials, setShowAllSocials] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const visibleSocials = useMemo(
    () =>
      showAllSocials
        ? supportedSocials
        : supportedSocials.filter(
            type =>
              primarySocials.includes(type) || profileConfig.social_links[type],
          ),
    [profileConfig.social_links, showAllSocials],
  );

  const form = useForm<CreatorProfileForm>({
    defaultValues: {
      ...profileConfig,
      skills: profileConfig.skills.join(', '),
    },
  });
  const values = useWatch({control: form.control});
  const productsQuery = useQuery({
    queryKey: ['digital-products', 'creator-profile-picker', {per_page: 100}],
    queryFn: async () => {
      const response = await digitalProductsIndex({
        params: {per_page: 100},
      });
      return (response.data || []) as CreatorProduct[];
    },
  });
  const approvedProducts = useMemo(
    () =>
      (productsQuery.data || []).filter(
        product => product.status === 'approved',
      ),
    [productsQuery.data],
  );
  const selectedProducts = useMemo(
    () =>
      approvedProducts.filter(product =>
        selectedProductIds.includes(product.id),
      ),
    [approvedProducts, selectedProductIds],
  );
  const professionItems = useMemo(() => {
    const currentTitle = values.profile_title?.trim();
    if (
      !currentTitle ||
      professionOptions.some(option => option.value === currentTitle)
    ) {
      return professionOptions;
    }

    return [
      {
        value: currentTitle,
        label: message(':title', {values: {title: currentTitle}}),
      },
      ...professionOptions,
    ];
  }, [values.profile_title]);
  const selectedProfession =
    professionItems.find(option => option.value === values.profile_title) ||
    null;
  const productsAreDirty =
    initialSelectedProductIds.current !== null &&
    !sameProductSelection(
      initialSelectedProductIds.current,
      selectedProductIds,
    );

  useEffect(() => {
    if (!productsQuery.data || initialSelectedProductIds.current !== null) {
      return;
    }

    const attachedProductIds = productsQuery.data
      .filter(product =>
        (product.biolink_ids || []).map(Number).includes(biolink.id),
      )
      .map(product => product.id)
      .slice(0, 6);

    initialSelectedProductIds.current = attachedProductIds;
    setSelectedProductIds(attachedProductIds);
  }, [biolink.id, productsQuery.data]);

  useEffect(() => {
    if (form.formState.isDirty) {
      updateProfileConfig(normalizeProfileValues(values, initialProfileConfig));
    }
    setProfileIsDirty(form.formState.isDirty || productsAreDirty);
  }, [
    form.formState.isDirty,
    initialProfileConfig,
    productsAreDirty,
    setProfileIsDirty,
    updateProfileConfig,
    values,
  ]);

  const saveProfile = useMutation({
    mutationFn: (
      payload: CreatorProfileConfig & {featured_product_ids: number[]},
    ) =>
      updateCreatorProfile(
        biolink.id,
        payload as Parameters<typeof updateCreatorProfile>[1],
      ),
    onSuccess: (_response, payload) => {
      const {featured_product_ids: savedProductIds, ...savedProfile} = payload;
      form.reset({
        ...savedProfile,
        skills: savedProfile.skills.join(', '),
      });
      initialSelectedProductIds.current = savedProductIds;
      updateProfileConfig(savedProfile);
      setProfileIsDirty(false);
      queryClient.invalidateQueries({queryKey: ['biolinks']});
      queryClient.invalidateQueries({queryKey: ['digital-products']});
      toast.success(<Trans message="Creator profile saved" />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const handleSubmit = () => {
    const normalized = normalizeProfileValues(form.getValues(), profileConfig);
    saveProfile.mutate({
      ...normalized,
      featured_product_ids: selectedProductIds,
    });
  };

  return (
    <FileUploadProvider>
      <HookForm.Root form={form} onSubmit={handleSubmit}>
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                <Trans message="Creator profile" />
              </h2>
              <p className="text-sm text-muted-foreground">
                <Trans message="Shape the profile your audience sees." />
              </p>
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={
                (!form.formState.isDirty && !productsAreDirty) ||
                productsQuery.isPending ||
                productsQuery.isError ||
                saveProfile.isPending
              }
            >
              <SaveIcon data-icon="inline-start" />
              <Trans message="Save changes" />
            </Button>
          </div>

          <Accordion.Root
            multiple
            variant="bordered"
            defaultValue={['profile']}
          >
            <Accordion.Item value="profile">
              <Accordion.Trigger>
                <UserRoundIcon />
                <Trans message="Profile" />
              </Accordion.Trigger>
              <Accordion.Content>
                <Field.Group>
                  <HookForm.Field name="cover_url">
                    <Field.Label>
                      <Trans message="Cover image" />
                    </Field.Label>
                    <ImageSelector.Square
                      className="h-28 w-full rounded-card-sm sm:h-32"
                      value={values.cover_url || ''}
                      onChange={value =>
                        form.setValue('cover_url', value || '', {
                          shouldDirty: true,
                        })
                      }
                      uploadType="linkImages"
                      placeholderVariant="dropzone"
                    />
                  </HookForm.Field>

                  <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-5">
                    <HookForm.Field name="avatar_url">
                      <Field.Label>
                        <Trans message="Profile photo" />
                      </Field.Label>
                      <ImageSelector.Avatar
                        className="size-22 rounded-card-sm bg-background p-1"
                        previewClassName="rounded-card-xs"
                        value={values.avatar_url || ''}
                        onChange={value =>
                          form.setValue('avatar_url', value || '', {
                            shouldDirty: true,
                          })
                        }
                        uploadType="linkImages"
                      />
                    </HookForm.Field>

                    <Field.Group>
                      <HookForm.Field name="display_name">
                        <Field.Label>
                          <Trans message="Display name" />
                        </Field.Label>
                        <Input required maxLength={80} />
                        <Field.Error />
                      </HookForm.Field>
                      <HookForm.Field name="profile_title">
                        <Field.Label>
                          <Trans message="Profile title" />
                        </Field.Label>
                        <Combobox.Root<ProfessionOption>
                          bindToHookForm={false}
                          items={professionItems}
                          value={selectedProfession}
                          onValueChange={option =>
                            form.setValue(
                              'profile_title',
                              option?.value || '',
                              {shouldDirty: true},
                            )
                          }
                          itemToStringLabel={option => trans(option.label)}
                          isItemEqualToValue={(option, value) =>
                            option.value === value.value
                          }
                        >
                          <Combobox.Input
                            placeholder={trans(message('Choose a profession'))}
                          />
                          <Combobox.Content>
                            <Combobox.Empty>
                              <Trans message="No professions found." />
                            </Combobox.Empty>
                            <Combobox.List>
                              {(option: ProfessionOption) => (
                                <Combobox.Item
                                  key={option.value}
                                  value={option}
                                >
                                  <Trans {...option.label} />
                                </Combobox.Item>
                              )}
                            </Combobox.List>
                          </Combobox.Content>
                        </Combobox.Root>
                        <Field.Description>
                          <Trans message="Choose the professional title shown below your name." />
                        </Field.Description>
                        <Field.Error />
                      </HookForm.Field>
                    </Field.Group>
                  </div>
                  <HookForm.Field name="bio">
                    <Field.Label>
                      <Trans message="About" />
                    </Field.Label>
                    <Textarea rows={4} maxLength={600} />
                    <Field.Description>
                      <Trans message="A short introduction to your work and audience." />
                    </Field.Description>
                    <Field.Error />
                  </HookForm.Field>
                  <HookForm.Field name="skills">
                    <Field.Label>
                      <Trans message="Skills" />
                    </Field.Label>
                    <Input
                      placeholder={trans(
                        message('Design, Photography, Coaching'),
                      )}
                    />
                    <Field.Description>
                      <Trans message="Separate skills with commas. The first eight are shown." />
                    </Field.Description>
                    <Field.Error />
                  </HookForm.Field>
                  <HookForm.Field name="available_for_work">
                    <Field.Root orientation="horizontal">
                      <div
                        data-slot="field-content"
                        className="flex min-w-0 flex-1 flex-col gap-1"
                      >
                        <Field.Label>
                          <Trans message="Available for work" />
                        </Field.Label>
                        <Field.Description>
                          <Trans message="Show a small availability badge on your profile." />
                        </Field.Description>
                      </div>
                      <Switch />
                    </Field.Root>
                  </HookForm.Field>
                </Field.Group>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="socials">
              <Accordion.Trigger>
                <AtSignIcon />
                <Trans message="Social links" />
              </Accordion.Trigger>
              <Accordion.Content>
                <Field.Group>
                  {visibleSocials.map(type => {
                    const social = SocialsList[type];
                    return (
                      <HookForm.Field key={type} name={`social_links.${type}`}>
                        <Field.Label>
                          <Trans {...social.name} />
                        </Field.Label>
                        <InputGroup>
                          <InputGroupAddon align="inline-start">
                            {social.icon}
                          </InputGroupAddon>
                          <InputGroupInput
                            type={social.inputType}
                            pattern={social.pattern}
                            placeholder={social.placeholder}
                          />
                        </InputGroup>
                        <Field.Error />
                      </HookForm.Field>
                    );
                  })}
                  {!showAllSocials &&
                    visibleSocials.length < supportedSocials.length && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-fit"
                        onClick={() => setShowAllSocials(true)}
                      >
                        <PlusIcon data-icon="inline-start" />
                        <Trans message="Show all networks" />
                      </Button>
                    )}
                </Field.Group>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item value="actions">
              <Accordion.Trigger>
                <LinkIcon />
                <Trans message="Actions" />
              </Accordion.Trigger>
              <Accordion.Content>
                <Field.Group>
                  <HookForm.Field name="follow_url">
                    <Field.Label>
                      <Trans message="Follow link" />
                    </Field.Label>
                    <Input type="url" placeholder="https://" />
                    <Field.Description>
                      <Trans message="The Follow button stays hidden until this is configured." />
                    </Field.Description>
                    <Field.Error />
                  </HookForm.Field>
                  <HookForm.Field name="contact_url">
                    <Field.Label>
                      <Trans message="Message link" />
                    </Field.Label>
                    <Input
                      type="text"
                      inputMode="email"
                      placeholder="hello@example.com"
                    />
                    <Field.Description>
                      <Trans message="Use an email, booking, or contact-page link." />
                    </Field.Description>
                    <Field.Error />
                  </HookForm.Field>
                </Field.Group>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>

          <Separator />

          <section className="flex flex-col gap-4" aria-labelledby="work-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="work-title" className="text-lg font-semibold">
                    <Trans message="Work" />
                  </h2>
                  <Badge variant="outline">{selectedProductIds.length}/6</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <Trans message="Choose up to six approved Digital Products to feature on this profile." />
                </p>
              </div>
              {!productsQuery.isError && (
                <ProductPickerDialog
                  products={approvedProducts}
                  selectedProductIds={selectedProductIds}
                  onSelectionChange={setSelectedProductIds}
                />
              )}
            </div>

            {productsQuery.isPending ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({length: 2}).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-card" />
                ))}
              </div>
            ) : productsQuery.isError ? (
              <Empty.Root className="min-h-40 border p-6">
                <Empty.Media variant="icon">
                  <PackageIcon />
                </Empty.Media>
                <Empty.Header>
                  <Empty.Title>
                    <Trans message="Products could not be loaded" />
                  </Empty.Title>
                  <Empty.Description>
                    <Trans message="Retry before saving so your current profile products stay unchanged." />
                  </Empty.Description>
                </Empty.Header>
                <Empty.Content>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void productsQuery.refetch()}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    <Trans message="Retry" />
                  </Button>
                </Empty.Content>
              </Empty.Root>
            ) : selectedProducts.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedProducts.map(product => (
                  <SelectedProduct key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <Empty.Root className="min-h-40 border p-6">
                <Empty.Media variant="icon">
                  <PackageCheckIcon />
                </Empty.Media>
                <Empty.Header>
                  <Empty.Title>
                    <Trans message="Feature your Digital Products" />
                  </Empty.Title>
                  <Empty.Description>
                    {approvedProducts.length ? (
                      <Trans message="Choose the products visitors should see on this profile." />
                    ) : (
                      <Trans message="Approved products will be available here after review." />
                    )}
                  </Empty.Description>
                </Empty.Header>
                {!approvedProducts.length && (
                  <Empty.Content>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      render={<Link to="/dashboard/my-products" />}
                    >
                      <PackageIcon data-icon="inline-start" />
                      <Trans message="Manage Digital Products" />
                    </Button>
                  </Empty.Content>
                )}
              </Empty.Root>
            )}
          </section>
        </div>
      </HookForm.Root>
    </FileUploadProvider>
  );
}

function ProductPickerDialog({
  products,
  selectedProductIds,
  onSelectionChange,
}: {
  products: CreatorProduct[];
  selectedProductIds: number[];
  onSelectionChange: (productIds: number[]) => void;
}) {
  const toggleProduct = (productId: number, checked: boolean) => {
    if (checked) {
      if (selectedProductIds.length >= 6) {
        toast.warning(<Trans message="You can feature up to six products." />);
        return;
      }
      onSelectionChange([...selectedProductIds, productId]);
      return;
    }

    onSelectionChange(selectedProductIds.filter(id => id !== productId));
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button type="button" size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        <Trans message="Choose products" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-xl">
          <Dialog.Header>
            <Dialog.Title>
              <PackageCheckIcon />
              <Trans message="Featured products" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Select up to six approved products for this creator profile." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {products.length ? (
              <div className="flex flex-col gap-2">
                {products.map(product => {
                  const checked = selectedProductIds.includes(product.id);
                  const disabled = !checked && selectedProductIds.length >= 6;
                  return (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 rounded-card border p-3 has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
                      data-disabled={disabled || undefined}
                    >
                      <ProductThumbnail product={product} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {product.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatMoney(product.price_cents, product.currency)}
                        </span>
                      </span>
                      <Checkbox
                        bindToHookForm={false}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={next =>
                          toggleProduct(product.id, next === true)
                        }
                        aria-label={product.title}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <Empty.Root className="min-h-48 p-6">
                <Empty.Media variant="icon">
                  <PackageIcon />
                </Empty.Media>
                <Empty.Header>
                  <Empty.Title>
                    <Trans message="No approved products yet" />
                  </Empty.Title>
                  <Empty.Description>
                    <Trans message="Submit a Digital Product for review before featuring it here." />
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            )}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton>
              <Trans message="Done" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SelectedProduct({product}: {product: CreatorProduct}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border p-3">
      <ProductThumbnail product={product} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{product.title}</div>
        <div className="text-xs text-muted-foreground">
          {formatMoney(product.price_cents, product.currency)}
        </div>
      </div>
      <Badge variant="secondary">
        <Trans message="Featured" />
      </Badge>
    </div>
  );
}

function ProductThumbnail({product}: {product: CreatorProduct}) {
  return product.cover?.url ? (
    <img
      src={product.cover.url}
      alt=""
      className="size-12 shrink-0 rounded-input object-cover"
    />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-input bg-muted text-muted-foreground">
      <PackageIcon />
    </span>
  );
}

function normalizeProfileValues(
  values: Partial<CreatorProfileForm>,
  fallback: CreatorProfileConfig,
): CreatorProfileConfig {
  return {
    display_name: values.display_name?.trim() || fallback.display_name,
    profile_title: values.profile_title?.trim() || '',
    bio: values.bio?.trim() || '',
    avatar_url: values.avatar_url || '',
    cover_url: values.cover_url || '',
    available_for_work: values.available_for_work ?? false,
    skills: (values.skills || '')
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean)
      .slice(0, 8),
    follow_url: values.follow_url?.trim() || '',
    contact_url: values.contact_url?.trim() || '',
    social_links: Object.fromEntries(
      Object.entries(values.social_links || {}).filter(([, value]) =>
        value?.trim(),
      ),
    ),
  };
}

function sameProductSelection(first: number[], second: number[]): boolean {
  if (first.length !== second.length) return false;
  const sortedFirst = [...first].sort((a, b) => a - b);
  const sortedSecond = [...second].sort((a, b) => a - b);
  return sortedFirst.every((id, index) => id === sortedSecond[index]);
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(
    cents / 100,
  );
}
