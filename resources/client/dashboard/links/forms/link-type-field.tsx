import {listLinkOverlaysOptions} from '@app/dashboard/link-overlays/link-overlays-queries';
import {listLinkPagesOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Item} from '@shadcn/item/item';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {useMemo} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

type Props = {
  className?: string;
};
export function LinkTypeField({className}: Props) {
  const {links} = useSettings();
  const selectedType = useWatch({name: 'type'});

  if (!links?.enable_type) {
    return null;
  }

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <TypeSelect />
      {selectedType === 'page' && <PageSelect />}
      {selectedType === 'overlay' && <OverlaySelect />}
    </div>
  );
}

function PageSelect() {
  const {routeType} = useDatatableRouteType();
  const query = useQuery(listLinkPagesOptions(routeType));

  const selectItems = useMemo(
    () =>
      query.data?.data?.map(page => ({
        value: page.id,
        label: page.title,
      })) ?? [],
    [query.data?.data],
  );

  return (
    <HookForm.Field name="type_id">
      <Field.Label>
        <Trans message="Link page" />
      </Field.Label>
      <Select.Root items={selectItems}>
        <Select.Trigger>
          <Select.Value placeholder={<Trans message="Select page" />} />
        </Select.Trigger>
        <Select.Content>
          {selectItems.map(page => (
            <Select.Item key={page.value} value={page.value}>
              {page.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function OverlaySelect() {
  const {routeType} = useDatatableRouteType();
  const {data} = useQuery(listLinkOverlaysOptions(routeType));
  const selectItems = useMemo(
    () =>
      data?.data?.map(overlay => ({
        value: overlay.id,
        label: overlay.name,
      })) ?? [],
    [data?.data],
  );

  return (
    <HookForm.Field name="type_id">
      <Field.Label>
        <Trans message="Link overlay" />
      </Field.Label>
      <Select.Root items={selectItems}>
        <Select.Trigger>
          <Select.Value placeholder={<Trans message="Select overlay" />} />
        </Select.Trigger>
        <Select.Content>
          {selectItems.map(overlay => (
            <Select.Item key={overlay.value} value={overlay.value}>
              {overlay.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function TypeSelect() {
  const {branding} = useSettings();
  const {routeType} = useDatatableRouteType();
  const linkPagesQuery = useQuery(listLinkPagesOptions(routeType));
  const linkOverlaysQuery = useQuery(listLinkOverlaysOptions(routeType));
  const {setValue} = useFormContext<CrupdateLinkBody>();
  const items = useMemo(() => {
    const items = [
      {
        value: 'direct',
        label: <Trans message="Direct" />,
        description: <Trans message="Redirect user to url instantly" />,
      },
      {
        value: 'frame',
        label: <Trans message="Frame" />,
        description: (
          <Trans
            message="Show url inside iframe with :siteName navigation bar."
            values={{siteName: branding.site_name}}
          />
        ),
      },
      {
        value: 'splash',
        label: <Trans message="Splash" />,
        description: (
          <Trans message="Show splash page with optional ads and redirect user to url after a delay." />
        ),
      },
    ];

    if (linkPagesQuery.data?.data?.length) {
      items.push({
        value: 'page',
        label: <Trans message="Link page" />,
        description: (
          <Trans
            message="Show specified link page with :siteName navigation bar and button to open long url."
            values={{siteName: branding.site_name}}
          />
        ),
      });
    }

    if (linkOverlaysQuery.data?.data?.length) {
      items.push({
        value: 'overlay',
        label: <Trans message="Link overlay" />,
        description: (
          <Trans message="Redirect user instantly and show specified overlay over the link." />
        ),
      });
    }

    return items;
  }, [
    branding.site_name,
    linkPagesQuery.data?.data,
    linkOverlaysQuery.data?.data,
  ]);

  return (
    <HookForm.Field name="type">
      <Field.Label>{<Trans message="Type" />}</Field.Label>
      <Select.Root
        items={items}
        onValueChange={() => {
          // clear type id when link type changes
          setValue('type_id', null);
        }}
      >
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {items.map(item => (
            <Select.Item key={item.value} value={item.value}>
              <Item>
                <Item.Content>
                  <Item.Title>{item.label}</Item.Title>
                  <Item.Description>{item.description}</Item.Description>
                </Item.Content>
              </Item>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}
