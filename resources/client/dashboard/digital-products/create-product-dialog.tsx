import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {
  BookIcon,
  DownloadIcon,
  HeadphonesIcon,
} from 'lucide-react';
import {useNavigate} from 'react-router';
import {useState} from 'react';

export type ProductType = 'digital' | 'ebook' | 'audio';

type ProductTypeOption = {
  id: ProductType;
  icon: typeof DownloadIcon;
  title: string;
  description: string;
};

const PRODUCT_TYPES: ProductTypeOption[] = [
  {
    id: 'digital',
    icon: DownloadIcon,
    title: 'Digital product',
    description: 'Any set of files to download or stream.',
  },
  {
    id: 'ebook',
    icon: BookIcon,
    title: 'E-book',
    description: 'Offer a book or comic in PDF, ePub, and Mobi formats.',
  },
  {
    id: 'audio',
    icon: HeadphonesIcon,
    title: 'Audio',
    description: 'Sell music, podcasts, or any audio content.',
  },
];

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
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Create a new product" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Choose the type of product you want to create." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className="grid gap-3 sm:grid-cols-3">
              {PRODUCT_TYPES.map(type => (
                <ProductTypeCard
                  key={type.id}
                  type={type}
                  selected={selectedType === type.id}
                  onSelect={() => setSelectedType(type.id)}
                />
              ))}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton render={<Button variant="outline" />}>
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              disabled={!selectedType}
              onClick={handleContinue}
            >
              <Trans message="Continue" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProductTypeCard({
  type,
  selected,
  onSelect,
}: {
  type: ProductTypeOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = type.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex cursor-pointer flex-col items-start gap-3 rounded-card border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'border-border bg-background hover:border-primary/50'
      }`}
    >
      <div
        className={`flex size-10 items-center justify-center rounded-lg ${
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <h4 className="font-semibold">
          <Trans message={type.title} />
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans message={type.description} />
        </p>
      </div>
    </button>
  );
}
