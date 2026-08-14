import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useNavigate} from 'react-router';
import {useState} from 'react';
import {ArrowRightIcon, PackagePlusIcon} from 'lucide-react';
import {
  ProductTypePicker,
  type ProductType,
} from './product-type-picker';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
}: CreateProductDialogProps) {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onOpenChange(false);
      navigate(`/dashboard/my-products/new/details?type=${selectedType}`);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedType(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-xl">
          <Dialog.Header className="border-b px-6 py-5 pe-14">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/8 text-primary ring-1 ring-primary/15">
                <PackagePlusIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-lg leading-tight font-semibold">
                  <Trans message="Create a new product" />
                </Dialog.Title>
                <Dialog.Description className="mt-1 max-w-md leading-relaxed">
                  <Trans message="Choose the best format for what you want to sell." />
                </Dialog.Description>
              </div>
            </div>
          </Dialog.Header>
          <Dialog.Body className="mx-0 px-6 py-5">
            <ProductTypePicker
              value={selectedType}
              onValueChange={setSelectedType}
            />
          </Dialog.Body>
          <Dialog.Footer
            variant="muted"
            className="mx-0 mb-0 px-6 py-4 sm:items-center"
          >
            <Dialog.CloseButton render={<Button variant="outline" />}>
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              disabled={!selectedType}
              onClick={handleContinue}
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
