import {FolderFields} from '@app/dashboard/folders/folders-datatable-page/crupdate/folder-fields';
import {
  retrieveFolderOptions,
  updateFolderOptions,
} from '@app/dashboard/folders/folders-queries';
import {LinkeableQRCodePanel} from '@app/dashboard/links/forms/linkeable-qr-code-panel';
import {CrupdateFolderBody} from '@app/gen/schemas/crupdate-folder-body';
import {Folder} from '@app/gen/schemas/folder';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {UserAvatar} from '@common/auth/user-avatar';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Form} from '@ui/forms/form';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {useForm} from 'react-hook-form';

export function Component() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const {folderId} = useRequiredParams(['folderId']);
  const query = useSuspenseQuery(retrieveFolderOptions(Number(folderId)));
  const folder = query.data.data;

  const form = useForm<CrupdateFolderBody>({
    defaultValues: {
      name: folder.name,
      back_half: folder.back_half,
      description: folder.description,
      image: folder.image ?? null,
      rotator: folder.rotator,
      domain_id: folder.domain_id,
      create_qr_code: false,
      qr_code_style: folder.qr_code?.style ?? undefined,
    },
  });
  const updateFolder = useMutation(updateFolderOptions(folder.id));
  const shouldCollapseSidebar = useMediaQuery('(max-width: 1200px)');

  const handleSubmit = (values: CrupdateFolderBody) => {
    updateFolder.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Folder updated')));
        navigate('..', {relative: 'path'});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <Form
      className="flex h-full min-h-0 gap-6"
      form={form}
      id="folder-settings-form"
      onSubmit={handleSubmit}
    >
      <DirtyFormSaveDrawer isLoading={updateFolder.isPending} />
      <section className="compact-scrollbar mx-auto max-w-xl flex-auto overflow-y-auto pb-6 lg:pt-6">
        <FolderFields />
        {shouldCollapseSidebar && (
          <LinkeableQRCodePanel
            qrCode={folder.qr_code}
            className="mt-6"
            previewSize={120}
          />
        )}
        <OwnerInfoSection folder={folder} />
      </section>
      {!shouldCollapseSidebar ? (
        <section className="compact-scrollbar hidden w-80 shrink-0 overflow-y-auto border-l border-border/80 p-6 lg:block">
          <LinkeableQRCodePanel qrCode={folder.qr_code} previewSize={220} />
        </section>
      ) : null}
    </Form>
  );
}

type OwnerInfoSectionProps = {
  folder: Folder;
};
function OwnerInfoSection({folder}: OwnerInfoSectionProps) {
  if (!folder.user) return null;

  return (
    <div className="mt-7 flex items-center gap-1.5 border-t pt-7 text-sm whitespace-nowrap">
      <UserAvatar user={folder.user} size="xs" />
      <Trans
        message="Created by :name on :date"
        values={{
          name: <strong className="truncate">{folder.user.name}</strong>,
          date: (
            <strong>
              <FormattedDate date={folder.created_at} />
            </strong>
          ),
        }}
      />
    </div>
  );
}
