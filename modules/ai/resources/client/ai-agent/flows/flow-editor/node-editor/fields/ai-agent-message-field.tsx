import {aiAgentQueries} from '@ai/ai-agent/ai-agent-queries';
import {FlowAttachment} from '@ai/ai-agent/flows/ai-agent-flow';
import {AttachmentPreviewGrid} from '@ai/ai-agent/flows/flow-editor/node-editor/attachments-preview-grid';
import {CrupdateButtonFields} from '@ai/ai-agent/flows/flow-editor/node-editor/fields/crupdate-button-fields';
import {FormTipTapTextField} from '@ai/ai-agent/flows/flow-editor/node-editor/fields/tiptap-text-field/tiptap-text-field';
import {useFlowEditorStore} from '@ai/ai-agent/flows/flow-editor/store/flow-editor-store-provider';
import {MessageButton} from '@app/dashboard/conversations/conversation-page/messages/conversation-message';
import {queryClient} from '@common/http/query-client';
import {TwoMB} from '@common/text-editor/menubar/image-button';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Disk} from '@common/uploads/uploader/backend-metadata';
import {useFileUploadStore} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@ui/buttons/button';
import {ButtonSize} from '@ui/buttons/button-size';
import {IconButton} from '@ui/buttons/icon-button';
import {Form} from '@ui/forms/form';
import {Trans} from '@ui/i18n/trans';
import {ImageUpIcon} from '@ui/icons/lucide/image-up';
import {PaperclipIcon} from '@ui/icons/lucide/paperclip';
import {AddIcon} from '@ui/icons/material/Add';
import {Dialog} from '@ui/overlays/dialog/dialog';
import {DialogBody} from '@ui/overlays/dialog/dialog-body';
import {useDialogContext} from '@ui/overlays/dialog/dialog-context';
import {DialogFooter} from '@ui/overlays/dialog/dialog-footer';
import {DialogHeader} from '@ui/overlays/dialog/dialog-header';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {Tooltip} from '@ui/tooltip/tooltip';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {openUploadWindow} from '@ui/utils/files/open-upload-window';
import {Restrictions} from '@ui/utils/files/validate-file';
import {useFieldArray, useForm, useFormContext} from 'react-hook-form';

interface Props {
  className?: string;
  placeholder?: string;
  required?: boolean;
  showButtonsEditor?: boolean;
}
export function AiAgentMessageField({
  className,
  placeholder,
  required = true,
  showButtonsEditor,
}: Props) {
  return (
    <div className={className}>
      <FormTipTapTextField
        size="lg"
        name="message"
        label={<Trans message="AI agent message" />}
        required={required}
        placeholder={placeholder}
        multiline
      >
        <AddImageButton size="2xs" />
        <AddFileButton size="2xs" />
      </FormTipTapTextField>
      {showButtonsEditor && <ButtonList />}
      <AttachmentPreviewGrid />
    </div>
  );
}

type AddImageButtonProps = {
  size?: ButtonSize;
};
function AddImageButton({size}: AddImageButtonProps) {
  const handleUpload = useUploadAttachment({
    allowedFileTypes: [FileInputType.image],
    maxFileSize: TwoMB,
  });
  return (
    <Tooltip label={<Trans message="Add image" />}>
      <IconButton size={size} iconSize="sm" onClick={() => handleUpload()}>
        <ImageUpIcon />
      </IconButton>
    </Tooltip>
  );
}

const EightMB = 8 * 1024 * 1024;
function AddFileButton({size}: AddImageButtonProps) {
  const handleUpload = useUploadAttachment({
    maxFileSize: EightMB,
  });
  return (
    <Tooltip label={<Trans message="Add file" />}>
      <IconButton size={size} iconSize="sm" onClick={() => handleUpload()}>
        <PaperclipIcon />
      </IconButton>
    </Tooltip>
  );
}

function useUploadAttachment(restrictions: Restrictions = {}) {
  const {flowId} = useRequiredParams(['flowId']);
  const uploadMultiple = useFileUploadStore(s => s.uploadMultiple);
  const removeUpload = useFileUploadStore(s => s.removeUpload);
  const {setValue, getValues} = useFormContext();
  const nodeId = useFlowEditorStore(s => s.selectedNodeId);

  return async () => {
    const files = await openUploadWindow({
      types: restrictions.allowedFileTypes,
      multiple: true,
    });
    uploadMultiple(files, {
      showToastOnRestrictionFail: true,
      restrictions,
      metadata: {
        diskPrefix: 'flow_uploads',
        disk: Disk.public,
        middleware: 'flowAttachments',
        flowId,
        nodeId,
      },
      onSuccess: (entry, file) => {
        removeUpload(file.id);
        queryClient.setQueriesData<{attachments: FlowAttachment[]}>(
          aiAgentQueries.flows.indexAttachments(flowId),
          prev => ({
            attachments: [...(prev?.attachments ?? []), entry],
          }),
        );
        setValue('attachmentIds', [...getValues('attachmentIds'), entry.id]);
      },
    });
  };
}

function ButtonList() {
  const {fields, append, update, remove} = useFieldArray<
    {
      buttons: MessageButton[];
    },
    'buttons'
  >({
    name: 'buttons',
  });

  return (
    <div className="mt-10 flex flex-wrap items-center gap-6">
      {fields.map((field, index) => (
        <DialogTrigger
          key={field.id}
          type="popover"
          placement="left"
          onClose={data => {
            if (data) {
              update(index, data);
            }
          }}
        >
          <Button size="xs" variant="outline">
            {field.name}
          </Button>
          <CrupdateButtonDialog button={field} onRemove={() => remove(index)} />
        </DialogTrigger>
      ))}
      <DialogTrigger
        type="popover"
        placement="left"
        onClose={data => {
          if (data) {
            append(data);
          }
        }}
      >
        <Button size="xs" color="primary" startIcon={<AddIcon />}>
          <Trans message="Add button" />
        </Button>
        <CrupdateButtonDialog />
      </DialogTrigger>
    </div>
  );
}

type CrupdateButtonDialogProps = {
  button?: MessageButton;
  onRemove?: () => void;
};
function CrupdateButtonDialog({button, onRemove}: CrupdateButtonDialogProps) {
  const {close, formId} = useDialogContext();

  const form = useForm<MessageButton>({
    defaultValues: {
      actionType: 'openUrl',
      ...button,
    },
  });

  return (
    <Dialog>
      <DialogHeader>
        {button ? (
          <Trans message="Update button" />
        ) : (
          <Trans message="Add button" />
        )}
      </DialogHeader>
      <DialogBody>
        <Form id={formId} form={form} onSubmit={value => close(value)}>
          <CrupdateButtonFields pathPrefix="" size="md" />
        </Form>
      </DialogBody>
      <DialogFooter
        startAction={
          onRemove ? (
            <Button color="danger" onClick={() => onRemove()}>
              <Trans message="Remove" />
            </Button>
          ) : null
        }
      >
        <Button onClick={() => close()}>
          <Trans message="Cancel" />
        </Button>
        <Button form={formId} type="submit" variant="flat" color="primary">
          {button ? <Trans message="Update" /> : <Trans message="Add" />}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
