import {folderIcons, FolderImage} from '@app/dashboard/folders/folder-icons';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {UploadType} from '@app/site-config';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {ImagePlusIcon} from 'lucide-react';
import {useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function FolderFields({className}: {className?: string}) {
  return (
    <Field.Group className={className}>
      <div className="flex items-end gap-3">
        <ImageSelectorButton />
        <HookForm.Field name="name" className="flex-auto">
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input minLength={3} autoFocus />
          <Field.Error />
        </HookForm.Field>
      </div>
      <ShortUrlField backHalfName="back_half" domainName="domain_id" />
      <HookForm.Field name="description">
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea rows={2} />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="rotator">
        <Field.Label>
          <Switch />
          <Trans message="Redirect to random link" />
        </Field.Label>
        <Field.Description>
          <Trans message="Redirect to a random link from within this folder when short url is visited." />
        </Field.Description>
      </HookForm.Field>
    </Field.Group>
  );
}

function ImageSelectorButton() {
  const selectedImage = useWatch({name: 'image'});
  const {setValue} = useFormContext();
  const [open, setOpen] = useState(false);

  const selectImage = (newImage: string) => {
    setValue('image', newImage, {shouldDirty: true});
    setOpen(false);
  };

  const renderedImage = !selectedImage ? (
    <ImagePlusIcon />
  ) : (
    <FolderImage src={selectedImage} />
  );

  return (
    <div className="flex flex-col gap-2">
      <Field.Title>
        <Trans message="Image" />
      </Field.Title>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <Button
              variant="outline"
              color="default"
              className="rounded-input shadow-none"
            />
          }
        >
          {renderedImage}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="w-80">
            <ImageSelectorPopover
              selectedImage={selectedImage}
              onSelect={selectImage}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

type ImageSelectorPopoverProps = {
  selectedImage: string | null;
  onSelect: (image: string) => void;
};
function ImageSelectorPopover({
  selectedImage,
  onSelect,
}: ImageSelectorPopoverProps) {
  const isDefaultIcon = selectedImage && selectedImage in folderIcons;
  return (
    <>
      <Popover.Header>
        <Popover.Title>
          <Trans message="Folder image" />
        </Popover.Title>
      </Popover.Header>
      <div className="-mx-2 grid grid-cols-8 gap-2">
        {Object.entries(folderIcons).map(([name, icon]) => (
          <Button
            variant="ghost"
            size="icon"
            color={selectedImage === name ? 'primary' : undefined}
            key={name}
            onClick={() => onSelect(name)}
          >
            {icon}
          </Button>
        ))}
      </div>
      <section>
        <div className="mb-1 text-sm font-medium">
          <Trans message="Upload custom image" />
        </div>
        <FileUploadProvider>
          <ImageSelector.Input
            value={isDefaultIcon ? null : selectedImage}
            uploadType={UploadType.linkImages}
            onChange={newImage => onSelect(newImage)}
          />
        </FileUploadProvider>
      </section>
    </>
  );
}
