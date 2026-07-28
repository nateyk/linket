import {Role} from '@app/gen/schemas/role';
import {UpdateRoleBody} from '@app/gen/schemas/update-role-body';
import {FormPermissionSelector} from '@common/auth/ui/permission-selector';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {InfoIcon} from 'lucide-react';
import {useContext} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';
import {useOutletContext} from 'react-router';

export function Component() {
  const {trans} = useTrans();
  const role = useOutletContext<Role | null>();
  const {setValue} = useFormContext<UpdateRoleBody>();
  const watchedType = useWatch({name: 'type'});

  const siteConfig = useContext(SiteConfigContext);
  const roleTypes = siteConfig.roles?.types ?? [];
  const typeSelectItems = roleTypes.map(type => ({
    value: type.type,
    label: type.label,
  }));

  return (
    <Field.Group>
      {role?.internal && role?.default && (
        <Alert.Root>
          <InfoIcon />
          <Alert.Title>
            <Trans message="Default role" />
          </Alert.Title>
          <Alert.Description>
            <Trans message="This role will be assigned to new users, if they have no other roles." />
          </Alert.Description>
        </Alert.Root>
      )}
      {role?.internal && role?.guests && (
        <Alert.Root>
          <InfoIcon />
          <Alert.Title>
            <Trans message="Guests role" />
          </Alert.Title>
          <Alert.Description>
            <Trans message="Non logged in users will be assigned this role." />
          </Alert.Description>
        </Alert.Root>
      )}
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="description">
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea
          placeholder={trans(message('Role description...'))}
          rows={4}
        />
        <Field.Error />
      </HookForm.Field>
      {!role && roleTypes.length ? (
        <HookForm.Field name="type">
          <Field.Label>
            <Trans message="Type" />
          </Field.Label>
          <Select.Root items={typeSelectItems}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {typeSelectItems.map(item => (
                <Select.Item key={item.value} value={item.value}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Field.Error />
        </HookForm.Field>
      ) : null}
      <div>
        <Field.Title className="mb-3 w-full items-end justify-between">
          <Trans message="Permissions" />
          <Button
            variant="outline"
            size="xs"
            onClick={() => setValue('permissions', [])}
          >
            <Trans message="Remove all" />
          </Button>
        </Field.Title>
        <FormPermissionSelector name="permissions" roleType={watchedType} />
      </div>
    </Field.Group>
  );
}
