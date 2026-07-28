import {UploadType} from '@app/site-config';
import {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {Field} from '@shadcn/forms/field';
import {getImageSize} from '@ui/utils/files/get-image-size';
import {ReactNode, useRef} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

type Props = {
  formPrefix: string;
  className?: string;
  label: ReactNode;
};
export function LandingPageImageSelector({
  formPrefix,
  className,
  label,
}: Props) {
  const nativeImageRef = useRef<File>(null);
  const {setValue} = useFormContext();
  const value = useWatch({name: `${formPrefix}.image`});
  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <ImageSelector.Input
        uploadType={UploadType.brandingImages}
        className={className}
        value={value?.src}
        onChange={async url => {
          const value: LandingPageImageConfig = {
            src: url,
          };
          if (nativeImageRef.current) {
            const size = await getImageSize(nativeImageRef.current);
            if (size) {
              value.width = size.width;
              value.height = size.height;
            }
          }
          setValue(`${formPrefix}.image`, value, {shouldDirty: true});
        }}
        onFileSelected={file => {
          nativeImageRef.current = file;
        }}
      />
      <Field.Error />
    </Field.Root>
  );
}
