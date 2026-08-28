import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {CreatorProfileConfig} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/stores/store-editor/content/widgets/socials-widget/socials-list';
import {digitalProductsIndex} from '@app/gen/digital-products';
import {useAuth} from '@common/auth/use-auth';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {LinkButton as EditorLinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {
  CroppedAvatar,
  CroppedCover,
} from '@common/uploads/components/cropped-image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Badge} from '@shadcn/badge/badge';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
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
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {toast} from '@shadcn/toast/toast';
import {useQuery} from '@tanstack/react-query';
import {Placeholder} from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import {useCurrentTextEditor} from '@common/text-editor/tiptap-editor-context';
import {message} from '@ui/i18n/message';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  AtSignIcon,
  ChevronDownIcon,
  LinkIcon,
  MailIcon,
  PackageCheckIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {Link} from 'react-router';

type CreatorProfileForm = Omit<CreatorProfileConfig, 'skills'> & {
  skills: string;
};

type CreatorProfileSection = 'actions' | 'products' | 'profile' | 'socials';

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

const creatorAboutExtensions = [
  StarterKit.configure({
    heading: {levels: [2, 3]},
    code: false,
    codeBlock: false,
    strike: false,
    underline: {},
    link: {
      shouldAutoLink: value => /^https?:\/\//.test(value),
    },
  }),
  Placeholder.configure({
    placeholder: 'Share your story, experience, and approach...',
  }),
];

export function CreatorProfileEditor({
  tab = 'content',
}: {
  tab?: 'about' | 'content';
}) {
  const {trans} = useTrans();
  const {user} = useAuth();
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const profileConfig = useBiolinkEditorStore(s => s.profileConfig);
  const initialProfileConfig = useRef(profileConfig).current;
  const initialSelectedProductIds = useRef<number[] | null>(null);
  const updateProfileConfig = useBiolinkEditorStore(s => s.updateProfileConfig);
  const setProfileIsDirty = useBiolinkEditorStore(s => s.setProfileIsDirty);
  const setFeaturedProductIds = useBiolinkEditorStore(
    s => s.setFeaturedProductIds,
  );
  const [openSection, setOpenSection] = useState<CreatorProfileSection | null>(
    tab === 'content' ? 'profile' : null,
  );
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
  const accountEmail = user?.email || '';
  const contactUrl = values.contact_url?.trim() || '';
  const usesAccountEmailForContact =
    accountEmail !== '' && contactUrl === accountEmail;
  const handleAccountEmailContactChange = (enabled: boolean) => {
    form.setValue('contact_url', enabled && accountEmail ? accountEmail : '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };
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
    setFeaturedProductIds(attachedProductIds);
  }, [biolink.id, productsQuery.data, setFeaturedProductIds]);

  useEffect(() => {
    setFeaturedProductIds(selectedProductIds);
  }, [selectedProductIds, setFeaturedProductIds]);

  useEffect(() => {
    if (form.formState.isDirty) {
      updateProfileConfig(
        normalizeProfileValues(
          values as Partial<CreatorProfileForm>,
          initialProfileConfig,
        ),
      );
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

  return (
    <FileUploadProvider>
      <HookForm.Root form={form} onSubmit={() => {}}>
        <div className="w-full max-w-3xl">
          {tab === 'about' ? (
            <section className="flex max-w-2xl flex-col gap-4 py-2">
              <div>
                <h2 className="text-lg font-semibold">
                  <Trans message="About" />
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans message="Share the story, experience, and approach behind your work." />
                </p>
              </div>
              <Field.Root>
                <Field.Label>
                  <Trans message="About content" />
                </Field.Label>
                <CreatorAboutEditor
                  key={biolink.id}
                  value={values.about_html || ''}
                  onChange={aboutHtml =>
                    form.setValue('about_html', aboutHtml, {
                      shouldDirty: true,
                    })
                  }
                />
                <Field.Description>
                  <Trans message="This appears in the About tab on your public profile." />
                </Field.Description>
              </Field.Root>
            </section>
          ) : (
            <Accordion.Root
              variant="bordered"
              value={openSection ? [openSection] : []}
              onValueChange={value =>
                setOpenSection(
                  (value[0] as CreatorProfileSection | undefined) ?? null,
                )
              }
            >
              <Accordion.Item value="profile">
                <Accordion.Trigger>
                  <BuilderSectionHeader
                    icon={UserRoundIcon}
                    title={<Trans message="Profile" />}
                    description={
                      <Trans message="Name, photo, bio, and skills." />
                    }
                  />
                </Accordion.Trigger>
                <Accordion.Content className="border-t pt-4">
                  <Field.Group className="max-w-2xl gap-3">
                    <HookForm.Field name="cover_url">
                      <Field.Label>
                        <Trans message="Cover image" />
                      </Field.Label>
                      <CroppedCover
                        className="h-28 w-full sm:h-32"
                        value={values.cover_url || ''}
                        onChange={value =>
                          form.setValue('cover_url', value || '', {
                            shouldDirty: true,
                          })
                        }
                        uploadType="linkImages"
                        aspect={16 / 9}
                      />
                    </HookForm.Field>

                    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-5">
                      <HookForm.Field name="avatar_url">
                        <Field.Label>
                          <Trans message="Profile photo" />
                        </Field.Label>
                        <CroppedAvatar
                          className="size-22 rounded-card-sm bg-background p-1"
                          previewClassName="rounded-card-xs"
                          value={values.avatar_url || ''}
                          onChange={value =>
                            form.setValue('avatar_url', value || '', {
                              shouldDirty: true,
                            })
                          }
                          uploadType="linkImages"
                          aspect={1}
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
                                {
                                  shouldDirty: true,
                                },
                              )
                            }
                            itemToStringLabel={option => trans(option.label)}
                            isItemEqualToValue={(option, value) =>
                              option.value === value.value
                            }
                          >
                            <Combobox.Input
                              placeholder={trans(
                                message('Choose a profession'),
                              )}
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
                  <BuilderSectionHeader
                    icon={AtSignIcon}
                    title={<Trans message="Social links" />}
                    description={
                      <Trans message="Instagram, X, TikTok, and more." />
                    }
                  />
                </Accordion.Trigger>
                <Accordion.Content className="border-t pt-4">
                  <Field.Group className="max-w-2xl gap-3">
                    {visibleSocials.map(type => {
                      const social = SocialsList[type];
                      return (
                        <HookForm.Field
                          key={type}
                          name={`social_links.${type}`}
                        >
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
                  <BuilderSectionHeader
                    icon={LinkIcon}
                    title={<Trans message="Actions" />}
                    description={<Trans message="Message button settings." />}
                  />
                </Accordion.Trigger>
                <Accordion.Content className="border-t pt-4">
                  <Field.Group className="max-w-2xl gap-3">
                    <Field.Root
                      orientation="horizontal"
                      className="items-start rounded-card-sm border bg-muted/20 p-4"
                    >
                      <div
                        data-slot="field-content"
                        className="flex min-w-0 flex-1 flex-col gap-2"
                      >
                        <div>
                          <Field.Label>
                            <Trans message="Use signup email for Message" />
                          </Field.Label>
                          <Field.Description>
                            <Trans message="Turn this on to show a Message button using your account email." />
                          </Field.Description>
                        </div>
                        {accountEmail ? (
                          <div className="flex w-fit max-w-full items-center gap-2 rounded-input border bg-background px-3 py-1.5 text-sm font-medium">
                            <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{accountEmail}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <Trans message="Add an email to your account before using this shortcut." />
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={usesAccountEmailForContact}
                        disabled={!accountEmail}
                        onCheckedChange={handleAccountEmailContactChange}
                        aria-label={trans(
                          message('Use signup email for Message'),
                        )}
                      />
                    </Field.Root>
                    {!usesAccountEmailForContact && (
                      <HookForm.Field name="contact_url">
                        <Field.Label>
                          <Trans message="Custom message link" />
                        </Field.Label>
                        <Input
                          type="text"
                          inputMode="url"
                          placeholder="https://cal.com/your-name"
                        />
                        <Field.Description>
                          <Trans message="Optional. Add a booking or contact-page link, or leave empty to hide Message." />
                        </Field.Description>
                        <Field.Error />
                      </HookForm.Field>
                    )}
                  </Field.Group>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="products">
                <Accordion.Trigger>
                  <BuilderSectionHeader
                    icon={PackageCheckIcon}
                    title={<Trans message="Products" />}
                    description={
                      <Trans message="Feature up to six Digital Products." />
                    }
                    trailing={
                      <Badge
                        variant="outline"
                        className="font-mono tabular-nums"
                      >
                        {selectedProductIds.length}/6
                      </Badge>
                    }
                  />
                </Accordion.Trigger>
                <Accordion.Content className="border-t pt-4">
                  <div className="flex max-w-2xl flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        <Trans message="Showcase approved products on your profile." />
                      </p>
                      {!productsQuery.isError && (
                        <ProductPickerDialog
                          products={approvedProducts}
                          selectedProductIds={selectedProductIds}
                          onSelectionChange={setSelectedProductIds}
                        />
                      )}
                    </div>

                    {productsQuery.isPending ? (
                      <div className="divide-y">
                        {Array.from({length: 2}).map((_, index) => (
                          <Skeleton
                            key={index}
                            className="my-2 h-10 rounded-card-sm"
                          />
                        ))}
                      </div>
                    ) : productsQuery.isError ? (
                      <Empty.Root className="min-h-28 p-3">
                        <Empty.Media variant="icon">
                          <PackageIcon />
                        </Empty.Media>
                        <Empty.Header>
                          <Empty.Title>
                            <Trans message="Could not load products" />
                          </Empty.Title>
                          <Empty.Description>
                            <Trans message="Retry before saving." />
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
                      <div className="divide-y">
                        {selectedProducts.map(product => (
                          <SelectedProduct
                            key={product.id}
                            product={product}
                            onRemove={() =>
                              setSelectedProductIds(
                                selectedProductIds.filter(
                                  id => id !== product.id,
                                ),
                              )
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty.Root className="min-h-28 p-3">
                        <Empty.Media variant="icon">
                          <PackageCheckIcon />
                        </Empty.Media>
                        <Empty.Header>
                          <Empty.Title>
                            <Trans message="No products yet" />
                          </Empty.Title>
                          <Empty.Description>
                            {approvedProducts.length ? (
                              <Trans message="Add products to showcase them." />
                            ) : (
                              <Trans message="Approved products will appear here." />
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
                              <Trans message="Manage products" />
                            </Button>
                          </Empty.Content>
                        )}
                      </Empty.Root>
                    )}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          )}
        </div>
      </HookForm.Root>
    </FileUploadProvider>
  );
}

function CreatorAboutEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={creatorAboutExtensions}
      initialContent={value}
      onChange={onChange}
    >
      <div className="overflow-hidden rounded-card-sm border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
          <AboutFormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <EditorLinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-52 max-w-none px-3.5 py-3 text-foreground dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}

function AboutFormatDropdown() {
  const editor = useCurrentTextEditor();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={!editor} />
        }
      >
        <Trans message="Format" />
        <ChevronDownIcon data-icon="inline-end" />
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Item
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          <Trans message="Paragraph" />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            editor?.chain().focus().toggleHeading({level: 2}).run()
          }
        >
          <Trans message="Heading :number" values={{number: 2}} />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            editor?.chain().focus().toggleHeading({level: 3}).run()
          }
        >
          <Trans message="Heading :number" values={{number: 3}} />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Trans message="Blockquote" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
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
      <Dialog.Trigger
        render={<Button type="button" size="sm" variant="outline" />}
      >
        <PlusIcon data-icon="inline-start" />
        <Trans message="Add products" />
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
              <div className="divide-y">
                {products.map(product => {
                  const checked = selectedProductIds.includes(product.id);
                  const disabled = !checked && selectedProductIds.length >= 6;
                  return (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 px-1 py-3 transition-colors hover:bg-muted/40 has-data-checked:bg-primary/5 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-60"
                      data-disabled={disabled || undefined}
                    >
                      <ProductThumbnail product={product} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {product.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          <FormattedCurrency
                            valueInCents={product.price_cents}
                            currency={product.currency}
                          />
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

function SelectedProduct({
  product,
  onRemove,
}: {
  product: CreatorProduct;
  onRemove: () => void;
}) {
  return (
    <div className="group flex min-w-0 items-center gap-3 px-1 py-2.5 transition-colors hover:bg-accent/50">
      <ProductThumbnail product={product} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm leading-tight font-medium">
          {product.title}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          <FormattedCurrency
            valueInCents={product.price_cents}
            currency={product.currency}
          />
        </div>
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={onRemove}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <XIcon />
      </Button>
    </div>
  );
}

function ProductThumbnail({product}: {product: CreatorProduct}) {
  return product.cover?.url ? (
    <img
      src={product.cover.url}
      alt=""
      className="rounded-object size-10 shrink-0 object-cover"
    />
  ) : (
    <span className="rounded-object flex size-10 shrink-0 items-center justify-center bg-muted text-muted-foreground">
      <PackageIcon className="size-4" />
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
    about_html: values.about_html || '',
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
