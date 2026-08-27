import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
import {useState} from 'react';
import {ProductTypePicker, type ProductType} from './product-type-picker';

export function Component() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      navigate(
        selectedType === 'course'
          ? '/dashboard/my-products/new/course'
          : `/dashboard/my-products/new/details?type=${selectedType}`,
      );
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
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              render={<Link to="/dashboard/my-products" />}
            >
              <ArrowLeftIcon />
              <Trans message="All products" />
            </Button>
            <Button disabled={!selectedType} onClick={handleContinue}>
              <Trans message="Continue" />
            </Button>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-base font-semibold">
              <Trans message="Select product type" />
            </legend>
            <ProductTypePicker
              value={selectedType}
              onValueChange={setSelectedType}
            />
          </fieldset>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
