import type {FileEntry} from '@app/gen/schemas/file-entry';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {Button} from '@shadcn/button/button';
import {XIcon} from 'lucide-react';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ServiceFormField} from './service-form-field';

export const SERVICE_GALLERY_MAX = 8;

type GalleryImage = {id: number; file_entry_id: number; url: string};

/**
 * Cover and gallery are two different decisions, so they get two labelled
 * fields instead of two anonymous drop zones side by side: a cover is one
 * cropped 16:9 image, and the gallery is a strip of thumbnails with a compact
 * picker beneath it. On the public page the cover leads and the gallery
 * follows as thumbnails, so a cover-only service still renders.
 */
export function ServiceGalleryField({
  coverUrl,
  gallery,
  onCoverChange,
  onGalleryChange,
}: {
  coverUrl: string;
  gallery: GalleryImage[];
  onCoverChange: (url: string, entryId: number | null) => void;
  onGalleryChange: (gallery: GalleryImage[]) => void;
}) {
  const {trans} = useTrans();
  const isFull = gallery.length >= SERVICE_GALLERY_MAX;

  const addImage = (entry: FileEntry) => {
    if (gallery.length >= SERVICE_GALLERY_MAX) return;
    if (gallery.some(item => item.file_entry_id === entry.id)) return;
    onGalleryChange([
      ...gallery,
      {id: entry.id, file_entry_id: entry.id, url: entry.url},
    ]);
  };

  return (
    <div className="flex flex-col gap-6">
      <ServiceFormField
        name="cover_file_entry_id"
        label={trans({message: 'Cover image'})}
      >
        <CroppedCover
          value={coverUrl}
          onChange={(url, entry) => onCoverChange(url, entry?.id ?? null)}
          uploadType="linkImages"
          aspect={16 / 9}
          label={trans({message: 'Cover image'})}
          placeholderVariant="text"
          showHint={false}
          className="aspect-video w-full"
        />
      </ServiceFormField>

      <ServiceFormField
        name="gallery"
        label={trans({message: 'Gallery images'})}
        trailing={
          <span className="text-xs tabular-nums text-muted-foreground">
            <Trans
              message=":used of :max"
              values={{used: gallery.length, max: SERVICE_GALLERY_MAX}}
            />
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          {!!gallery.length && (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {gallery.map((item, index) => (
                <li key={item.file_entry_id} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-card-xs bg-muted">
                    <img
                      src={item.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    className="absolute end-1 top-1 bg-background/90 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={trans({
                      message: 'Remove image :number',
                      values: {number: index + 1},
                    })}
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

          {isFull ? (
            <p className="text-xs leading-5 text-muted-foreground">
              <Trans
                message="Gallery is full (:used of :max)"
                values={{used: gallery.length, max: SERVICE_GALLERY_MAX}}
              />
            </p>
          ) : (
            <SharedFileUploader
              compact
              uploadType="linkImages"
              ariaLabel={trans({message: 'Add images'})}
              onUploaded={addImage}
              hint={trans({
                message: 'PNG, JPG or WebP. Drag files here or browse.',
              })}
            />
          )}
        </div>
      </ServiceFormField>
    </div>
  );
}