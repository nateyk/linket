import {
  AdminServiceCategory,
  AdminServiceSubcategory,
  createServiceCategoryOptions,
  createServiceSubcategoryOptions,
  deleteServiceCategoryOptions,
  deleteServiceSubcategoryOptions,
  serviceCategoriesAdminOptions,
  updateServiceCategoryOptions,
  updateServiceSubcategoryOptions,
} from '@app/admin/service-categories/service-categories-admin-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Item} from '@shadcn/item/item';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  ChevronRightIcon,
  EllipsisIcon,
  FolderIcon,
  FolderTreeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import {ReactNode, useState} from 'react';

export function Component() {
  const query = useSuspenseQuery(serviceCategoriesAdminOptions());
  const categories = query.data?.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <StaticPageTitle>
        <Trans message="Service categories" />
      </StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Service categories" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent>
          <DashboardLayout.SectionContentHeader>
            <p className="mr-auto text-sm text-muted-foreground">
              <Trans message="Categories and subcategories creators can choose when listing a service." />
            </p>
            <Button color="primary" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              <Trans message="New category" />
            </Button>
          </DashboardLayout.SectionContentHeader>
          <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
            {categories.map(category => (
              <CategoryCard key={category.id} category={category} />
            ))}
            {categories.length === 0 && <EmptyState />}
          </DashboardLayout.SectionScrollContainer>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>

      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        category={null}
      />
    </>
  );
}

function EmptyState() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FolderTreeIcon className="size-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium text-muted-foreground">
        <Trans message="No service categories yet" />
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        <Trans message="Create your first category to organize creator services." />
      </p>
      <Button color="primary" className="mt-4" onClick={() => setCreateOpen(true)}>
        <PlusIcon />
        <Trans message="New category" />
      </Button>
      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        category={null}
      />
    </div>
  );
}

