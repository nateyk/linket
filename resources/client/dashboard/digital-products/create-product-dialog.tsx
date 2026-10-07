import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';
import {useNavigate} from 'react-router';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {hasNextStep} from './product-create-flow';
import {
  STEP_META,
  focusWizardStep,
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
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const handleFinish = () => {
    if (wizard.finishUrl) {
      onOpenChange(false);
      navigate(wizard.finishUrl);
    }
  };

  const discardAndClose = () => {
    wizard.reset();
    setConfirmDiscardOpen(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && wizard.isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    if (!newOpen) {
      wizard.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-xl">
          <Dialog.Header>
            <Dialog.Title>
              <MetaIcon className="size-5" />
              <Trans message={meta.title} />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message={meta.description} />
            </Dialog.Description>
          </Dialog.Header>
          <div className="flex flex-col gap-4 pt-2">
            <WizardStepDots wizard={wizard} />
            <div
              key={wizard.step}
              ref={focusWizardStep}
              className="animate-in fade-in duration-200"
            >
              <WizardStepBody wizard={wizard} />
            </div>
          </div>
          <Dialog.Footer variant="muted" className="py-4 sm:justify-between">            {wizard.step === 'type' ? (
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
      <AlertDialog.Root
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Discard this product?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Your progress in this wizard will be lost. This action cannot be undone." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action color="danger" onClick={discardAndClose}>
                <Trans message="Discard" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
