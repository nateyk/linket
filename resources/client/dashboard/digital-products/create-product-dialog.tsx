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
        <Dialog.Content className="sm:max-w-xl">
          <Dialog.Header>
            <Dialog.Title>
              <PackagePlusIcon className="size-5" aria-hidden="true" />
              <Trans message="What are you selling?" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Choose a type to open its editor." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="flex min-h-0 flex-col gap-4 overflow-y-auto pt-2">
            <ProductTypePicker value={selectedType} onValueChange={setSelectedType} />
          </Dialog.Body>
          <Dialog.Footer className="py-4 sm:justify-between">
            <Dialog.CloseButton render={<Button variant="outline" />}>
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              disabled={!selectedType}
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
