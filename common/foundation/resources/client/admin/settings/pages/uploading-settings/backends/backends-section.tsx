import {AdminSettings} from '@common/admin/settings/admin-settings';
import {supportedBackends} from '@common/admin/settings/pages/uploading-settings/backends/backends';
import {CreateBackendDialog} from '@common/admin/settings/pages/uploading-settings/backends/create-backend-dialog';
import {UpdateBackendDialog} from '@common/admin/settings/pages/uploading-settings/backends/update-backend-dialog';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {UploadingBackendSettings} from '@common/core/settings/base-backend-settings';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Table} from '@shadcn/table/table';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {MoreHorizontalIcon, PlusIcon, ServerIcon} from 'lucide-react';
import {useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function BackendsSection() {
  const {setValue, getValues} = useFormContext<AdminSettings>();
  const [createOpen, setCreateOpen] = useState(false);
  const backends =
    useWatch<AdminSettings>({
      name: 'client.uploading.backends',
    }) ?? [];

  return (
    <div>
      <div className="flex items-center gap-4 pl-2">
        <div className="flex size-8 items-center justify-center rounded-button bg-secondary">
          <ServerIcon className="size-4" />
        </div>
        <div className="text-base font-semibold">
          <Trans message="Storage backends" />
        </div>
      </div>
      <div>
        <div className="ml-6 h-6 w-0.5 bg-border/80" />
        <div className="mb-3 overflow-hidden rounded-card-sm border">
          <BackendsTable backends={backends} />
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          <Trans message="Add backend" />
        </Button>
        <CreateBackendDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={value => {
            const existing = getValues('client.uploading.backends') ?? [];
            setValue('client.uploading.backends', [...existing, value], {
              shouldDirty: true,
            });
          }}
        />
      </div>
    </div>
  );
}

function BackendsTable({backends}: {backends: UploadingBackendSettings[]}) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row className="bg-secondary hover:bg-secondary">
          <Table.Head className="h-9">
            <Trans message="Name" />
          </Table.Head>
          <Table.Head className="h-9">
            <Trans message="Type" />
          </Table.Head>
          <Table.Head className="h-9">
            <Trans message="Files" />
          </Table.Head>
          <Table.Head className="h-9">
            <Trans message="Size" />
          </Table.Head>
          <Table.Head className="size-9" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {backends.map(backend => (
          <Table.Row key={backend.id} className="hover:bg-transparent">
            <Table.Cell className="py-1.5">
              <span className="font-semibold">{backend.name}</span>
            </Table.Cell>
            <Table.Cell className="py-1.5">
              {supportedBackends.find(b => b.value === backend.type)?.label ??
                backend.type}
            </Table.Cell>
            <Table.Cell className="py-1.5">
              <FileCountColumn backend={backend} />
            </Table.Cell>
            <Table.Cell className="py-1.5">
              <SizeColumn backend={backend} />
            </Table.Cell>
            <Table.Cell className="py-1.5">
              <ActionsColumn backend={backend} />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function SizeColumn({backend}: {backend: UploadingBackendSettings}) {
  const {data} = useAdminSettings();
  const size = data.uploading.file_counts?.find(
    f => f.backend_id === backend.id,
  )?.total_size;
  return size ? <FormattedBytes bytes={size} /> : '-';
}

function FileCountColumn({backend}: {backend: UploadingBackendSettings}) {
  const {data} = useAdminSettings();
  const count = data.uploading.file_counts?.find(
    f => f.backend_id === backend.id,
  )?.file_count;
  return count ? <FormattedNumber value={count} /> : '-';
}

function ActionsColumn({backend}: {backend: UploadingBackendSettings}) {
  const {setValue, getValues} = useFormContext<AdminSettings>();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const handleUpdated = (updatedBackend: UploadingBackendSettings) => {
    const backends = (getValues('client.uploading.backends') ?? []).map(b =>
      b.id === backend.id ? {...b, ...updatedBackend} : b,
    );
    setValue('client.uploading.backends', backends, {
      shouldDirty: true,
    });
  };

  const handleRemoved = () => {
    const backends = (getValues('client.uploading.backends') ?? []).filter(
      b => b.id !== backend.id,
    );
    setValue('client.uploading.backends', backends, {
      shouldDirty: true,
    });
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
            />
          }
        >
          <MoreHorizontalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.Item onClick={() => setUpdateOpen(true)}>
            <Trans message="Edit" />
          </Dropdown.Item>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setRemoveOpen(true)}
          >
            <Trans message="Remove" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <UpdateBackendDialog
        backend={backend}
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        onUpdated={handleUpdated}
      />
      <RemoveBackendDialog
        backend={backend}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        onRemoved={handleRemoved}
      />
    </>
  );
}

type RemoveBackendDialogProps = {
  backend: UploadingBackendSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
};

function RemoveBackendDialog({
  backend,
  open,
  onOpenChange,
  onRemoved,
}: RemoveBackendDialogProps) {
  const {data} = useAdminSettings();
  const isUsed = Object.entries(data.client.uploading?.types ?? {}).some(
    ([, type]) => type.backends.includes(backend.id),
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        {isUsed ? (
          <RemoveWarningContent onOpenChange={onOpenChange} />
        ) : (
          <RemoveBackendContent
            onOpenChange={onOpenChange}
            onRemoved={onRemoved}
          />
        )}
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function RemoveBackendContent({
  onOpenChange,
  onRemoved,
}: Pick<RemoveBackendDialogProps, 'onOpenChange' | 'onRemoved'>) {
  const {base_url} = useSettings();
  return (
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Are you sure you want to remove this backend?" />
        </AlertDialog.Title>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <p>
            <Trans
              message="This <b>will not</b> delete files uploaded using this backend, so you can re-attach it later at the same path."
              values={{
                b: parts => <strong>{parts}</strong>,
              }}
            />
          </p>
          <p>
            <Trans
              message="If you want to delete the files first, you can do it from the <a>files</a> page, using backend filter."
              values={{
                a: parts => (
                  <a
                    className="font-semibold underline"
                    target="_blank"
                    href={`${base_url}/admin/files`}
                  >
                    {parts}
                  </a>
                ),
              }}
            />
          </p>
        </div>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          onClick={() => {
            onRemoved();
            onOpenChange(false);
          }}
        >
          <Trans message="Remove" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

function RemoveWarningContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Remove backend" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="This backend is used by some upload types. Detach it first to remove." />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer className="group-data-[size=sm]/alert-dialog-content:grid-cols-1">
        <AlertDialog.Action onClick={() => onOpenChange(false)}>
          <Trans message="Got it" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}
