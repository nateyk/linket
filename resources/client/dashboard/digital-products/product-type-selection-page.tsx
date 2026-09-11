import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
import {hasNextStep} from './product-create-flow';
import {
  STEP_META,
  useProductCreateWizard,
  WizardStepBody,
  WizardStepDots,
} from './product-create-wizard';

export function Component() {
  const navigate = useNavigate();
  const wizard = useProductCreateWizard();
  const meta = STEP_META[wizard.step];
  const MetaIcon = meta.icon;

  const handleFinish = () => {
    if (wizard.finishUrl) {
      navigate(wizard.finishUrl);
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
            {wizard.step === 'type' ? (
              <Button variant="ghost" render={<Link to="/dashboard/my-products" />}>
                <ArrowLeftIcon />
                <Trans message="All products" />
              </Button>
            ) : (
              <Button variant="ghost" onClick={wizard.goBack}>
                <ArrowLeftIcon />
                <Trans message="Back" />
              </Button>
            )}
            <Button
              disabled={!wizard.canContinue}
              onClick={() =>
                hasNextStep(wizard.step, wizard.billing)
                  ? wizard.goNext()
                  : handleFinish()
              }
            >
              <Trans message="Continue" />
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/8 text-primary ring-1 ring-primary/15">
              <MetaIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-semibold">
                <Trans message={meta.title} />
              </h2>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                <Trans message={meta.description} />
              </p>
              <div className="mt-3">
                <WizardStepDots wizard={wizard} />
              </div>
            </div>
          </div>

          <div key={wizard.step} className="animate-in fade-in duration-200">
            <WizardStepBody wizard={wizard} />
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
