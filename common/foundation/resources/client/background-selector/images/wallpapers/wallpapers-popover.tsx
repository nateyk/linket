import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {ImageIcon, XIcon} from 'lucide-react';
import {ReactElement, ReactNode, useState} from 'react';
import {Apple} from './apple';
import {Gradients} from './gradients';
import {Macos} from './macos';
import {Patterns} from './patterns';
import {Raycast} from './raycast';

type WallpaperCategoryId =
  | 'gradients'
  | 'macos'
  | 'raycast'
  | 'apple'
  | 'patterns';

interface WallpaperItem {
  src: string;
}

interface WallpaperCategory {
  id: WallpaperCategoryId;
  label: ReactNode;
  wallpapers: WallpaperItem[];
}

const WallpaperCategories: WallpaperCategory[] = [
  {
    id: 'gradients',
    label: <Trans message="Gradients" />,
    wallpapers: Gradients,
  },
  {
    id: 'macos',
    label: <Trans message="macOS" />,
    wallpapers: Macos,
  },
  {
    id: 'raycast',
    label: <Trans message="Raycast" />,
    wallpapers: Raycast,
  },
  {
    id: 'apple',
    label: <Trans message="Apple" />,
    wallpapers: Apple,
  },
  {
    id: 'patterns',
    label: <Trans message="Patterns" />,
    wallpapers: Patterns,
  },
];

interface Props {
  onSelected?: (value: string) => void;
  children?: ReactElement;
}

export function WallpapersPopover({onSelected, children}: Props) {
  const [open, setOpen] = useState(false);

  const selectWallpaper = (wallpaper: WallpaperItem) => {
    onSelected?.(wallpaper.src);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {children}
      <Popover.Portal>
        <Popover.Content align="start" className="w-107 gap-2">
          <Popover.Header className="mb-2 flex-row items-center justify-between border-b pb-2">
            <Popover.Title className="text-sm">
              <ImageIcon />
              <Trans message="Wallpapers" />
            </Popover.Title>
            <Popover.CloseButton
              className="text-muted-foreground"
              render={<Button variant="ghost" size="icon-xs" />}
            >
              <XIcon className="size-4" />
            </Popover.CloseButton>
          </Popover.Header>
          <Tabs.Root defaultValue="gradients">
            <Tabs.List className="mb-2">
              {WallpaperCategories.map(category => (
                <Tabs.Tab key={category.id} value={category.id}>
                  {category.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {WallpaperCategories.map(category => (
              <Tabs.Panel key={category.id} value={category.id}>
                <div className="compact-scrollbar h-70 overflow-x-hidden overflow-y-auto">
                  <div className="grid grid-cols-4 content-start gap-2">
                    {category.wallpapers.map(wallpaper => (
                      <button
                        key={wallpaper.src}
                        type="button"
                        aria-label={wallpaper.src}
                        className="block aspect-[1.35] w-full overflow-hidden rounded-md outline-foreground transition-transform hover:scale-[1.02] focus-visible:outline-2"
                        onClick={() => selectWallpaper(wallpaper)}
                      >
                        <img
                          src={wallpaper.src.replace(
                            '.webp',
                            '-thumbnail.webp',
                          )}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
