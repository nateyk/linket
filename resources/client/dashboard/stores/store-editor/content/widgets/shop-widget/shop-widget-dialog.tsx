import {useCrupdateBiolinkWidget} from '@app/dashboard/stores/store-editor/content/widgets/use-crupdate-biolink-widget';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {StoreIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

export type ShopWidgetConfig = {
  title?: string;
  layout?: 'list' | 'grid';
  source?: 'digital-products';
  product_ids?: number[];
};

export type ShopWidget = Omit<BiolinkWidget, 'type' | 'config'> & {
  type: 'shop';
  config: ShopWidgetConfig;
};

export function ShopWidgetDialog({children, widget, open: propsOpen, onOpenChange: propsOnOpenChange}: {children?: ReactElement<typeof Dialog.Trigger>; widget?: ShopWidget; open?: boolean; onOpenChange?: (open: boolean) => void}) {
  const [open, setOpen] = useControlledState(propsOpen, false, propsOnOpenChange);
  const {storeId} = useRequiredParams(['storeId']);
  const form = useForm<ShopWidgetConfig>({defaultValues: {title: widget?.config.title ?? '', layout: widget?.config.layout ?? 'list', source: 'digital-products', product_ids: widget?.config.product_ids ?? []}});
  const mutation = useCrupdateBiolinkWidget(storeId, form, widget?.id);
  const layouts = [{value: 'list', label: <Trans message="List" />}, {value: 'grid', label: <Trans message="Grid" />}];
  return <Dialog.Root open={open} onOpenChange={setOpen}>{children}<Dialog.Portal><Dialog.Backdrop /><HookForm.Root form={form} onSubmit={values => mutation.mutate({type: 'shop', config: values as unknown as BiolinkWidget['config']}, {onSuccess: () => setOpen(false), onError: error => onFormQueryError(error, form)})}><Dialog.Content><Dialog.Header><Dialog.Title><StoreIcon /><Trans message="Items" /></Dialog.Title></Dialog.Header><Dialog.Body><Field.Group><HookForm.Field name="title"><Field.Label><Trans message="Section title" /></Field.Label><Input placeholder="Shop" /><Field.Description><Trans message="Choose which products appear from the My Items page." /></Field.Description></HookForm.Field><HookForm.Field name="layout"><Field.Label><Trans message="Layout" /></Field.Label><Select.Root items={layouts}><Select.Trigger className="w-full"><Select.Value /></Select.Trigger><Select.Content>{layouts.map(item => <Select.Item key={item.value} value={item.value}>{item.label}</Select.Item>)}</Select.Content></Select.Root></HookForm.Field></Field.Group></Dialog.Body><Dialog.Footer><Dialog.CloseButton><Trans message="Cancel" /></Dialog.CloseButton><Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>{widget ? <Trans message="Update" /> : <Trans message="Add" />}</Button></Dialog.Footer></Dialog.Content></HookForm.Root></Dialog.Portal></Dialog.Root>;
}