function CategoryCard({category}: {category: AdminServiceCategory}) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false);
  const deleteCategory = useMutation(deleteServiceCategoryOptions());
  const subcategories = category.subcategories ?? [];

  return (
    <>
      <Item.Root variant="outline">
        <Item.Media align="center" className="size-9.5 rounded-full border">
          <FolderIcon className="size-4" />
        </Item.Media>
        <Item.Content>
          <Item.Title className="flex flex-wrap items-center gap-2">
            {category.name}
            <Badge variant={category.status === 'active' ? 'positive' : 'secondary'}>
              {category.status === 'active' ? (
                <Trans message="Active" />
              ) : (
                <Trans message="Inactive" />
              )}
            </Badge>
            {category.featured && (
              <Badge variant="default">
                <Trans message="Featured" />
              </Badge>
            )}
          </Item.Title>
          <Item.Description className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{category.slug}</span>
            <span className="text-muted-foreground">·</span>
            <Trans
              message="Subcategories: :count"
              values={{count: subcategories.length}}
            />
            <span className="text-muted-foreground">·</span>
            <Trans
              message="Services: :count"
              values={{count: category.services_count ?? 0}}
            />
          </Item.Description>
        </Item.Content>
        <Item.Actions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateSubcategoryOpen(true)}
          >
            <PlusIcon />
            <Trans message="Add subcategory" />
          </Button>
          <Dropdown.Root>
            <Dropdown.Trigger render={<Button variant="ghost" size="icon" />}>
              <EllipsisIcon />
            </Dropdown.Trigger>
            <Dropdown.Content align="end">
              <Dropdown.Item onClick={() => setEditOpen(true)}>
                <PencilIcon />
                <Trans message="Edit" />
              </Dropdown.Item>
              <Dropdown.Item
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <TrashIcon />
                <Trans message="Delete" />
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </Item.Actions>
      </Item.Root>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="sm" className="ms-3 mt-1" />
          }
        >
          <ChevronRightIcon
            className={open ? 'rotate-90 transition-transform' : 'transition-transform'}
          />
          {open ? (
            <Trans message="Hide subcategories" />
          ) : (
            <Trans
              message="Show subcategories (:count)"
              values={{count: subcategories.length}}
            />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ms-8 mt-2 flex flex-col gap-2 border-s ps-4">
            {subcategories.map(subcategory => (
              <SubcategoryRow
                key={subcategory.id}
                category={category}
                subcategory={subcategory}
              />
            ))}
            {subcategories.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                <Trans message="No subcategories yet." />
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
      />
      <SubcategoryDialog
        open={createSubcategoryOpen}
        onOpenChange={setCreateSubcategoryOpen}
        category={category}
        subcategory={null}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={<Trans message="Delete category" />}
        description={
          <Trans
            message="This will delete the category and its :count subcategories. Services using it will keep their details but lose the category link."
            values={{count: subcategories.length}}
          />
        }
        onConfirm={() => deleteCategory.mutateAsync(category.id)}
      />
    </>
  );
}

function SubcategoryRow({
  category,
  subcategory,
}: {
  category: AdminServiceCategory;
  subcategory: AdminServiceSubcategory;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteSubcategory = useMutation(deleteServiceSubcategoryOptions());

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">
            {subcategory.name}
          </span>
          <Badge
            variant={subcategory.status === 'active' ? 'positive' : 'secondary'}
          >
            {subcategory.status === 'active' ? (
              <Trans message="Active" />
            ) : (
              <Trans message="Inactive" />
            )}
          </Badge>
          {subcategory.featured && (
            <Badge variant="default">
              <Trans message="Featured" />
            </Badge>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {subcategory.slug}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditOpen(true)}
      >
        <PencilIcon />
        <span className="sr-only">
          <Trans message="Edit subcategory" />
        </span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDeleteOpen(true)}
      >
        <TrashIcon />
        <span className="sr-only">
          <Trans message="Delete subcategory" />
        </span>
      </Button>

      <SubcategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        subcategory={subcategory}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={<Trans message="Delete subcategory" />}
        description={
          <Trans message="Are you sure you want to delete this subcategory? Services using it will keep their details but lose the link." />
        }
        onConfirm={() => deleteSubcategory.mutateAsync(subcategory.id)}
      />
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AdminServiceCategory | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-lg">
          {open && (
            <CategoryDialogForm
              category={category}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CategoryDialogForm({
  category,
  onClose,
}: {
  category: AdminServiceCategory | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [status, setStatus] = useState<'active' | 'inactive'>(
    category?.status ?? 'active',
  );
  const [featured, setFeatured] = useState(category?.featured ?? false);
  const [addToMenu, setAddToMenu] = useState(category?.add_to_menu ?? false);
  const [position, setPosition] = useState(String(category?.position ?? ''));

  const create = useMutation(createServiceCategoryOptions());
  const update = useMutation(updateServiceCategoryOptions(category?.id ?? 0));
  const mutation = category ? update : create;

  const submit = () => {
    mutation.mutate(
      {
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
        status,
        featured,
        add_to_menu: addToMenu,
        position: position === '' ? null : Number(position),
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans
              message={category ? 'Category updated' : 'Category created'}
            />,
          );
          onClose();
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {category ? (
            <Trans message="Edit category" />
          ) : (
            <Trans message="New category" />
          )}
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Body className="flex flex-col gap-4">
        <Field.Root>
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input
            required
            autoFocus
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message="Slug" />
          </Field.Label>
          <Input
            value={slug}
            placeholder="auto-generated"
            onChange={event => setSlug(event.target.value)}
          />
          <Field.Description>
            <Trans message="Leave empty to generate a slug from the name." />
          </Field.Description>
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message="Description" />
          </Field.Label>
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
          />
        </Field.Root>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field.Root>
            <Field.Label>
              <Trans message="Status" />
            </Field.Label>
            <Select.Root
              value={status}
              onValueChange={value =>
                setStatus(value === 'inactive' ? 'inactive' : 'active')
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="active">
                  <Trans message="Active" />
                </Select.Item>
                <Select.Item value="inactive">
                  <Trans message="Inactive" />
                </Select.Item>
              </Select.Content>
            </Select.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>
              <Trans message="Position" />
            </Field.Label>
            <Input
              type="number"
              min={0}
              value={position}
              onChange={event => setPosition(event.target.value)}
            />
          </Field.Root>
        </div>
        <ToggleField
          label={<Trans message="Featured" />}
          checked={featured}
          onCheckedChange={setFeatured}
        />
        <ToggleField
          label={<Trans message="Add to menu" />}
          checked={addToMenu}
          onCheckedChange={setAddToMenu}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button type="submit" color="primary" disabled={mutation.isPending}>
          {category ? <Trans message="Save" /> : <Trans message="Create" />}
        </Button>
      </Dialog.Footer>
    </form>
  );
}

function SubcategoryDialog({
  open,
  onOpenChange,
  category,
  subcategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: AdminServiceCategory;
  subcategory: AdminServiceSubcategory | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-lg">
          {open && (
            <SubcategoryDialogForm
              category={category}
              subcategory={subcategory}
              onClose={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SubcategoryDialogForm({
  category,
  subcategory,
  onClose,
}: {
  category: AdminServiceCategory;
  subcategory: AdminServiceSubcategory | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(subcategory?.name ?? '');
  const [slug, setSlug] = useState(subcategory?.slug ?? '');
  const [description, setDescription] = useState(
    subcategory?.description ?? '',
  );
  const [status, setStatus] = useState<'active' | 'inactive'>(
    subcategory?.status ?? 'active',
  );
  const [featured, setFeatured] = useState(subcategory?.featured ?? false);
  const [addToMenu, setAddToMenu] = useState(
    subcategory?.add_to_menu ?? false,
  );
  const [position, setPosition] = useState(
    String(subcategory?.position ?? ''),
  );

  const create = useMutation(createServiceSubcategoryOptions());
  const update = useMutation(
    updateServiceSubcategoryOptions(subcategory?.id ?? 0),
  );
  const mutation = subcategory ? update : create;

  const submit = () => {
    mutation.mutate(
      {
        service_category_id: category.id,
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
        status,
        featured,
        add_to_menu: addToMenu,
        position: position === '' ? null : Number(position),
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans
              message={
                subcategory ? 'Subcategory updated' : 'Subcategory created'
              }
            />,
          );
          onClose();
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {subcategory ? (
            <Trans message="Edit subcategory" />
          ) : (
            <Trans message="New subcategory" />
          )}
        </Dialog.Title>
        <Dialog.Description>{category.name}</Dialog.Description>
      </Dialog.Header>
      <Dialog.Body className="flex flex-col gap-4">
        <Field.Root>
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input
            required
            autoFocus
            value={name}
            onChange={event => setName(event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message="Slug" />
          </Field.Label>
          <Input
            value={slug}
            placeholder="auto-generated"
            onChange={event => setSlug(event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>
            <Trans message="Description" />
          </Field.Label>
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
          />
        </Field.Root>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field.Root>
            <Field.Label>
              <Trans message="Status" />
            </Field.Label>
            <Select.Root
              value={status}
              onValueChange={value =>
                setStatus(value === 'inactive' ? 'inactive' : 'active')
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="active">
                  <Trans message="Active" />
                </Select.Item>
                <Select.Item value="inactive">
                  <Trans message="Inactive" />
                </Select.Item>
              </Select.Content>
            </Select.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>
              <Trans message="Position" />
            </Field.Label>
            <Input
              type="number"
              min={0}
              value={position}
              onChange={event => setPosition(event.target.value)}
            />
          </Field.Root>
        </div>
        <ToggleField
          label={<Trans message="Featured" />}
          checked={featured}
          onCheckedChange={setFeatured}
        />
        <ToggleField
          label={<Trans message="Add to menu" />}
          checked={addToMenu}
          onCheckedChange={setAddToMenu}
        />
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={onClose}>
          <Trans message="Cancel" />
        </Button>
        <Button type="submit" color="primary" disabled={mutation.isPending}>
          {subcategory ? <Trans message="Save" /> : <Trans message="Create" />}
        </Button>
      </Dialog.Footer>
    </form>
  );
}

function ToggleField({
  label,
  checked,
  onCheckedChange,
}: {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  onConfirm: () => Promise<unknown>;
}) {
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);

    try {
      await onConfirm();
      toast.success(<Trans message="Deleted" />);
      onOpenChange(false);
    } catch (error) {
      showHttpErrorToast(error);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>{title}</AlertDialog.Title>
            <AlertDialog.Description>{description}</AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={pending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={pending}
              onClick={confirm}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
