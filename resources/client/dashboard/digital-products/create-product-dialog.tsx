import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useNavigate} from 'react-router';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {hasNextStep} from './product-create-flow';
import {
  STEP_META,
  useProductCreateWizard,
  WizardStepBody,
  WizardStepDots,
} from './product-create-wizard';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductDialog({
  open,
  onOpenChange,
}: CreateProductDialogProps) {
  const navigate = useNavigate();
  const wizard = useProductCreateWizard();
  const meta = STEP_META[wizard.step];
  const MetaIcon = meta.icon;

  const handleFinish = () => {
    if (wizard.finishUrl) {
      onOpenChange(false);
      navigate(wizard.finishUrl);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      wizard.reset();
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
                <MetaIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <Dialog.Title className="text-lg leading-tight font-semibold">
                  <Trans message={meta.title} />
                </Dialog.Title>
                <Dialog.Description className="mt-1 max-w-md leading-relaxed">
                  <Trans message={meta.description} />
                </Dialog.Description>
                <div className="mt-3">
                  <WizardStepDots wizard={wizard} />
                </div>
              </div>
            </div>
          </Dialog.Header>
          <Dialog.Body className="mx-0 px-6 py-5">
            <div key={wizard.step} className="animate-in fade-in duration-200">
              <WizardStepBody wizard={wizard} />
            </div>
          </Dialog.Body>
          <Dialog.Footer
            variant="muted"
            className="mx-0 mb-0 px-6 py-4 sm:items-center"
          >
            {wizard.step === 'type' ? (
              <Dialog.CloseButton render={<Button variant="outline" />}>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
            ) : (
              <Button variant="outline" onClick={wizard.goBack}>
                <ArrowLeftIcon data-icon="inline-start" />
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
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
