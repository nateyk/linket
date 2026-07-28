import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {updateBiolinkLinkOptions} from '@app/dashboard/biolink/biolinks-queries';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {CrupdateBiolinkLinkBody} from '@app/gen/schemas/crupdate-biolink-link-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';
import {ReactNode, useEffect, useState} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

const animationsList = [
  'none',
  'bounce',
  'flash',
  'pulse',
  'rubberBand',
  'shakeX',
  'shakeY',
  'headShake',
  'swing',
  'tada',
  'wobble',
  'jello',
  'heartBeat',
];

interface LinkAnimationDialogProps {
  link: BiolinkLink;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function LinkAnimationDialog({
  link,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: LinkAnimationDialogProps) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent link={link} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  link,
  onClose,
}: {
  link: BiolinkLink;
  onClose: () => void;
}) {
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const form = useForm<CrupdateBiolinkLinkBody>({
    defaultValues: {
      animation: link.animation,
    },
  });
  const isDirty = form.formState.isDirty;

  const updateLink = useMutation(
    updateBiolinkLinkOptions(Number(biolinkId), link.id),
  );

  const handleSubmit = (values: CrupdateBiolinkLinkBody) => {
    updateLink.mutate(values, {
      onSuccess: response => {
        overrideContent(response.data.content);
        toast.success(<Trans message="Animation updated" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  useEffect(() => {
    import('./animate.min.css');
  }, []);

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Link animation" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="Add motion effect to draw attention to this link." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(95px,1fr))] gap-3.5">
            {animationsList.map((animation, index) => (
              <AnimationItem key={index} animationName={animation} />
            ))}
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={updateLink.isPending || !isDirty}>
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

interface AnimationItemProps {
  animationName: string;
}
function AnimationItem({animationName}: AnimationItemProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const {setValue} = useFormContext<CrupdateBiolinkLinkBody>();
  const animation: string | null =
    animationName === 'none' ? null : animationName;
  const selectedAnimation = useWatch({name: 'animation'});

  return (
    <button
      type="button"
      onClick={() => {
        setValue('animation', animation, {shouldDirty: true});
      }}
      onPointerEnter={() => {
        setIsAnimating(true);
      }}
      onPointerLeave={() => {
        setIsAnimating(false);
      }}
      className={clsx(
        'animate__animated flex h-16 items-center justify-center rounded-sm border-2 px-2.5 font-medium uppercase',
        isAnimating && `animate__${animationName}`,
        selectedAnimation === animation && 'border-primary',
      )}
    >
      {animationName}
    </button>
  );
}
