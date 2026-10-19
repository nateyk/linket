import type {FileEntry} from '@app/gen/schemas/file-entry';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {XIcon} from 'lucide-react';

export const SERVICE_GALLERY_MAX = 8;

/**
 * Cover plus gallery. On the public page the cover is the lead image and the
 * gallery follows it as thumbnails, so a cover-only service still renders.
 */
export function ServiceGalleryField({
  coverUrl,
  gallery,
  onCoverChange,
  onGalleryChange,
}: {
  coverUrl: string;
  gallery: {id: number; file_entry_id: number; url: string}[];
  onCoverChange: (url: string, entryId: number | null) => void;
  onGalleryChange: (
    gallery: {id: number; file_entry_id: number; url: string}[],
  ) => void;
}) {
  const {trans} = useTrans();

  const addImage = (entry: FileEntry) => {
    if (gallery.length >= SERVICE_GALLERY_MAX) return;
    if (gallery.some(item => item.file_entry_id === entry.id)) return;
    onGalleryChange([
      ...gallery,
      {id: entry.id, file_entry_id: entry.id, url: entry.url},
    ]);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <CroppedCover
        value={coverUrl}
        onChange={(url, entry) => onCoverChange(url, entry?.id ?? null)}
        uploadType="linkImages"
        aspect={16 / 9}
        label={trans({message: 'Cover image'})}
        className="aspect-video h-auto w-full"
      />

      <div className="flex flex-col gap-3">
        <SharedFileUploader
          uploadType="linkImages"
          bare
          onUploaded={addImage}
          hint={trans({
            message: 'PNG, JPG or WebP. Up to 8 images.',
          })}
        />
        {!!gallery.length && (
          <ul className="grid grid-cols-4 gap-2">
            {gallery.map(item => (
              <li key={item.file_entry_id} className="group relative">
                <img
                  src={item.url}
                  alt=""
                  className="aspect-square w-full rounded-card-xs object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute end-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={trans({message: 'Remove image'})}
                  onClick={() =>
                    onGalleryChange(
                      gallery.filter(
                        image => image.file_entry_id !== item.file_entry_id,
                      ),
                    )
                  }
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          <Trans message="Gallery images appear on the service page. The cover is used on cards and the storefront." />
        </p>
      </div>
    </div>
  );
}