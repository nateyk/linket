import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ArrowRightIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

type FormValue = {
  host: string;
  method: 'store' | 'update';
};

type Props = {
  host: string;
  onComplete: ({serverIp, host}: {serverIp: string; host: string}) => void;
  showGlobal: boolean;
};

export function HostStep({host, onComplete, showGlobal}: Props) {
  const form = useForm<FormValue>({
    defaultValues: {
      host,
      method: 'store',
    },
  });
  const {base_url} = useSettings();
  const validateHost = useMutation({
    mutationFn: (payload: FormValue) =>
      apiClient
        .post<{
          server_ip: string;
        }>(`${base_url}/secure/custom-domains/validate-host`, payload)
        .then(r => r.data),
  });

  const handleSubmit = (values: FormValue) => {
    validateHost.mutate(values, {
      onSuccess: response => {
        onComplete({serverIp: response.server_ip, host: values.host});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root
      form={form}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5.5"
    >
      <Dialog.Body>
        <Field.Group>
          <HookForm.Field name="host">
            <Field.Label>
              <Trans message="Host" />
            </Field.Label>
            <Input
              autoFocus
              required
              maxLength={100}
              placeholder="go.example.com"
            />
            <Field.Description>
              <Trans message="Enter a valid domain or subdomain to get started." />
            </Field.Description>
            <Field.Error />
          </HookForm.Field>
          {showGlobal && (
            <>
              <Field.Separator />
              <HookForm.Field name="global">
                <Field.Label>
                  <Switch />
                  <Trans message="Global" />
                </Field.Label>
                <Field.Description>
                  <Trans message="Whether all users should be able to select this domain." />
                </Field.Description>
                <Field.Error />
              </HookForm.Field>
            </>
          )}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.CloseButton>
          <Trans message="Cancel" />
        </Dialog.CloseButton>
        <Button type="submit" color="primary" disabled={validateHost.isPending}>
          <Trans message="Next" />
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </Dialog.Footer>
    </HookForm.Root>
  );
}
