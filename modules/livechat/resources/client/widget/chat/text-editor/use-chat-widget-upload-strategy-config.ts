import {UploadStrategyConfig} from '@common/uploads/uploader/strategy/upload-strategy';
import {useSettings} from '@ui/settings/use-settings';

const maxChatUploadFileSize = 5 * 1024 * 1024;

export function useChatWidgetUploadStrategyConfig(): Partial<UploadStrategyConfig> {
  const {lc} = useSettings();
  return {
    metadata: {
      middleware: 'chatWidget',
    },
    restrictions: {
      maxFileSize: lc?.uploads?.max_size ?? maxChatUploadFileSize,
      allowedFileTypes: lc?.uploads?.allowed_extensions ?? [],
      blockedFileTypes: lc?.uploads?.blocked_extensions ?? [],
    },
  };
}
