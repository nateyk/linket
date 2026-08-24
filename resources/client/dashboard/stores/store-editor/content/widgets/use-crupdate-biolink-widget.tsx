import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {
  createStoreWidget,
  updateStoreWidget,
} from '@app/gen/store-widgets';
import type {CreateStoreWidgetBody} from '@app/gen/schemas/create-store-widget-body';
import type {UpdateStoreWidgetBody} from '@app/gen/schemas/update-store-widget-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {UseFormReturn} from 'react-hook-form';

export function useCrupdateBiolinkWidget(
  storeId: number | string,
  form: UseFormReturn<any>,
  widgetId?: number,
) {
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const numericBiolinkId = String(storeId);

  return useMutation({
    mutationFn: (body: CreateStoreWidgetBody) =>
      widgetId
        ? updateStoreWidget(
            numericBiolinkId,
            String(widgetId),
            body as UpdateStoreWidgetBody,
          )
        : createStoreWidget(numericBiolinkId, body as any),
    onSuccess: response => {
      toast.success(
        widgetId ? (
          <Trans message="Widget updated" />
        ) : (
          <Trans message="Widget added" />
        ),
      );
      overrideContent(response.data.content);
    },
    onError: err => onFormQueryError(err, form),
  });
}
