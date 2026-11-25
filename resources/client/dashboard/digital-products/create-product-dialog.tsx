import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {ArrowRightIcon, PackagePlusIcon} from 'lucide-react';
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
        <Dialog.Content className="gap-4 sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title className="text-lg font-semibold tracking-tight">
              <PackagePlusIcon className="size-5 text-primary" aria-hidden="true" />
              <Trans message="What are you selling?" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Choose a type to open its editor." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="min-h-0 overflow-y-auto pt-1">
            <ProductTypePicker value={selectedType} onValueChange={setSelectedType} />
          </Dialog.Body>
          <Dialog.Footer className="max-sm:flex-row max-sm:justify-between sm:justify-between border-t border-border/70 pt-4">
            <Dialog.CloseButton render={<Button variant="outline" className="min-h-10" />}>
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
