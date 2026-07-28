import {validateLinkPasswordOptions} from '@app/dashboard/links/links-queries';
import {Biolink} from '@app/gen/schemas/biolink';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {ValidateLinkPasswordBody} from '@app/gen/schemas/validate-link-password-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {LockIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

type FormValue = Pick<ValidateLinkPasswordBody, 'password'>;

type Props = {
  linkeable: LinkType | Folder | Biolink;
  onPasswordValid: () => void;
};
export function PasswordPage({linkeable, onPasswordValid}: Props) {
  const form = useForm<FormValue>();
  const checkPassword = useMutation(validateLinkPasswordOptions());

  const handleSubmit = (values: FormValue) => {
    checkPassword.mutate(
      {
        ...values,
        linkeableType: linkeable.model_type,
        linkeableId: linkeable.id,
      },
      {
        onSuccess: onPasswordValid,
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted">
      <div className="m-3.5 max-w-140 rounded-card border bg-background p-6">
        <HookForm.Root
          className="flex flex-col gap-4"
          form={form}
          onSubmit={values => {
            handleSubmit(values);
          }}
        >
          <div className="flex items-center gap-2 text-sm">
            <LockIcon className="size-4" />
            <Trans message="The content you are trying to access is password protected." />
          </div>
          <HookForm.Field name="password">
            <Field.Label>
              <Trans message="Password" />
            </Field.Label>
            <Input autoFocus type="password" required />
            <Field.Error />
          </HookForm.Field>
          <div className="text-right">
            <Button
              variant="default"
              color="primary"
              type="submit"
              className="w-full md:w-auto"
              disabled={checkPassword.isPending}
            >
              <Trans message="Enter" />
            </Button>
          </div>
        </HookForm.Root>
      </div>
    </div>
  );
}
