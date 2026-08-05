import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  BookIcon,
  DownloadIcon,
  HeadphonesIcon,
} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
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

export function Component() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/dashboard/my-products/new/details?type=${selectedType}`);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Create a new product" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" render={<Link to="/dashboard/my-products" />}>
              <ArrowLeftIcon />
              <Trans message="All products" />
            </Button>
            <Button
              disabled={!selectedType}
              onClick={handleContinue}
            >
              <Trans message="Continue" />
            </Button>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-base font-semibold">
              <Trans message="Select product type" />
            </legend>
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
          </fieldset>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
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
