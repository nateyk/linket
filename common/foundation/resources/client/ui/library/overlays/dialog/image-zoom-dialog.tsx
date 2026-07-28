import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {ChevronLeftIcon, ChevronRightIcon, XIcon} from 'lucide-react';
import {ReactNode} from 'react';

interface Props {
  children?: ReactNode;
  image?: string;
  images?: string[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  defaultActiveIndex?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function ImageZoomDialog({
  children,
  image,
  images,
  activeIndex: activeIndexProp,
  onActiveIndexChange,
  defaultActiveIndex,
  open: openProp,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChange);
  const [activeIndex, setActiveIndex] = useControlledState(
    activeIndexProp,
    defaultActiveIndex ?? 0,
    onActiveIndexChange,
  );
  const src = image || images?.[activeIndex];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-black/80 supports-backdrop-filter:backdrop-blur-none" />
        <Dialog.CloseButton
          className="fixed top-3 right-3 z-50 size-10 cursor-pointer rounded-button text-white hover:bg-black/20"
          render={<button />}
        >
          <XIcon className="size-7" />
        </Dialog.CloseButton>
        <Dialog.Content
          className="size-full bg-transparent p-0 shadow-none md:max-w-full"
          showCloseButton={false}
        >
          <div className="relative flex size-full items-center justify-center">
            {images?.length ? (
              <Button
                type="button"
                variant="ghost"
                color="white"
                size="icon-lg"
                className="absolute top-0 bottom-0 left-5 my-auto text-white hover:bg-black/20"
                disabled={activeIndex < 1}
                onClick={() => {
                  setActiveIndex(activeIndex - 1);
                }}
              >
                <ChevronLeftIcon className="size-7" />
              </Button>
            ) : null}
            <img
              src={src}
              alt=""
              className="max-h-full w-auto rounded-card object-contain shadow-sm"
            />
            {images?.length ? (
              <Button
                type="button"
                variant="ghost"
                color="white"
                size="icon-lg"
                className="absolute top-0 right-5 bottom-0 my-auto text-white hover:bg-black/20"
                disabled={activeIndex + 1 === images?.length}
                onClick={() => {
                  setActiveIndex(activeIndex + 1);
                }}
              >
                <ChevronRightIcon className="size-7" />
              </Button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
