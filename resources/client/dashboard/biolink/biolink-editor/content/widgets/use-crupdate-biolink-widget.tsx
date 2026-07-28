import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {
  createBiolinkWidget,
  updateBiolinkWidget,
} from '@app/gen/biolinks';
import type {CreateBiolinkWidgetBody} from '@app/gen/schemas/create-biolink-widget-body';
import type {UpdateBiolinkWidgetBody} from '@app/gen/schemas/update-biolink-widget-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {UseFormReturn} from 'react-hook-form';

export function useCrupdateBiolinkWidget(
  biolinkId: number | string,
  form: UseFormReturn<any>,
  widgetId?: number,
) {
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const numericBiolinkId = Number(biolinkId);

  return useMutation({
    mutationFn: (body: CreateBiolinkWidgetBody) =>
      widgetId
        ? updateBiolinkWidget(
            numericBiolinkId,
            widgetId,
            body as UpdateBiolinkWidgetBody,
          )
        : createBiolinkWidget(numericBiolinkId, body),
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
