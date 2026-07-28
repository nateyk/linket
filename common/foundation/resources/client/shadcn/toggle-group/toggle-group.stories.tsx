import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import preview from '@storybook/preview';
import {BoldIcon, ItalicIcon, UnderlineIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Toggle Group',
  component: ToggleGroup,
});

export const Basic = meta.story(() => {
  return (
    <ToggleGroup multiple>
      <Toggle variant="outline" value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </Toggle>
      <Toggle variant="outline" value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </Toggle>
      <Toggle
        variant="outline"
        value="strikethrough"
        aria-label="Toggle strikethrough"
      >
        <UnderlineIcon />
      </Toggle>
    </ToggleGroup>
  );
});
