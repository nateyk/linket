import {InviteWorkspaceMembersBody} from '@app/gen/schemas/invite-workspace-members-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {
  inviteWorkspaceMembersOptions,
  listWorkspaceRolesOptions,
} from '@common/workspace/workspace-queries';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {toast} from '@shadcn/toast/toast';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Plus, XIcon} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useFieldArray, useForm, useWatch} from 'react-hook-form';
import {useNavigate} from 'react-router';

export function InviteMembersDialog({
  workspaceId,
  children,
}: {
  workspaceId: number;
  children: Dialog.TriggerElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <InviteMembersDialogContent
          workspaceId={workspaceId}
          onInvite={() => setOpen(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InviteMembersDialogContent({
  workspaceId,
  onInvite,
}: {
  workspaceId: number;
  onInvite: () => void;
}) {
  const navigate = useNavigate();
  const inviteMembers = useMutation(inviteWorkspaceMembersOptions(workspaceId));
  const rolesQuery = useSuspenseQuery(listWorkspaceRolesOptions());
  const roleItems = useMemo(
    () =>
      rolesQuery.data.data.map(role => ({value: role.id, label: role.name})),
    [rolesQuery.data],
  );
  const form = useForm<InviteWorkspaceMembersBody>({
    defaultValues: {
      emails: [{email: '', roleId: roleItems[0]?.value ?? 0}],
    },
  });
  const {fields, append, remove} = useFieldArray({
    control: form.control,
    name: 'emails',
  });
  const emails = useWatch({control: form.control, name: 'emails'});

  const handleSubmit = async (values: InviteWorkspaceMembersBody) => {
    inviteMembers.mutate(values, {
      onError: err => onFormQueryError(err, form),
      onSuccess: () => {
        toast.success(<Trans message="Workspace invitations sent" />);
        navigate(`/account-settings/workspaces/${workspaceId}/invites`);
        onInvite();
      },
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Invite members" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="Invite members to collaborate in this workspace. Invites are valid for 14 days." />
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body>
          <Field.Group className="gap-3">
            {fields.map((field, index) => (
              <div className="flex w-full items-start" key={field.id}>
                <HookForm.Field
                  name={`emails.${index}.email`}
                  className="flex-1"
                >
                  <Field.Label className={index === 0 ? undefined : 'sr-only'}>
                    <Trans message="Email" />
                  </Field.Label>
                  <Input
                    type="email"
                    autoFocus={index === 0}
                    placeholder="example@gmail.com"
                    className="rounded-e-none"
                  />
                  <Field.Error />
                </HookForm.Field>

                <HookForm.Field
                  name={`emails.${index}.roleId`}
                  className="w-max max-w-48"
                >
                  <Field.Label
                    className={index === 0 ? 'invisible' : 'sr-only'}
                  >
                    <Trans message="Role" />
                  </Field.Label>
                  <Select.Root items={roleItems}>
                    <Select.Trigger className="rounded-s-none border-s-0">
                      <Select.Value
                        placeholder={<Trans message="Select role" />}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {roleItems.map(role => (
                        <Select.Item key={role.value} value={role.value}>
                          <Trans message={role.label} />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Field.Error />
                </HookForm.Field>

                {fields.length > 1 ? (
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Button
                        className={cn(
                          'ml-1',
                          index === 0 ? 'mt-7.5' : 'mt-0.5',
                        )}
                        type="button"
                        variant="ghost"
                        color="default"
                        size="icon-sm"
                        onClick={() => remove(index)}
                      >
                        <XIcon />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <Trans message="Remove email" />
                    </Tooltip.Content>
                  </Tooltip.Root>
                ) : null}
              </div>
            ))}
          </Field.Group>

          <Button
            className="mt-3"
            type="button"
            variant="outline"
            color="default"
            size="sm"
            disabled={inviteMembers.isPending}
            onClick={() =>
              append({email: '', roleId: roleItems[0]?.value ?? 0})
            }
          >
            <Plus />
            <Trans message="Add email" />
          </Button>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton disabled={inviteMembers.isPending}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            type="submit"
            disabled={
              inviteMembers.isPending ||
              !form.formState.isDirty ||
              !emails.length
            }
          >
            <Trans message="Send invite" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
