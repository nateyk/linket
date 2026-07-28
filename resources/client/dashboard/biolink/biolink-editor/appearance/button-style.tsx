import {appearanceHeaderClassnames} from '@app/dashboard/biolink/biolink-editor/appearance/header-classnames';
import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {BiolinkAppearanceConfigBtnConfig} from '@app/gen/schemas/biolink-appearance-config-btn-config';
import {ColorField} from '@ui/color-picker/color-field';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ReactNode, useCallback, useId} from 'react';

export function ButtonStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const value = useBiolinkEditorStore(s => s.appearance?.btnConfig);

  const setValue = useCallback(
    (newValue: Partial<BiolinkAppearanceConfigBtnConfig>) => {
      updateAppearance({
        btnConfig: {
          ...value,
          ...newValue,
        },
      });
    },
    [value, updateAppearance],
  );

  return (
    <div>
      <h2 className={appearanceHeaderClassnames.h2}>
        <Trans message="Buttons" />
      </h2>
      <div className="flex flex-col gap-6">
        <StyleSelector value={value} onChange={setValue} />
        <RadiusSelector value={value} onChange={setValue} />
        <ShadowSelector value={value} onChange={setValue} />
        <ColorSelector />
      </div>
    </div>
  );
}

interface StyleSelectorProps {
  value?: BiolinkAppearanceConfigBtnConfig;
  onChange: (newValue: BiolinkAppearanceConfigBtnConfig) => void;
}
function StyleSelector({value, onChange}: StyleSelectorProps) {
  const selectedVariant = value?.variant ?? 'flat';

  return (
    <div>
      <h3 className={appearanceHeaderClassnames.h3}>
        <Trans message="Style" />
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <ButtonStyleItem
          label={<Trans message="Solid" />}
          active={selectedVariant === 'solid'}
          onClick={() => onChange({...value, variant: 'solid'})}
        >
          <span className="block h-6 w-full rounded-button bg-border" />
        </ButtonStyleItem>
        <ButtonStyleItem
          label={<Trans message="Glass" />}
          active={selectedVariant === 'glass'}
          onClick={() => onChange({...value, variant: 'glass'})}
        >
          <span className="block h-6 w-full rounded-button border border-white" />
        </ButtonStyleItem>
        <ButtonStyleItem
          label={<Trans message="Outline" />}
          active={selectedVariant === 'outline'}
          onClick={() => onChange({...value, variant: 'outline'})}
        >
          <span className="block h-6 w-full rounded-button border border-border" />
        </ButtonStyleItem>
      </div>
    </div>
  );
}

function RadiusSelector({value, onChange}: StyleSelectorProps) {
  const selectedValue = value?.radius ?? 'rounded-none';
  return (
    <div>
      <h3 className={appearanceHeaderClassnames.h3}>
        <Trans message="Corner roundness" />
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ButtonStyleItem
          label={<Trans message="Square" />}
          active={selectedValue === 'rounded-none'}
          onClick={() => onChange({...value, radius: 'rounded-none'})}
        >
          <RoundnessPreview d="M4 20V4H20" />
        </ButtonStyleItem>
        <ButtonStyleItem
          label={<Trans message="Round" />}
          active={selectedValue === 'rounded-sm'}
          onClick={() => onChange({...value, radius: 'rounded-sm'})}
        >
          <RoundnessPreview d="M4 20V8C4 5.79086 5.79086 4 8 4H20" />
        </ButtonStyleItem>
        <ButtonStyleItem
          label={<Trans message="Rounder" />}
          active={selectedValue === 'rounded-lg'}
          onClick={() => onChange({...value, radius: 'rounded-lg'})}
        >
          <RoundnessPreview d="M4 20V12C4 7.58172 7.58172 4 12 4H20" />
        </ButtonStyleItem>
        <ButtonStyleItem
          label={<Trans message="Full" />}
          active={selectedValue === 'rounded-full'}
          onClick={() => onChange({...value, radius: 'rounded-full'})}
        >
          <RoundnessPreview d="M4 20C4 11.1634 11.1634 4 20 4" />
        </ButtonStyleItem>
      </div>
    </div>
  );
}

function RoundnessPreview({d}: {d: string}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShadowSelector({value, onChange}: StyleSelectorProps) {
  const selectedValue = value?.shadow ?? 'none';
  return (
    <div>
      <h3 className={appearanceHeaderClassnames.h3}>
        <Trans message="Shadow" />
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ButtonStyleItem
          active={selectedValue === 'none'}
          onClick={() => onChange({...value, shadow: 'none'})}
        >
          <Trans message="None" />
        </ButtonStyleItem>
        <ButtonStyleItem
          active={selectedValue === 'soft'}
          onClick={() => onChange({...value, shadow: 'soft'})}
        >
          <Trans message="Soft" />
        </ButtonStyleItem>
        <ButtonStyleItem
          active={selectedValue === 'strong'}
          onClick={() => onChange({...value, shadow: 'strong'})}
        >
          <Trans message="Strong" />
        </ButtonStyleItem>
        <ButtonStyleItem
          active={selectedValue === 'hard'}
          onClick={() => onChange({...value, shadow: 'hard'})}
        >
          <Trans message="Hard" />
        </ButtonStyleItem>
      </div>
    </div>
  );
}

function ColorSelector() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const btnConfig = useBiolinkEditorStore(s => s.appearance?.btnConfig);

  return (
    <div className="flex items-center gap-3">
      <ColorField
        className="max-w-57"
        label={<Trans message="Color" />}
        value={btnConfig?.color || '#000'}
        onChange={newValue => {
          updateAppearance({
            btnConfig: {
              ...btnConfig,
              color: newValue,
            },
          });
        }}
      />
      <ColorField
        className="max-w-57"
        label={<Trans message="Text color" />}
        value={btnConfig?.textColor || '#000'}
        onChange={newValue => {
          updateAppearance({
            btnConfig: {
              ...btnConfig,
              textColor: newValue,
            },
          });
        }}
      />
    </div>
  );
}

type ButtonStyleItemProps = {
  label?: ReactNode;
  children: ReactNode;
  active: boolean;
  onClick: () => void;
};

function ButtonStyleItem({
  label,
  children,
  active,
  onClick,
}: ButtonStyleItemProps) {
  const id = useId();
  return (
    <div
      className="group flex flex-col items-center gap-2"
      data-active={active}
    >
      <button
        id={id}
        aria-labelledby={id}
        onClick={onClick}
        type="button"
        className={cn(
          'flex h-12 w-full items-center justify-center rounded-card-sm bg-accent p-3 text-sm outline-offset-3 outline-primary group-data-active:outline-2 focus-visible:outline-2',
        )}
      >
        {children}
      </button>
      {label ? (
        <div className="text-xs" id={id}>
          {label}
        </div>
      ) : null}
    </div>
  );
}
