import {listFoldersOptions} from '@app/dashboard/folders/folders-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Button} from '@shadcn/button/button';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Popover} from '@shadcn/popover/popover';
import {useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CircleQuestionMarkIcon} from 'lucide-react';
import {useMemo} from 'react';

export function LinkFolderField() {
  const {trans} = useTrans();
  const {routeType} = useDatatableRouteType();
  const query = useQuery({
    ...listFoldersOptions(routeType, {
      limit: 50,
    }),
  });
  const items = useMemo(
    () =>
      query.data?.data?.map(item => ({value: item.id, label: item.name})) ?? [],
    [query.data?.data],
  );

  return (
    <HookForm.Field name="folder_id">
      <Field.Label className="gap-2">
        <Trans message="Folder" />
        <InfoTrigger />
      </Field.Label>
      <Combobox.Root items={items}>
        <Combobox.ButtonTrigger
          placeholder={<Trans message="Select a folder" />}
        />
        <Combobox.Content>
          <Combobox.InsetInput placeholder={trans(message('Search folders'))} />
          <Combobox.Empty>
            <Trans message="No matching folders." />
          </Combobox.Empty>
          <Combobox.List>
            {item => (
              <Combobox.Item key={item.value} value={item.value}>
                {item.label}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-xs" className="size-4" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Use folders to organize and manage access to your links." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
