import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {Link, useNavigate} from 'react-router';
import {hasNextStep} from './product-create-flow';
import {
  STEP_META,
  focusWizardStep,
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
    const destination = wizard.finishUrl;
    if (destination) {
      wizard.reset();
      navigate(destination);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        {/* T7: ONE page heading. It names the flow ("Create product"); the
            step question below is the only other heading (h2), so the step
            title is never duplicated on screen. */}
        <DashboardLayout.SectionTitle render={<h1 />}>
          <Trans message="Create product" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5 py-4">
          {/* T7: question first — the reader answers before they see the
              actions, and Tab reaches the options before Continue. */}
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
            </div>
          </div>
          {/* T5: page-shell progress is the FLOW's rule, not step 1's — it
              sits after the whole header row (icon + text) so the bottom
              rule spans the content column and aligns with the cards. */}
          <div className="mt-4">
            <WizardStepDots wizard={wizard} />
          </div>

          <div
            key={wizard.step}
            ref={focusWizardStep}
            className="animate-in fade-in duration-200"
          >
            <WizardStepBody wizard={wizard} />
          </div>

          {/* T7: the action row closes the column (footer), mirroring the
              dialog's footer instead of sitting above the question. */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            {wizard.step === 'type' ? (
              <Button variant="ghost" render={<Link to="/dashboard/items" />}>
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
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
