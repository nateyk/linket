import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {PackagePlusIcon, ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
import {useState} from 'react';
import {productTypeCreateUrl} from './product-create-flow';
import {ProductTypePicker, type ProductType} from './product-type-picker';

export function Component() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleContinue = () => {
    const destination = productTypeCreateUrl(selectedType);
    if (destination) navigate(destination);
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle render={<h1 />}>
          <Trans message="Create product" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/8 text-primary ring-1 ring-primary/15">
              <PackagePlusIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-semibold">
                <Trans message="What are you selling?" />
              </h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                <Trans message="Choose a type to open its editor." />
              </p>
            </div>
          </div>
          <ProductTypePicker value={selectedType} onValueChange={setSelectedType} />
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" render={<Link to="/dashboard/items" />}>
              <ArrowLeftIcon data-icon="inline-start" />
              <Trans message="All products" />
            </Button>
            <Button disabled={!selectedType} onClick={handleContinue}>
              <Trans message="Continue" />
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
