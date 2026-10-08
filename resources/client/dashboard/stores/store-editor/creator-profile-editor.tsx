import {CharacterCounter} from '@app/dashboard/stores/store-editor/character-counter';
import {CreatorAboutEditor} from '@app/dashboard/stores/store-editor/creator-about-editor';
import {
  parseSkills,
  SkillsChipsField,
  SKILLS_MAX,
} from '@app/dashboard/stores/store-editor/skills-chips-field';
import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {SectionAccordionTrigger} from '@app/dashboard/stores/store-editor/section-accordion-trigger';
import {SectionHeading} from '@app/dashboard/stores/store-editor/section-heading';
import {
  BIO_MAX_LENGTH,
  buildInitialProfileFormValues,
  CreatorProfileForm,
  rebaseAboutFormOnEditorReady,
} from '@app/dashboard/stores/store-editor/creator-profile-form-values';
import {
  CreatorProfileConfig,
  CreatorProfileSection,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {
  SocialsList,
  SocialsType,
} from '@app/dashboard/stores/store-editor/content/widgets/socials-widget/socials-list';
import {resolveBiolinkContainerRadius} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {digitalProductsIndex} from '@app/gen/digital-products';
import {useAuth} from '@common/auth/use-auth';
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
import {message} from '@ui/i18n/message';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  AtSignIcon,
  LinkIcon,
  MailIcon,
  PackageCheckIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react';
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {Link} from 'react-router';

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
  // The last-saved baseline lives in the store so it outlives this
  // component: the tab routes remount the editor, and Save's enabled state
  // plus the leave-warning must still mean "differs from last saved" after
  // a Content -> Appearance -> Content round trip.
  const savedProfileConfig = useBiolinkEditorStore(s => s.savedProfileConfig);
  const initialSavedProfileConfig = useRef(savedProfileConfig).current;
  const rebaseSavedAboutHtml = useBiolinkEditorStore(
    s => s.rebaseSavedAboutHtml,
  );
  const initialSelectedProductIds = useRef<number[] | null>(null);
  const updateProfileConfig = useBiolinkEditorStore(s => s.updateProfileConfig);
  const setProfileIsDirty = useBiolinkEditorStore(s => s.setProfileIsDirty);
  const setFeaturedProductIds = useBiolinkEditorStore(
    s => s.setFeaturedProductIds,
  );
  const appearance = useBiolinkEditorStore(s => s.appearance);
  const containerRadius = resolveBiolinkContainerRadius(appearance);
  // The open accordion section lives in the store so the live preview can
  // follow it (A-06): opening Products moves the phone to its Products
  // section. It starts on Profile and keeps whatever the user last opened.
  const openSection = useBiolinkEditorStore(s => s.openSection);
  const setOpenSection = useBiolinkEditorStore(s => s.setOpenSection);
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
    defaultValues: buildInitialProfileFormValues(initialSavedProfileConfig),
  });
  const values = useWatch({control: form.control});
  // Seed the live draft's values while keeping the saved baseline as the
  // defaults: a remount (tab switch) re-seeds the form from the store's
  // pushed config — unsaved edits included — and form.isDirty must still
  // compare them against the last saved config, not against themselves.
  // Declared after useWatch so its subscription exists before this reset
  // emits — otherwise useWatch keeps its mount-time snapshot for the whole
  // mount and the form's live values never reach the preview.
  // Mirrors the pushed config so the re-seed below can read it without
  // subscribing to every push (a re-seed per keystroke would truncate
  // in-progress input through normalize).
  const profileConfigRef = useRef(profileConfig);
  profileConfigRef.current = profileConfig;
  // Re-seed both sides of the dirty comparison: values from the pushed
  // draft, defaults from the last-saved baseline (the saved baseline is the
  // dep so a TipTap About rebase re-seeds instead of leaving a clobber
  // behind — the rebase lands in a child layout effect, before this parent
  // layout effect, and keepDefaultValues used to preserve its defaults
  // while the seed overwrote its values, leaving about_html permanently
  // dirty with zero edits). When the form already holds exactly the saved
  // About HTML — the rebased canonical — keep it verbatim: translating it
  // through renderAboutHtml again would produce a third serialization and
  // make TipTap recreate itself in a loop.
  // Re-seed both sides of the dirty comparison: values from the pushed
  // draft, defaults from the last-saved baseline (the saved baseline is a
  // dep so a TipTap About rebase re-seeds instead of leaving a clobber
  // behind — the rebase lands in a child layout effect, before this parent
  // layout effect, and keepDefaultValues used to preserve its defaults
  // while the seed overwrote its values, leaving about_html permanently
  // dirty with zero edits after visiting About). When the form already
  // holds exactly the saved About HTML — the rebased canonical — keep it
  // verbatim: translating it through renderAboutHtml again would produce a
  // third serialization and make TipTap recreate itself in a loop.
  useLayoutEffect(() => {
    const currentAbout = (form.getValues('about_html') as string) || '';
    const rebasedAbout =
      currentAbout !== '' && currentAbout === savedProfileConfig.about_html
        ? currentAbout
        : null;
    const savedSeed = buildInitialProfileFormValues(savedProfileConfig);
    const pushedSeed = buildInitialProfileFormValues(profileConfigRef.current);
    if (rebasedAbout) {
      savedSeed.about_html = rebasedAbout;
      pushedSeed.about_html = rebasedAbout;
    }
    form.reset(savedSeed);
    form.reset(pushedSeed, {keepDefaultValues: true});
  }, [form, savedProfileConfig]);
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
      (productsQuery.data || []).filter(product =>
        selectedProductIds.includes(product.id),
      ),
    [productsQuery.data, selectedProductIds],
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
    // Push on every change, including when the form returns to clean: an
    // undone edit or a discarded draft must leave the phone preview showing
    // the saved values again (A-05). The dirty flag never comes from the
    // push itself — only from the form/product state below — so a clean
    // form can't be marked dirty by this sync.
    updateProfileConfig(
      normalizeProfileValues(
        // getValues() reads the form's current state, so this push is
        // correct even when the watched `values` snapshot from this render
        // still predates the mount-time reset above.
        form.getValues() as Partial<CreatorProfileForm>,
        initialProfileConfig,
      ),
    );
    setProfileIsDirty(form.formState.isDirty || productsAreDirty);
  }, [
    form,
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
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {tab === 'content' && (
            <SectionHeading
              title={<Trans message="Content" />}
              description={
                <Trans message="Manage what appears on your profile." />
              }
            />
          )}
          {tab === 'about' ? (
            <section className="flex flex-col gap-4 py-2">
              <SectionHeading
                title={<Trans message="About" />}
                description={
                  <Trans message="Share the story, experience, and approach behind your work." />
                }
              />
              <Field.Root>
                <CreatorAboutEditor
                  key={biolink.id}
                  value={values.about_html || ''}
                  onChange={aboutHtml =>
                    form.setValue('about_html', aboutHtml, {
                      shouldDirty: true,
                    })
                  }
                  onEditorReady={canonicalHtml => {
                    const rebased = rebaseAboutFormOnEditorReady(
                      form,
                      values.about_html,
                      canonicalHtml,
                    );
                    if (rebased) {
                      rebaseSavedAboutHtml(canonicalHtml);
                    }
                  }}
                />
                <Field.Description>
                  <Trans message="This appears in the About tab on your public profile." />
                </Field.Description>
              </Field.Root>
            </section>
          ) : (
            <Accordion.Root
              variant="separated"
              value={openSection ? [openSection] : []}
              onValueChange={value =>
                setOpenSection(
                  (value[0] as CreatorProfileSection | undefined) ?? null,
                )
              }
            >
              <Accordion.Item value="profile">
                <SectionAccordionTrigger>
                  <BuilderSectionHeader
                    icon={UserRoundIcon}
                    title={<Trans message="Profile" />}
                    description={
                      <Trans message="Name, photo, bio, and skills." />
                    }
                  />
                </SectionAccordionTrigger>
                <Accordion.Content className="border-t pt-4">
                  <Field.Group className="max-w-2xl gap-3">
                    <HookForm.Field name="cover_url">
                      <Field.Label>
                        <Trans message="Cover image" />
                      </Field.Label>
                      <CroppedCover
                        className={cn(
                          'h-28 w-full max-w-[22.5rem] sm:h-30',
                          containerRadius.className,
                        )}
                        cropRadius={containerRadius.value}
                        value={values.cover_url || ''}
                        label={trans(message('Cover image'))}
                        onChange={value =>
                          form.setValue('cover_url', value || '', {
                            shouldDirty: true,
                          })
                        }
                        uploadType="linkImages"
                        aspect={3}
                      />
                    </HookForm.Field>

                    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-5">
                      <HookForm.Field name="avatar_url">
                        <Field.Label>
                          <Trans message="Profile photo" />
                        </Field.Label>
                        <CroppedAvatar
                          className={cn(
                            'size-22 bg-background p-1',
                            containerRadius.avatarClassName,
                          )}
                          previewClassName={containerRadius.avatarClassName}
                          cropRadius={containerRadius.avatarValue}
                          value={values.avatar_url || ''}
                          label={trans(message('Profile photo'))}
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
                              clearLabel={trans(message('Clear profile title'))}
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
                        <Trans message="Short bio" />
                      </Field.Label>
                      <Textarea rows={4} maxLength={BIO_MAX_LENGTH} />
                      <Field.Description className="flex items-start justify-between gap-3">
                        <span>
                          <Trans message="A short introduction to your work and audience." />
                        </span>
                        <CharacterCounter
                          current={values.bio?.length ?? 0}
                          max={BIO_MAX_LENGTH}
                        />
                      </Field.Description>
                      <Field.Error />
                    </HookForm.Field>
                    <HookForm.Field name="skills">
                      <Field.Label>
                        <Trans message="Skills" />
                      </Field.Label>
                      <SkillsChipsField
                        placeholder={trans(
                          message('Design, Photography, Coaching'),
                        )}
                      />
                      <Field.Description className="flex items-start justify-between gap-3">
                        <span>
                          <Trans message="Separate skills with commas. The first eight are shown." />
                        </span>
                        <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
                          {parseSkills(values.skills).length}/{SKILLS_MAX}
                        </span>
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
                <SectionAccordionTrigger>
                  <BuilderSectionHeader
                    icon={AtSignIcon}
                    title={<Trans message="Social links" />}
                    description={
                      <Trans message="Instagram, X, TikTok, and more." />
                    }
                  />
                </SectionAccordionTrigger>
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
                <SectionAccordionTrigger>
                  <BuilderSectionHeader
                    icon={LinkIcon}
                    title={<Trans message="Actions" />}
                    description={<Trans message="Message button settings." />}
                  />
                </SectionAccordionTrigger>
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
                <SectionAccordionTrigger
                  descriptionPhrase={trans(
                    message(':selected of :total products featured', {
                      values: {
                        selected: selectedProductIds.length,
                        total: 6,
                      },
                    }),
                  )}
                >
                  <BuilderSectionHeader
                    icon={PackageCheckIcon}
                    title={<Trans message="Products" />}
                    description={
                      <Trans message="Feature up to six items." />
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
                </SectionAccordionTrigger>
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
                              render={<Link to="/dashboard/items" />}
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
  const {trans} = useTrans();
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
        {product.status !== 'approved' && (
          <div className="mt-1">
            <Badge variant="outline">
              <Trans message="Not visible yet" />
            </Badge>
          </div>
        )}
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={trans(
          message('Remove :title', {values: {title: product.title}}),
        )}
        onClick={onRemove}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
    // The config shape includes headline (getCreatorProfileConfig
    // materializes it), so the push must carry it too — otherwise every
    // push erases it and the next editor mount reads the lost field as an
    // edit, leaving Save enabled with nothing changed.
    headline: values.headline || '',
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
