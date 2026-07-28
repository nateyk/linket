import {UploadType} from '@app/site-config';
import {AlignButtons} from '@common/text-editor/menubar/align-buttons';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {CodeBlockMenuTrigger} from '@common/text-editor/menubar/code-block-menu-trigger';
import {ColorButtons} from '@common/text-editor/menubar/color-buttons';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {ImageButton} from '@common/text-editor/menubar/image-button';
import {IndentButtons} from '@common/text-editor/menubar/indent-buttons';
import {InsertMenuTrigger} from '@common/text-editor/menubar/insert-menu-trigger';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import clsx from 'clsx';

interface Props {
  justify?: string;
  hideInsertButton?: boolean;
  imageUploadType: keyof typeof UploadType;
}
export function ArticleEditorMenubar({
  justify = 'justify-center-safe',
  hideInsertButton = false,
  imageUploadType,
}: Props) {
  return (
    <div
      className={clsx(
        'no-scrollbar flex shrink-0 items-center overflow-x-auto border-b px-1 py-0.5 text-muted-foreground',
        justify,
      )}
    >
      <FormatDropdown />
      <Divider />
      <FontStyleButtons />
      <Divider />
      <AlignButtons />
      <IndentButtons />
      <Divider />
      <ListButtons />
      <Divider />
      <LinkButton />
      <ImageButton uploadType={imageUploadType} />
      {!hideInsertButton && <InsertMenuTrigger />}
      <Divider />
      <ColorButtons />
      <Divider />
      <CodeBlockMenuTrigger />
      <ClearFormatButton />
    </div>
  );
}
