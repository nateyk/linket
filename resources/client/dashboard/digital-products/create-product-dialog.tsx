import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowRightIcon, PackagePlusIcon} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {productTypeCreateUrl} from './product-create-flow';
import {ProductTypePicker, type ProductType} from './product-type-picker';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
}: CreateProductDialogProps) {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSelectedType(null);
    onOpenChange(nextOpen);
  };

  const handleContinue = () => {
    const destination = productTypeCreateUrl(selectedType);
    if (!destination) return;
    setSelectedType(null);
    onOpenChange(false);
    navigate(destination);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="gap-3 p-4 sm:max-w-xl sm:gap-4 sm:p-5">
          <Dialog.Header>
            <div className="flex items-start gap-3 pe-8">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-primary/10 text-primary ring-1 ring-primary/15"
              >
                <PackagePlusIcon className="size-4.5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <Dialog.Title className="text-base font-semibold tracking-tight sm:text-lg">
                  <Trans message="What are you selling?" />
                </Dialog.Title>
                <Dialog.Description>
                  <Trans message="Choose a type to open its editor." />
                </Dialog.Description>
              </div>
            </div>
          </Dialog.Header>
          <Dialog.Body className="-mx-4 min-h-0 overflow-y-auto px-4 pt-1 sm:-mx-5 sm:px-5">
            <ProductTypePicker
              value={selectedType}
              onValueChange={setSelectedType}
            />
          </Dialog.Body>
          <Dialog.Footer className="-mx-4 -mb-4 px-4 pt-2 pb-4 max-sm:flex-row max-sm:justify-between sm:-mx-5 sm:-mb-5 sm:justify-between sm:px-5 sm:pb-5">
            <Dialog.CloseButton
              render={<Button variant="outline" className="min-h-10" />}
            >
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              disabled={!selectedType}
              className="min-h-10"
              onClick={handleContinue}
              aria-label={trans({message: 'Continue'})}
            >
              <Trans message="Continue" />
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
